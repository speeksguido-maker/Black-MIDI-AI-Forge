import { MidiNote, GlitchMode } from '../types/midi';
import { getNotesDuration } from '../utils/safeMath';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  noteCount: number;
  activeVoices: number;
}

export type NoteTriggerCallback = (midi: number, velocity: number) => void;
export type GlitchBurstType = 'stutter_buzz' | 'lag_freeze' | 'bitcrush_snap';
export type GlitchTriggerCallback = (type: GlitchBurstType, intensity: number) => void;

class BlackMidiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private glitchBusGain: GainNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private notes: MidiNote[] = [];
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private timerId: number | null = null;
  private lastScheduledIndex = 0;
  private duration = 0;
  private volume = 0.85;
  private isMuted = false;
  private notesHearable = false; // Muted by default per user specification
  private noteCallbacks: Set<NoteTriggerCallback> = new Set();
  private glitchCallbacks: Set<GlitchTriggerCallback> = new Set();
  private activeVoicesCount = 0;

  // Black MIDI Glitch FX Engine state
  private glitchMode: GlitchMode = 'black_midi_lag';
  private glitchIntensity = 55; // 0-100
  private lastGlitchTime = -10;
  private noiseBuffer: AudioBuffer | null = null;

  // Polyphony voice pool
  private maxPolyphony = 72;
  private voiceSlots: { stopTime: number; osc: OscillatorNode; gain: GainNode }[] = [];

  constructor() {
    // Lazy initialized on first user interaction
  }

  private createSoftSaturationCurve(amount = 20): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const k = amount;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      // Digital stepped glitch noise (sample & hold every 6 samples)
      if (i % 6 === 0) {
        data[i] = Math.random() * 2 - 1;
      } else {
        data[i] = data[i - 1];
      }
    }
    return buf;
  }

  private initAudio() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master bus -> Glitch Gate Bus -> Warm Saturation -> Dynamic Limiter -> Destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

    this.glitchBusGain = this.ctx.createGain();
    this.glitchBusGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.waveShaper = this.ctx.createWaveShaper();
    this.waveShaper.curve = this.createSoftSaturationCurve(14);
    this.waveShaper.oversample = '2x';

    // Dynamic Limiter / Compressor for extreme Black MIDI densities
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(16, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);

    this.masterGain.connect(this.glitchBusGain);
    this.glitchBusGain.connect(this.waveShaper);
    this.waveShaper.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.noiseBuffer = this.createNoiseBuffer(this.ctx);
  }

  public subscribeNoteTrigger(cb: NoteTriggerCallback) {
    this.noteCallbacks.add(cb);
    return () => this.noteCallbacks.delete(cb);
  }

  public subscribeGlitchTrigger(cb: GlitchTriggerCallback) {
    this.glitchCallbacks.add(cb);
    return () => this.glitchCallbacks.delete(cb);
  }

  public setGlitchSettings(mode: GlitchMode, intensity: number) {
    this.glitchMode = mode || 'black_midi_lag';
    this.glitchIntensity = Math.max(0, Math.min(100, intensity ?? 55));
  }

  public loadSequence(notes: MidiNote[]) {
    this.notes = [...notes].sort((a, b) => a.time - b.time);
    this.duration = getNotesDuration(this.notes);
    this.lastScheduledIndex = 0;
    this.lastGlitchTime = -10;
    if (this.isPlaying) {
      this.seek(this.getCurrentTime());
    }
  }

  public async play() {
    this.initAudio();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - this.pauseOffset;
    this.lastGlitchTime = this.pauseOffset - 1.5;

    // Fast-forward lastScheduledIndex to current playhead
    const current = this.pauseOffset;
    this.lastScheduledIndex = 0;
    while (
      this.lastScheduledIndex < this.notes.length &&
      this.notes[this.lastScheduledIndex].time < current
    ) {
      this.lastScheduledIndex++;
    }

    this.startSchedulerLoop();
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.ctx) {
      this.pauseOffset = this.ctx.currentTime - this.startTime;
    }
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
    this.stopAllVoices();
  }

  public stop() {
    this.pause();
    this.pauseOffset = 0;
    this.lastScheduledIndex = 0;
    this.lastGlitchTime = -10;
  }

  public seek(seconds: number) {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.pauseOffset = Math.max(0, Math.min(seconds, this.duration));
    this.lastGlitchTime = this.pauseOffset - 1.0;
    if (wasPlaying) {
      this.play();
    }
  }

  public getCurrentTime(): number {
    if (!this.isPlaying || !this.ctx) {
      return this.pauseOffset;
    }
    const current = this.ctx.currentTime - this.startTime;
    if (current >= this.duration && this.duration > 0) {
      this.seek(0);
      return 0;
    }
    return current;
  }

  public getDuration(): number {
    return this.duration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getActiveVoices(): number {
    return this.activeVoicesCount;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Toggles audio for generated black MIDI notes.
   * Original piece notes always remain hearable!
   * Black notes are muted by default.
   */
  public setHearable(hearable: boolean) {
    this.notesHearable = hearable;
    if (!hearable) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      this.voiceSlots = this.voiceSlots.filter((v) => v.stopTime > now);
    }
  }

  public getIsHearable(): boolean {
    return this.notesHearable;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  private startSchedulerLoop() {
    const scheduleAheadTime = 0.12; // 120ms lookahead

    const loop = () => {
      if (!this.isPlaying || !this.ctx) return;

      const currentTime = this.ctx.currentTime - this.startTime;
      const scheduleUntil = currentTime + scheduleAheadTime;

      // Clean finished voice slots
      const now = this.ctx.currentTime;
      this.voiceSlots = this.voiceSlots.filter((v) => v.stopTime > now);
      this.activeVoicesCount = this.voiceSlots.length;

      const batchNotes: MidiNote[] = [];
      while (
        this.lastScheduledIndex < this.notes.length &&
        this.notes[this.lastScheduledIndex].time <= scheduleUntil
      ) {
        batchNotes.push(this.notes[this.lastScheduledIndex]);
        this.lastScheduledIndex++;
      }

      if (batchNotes.length > 0) {
        // Detect dense overload moment or glitch cluster for authentic Black MIDI glitch audio!
        this.maybeTriggerBlackMidiGlitch(batchNotes, currentTime);

        // If massive density in 120ms, prioritize originals + sub-bass + evenly sampled black notes so Web Audio stays ultra-tight
        const maxPerBatch = 110;
        if (batchNotes.length <= maxPerBatch) {
          for (const note of batchNotes) {
            this.scheduleNote(note, currentTime);
          }
        } else {
          // Always schedule all original notes + sample the black notes
          const originals = batchNotes.filter((n) => n.isOriginal);
          const blacks = batchNotes.filter((n) => !n.isOriginal);
          for (const note of originals) {
            this.scheduleNote(note, currentTime);
          }
          const remainingBudget = Math.max(20, maxPerBatch - originals.length);
          const stride = Math.max(1, Math.floor(blacks.length / remainingBudget));
          for (let i = 0; i < blacks.length; i += stride) {
            this.scheduleNote(blacks[i], currentTime);
          }
        }
      }

      if (currentTime >= this.duration && this.duration > 0) {
        this.seek(0);
      } else {
        this.timerId = requestAnimationFrame(loop);
      }
    };

    this.timerId = requestAnimationFrame(loop);
  }

  /**
   * Fires authentic Black MIDI audio glitch effects ("sometimes do glitch sounds like this"):
   * - Rapid micro-stutter buffer buzz (brrrrrt)
   * - Overload CPU-lag silence freeze + slam
   * - Stepped digital bitcrush shimmer snap
   */
  private maybeTriggerBlackMidiGlitch(batchNotes: MidiNote[], songTime: number) {
    if (!this.ctx || !this.masterGain || !this.glitchBusGain || this.isMuted) return;
    if (this.glitchMode === 'off' || this.glitchIntensity <= 0) return;

    // Cooldown scales inversely with glitchIntensity & mode
    const baseCooldown =
      this.glitchMode === 'rush_chaos'
        ? 1.4
        : this.glitchMode === 'black_midi_lag'
        ? 2.4
        : 4.0;
    const minCooldown = Math.max(0.75, baseCooldown * (1.25 - (this.glitchIntensity / 100) * 0.7));

    if (songTime - this.lastGlitchTime < minCooldown) return;

    // Check if there is an actual glitch cluster or dense climax note spike
    const hasGlitchNote = batchNotes.some((n) => n.id.startsWith('glitch-'));
    const isDenseMoment = batchNotes.length >= 18;
    const randomChance =
      this.glitchMode === 'rush_chaos'
        ? 0.45
        : this.glitchMode === 'black_midi_lag'
        ? 0.28
        : 0.16;

    if (!hasGlitchNote && (!isDenseMoment || Math.random() > randomChance * (this.glitchIntensity / 65))) {
      return;
    }

    this.lastGlitchTime = songTime;
    const anchorNote = batchNotes.find((n) => n.isOriginal) || batchNotes[Math.floor(batchNotes.length / 2)];
    const pitch = anchorNote ? anchorNote.midi : 60;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const audioNow = this.ctx.currentTime + 0.015;
    const normIntensity = this.glitchIntensity / 100;

    // Pick one of 3 authentic Black MIDI glitch archetypes
    const roll = Math.random();
    let burstType: GlitchBurstType = 'stutter_buzz';
    if (roll < 0.48) burstType = 'stutter_buzz';
    else if (roll < 0.78) burstType = 'lag_freeze';
    else burstType = 'bitcrush_snap';

    this.notifyGlitchTrigger(burstType, normIntensity);

    if (burstType === 'stutter_buzz') {
      // 1. Rapid 14ms Black MIDI buffer-stutter retrigger buzz ("brrrrrrt-t-t")
      const repeats = this.glitchMode === 'rush_chaos' ? 8 : 6;
      const stepSec = 0.014;
      for (let r = 0; r < repeats; r++) {
        const t = audioNow + r * stepSec;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = r % 2 === 0 ? 'sawtooth' : 'square';
        // Slight rising/glitch pitch step
        const mult = r % 3 === 0 ? 1 : r % 3 === 1 ? 2 : 0.5;
        osc.frequency.setValueAtTime(Math.min(4200, freq * mult), t);

        const amp = Math.min(0.18, 0.07 + normIntensity * 0.09);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + stepSec * 0.85);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + stepSec);
      }
    } else if (burstType === 'lag_freeze') {
      // 2. Classic MIDI Player Overload Pause / Freeze Cutout (45ms choke -> heavy sub + chord slam)
      const chokeDur = 0.055;
      this.glitchBusGain.gain.cancelScheduledValues(audioNow);
      this.glitchBusGain.gain.setValueAtTime(1.0, audioNow);
      this.glitchBusGain.gain.linearRampToValueAtTime(0.04, audioNow + 0.008);
      this.glitchBusGain.gain.setValueAtTime(0.04, audioNow + chokeDur);
      this.glitchBusGain.gain.linearRampToValueAtTime(1.0, audioNow + chokeDur + 0.012);

      // Sub-bass + digital click snap when resuming
      const resumeT = audioNow + chokeDur;
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(Math.max(32, freq * 0.25), resumeT);
      subGain.gain.setValueAtTime(0.001, resumeT);
      subGain.gain.linearRampToValueAtTime(0.24 * (0.6 + 0.4 * normIntensity), resumeT + 0.005);
      subGain.gain.exponentialRampToValueAtTime(0.0001, resumeT + 0.16);
      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(resumeT);
      subOsc.stop(resumeT + 0.17);
    } else {
      // 3. Digital Bitcrush / Sample-Hold Glitch Snap
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(Math.max(300, Math.min(3500, freq * 2)), audioNow);
        bp.Q.setValueAtTime(4.5, audioNow);

        const g = this.ctx.createGain();
        const dur = 0.075;
        g.gain.setValueAtTime(0.001, audioNow);
        g.gain.linearRampToValueAtTime(0.11 * (0.5 + 0.5 * normIntensity), audioNow + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, audioNow + dur);

        src.connect(bp);
        bp.connect(g);
        g.connect(this.masterGain);
        src.start(audioNow);
        src.stop(audioNow + dur + 0.01);
      }
    }
  }

  private scheduleNote(note: MidiNote, currentTime: number) {
    if (!this.ctx || !this.masterGain) return;

    const triggerDelay = Math.max(0, (note.time - currentTime) * 1000);
    if (triggerDelay < 50) {
      this.notifyNoteTrigger(note.midi, note.velocity);
    } else {
      setTimeout(() => {
        if (this.isPlaying) {
          this.notifyNoteTrigger(note.midi, note.velocity);
        }
      }, triggerDelay);
    }

    if (this.isMuted) return;

    const isGeneratedBlackNote = !note.isOriginal;
    if (isGeneratedBlackNote && !this.notesHearable) {
      return; // Muted by default: black notes stay silent while originals & glitch impacts play cleanly
    }

    const noteAudioTime = this.startTime + note.time;
    if (noteAudioTime < this.ctx.currentTime - 0.05) return;

    const isSubBass = note.midi <= 38;
    const noteDuration = isSubBass
      ? Math.max(0.28, Math.min(2.0, note.duration * 1.25))
      : Math.min(1.3, Math.max(0.035, note.duration));
    const freq = 440 * Math.pow(2, (note.midi - 69) / 12);

    // Voice pooling & stealing
    if (this.voiceSlots.length >= this.maxPolyphony) {
      const stolen = this.voiceSlots.shift();
      if (stolen) {
        try {
          stolen.gain.gain.cancelScheduledValues(this.ctx.currentTime);
          stolen.gain.gain.setValueAtTime(0, this.ctx.currentTime);
          stolen.osc.stop(this.ctx.currentTime + 0.005);
        } catch {
          // ignore
        }
      }
    }

    // Punchy Black MIDI Grand Synth Voice
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isSubBass ? 'triangle' : note.isOriginal ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, noteAudioTime);

    // Micro-detune chorus effect for massive piano wall feel
    const detune = ((note.midi % 5) - 2) * 3.5;
    osc.detune.setValueAtTime(detune, noteAudioTime);

    const baseVel = note.isOriginal ? 0.21 : 0.075;
    const bassBoost = isSubBass ? 1.4 : 1.0;
    const peakGain = Math.max(0.02, Math.min(0.3, note.velocity * baseVel * bassBoost));

    // Snappy percussive piano attack
    gain.gain.setValueAtTime(0.0001, noteAudioTime);
    gain.gain.linearRampToValueAtTime(peakGain, noteAudioTime + (isSubBass ? 0.006 : 0.003));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteAudioTime + noteDuration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(noteAudioTime);
    osc.stop(noteAudioTime + noteDuration + 0.01);

    this.voiceSlots.push({
      stopTime: noteAudioTime + noteDuration,
      osc,
      gain,
    });
  }

  private notifyNoteTrigger(midi: number, velocity: number) {
    this.noteCallbacks.forEach((cb) => {
      try {
        cb(midi, velocity);
      } catch {
        // ignore
      }
    });
  }

  private notifyGlitchTrigger(type: GlitchBurstType, intensity: number) {
    this.glitchCallbacks.forEach((cb) => {
      try {
        cb(type, intensity);
      } catch {
        // ignore
      }
    });
  }

  private stopAllVoices() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const v of this.voiceSlots) {
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(0, now);
        v.osc.stop(now + 0.005);
      } catch {
        // ignore
      }
    }
    this.voiceSlots = [];
    this.activeVoicesCount = 0;
  }
}

export const audioEngine = new BlackMidiAudioEngine();
