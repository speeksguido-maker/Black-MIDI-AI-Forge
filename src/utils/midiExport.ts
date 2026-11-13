import { Midi } from '@tonejs/midi';
import { MidiNote, MidiSequence, MidiColorPalette } from '../types/midi';
import { getNotesDuration } from './safeMath';

// Parse imported MIDI file buffer safely (handles standard files and multi-million Black MIDI)
export async function parseMidiFile(file: File): Promise<MidiSequence> {
  const arrayBuffer = await file.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  const notes: MidiNote[] = [];
  let totalNotesInFile = 0;

  if (midi.tracks && Array.isArray(midi.tracks)) {
    midi.tracks.forEach((track) => {
      if (track && track.notes && Array.isArray(track.notes)) {
        totalNotesInFile += track.notes.length;
      }
    });

    // If file has > 40,000 notes, sample evenly so browser memory never spikes and preview stays fluid
    const stride = totalNotesInFile > 40000 ? Math.ceil(totalNotesInFile / 35000) : 1;
    let counter = 0;
    let sampleIdx = 0;

    midi.tracks.forEach((track, trackIdx) => {
      if (track && track.notes && Array.isArray(track.notes)) {
        track.notes.forEach((note) => {
          if (sampleIdx++ % stride === 0 && typeof note.midi === 'number' && !isNaN(note.midi)) {
            notes.push({
              id: `imp-${trackIdx}-${counter++}`,
              midi: Math.max(0, Math.min(127, Math.round(note.midi))),
              time: Math.min(1799.9, Math.max(0, typeof note.time === 'number' ? note.time : 0)),
              duration: Math.max(0.015, typeof note.duration === 'number' ? note.duration : 0.1),
              velocity: typeof note.velocity === 'number' ? Math.max(0.1, Math.min(1, note.velocity)) : 0.8,
              isOriginal: true,
              channel: typeof (track as any).channel === 'number' ? (track as any).channel : (trackIdx % 16),
              track: trackIdx,
            });
          }
        });
      }
    });
  }

  let bpm = 120;
  if (midi.header && midi.header.tempos && midi.header.tempos.length > 0) {
    const parsedBpm = Math.round(midi.header.tempos[0].bpm);
    if (parsedBpm > 20 && parsedBpm < 600) bpm = parsedBpm;
  }

  const MAX_DURATION = 3600; // 1 hour maximum (3600s)
  const calculatedDuration = getNotesDuration(notes);
  const rawDuration = (midi.duration && midi.duration > 0)
    ? midi.duration
    : (calculatedDuration > 0 ? calculatedDuration : 10);
  const duration = Math.min(MAX_DURATION, Math.max(1, rawDuration));

  return {
    name: file.name.replace(/\.[^/.]+$/, '') || 'Imported MIDI',
    bpm,
    duration,
    notes: notes.filter((n) => n.time < MAX_DURATION).sort((a, b) => a.time - b.time),
  };
}

const CHANNEL_NAMES: Record<number, string> = {
  0: 'Lead Melody (Cyan/Blue)',
  1: 'Octave Cascade (Blood Red)',
  2: 'Harmonic Resonator (Green)',
  3: 'Tremolo Ratchet (Yellow)',
  4: 'Upper Register (Cyan)',
  5: 'Valkyrie Avalanche (Magenta)',
  6: 'Bass Ground (Orange)',
  7: 'Matrix Shimmer (Lime)',
  8: 'Counterpoint Blitz (Violet)',
  9: 'Percussive Strikes (Pink)',
  10: 'Glitch Bursts (Turquoise)',
  11: 'Decay Echoes (Amber)',
  12: 'Harmonic Fifths (Lavender)',
  13: 'Staircase Run (Coral)',
  14: 'Visual Note Art (Gold)',
  15: 'Hyper-Density Whiteout (Ice)',
};

// Export notes array to standard .mid binary file with multi-channel color palettes
export function downloadMidiFile(
  notes: MidiNote[],
  filename = 'black-midi-masterpiece.mid',
  bpm = 140,
  palette: MidiColorPalette = 'synthesia_rainbow'
) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.name = filename.replace(/\.[^/.]+$/, '');

  // Group notes by channel (0 to 15) for Synthesia / DAW color segregation
  const notesByChannel: Map<number, MidiNote[]> = new Map();
  for (let ch = 0; ch < 16; ch++) {
    notesByChannel.set(ch, []);
  }

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const ch = typeof n.channel === 'number' && n.channel >= 0 && n.channel < 16
      ? n.channel
      : (n.track ? n.track % 16 : 0);
    notesByChannel.get(ch)!.push(n);
  }

  // Create distinct MIDI tracks for each active channel
  // If a channel has > 60,000 notes, split across sub-tracks to avoid 16-bit track chunk overflows
  const MAX_NOTES_PER_TRACK = 55000;

  notesByChannel.forEach((chNotes, ch) => {
    if (chNotes.length === 0) return;

    const numChunks = Math.ceil(chNotes.length / MAX_NOTES_PER_TRACK);
    for (let c = 0; c < numChunks; c++) {
      const slice = chNotes.slice(c * MAX_NOTES_PER_TRACK, (c + 1) * MAX_NOTES_PER_TRACK);
      const track = midi.addTrack();
      const channelLabel = CHANNEL_NAMES[ch] || `Channel ${ch + 1}`;
      track.name = numChunks > 1 ? `${channelLabel} Part ${c + 1}` : channelLabel;
      track.channel = ch;

      for (let j = 0; j < slice.length; j++) {
        const n = slice[j];
        try {
          track.addNote({
            midi: Math.max(0, Math.min(127, Math.round(n.midi))),
            time: Math.max(0, n.time),
            duration: Math.max(0.015, n.duration),
            velocity: Math.max(0.05, Math.min(1, n.velocity)),
          });
        } catch {
          // ignore any individual note out of range
        }
      }
    }
  });

  // Fallback if no notes were added
  if (midi.tracks.length === 0) {
    const track = midi.addTrack();
    track.name = 'Black MIDI Layer';
    track.channel = 0;
    notes.slice(0, 1000).forEach((n) => {
      track.addNote({
        midi: Math.max(0, Math.min(127, Math.round(n.midi))),
        time: Math.max(0, n.time),
        duration: Math.max(0.015, n.duration),
        velocity: Math.max(0.05, Math.min(1, n.velocity)),
      });
    });
  }

  const array = midi.toArray();
  const blob = new Blob([array.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export audio WAV rendering via OfflineAudioContext
export async function exportWavAudio(
  notes: MidiNote[],
  filename = 'black-midi-audio.wav',
  maxDuration = 45
): Promise<void> {
  if (notes.length === 0) return;

  const calculatedDuration = getNotesDuration(notes);
  const totalDuration = Math.min(maxDuration, calculatedDuration + 1);
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * totalDuration, sampleRate);

  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, 0);
  compressor.knee.setValueAtTime(24, 0);
  compressor.ratio.setValueAtTime(14, 0);
  compressor.attack.setValueAtTime(0.003, 0);
  compressor.release.setValueAtTime(0.15, 0);
  compressor.connect(offlineCtx.destination);

  // Sample notes if count exceeds 25,000 for fast audio render
  const renderNotes = notes.length > 25000
    ? notes.filter((_, idx) => idx % Math.ceil(notes.length / 25000) === 0)
    : notes;

  for (const n of renderNotes) {
    if (n.time > maxDuration) continue;
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();

    const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, n.time);
    osc.type = n.isOriginal ? 'triangle' : 'sine';

    const vel = Math.min(1, n.velocity) * 0.12;
    gain.gain.setValueAtTime(0.0001, n.time);
    gain.gain.linearRampToValueAtTime(vel, n.time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, n.time + Math.max(0.04, n.duration));

    osc.connect(gain);
    gain.connect(compressor);

    osc.start(n.time);
    osc.stop(n.time + Math.max(0.05, n.duration));
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);

  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const length = left.length * numChannels * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(out, 0, 'RIFF');
  out.setUint32(4, 36 + left.length * numChannels * 2, true);
  writeString(out, 8, 'WAVE');
  writeString(out, 12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, format, true);
  out.setUint16(22, numChannels, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * numChannels * 2, true);
  out.setUint16(32, numChannels * 2, true);
  out.setUint16(34, bitDepth, true);
  writeString(out, 36, 'data');
  out.setUint32(40, left.length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    let sample = Math.max(-1, Math.min(1, left[i]));
    out.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
    if (numChannels > 1) {
      sample = Math.max(-1, Math.min(1, right[i]));
      out.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}
