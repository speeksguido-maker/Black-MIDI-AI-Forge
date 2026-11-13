import { MidiNote, MidiSequence } from '../types/midi';

export interface AudioToMidiOptions {
  mode: 'monophonic' | 'polyphonic';
  sensitivity: number; // 0.05 to 0.5 (YIN threshold or peak sensitivity)
  minPitch: number;    // MIDI note number (e.g. 24 = C1)
  maxPitch: number;    // MIDI note number (e.g. 96 = C7)
  minDuration: number; // minimum note duration in seconds (e.g. 0.05s)
  quantizePitch: boolean; // round to nearest semitone
  noiseGateDb: number; // dB threshold below which is treated as silence (e.g. -45 dB)
}

export const DEFAULT_AUDIO_TO_MIDI_OPTIONS: AudioToMidiOptions = {
  mode: 'monophonic',
  sensitivity: 0.15,
  minPitch: 28, // E1
  maxPitch: 96, // C7
  minDuration: 0.06,
  quantizePitch: true,
  noiseGateDb: -42,
};

export interface AudioConversionProgress {
  stage: 'decoding' | 'analyzing' | 'segmenting' | 'complete' | 'error';
  progress: number; // 0 to 100
  message: string;
  notesFound: number;
}

/**
 * Frequency to MIDI pitch conversion
 * f = 440 * 2^((m - 69)/12)
 * m = 69 + 12 * log2(f / 440)
 */
export function frequencyToMidi(freq: number): number {
  if (freq <= 0) return 0;
  return 69 + 12 * (Math.log(freq / 440) / Math.LN2);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Root Mean Square (RMS) energy in decibels
 */
function calculateRmsDb(buffer: Float32Array, start: number, length: number): { rms: number; db: number } {
  let sum = 0;
  const end = Math.min(buffer.length, start + length);
  const actualLen = end - start;
  if (actualLen <= 0) return { rms: 0, db: -100 };

  for (let i = start; i < end; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / actualLen);
  const db = rms > 0.000001 ? 20 * Math.log10(rms) : -100;
  return { rms, db };
}

/**
 * YIN Monophonic Pitch Estimation Algorithm
 * High-accuracy sub-semitone pitch detection with parabolic interpolation
 */
function detectPitchYin(
  buffer: Float32Array,
  start: number,
  sampleRate: number,
  windowSize = 2048,
  threshold = 0.15,
  minPitch = 28,
  maxPitch = 96
): { frequency: number; probability: number } | null {
  const minFreq = midiToFrequency(minPitch);
  const maxFreq = midiToFrequency(maxPitch);

  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxTau = Math.min(Math.floor(windowSize / 2), Math.floor(sampleRate / minFreq));

  if (start + windowSize > buffer.length) return null;

  // Step 1: Difference Function
  const diff = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let j = 0; j < windowSize - tau; j++) {
      const delta = buffer[start + j] - buffer[start + j + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative Mean Normalized Difference Function
  const cmndf = new Float32Array(maxTau + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = runningSum > 0 ? (diff[tau] * tau) / runningSum : 1;
  }

  // Step 3: Absolute Thresholding
  let tauFound = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= maxTau && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      tauFound = tau;
      break;
    }
  }

  // Fallback: Global minimum if within reasonable bounds
  if (tauFound === -1) {
    let globalMinTau = minTau;
    let globalMinVal = cmndf[minTau];
    for (let tau = minTau + 1; tau <= maxTau; tau++) {
      if (cmndf[tau] < globalMinVal) {
        globalMinVal = cmndf[tau];
        globalMinTau = tau;
      }
    }
    if (globalMinVal < threshold * 2.2) {
      tauFound = globalMinTau;
    }
  }

  if (tauFound < minTau || tauFound > maxTau) {
    return null;
  }

  // Step 4: Parabolic Interpolation for sub-bin precision
  let betterTau = tauFound;
  const x0 = tauFound > 1 ? tauFound - 1 : tauFound;
  const x2 = tauFound < maxTau ? tauFound + 1 : tauFound;
  if (x0 !== tauFound && x2 !== tauFound) {
    const s0 = cmndf[x0];
    const s1 = cmndf[tauFound];
    const s2 = cmndf[x2];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(denom) > 1e-6) {
      betterTau = tauFound + (s2 - s0) / denom;
    }
  }

  const pitchFreq = sampleRate / betterTau;
  if (pitchFreq < minFreq || pitchFreq > maxFreq) {
    return null;
  }

  const prob = Math.max(0, 1 - cmndf[tauFound]);
  return { frequency: pitchFreq, probability: prob };
}

/**
 * Polyphonic FFT Peak Extractor
 * Extracts dominant spectral peaks and maps to candidate chord pitches
 */
function extractSpectralPeaks(
  buffer: Float32Array,
  start: number,
  sampleRate: number,
  fftSize = 2048,
  minPitch = 28,
  maxPitch = 96,
  maxPeaks = 4
): Array<{ midi: number; magnitude: number }> {
  const actualLen = Math.min(fftSize, buffer.length - start);
  if (actualLen < 512) return [];

  // Compute DFT over musically relevant frequency bins (semitone spaced filterbank)
  const results: Array<{ midi: number; magnitude: number }> = [];

  // Evaluate candidate notes from minPitch to maxPitch
  for (let m = minPitch; m <= maxPitch; m++) {
    const targetFreq = midiToFrequency(m);
    const omega = (2 * Math.PI * targetFreq) / sampleRate;

    // Goertzel-inspired or correlation magnitude with Hann window
    let real = 0;
    let imag = 0;
    for (let n = 0; n < actualLen; n++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * n) / actualLen));
      const sample = buffer[start + n] * hann;
      real += sample * Math.cos(omega * n);
      imag -= sample * Math.sin(omega * n);
    }
    const mag = Math.sqrt(real * real + imag * imag) / actualLen;
    results.push({ midi: m, magnitude: mag });
  }

  // Find local peaks
  const peaks: Array<{ midi: number; magnitude: number }> = [];
  for (let i = 1; i < results.length - 1; i++) {
    if (results[i].magnitude > results[i - 1].magnitude && results[i].magnitude > results[i + 1].magnitude) {
      peaks.push(results[i]);
    }
  }

  // Sort by magnitude descending and take top peaks
  peaks.sort((a, b) => b.magnitude - a.magnitude);
  if (peaks.length === 0) return [];

  const maxMag = peaks[0].magnitude;
  if (maxMag < 0.003) return [];

  // Keep peaks that are at least 18% of maximum peak
  return peaks.filter((p) => p.magnitude >= maxMag * 0.22).slice(0, maxPeaks);
}

/**
 * Downmix any audio buffer to a single mono Float32Array
 */
export function downmixToMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);

  if (numChannels === 1) {
    mono.set(audioBuffer.getChannelData(0));
    return mono;
  }

  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    const weight = 1 / numChannels;
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] * weight;
    }
  }
  return mono;
}

/**
 * Convert AudioBuffer to MidiSequence
 */
export async function convertAudioBufferToMidi(
  audioBuffer: AudioBuffer,
  options: Partial<AudioToMidiOptions> = {},
  onProgress?: (progress: AudioConversionProgress) => void
): Promise<MidiSequence> {
  const opts: AudioToMidiOptions = { ...DEFAULT_AUDIO_TO_MIDI_OPTIONS, ...options };
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  onProgress?.({
    stage: 'analyzing',
    progress: 5,
    message: 'Extracting mono audio stream...',
    notesFound: 0,
  });

  const mono = downmixToMono(audioBuffer);

  // Frame parameters
  const windowSize = 2048;
  const hopSize = 512; // ~11.6ms at 44.1kHz
  const numHops = Math.floor((mono.length - windowSize) / hopSize);

  interface RawFrame {
    time: number;
    rmsDb: number;
    velocity: number;
    pitches: number[]; // MIDI notes
  }

  const frames: RawFrame[] = [];

  const updateInterval = Math.max(1, Math.floor(numHops / 25));

  for (let h = 0; h < numHops; h++) {
    const startSample = h * hopSize;
    const time = startSample / sampleRate;

    const { rms, db } = calculateRmsDb(mono, startSample, windowSize);
    const velocity = Math.min(1, Math.max(0.15, (db + 60) / 60));

    if (db < opts.noiseGateDb) {
      frames.push({ time, rmsDb: db, velocity: 0, pitches: [] });
    } else {
      if (opts.mode === 'monophonic') {
        const detection = detectPitchYin(
          mono,
          startSample,
          sampleRate,
          windowSize,
          opts.sensitivity,
          opts.minPitch,
          opts.maxPitch
        );

        if (detection && detection.probability >= 0.45) {
          const rawMidi = frequencyToMidi(detection.frequency);
          const finalMidi = opts.quantizePitch ? Math.round(rawMidi) : rawMidi;
          if (finalMidi >= opts.minPitch && finalMidi <= opts.maxPitch) {
            frames.push({ time, rmsDb: db, velocity, pitches: [finalMidi] });
          } else {
            frames.push({ time, rmsDb: db, velocity: 0, pitches: [] });
          }
        } else {
          frames.push({ time, rmsDb: db, velocity: 0, pitches: [] });
        }
      } else {
        // Polyphonic chord extraction
        const peaks = extractSpectralPeaks(
          mono,
          startSample,
          sampleRate,
          windowSize,
          opts.minPitch,
          opts.maxPitch,
          4
        );

        if (peaks.length > 0) {
          frames.push({
            time,
            rmsDb: db,
            velocity,
            pitches: peaks.map((p) => p.midi),
          });
        } else {
          frames.push({ time, rmsDb: db, velocity: 0, pitches: [] });
        }
      }
    }

    if (h % updateInterval === 0 || h === numHops - 1) {
      const pct = Math.round(10 + (h / numHops) * 65);
      onProgress?.({
        stage: 'analyzing',
        progress: pct,
        message: `Analyzing pitch spectrum (${Math.round(time)}s / ${Math.round(duration)}s)...`,
        notesFound: 0,
      });
      // Yield thread briefly for smooth UI
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.({
    stage: 'segmenting',
    progress: 80,
    message: 'Segmenting notes, tracking onsets, and filtering transients...',
    notesFound: 0,
  });

  // Track discrete notes
  const notes: MidiNote[] = [];
  let noteCounter = 0;

  if (opts.mode === 'monophonic') {
    let currentNote: { midi: number; startTime: number; lastTime: number; velSum: number; count: number } | null = null;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const pitch = f.pitches.length > 0 ? f.pitches[0] : null;

      if (pitch !== null) {
        if (currentNote === null) {
          // Note start
          currentNote = {
            midi: pitch,
            startTime: f.time,
            lastTime: f.time,
            velSum: f.velocity,
            count: 1,
          };
        } else if (Math.abs(currentNote.midi - pitch) < 0.8) {
          // Continuation of same note
          currentNote.lastTime = f.time;
          currentNote.velSum += f.velocity;
          currentNote.count += 1;
        } else {
          // Pitch changed -> complete current note and start new
          const dur = currentNote.lastTime - currentNote.startTime + (hopSize / sampleRate);
          if (dur >= opts.minDuration) {
            notes.push({
              id: `aud-mono-${noteCounter++}`,
              midi: Math.round(currentNote.midi),
              time: Math.max(0, currentNote.startTime),
              duration: Math.max(0.04, dur),
              velocity: Math.min(1, Math.max(0.2, currentNote.velSum / currentNote.count)),
              isOriginal: true,
              channel: 0,
              track: 0,
            });
          }
          currentNote = {
            midi: pitch,
            startTime: f.time,
            lastTime: f.time,
            velSum: f.velocity,
            count: 1,
          };
        }
      } else {
        // Silence or no pitch detected
        if (currentNote !== null) {
          const dur = currentNote.lastTime - currentNote.startTime + (hopSize / sampleRate);
          if (dur >= opts.minDuration) {
            notes.push({
              id: `aud-mono-${noteCounter++}`,
              midi: Math.round(currentNote.midi),
              time: Math.max(0, currentNote.startTime),
              duration: Math.max(0.04, dur),
              velocity: Math.min(1, Math.max(0.2, currentNote.velSum / currentNote.count)),
              isOriginal: true,
              channel: 0,
              track: 0,
            });
          }
          currentNote = null;
        }
      }
    }

    // Flush last note
    if (currentNote !== null) {
      const dur = currentNote.lastTime - currentNote.startTime + (hopSize / sampleRate);
      if (dur >= opts.minDuration) {
        notes.push({
          id: `aud-mono-${noteCounter++}`,
          midi: Math.round(currentNote.midi),
          time: Math.max(0, currentNote.startTime),
          duration: Math.max(0.04, dur),
          velocity: Math.min(1, Math.max(0.2, currentNote.velSum / currentNote.count)),
          isOriginal: true,
          channel: 0,
          track: 0,
        });
      }
    }
  } else {
    // Polyphonic segmentation
    // Active voices map: midiNote -> active state
    const activeVoices = new Map<number, { startTime: number; lastTime: number; velSum: number; count: number }>();

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const currentPitches = new Set(f.pitches);

      // Check active voices that stopped
      for (const [activeMidi, voice] of activeVoices.entries()) {
        if (!currentPitches.has(activeMidi)) {
          const dur = voice.lastTime - voice.startTime + (hopSize / sampleRate);
          if (dur >= opts.minDuration) {
            notes.push({
              id: `aud-poly-${noteCounter++}`,
              midi: activeMidi,
              time: Math.max(0, voice.startTime),
              duration: Math.max(0.04, dur),
              velocity: Math.min(1, Math.max(0.2, voice.velSum / voice.count)),
              isOriginal: true,
              channel: (activeMidi % 4),
              track: 0,
            });
          }
          activeVoices.delete(activeMidi);
        } else {
          // Voice continues
          voice.lastTime = f.time;
          voice.velSum += f.velocity;
          voice.count += 1;
        }
      }

      // Check new pitches that started
      for (const pitch of currentPitches) {
        if (!activeVoices.has(pitch)) {
          activeVoices.set(pitch, {
            startTime: f.time,
            lastTime: f.time,
            velSum: f.velocity,
            count: 1,
          });
        }
      }
    }

    // Flush remaining active voices
    for (const [activeMidi, voice] of activeVoices.entries()) {
      const dur = voice.lastTime - voice.startTime + (hopSize / sampleRate);
      if (dur >= opts.minDuration) {
        notes.push({
          id: `aud-poly-${noteCounter++}`,
          midi: activeMidi,
          time: Math.max(0, voice.startTime),
          duration: Math.max(0.04, dur),
          velocity: Math.min(1, Math.max(0.2, voice.velSum / voice.count)),
          isOriginal: true,
          channel: (activeMidi % 4),
          track: 0,
        });
      }
    }
  }

  // Sort notes chronologically
  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  onProgress?.({
    stage: 'complete',
    progress: 100,
    message: `Transcribed ${notes.length.toLocaleString()} pitch notes successfully!`,
    notesFound: notes.length,
  });

  return {
    name: 'Audio Transcribed Track',
    bpm: 120,
    duration: Math.max(1, duration),
    notes,
  };
}

/**
 * Generate a high quality synthetic audio buffer for 1-click test clips
 * without needing an external audio file.
 */
export function generateSyntheticAudioSample(
  type: 'synth_lead' | 'piano_chords' | 'retro_bass' = 'synth_lead'
): AudioBuffer {
  const sampleRate = 44100;
  const duration = 6.0; // 6 seconds clip
  const numSamples = Math.floor(sampleRate * duration);

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'synth_lead') {
    // Catchy melody: C4, E4, G4, B4, C5, A4, F4, G4
    const melody = [
      { midi: 60, start: 0.0, dur: 0.6 },
      { midi: 64, start: 0.7, dur: 0.5 },
      { midi: 67, start: 1.3, dur: 0.5 },
      { midi: 71, start: 1.9, dur: 0.6 },
      { midi: 72, start: 2.6, dur: 0.8 },
      { midi: 69, start: 3.5, dur: 0.6 },
      { midi: 65, start: 4.2, dur: 0.6 },
      { midi: 67, start: 4.9, dur: 0.9 },
    ];

    for (const note of melody) {
      const freq = midiToFrequency(note.midi);
      const startIdx = Math.floor(note.start * sampleRate);
      const endIdx = Math.min(numSamples, Math.floor((note.start + note.dur) * sampleRate));
      const noteLen = endIdx - startIdx;

      for (let i = 0; i < noteLen; i++) {
        const t = i / sampleRate;
        const progress = i / noteLen;
        // Smooth ADSR envelope
        const env = progress < 0.1 ? progress / 0.1 : progress > 0.8 ? (1 - progress) / 0.2 : 0.85;
        // Harmonic rich timbre (fundamental + 2nd + 3rd harmonic)
        const sample =
          0.6 * Math.sin(2 * Math.PI * freq * t) +
          0.3 * Math.sin(2 * Math.PI * freq * 2 * t) +
          0.15 * Math.sin(2 * Math.PI * freq * 3 * t);

        data[startIdx + i] += sample * env * 0.45;
      }
    }
  } else if (type === 'piano_chords') {
    // Chord progression: Am -> F -> C -> G
    const chords = [
      { notes: [57, 60, 64, 69], start: 0.0, dur: 1.3 }, // Am
      { notes: [53, 57, 60, 65], start: 1.4, dur: 1.3 }, // F
      { notes: [48, 52, 55, 60], start: 2.8, dur: 1.3 }, // C
      { notes: [55, 59, 62, 67], start: 4.2, dur: 1.5 }, // G
    ];

    for (const chord of chords) {
      for (const pitch of chord.notes) {
        const freq = midiToFrequency(pitch);
        const startIdx = Math.floor(chord.start * sampleRate);
        const endIdx = Math.min(numSamples, Math.floor((chord.start + chord.dur) * sampleRate));
        const noteLen = endIdx - startIdx;

        for (let i = 0; i < noteLen; i++) {
          const t = i / sampleRate;
          // Piano exponential decay envelope
          const env = Math.exp(-2.5 * (i / sampleRate));
          const sample =
            0.7 * Math.sin(2 * Math.PI * freq * t) +
            0.25 * Math.sin(2 * Math.PI * freq * 2 * t);

          data[startIdx + i] += (sample * env * 0.25) / chord.notes.length;
        }
      }
    }
  } else {
    // Retro Bass groove: Deep punchy stabs in C2 - Eb2 - G2 - Bb1
    const bassNotes = [
      { midi: 36, start: 0.0, dur: 0.35 },
      { midi: 36, start: 0.45, dur: 0.25 },
      { midi: 39, start: 0.8, dur: 0.4 },
      { midi: 43, start: 1.3, dur: 0.4 },
      { midi: 34, start: 1.8, dur: 0.5 },
      { midi: 36, start: 2.5, dur: 0.4 },
      { midi: 41, start: 3.1, dur: 0.4 },
      { midi: 43, start: 3.7, dur: 0.6 },
      { midi: 36, start: 4.5, dur: 1.1 },
    ];

    for (const note of bassNotes) {
      const freq = midiToFrequency(note.midi);
      const startIdx = Math.floor(note.start * sampleRate);
      const endIdx = Math.min(numSamples, Math.floor((note.start + note.dur) * sampleRate));
      const noteLen = endIdx - startIdx;

      for (let i = 0; i < noteLen; i++) {
        const t = i / sampleRate;
        const progress = i / noteLen;
        const env = Math.exp(-3.5 * progress);
        // Rich bass triangle/saw wave
        const sample =
          0.8 * Math.sin(2 * Math.PI * freq * t) +
          0.3 * Math.sin(2 * Math.PI * freq * 3 * t) +
          0.15 * Math.sin(2 * Math.PI * freq * 5 * t);

        data[startIdx + i] += sample * env * 0.5;
      }
    }
  }

  return buffer;
}
