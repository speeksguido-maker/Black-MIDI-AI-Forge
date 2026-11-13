/**
 * High-performance Standard MIDI File (SMF Type 1) generator for Black MIDI.
 * Restores classic Black MIDI expansion algorithms:
 * - Timeline song doubling / looping across the timeline up to strict 1-hour limit (3600s).
 * - Multi-octave cascades (-36 to +36 semitones) and harmonic intervals (5ths, 4ths, 12ths).
 * - Tremolo machine-gun ratchets sliced across time (1/16, 1/32, 1/64, 1/128).
 * - Anti-lag polyphonic voice allocation: distinct keys across the piano roll (NO 1000 identical notes on 1 key).
 * - Original melody preserved on Channel 0 at velocity 127; black multiplier notes muted by default (velocity 1).
 * - 100% compliant with Zenith MIDI Engine (AssertText("MTrk") passes cleanly with exact chunk lengths).
 * - Step-by-step progress updating smoothly to keep UI fluid.
 * - Guarantees target minimum notes (10M, 100M, 500M, 1 BILLION) are fully reached and encoded.
 */

import { MidiNote, BlackMidiConfig } from '../types/midi';
import { getNotesDuration } from './safeMath';
import { analyzeSongEnergyProfile, DynamicSectionState } from './songEnergyAnalyzer';

export const MAX_ALLOWED_DURATION_SECONDS = 3600; // Strict maximum duration: 1 hour (3600s)

export interface ExportProgressInfo {
  step: number;
  totalSteps: number;
  stageName: string;
  percent: number;
  currentNotes: number;
  targetNotes: number;
  currentChannel: number;
  log: string;
}

export const CHANNEL_LABELS: Record<number, string> = {
  0: 'Ch 1 - Lead Melody (Blue/White)',
  1: 'Ch 2 - Octave Avalanche & Ascending Stairs (Red)',
  2: 'Ch 3 - Harmonic Resonator & Descending Stairs (Green)',
  3: 'Ch 4 - Left Angel Wing & Tremolo (Yellow)',
  4: 'Ch 5 - Right Angel Wing & Cascade (Cyan)',
  5: 'Ch 6 - Valkyrie Diamond Burst (Magenta)',
  6: 'Ch 7 - Sub-Bass Ground & Foundation (Orange)',
  7: 'Ch 8 - Matrix Shimmer & Mid Feathers (Lime)',
  8: 'Ch 9 - Counterpoint Blitz (Violet)',
  9: 'Ch 10 - Ascending Criss-Cross Stairs (Pink)',
  10: 'Ch 11 - Descending Criss-Cross Stairs (Turquoise)',
  11: 'Ch 12 - Staircase Echo Decay (Amber)',
  12: 'Ch 13 - Harmonic Fifths & Waterfall (Lavender)',
  13: 'Ch 14 - Stepped Terraced Stairs (Coral)',
  14: 'Ch 15 - Golden Angel Spine & Sacred Art (Gold)',
  15: 'Ch 16 - Celestial Halo & Oblivion Climax (Ice)',
};

export const PART_NAMES = [
  'Movement I: Thick Staircase Gateway (Bold Ascending & Stepped Stairs)',
  'Movement II: Thick Angel Wings Opus (Layered Feathered Angel Wings)',
  'Movement III: Criss-Cross X-Stairs (Thick Double Helix & Interlocking Beams)',
  'Movement IV: AI Theme Variation (AI-Composed Melodic Solo Based on the Song)',
  'Movement V: Sacred Diamond Crystals & Thick Geometric Polyhedra',
  'Movement VI: Torrential Waterfall Cascades & Wave Undulations',
  'Movement VII: Grand Climax (Grand Thick Angels + Dual Climbing Staircases)',
];

// Variable-Length Quantity (VLQ) encoding for MIDI delta times
export function encodeVLQ(value: number): number[] {
  let val = Math.max(0, Math.floor(value));
  const bytes: number[] = [];
  bytes.push(val & 0x7f);
  while ((val >>= 7) > 0) {
    bytes.unshift((val & 0x7f) | 0x80);
  }
  return bytes;
}

function uint32ToBytes(val: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = (val >>> 24) & 0xff;
  bytes[1] = (val >>> 16) & 0xff;
  bytes[2] = (val >>> 8) & 0xff;
  bytes[3] = val & 0xff;
  return bytes;
}

function uint16ToBytes(val: number): Uint8Array {
  const bytes = new Uint8Array(2);
  bytes[0] = (val >>> 8) & 0xff;
  bytes[1] = val & 0xff;
  return bytes;
}

/**
 * Calculates note velocity based on the user's specification:
 * - Original melody notes: Velocity 127 so song is loud and distinct.
 * - Black multiplier notes: Muted by default (Velocity 1) unless notesHearable is toggled on.
 */
export function getNoteVelocity(
  notesHearable: boolean,
  origVel = 0.8,
  isOriginalMelody = false,
  ghostMelodyCloak = false
): number {
  if (isOriginalMelody) {
    return 127;
  }
  if (ghostMelodyCloak || !notesHearable) {
    return 1; // Muted by default: visible in piano roll, completely silent to prevent audio clipping
  }
  return Math.max(30, Math.min(105, Math.round((origVel || 0.75) * 80)));
}

export interface DynamicDensityInfo {
  multiplier: number;
  sectionName: string;
  isClimax: boolean;
  activePatterns: string[];
}

/**
 * Dynamic Section Density & Multi-Pattern Modulation Engine:
 * Creates dramatic dynamic contrast across the song timeline:
 * - Phase 1 (Exposition): Spacious & clear (0.4x)
 * - Phase 2 (Build-up): Climbing stairs & accelerando (0.7x -> 1.4x)
 * - Phase 3 (GRAND DROP 1 / Wall of Notes): Hyper-dense (2.4x) with MULTIPLE SIMULTANEOUS PATTERNS (Wings + Stairs + Waterfalls)
 * - Phase 4 (Breakdown & AI Cadenza): Sudden contrast & melodic virtuosic solo (0.5x)
 * - Phase 5 (APOCALYPTIC DROP / Mega Climax): Maximum peak density (2.8x) with ALL geometric patterns layered at once
 * - Phase 6 (Grand Outro): Harmonically resolving descent (0.7x) resolving with final MIDI melody note
 */
export function getDynamicSectionDensity(
  relProgress: number,
  dynState?: DynamicSectionState
): DynamicDensityInfo {
  // If dynamic state from imported MIDI analysis is provided, honor the song's actual musical energy!
  // If the song is relaxed (e.g. at the start or throughout), black notes will be calm and spaced.
  // If the song becomes crazy (e.g. intense drops or climaxes), black notes match the insanity!
  if (dynState) {
    if (dynState.isCrazy) {
      const m = Math.max(2.2, dynState.densityMultiplier);
      return {
        multiplier: m,
        sectionName: `SONG CLIMAX: Multi-Pattern Wall of Notes & Resonant Thunder (${m.toFixed(1)}x)`,
        isClimax: true,
        activePatterns: ['grand_angels', 'dual_x_stairs', 'torrential_waterfalls', 'tremolo_clusters', 'sub_bass_thunder', 'sacred_diamonds'],
      };
    } else if (dynState.isRelaxed) {
      const m = Math.min(0.42, dynState.densityMultiplier);
      return {
        multiplier: m,
        sectionName: `SONG RELAXED: Gentle Shimmer & Harmonic Spacing (${m.toFixed(1)}x)`,
        isClimax: false,
        activePatterns: ['sparkles', 'octave_echoes'],
      };
    } else {
      const m = dynState.densityMultiplier;
      return {
        multiplier: m,
        sectionName: `SONG DYNAMIC: Ascending Stairs & Wing Sweeps (${m.toFixed(1)}x)`,
        isClimax: false,
        activePatterns: ['staircase', 'angel_wings'],
      };
    }
  }

  // Fallback to timeline progress if dynState is not provided
  const p = Math.max(0, Math.min(0.9999, relProgress % 1.0));

  if (p < 0.15) {
    return {
      multiplier: 0.4,
      sectionName: 'Melodic Exposition & Shimmer (0.4x)',
      isClimax: false,
      activePatterns: ['sparkles', 'octave_echoes'],
    };
  } else if (p < 0.35) {
    const ramp = (p - 0.15) / 0.20;
    const m = 0.7 + ramp * 0.7;
    return {
      multiplier: m,
      sectionName: `Ascending Tension & Climbing Stairs (${m.toFixed(1)}x)`,
      isClimax: false,
      activePatterns: ['staircase', 'accelerando'],
    };
  } else if (p < 0.55) {
    return {
      multiplier: 2.4,
      sectionName: 'GRAND DROP: Multi-Pattern Wall of Notes (2.4x)',
      isClimax: true,
      activePatterns: ['angel_wings', 'staircases', 'waterfall_cascades', 'diamond_bursts'],
    };
  } else if (p < 0.70) {
    return {
      multiplier: 0.5,
      sectionName: 'Breakdown & AI Song Cadenza (0.5x)',
      isClimax: false,
      activePatterns: ['ai_cadenza', 'sacred_diamonds'],
    };
  } else if (p < 0.90) {
    return {
      multiplier: 2.8,
      sectionName: 'APOCALYPTIC DROP: Maximum Climax Torrent (2.8x)',
      isClimax: true,
      activePatterns: ['grand_angels', 'dual_x_stairs', 'torrential_waterfalls', 'tremolo_clusters', 'sub_bass_thunder'],
    };
  } else {
    const fade = (p - 0.90) / 0.10;
    const m = Math.max(0.4, 0.75 - fade * 0.25);
    return {
      multiplier: m,
      sectionName: `Grand Melodic Outro & Final Resolution (${m.toFixed(1)}x)`,
      isClimax: false,
      activePatterns: ['resolving_chords', 'angel_halo'],
    };
  }
}

export interface AiSongNote {
  tickOffset: number;
  pitch: number;
  durTicks: number;
  vel: number;
}

/**
 * Intelligent AI melodic cadenza / variation engine grounded in the imported song.
 * Analyzes the song's pitch classes, key center, and initial thematic motif,
 * and composes an authentic 3-phrase neoclassical variation for the AI movement.
 */
export function generateAiSongVariation(
  sortedOriginals: MidiNote[],
  bpmMult: number,
  ticksPerSecond: number,
  PPQ: number
): AiSongNote[] {
  if (!sortedOriginals || sortedOriginals.length === 0) return [];

  // Extract root and motif from the song
  const rootMidi = Math.round(sortedOriginals[0]?.midi || 60);
  const motifLen = Math.min(16, sortedOriginals.length);
  const motif: number[] = [];
  for (let i = 0; i < motifLen; i++) {
    motif.push(Math.round(sortedOriginals[i].midi));
  }

  const aiNotes: AiSongNote[] = [];
  let relTick = 0;
  const sixteenthTicks = Math.max(12, Math.round(PPQ / 4)); // 16th note

  // Phrase 1: Neoclassical Thematic Arpeggiation (Rising variations on the motif)
  for (let i = 0; i < 32; i++) {
    const motifP = motif[i % motif.length];
    const intervals = [0, 4, 7, 12, 16, 12, 7, 4];
    const p = Math.max(36, Math.min(104, motifP + intervals[i % intervals.length]));
    aiNotes.push({
      tickOffset: relTick,
      pitch: p,
      durTicks: Math.max(8, Math.round(sixteenthTicks * 0.9)),
      vel: 127,
    });
    relTick += sixteenthTicks;
  }

  // Phrase 2: Inverted Counter-Subject & Polymetric Staccato
  for (let i = 0; i < 32; i++) {
    const motifP = motif[i % motif.length];
    const diff = motifP - rootMidi;
    const invertedP = Math.max(36, Math.min(104, rootMidi - diff + ((i % 4) * 3)));
    aiNotes.push({
      tickOffset: relTick,
      pitch: invertedP,
      durTicks: Math.max(8, Math.round(sixteenthTicks * 0.8)),
      vel: 127,
    });
    relTick += sixteenthTicks;
  }

  // Phrase 3: Virtuosic 32nd-Note Cadenza Rush & Soaring Climax
  const thirtySecondTicks = Math.max(6, Math.round(PPQ / 8));
  for (let i = 0; i < 64; i++) {
    const motifP = motif[i % motif.length];
    const octaveLift = (i % 2 === 0 ? 12 : 24);
    const p = Math.max(48, Math.min(116, motifP + octaveLift));
    aiNotes.push({
      tickOffset: relTick,
      pitch: p,
      durTicks: Math.max(6, Math.round(thirtySecondTicks * 0.85)),
      vel: 127,
    });
    relTick += thirtySecondTicks;
  }

  return aiNotes;
}

/**
 * High-performance streaming byte writer using preallocated 64KB Uint8Array pages.
 */
export class ChunkedTrackWriter {
  private chunks: Uint8Array[] = [];
  private currentBuffer = new Uint8Array(65536);
  private currentOffset = 0;
  private totalByteCount = 0;

  public pushByte(b: number) {
    if (this.currentOffset >= this.currentBuffer.length) {
      this.chunks.push(this.currentBuffer.subarray(0, this.currentOffset));
      this.currentBuffer = new Uint8Array(65536);
      this.currentOffset = 0;
    }
    this.currentBuffer[this.currentOffset++] = b & 0xff;
    this.totalByteCount++;
  }

  public pushBytes(bytes: number[] | Uint8Array) {
    for (let i = 0; i < bytes.length; i++) {
      this.pushByte(bytes[i]);
    }
  }

  public pushVLQ(val: number) {
    let v = Math.max(0, Math.floor(val));
    const stack: number[] = [];
    stack.push(v & 0x7f);
    while ((v >>= 7) > 0) {
      stack.push((v & 0x7f) | 0x80);
    }
    while (stack.length > 0) {
      this.pushByte(stack.pop()!);
    }
  }

  /**
   * Finalizes track chunk with standard SMF 'MTrk' 4-byte header
   * and 32-bit big-endian length EXACTLY equal to the track data byte count.
   * Zenith MIDI strictly asserts this header and length.
   */
  public finishTrackChunk(): Uint8Array[] {
    if (this.currentOffset > 0) {
      this.chunks.push(this.currentBuffer.subarray(0, this.currentOffset));
      this.currentOffset = 0;
    }

    const header = new Uint8Array(8);
    header.set([0x4d, 0x54, 0x72, 0x6b], 0); // 'MTrk'
    header.set(uint32ToBytes(this.totalByteCount), 4);

    return [header, ...this.chunks];
  }

  public getByteLength(): number {
    return this.totalByteCount;
  }
}

interface RawMidiEvent {
  tick: number;
  type: 1 | 0; // 1 = Note On, 0 = Note Off
  pitch: number;
  vel: number;
}

/**
 * Builds and downloads a standard Type 1 MIDI file step-by-step.
 * Strict maximum duration of 1 hour (3600s).
 * Implements the fun classic Black MIDI "old AI" algorithms:
 * - Multi-octave cascading (-36 to +36)
 * - Doubling the song across the timeline up to 1 hour (3600s)
 * - Tremolo ratchets sliced along time
 * - Polyphonic anti-lag voice distribution (distinct keys across the keyboard)
 * - Zenith compatibility (AssertText("MTrk") clean validation)
 * - Guaranteed target note count fulfillment (e.g. 100M reaches at least 100M notes)
 */
export async function exportStepByStepMidi(
  originalNotes: MidiNote[],
  config: BlackMidiConfig,
  bpm: number,
  filename: string,
  onProgress: (info: ExportProgressInfo) => void,
  signal?: { aborted: boolean },
  writableStream?: any
): Promise<void> {
  const PPQ = 480;
  const safeBpm = Math.max(20, Math.min(600, bpm || 140));
  const ticksPerSecond = (safeBpm / 60) * PPQ;
  const targetNotes = Math.max(1, Math.min(1000000000, config.targetMinimumNotes || 50000));
  const bpmMult = Math.max(0.2, Math.min(5.0, config.bpmMultiplier || 1.0));
  const minKeyMidi = Math.max(0, Math.min(127, config.lowestMidiNote ?? 21));
  const keySpan = Math.max(12, Math.min(128 - minKeyMidi, config.keyCount ?? 88));
  const maxKeyMidi = minKeyMidi + keySpan - 1;

  // MAXIMUM DURATION ENFORCEMENT: Max 1 hour (3600 seconds)
  const maxAllowedTicks = Math.round(MAX_ALLOWED_DURATION_SECONDS * ticksPerSecond);

  // Sub-stepping for UI responsiveness
  const isUltraExport = targetNotes > 100000000;
  const subStepsPerChannel = isUltraExport ? 20 : targetNotes > 10000000 ? 12 : 6;
  const totalSteps = 1 + 16 * subStepsPerChannel + 2;
  let currentStep = 1;

  onProgress({
    step: currentStep,
    totalSteps,
    stageName: 'Analyzing Melodic Structure',
    percent: 2,
    currentNotes: 0,
    targetNotes,
    currentChannel: 0,
    log: `Importing ${originalNotes.length.toLocaleString()} original notes (Max Duration: 1:00:00 / 3600s, ${safeBpm} BPM)...`,
  });

  await new Promise((r) => setTimeout(r, 10));
  if (signal?.aborted) throw new Error('Export cancelled');

  // Filter and sort original notes by time (strictly clamped under 1 hour)
  const sortedOriginals = [...originalNotes]
    .filter((n) => n.time < MAX_ALLOWED_DURATION_SECONDS)
    .sort((a, b) => a.time - b.time);

  // Fallback if no valid notes
  if (sortedOriginals.length === 0) {
    sortedOriginals.push({
      id: 'fallback_root_note',
      midi: 60,
      time: 0,
      duration: 1,
      velocity: 0.8,
      channel: 0,
    });
  }

  // Calculate base song duration for timeline doubling
  const rawBaseDuration = getNotesDuration(sortedOriginals) || 10;
  const baseDuration = Math.max(2, Math.min(MAX_ALLOWED_DURATION_SECONDS, rawBaseDuration / bpmMult));
  const baseDurationTicks = Math.max(PPQ, Math.round(baseDuration * ticksPerSecond));

  // Determine how many times we double / repeat the song across the timeline
  // "doubling the song, it was fun"
  const maxPossibleRepeats = Math.max(1, Math.floor(MAX_ALLOWED_DURATION_SECONDS / baseDuration));

  let desiredRepeats = 1;
  if (targetNotes <= 50000) {
    desiredRepeats = Math.min(maxPossibleRepeats, baseDuration < 30 ? 4 : 2);
  } else if (targetNotes <= 1000000) {
    desiredRepeats = Math.min(maxPossibleRepeats, baseDuration < 30 ? 6 : baseDuration < 60 ? 4 : 2);
  } else if (targetNotes <= 20000000) {
    desiredRepeats = Math.min(maxPossibleRepeats, Math.max(2, Math.ceil(300 / baseDuration))); // ~5 mins
  } else if (targetNotes <= 100000000) {
    desiredRepeats = Math.min(maxPossibleRepeats, Math.max(4, Math.ceil(900 / baseDuration))); // ~15 mins
  } else {
    // 100M to 1B notes: 30 to 60 mins
    desiredRepeats = Math.min(maxPossibleRepeats, Math.max(8, Math.ceil(1800 / baseDuration))); // ~30-60 mins
  }

  // Capacity-aware guarantee: ensure timeline has enough ticks so 15 channels * keySpan can encode >= targetNotes cleanly
  const perChannelTargetEst = Math.ceil(targetNotes / 15);
  const effectiveKeysPerStep = Math.max(12, Math.min(keySpan, 96) * 0.5);
  const neededStepsEst = Math.ceil(perChannelTargetEst / effectiveKeysPerStep);
  const neededTicksEst = neededStepsEst * (targetNotes > 2000000 ? 2 : 6) + 128;
  const capacityRepeats = Math.ceil(neededTicksEst / baseDurationTicks);

  const songRepeats = Math.min(maxPossibleRepeats, Math.max(1, desiredRepeats, capacityRepeats));
  // CRITICAL SYNCHRONIZATION: Both Channel 0 (Melody) and Channels 1-15 (Black notes)
  // span this exact timeline so the original MIDI NEVER drops out before the end!
  const totalTimelineTicks = Math.max(
    Math.min(maxAllowedTicks, songRepeats * baseDurationTicks),
    Math.min(maxAllowedTicks, neededTicksEst)
  );

  // Track 0: Conductor Track (Tempo, Time Signature, Track Name)
  currentStep++;
  onProgress({
    step: currentStep,
    totalSteps,
    stageName: 'Formatting Conductor Track',
    percent: 4,
    currentNotes: 0,
    targetNotes,
    currentChannel: 0,
    log: `Conductor Track: ${safeBpm} BPM, ${songRepeats} song section double(s), Synchronous duration: ${Math.round(totalTimelineTicks / ticksPerSecond)}s (Max 1h)...`,
  });

  const conductorWriter = new ChunkedTrackWriter();
  const trackNameBytes = new TextEncoder().encode(
    `${filename.replace(/\.[^/.]+$/, '')} [Max 1 Hour Duration]`
  );
  conductorWriter.pushVLQ(0);
  conductorWriter.pushBytes([0xff, 0x03]);
  conductorWriter.pushVLQ(trackNameBytes.length);
  conductorWriter.pushBytes(trackNameBytes);

  // Set Tempo (microseconds per quarter note)
  const tempoMicros = Math.max(10000, Math.round(60000000 / safeBpm));
  conductorWriter.pushVLQ(0);
  conductorWriter.pushBytes([
    0xff,
    0x51,
    0x03,
    (tempoMicros >>> 16) & 0xff,
    (tempoMicros >>> 8) & 0xff,
    tempoMicros & 0xff,
  ]);

  // Time Signature: 4/4
  conductorWriter.pushVLQ(0);
  conductorWriter.pushBytes([0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]);

  // End of Track
  conductorWriter.pushVLQ(0);
  conductorWriter.pushBytes([0xff, 0x2f, 0x00]);
  const conductorParts = conductorWriter.finishTrackChunk();

  const allTrackParts: Uint8Array[][] = [conductorParts];
  let totalNotesEncoded = 0;
  const numOriginals = sortedOriginals.length;

  // Analyze musical energy profile of the imported MIDI
  // Detects relaxed vs crazy sections and locates harmonic chord roots
  const energyProfile = analyzeSongEnergyProfile(sortedOriginals, baseDuration);

  // Only compute & inject AI Variation if the user explicitly enabled AI Variation mode!
  const useAiVariation = config.melodyMode === 'ai_variation';
  const aiNotes = useAiVariation ? generateAiSongVariation(sortedOriginals, bpmMult, ticksPerSecond, PPQ) : [];
  const movementDurationTicks = PPQ * 32;

  // =========================================================================
  // CHANNEL 0: Lead Melody & Original Chords Doubled Across Timeline
  // Velocity is 127 so the original melody and chords are crystal clear and loud.
  // =========================================================================
  {
    if (signal?.aborted) throw new Error('Export cancelled');
    const chName = CHANNEL_LABELS[0];
    const trackWriter = new ChunkedTrackWriter();

    // 1. Track Name Meta Event
    const chNameBytes = new TextEncoder().encode(chName);
    trackWriter.pushVLQ(0);
    trackWriter.pushBytes([0xff, 0x03]);
    trackWriter.pushVLQ(chNameBytes.length);
    trackWriter.pushBytes(chNameBytes);

    // 2. Program Change for channel (Acoustic Grand Piano 0)
    trackWriter.pushVLQ(0);
    trackWriter.pushBytes([0xc0, 0x00]);

    // Gather raw note events for Channel 0 across all song section doubles
    const channel0Events: RawMidiEvent[] = [];
    let lastSubBassTick = -999999;

    for (let r = 0; r < songRepeats; r++) {
      const repeatOffsetTicks = r * baseDurationTicks;
      if (repeatOffsetTicks >= totalTimelineTicks) break;

      // 1. Original melody & chords of the song
      for (let i = 0; i < sortedOriginals.length; i++) {
        const orig = sortedOriginals[i];
        const noteTime = orig.time / bpmMult;
        const noteDur = Math.max(0.02, orig.duration / bpmMult);
        const sTick = Math.min(totalTimelineTicks - 12, repeatOffsetTicks + Math.round(noteTime * ticksPerSecond));
        const dTicks = Math.max(6, Math.min(totalTimelineTicks - sTick, Math.round(noteDur * ticksPerSecond)));
        const p = Math.max(12, Math.min(120, Math.round(orig.midi)));

        channel0Events.push({ tick: sTick, type: 1, pitch: p, vel: 127 });
        channel0Events.push({ tick: sTick + dTicks, type: 0, pitch: p, vel: 0 });

        // INJECT DARK, LOW-PITCHED SUB-BASS NOTES FOR REAL DYNAMICS:
        // Anchored strictly to the song's harmonic root (NOT random notes!).
        // Only added during crazy or driving sections (energy >= 0.48), spaced to avoid clutter.
        // Relaxed sections remain clean and serene without chaotic sub-bass.
        const dynState = energyProfile.getStateAtTime(orig.time);
        const subBassIntervalTicks = Math.round(PPQ / 2); // 8th note spacing limit to avoid clutter

        if (dynState.energy >= 0.48 && (sTick - lastSubBassTick >= subBassIntervalTicks)) {
          lastSubBassTick = sTick;
          const bassDurTicks = Math.max(Math.round(PPQ / 2), Math.min(PPQ * 2, dTicks));
          const octavesToAdd = dynState.isCrazy ? dynState.subBassOctaves : [dynState.subBassRootPitch];
          for (const bassPitch of octavesToAdd) {
            if (bassPitch >= 21 && bassPitch <= 38) {
              channel0Events.push({ tick: sTick, type: 1, pitch: bassPitch, vel: dynState.isCrazy ? 127 : 118 });
              channel0Events.push({ tick: sTick + bassDurTicks, type: 0, pitch: bassPitch, vel: 0 });
            }
          }
        }
      }

      // 2. Dedicated AI Melodic Variation Section (ONLY when AI Variation toggle is ON!)
      if (useAiVariation && aiNotes.length > 0) {
        const aiStartTick = repeatOffsetTicks + 3 * movementDurationTicks;
        if (aiStartTick < totalTimelineTicks) {
          for (let a = 0; a < aiNotes.length; a++) {
            const aiN = aiNotes[a];
            const sTick = Math.min(totalTimelineTicks - 12, aiStartTick + aiN.tickOffset);
            const dTicks = Math.max(6, Math.min(totalTimelineTicks - sTick, aiN.durTicks));
            channel0Events.push({ tick: sTick, type: 1, pitch: aiN.pitch, vel: 127 });
            channel0Events.push({ tick: sTick + dTicks, type: 0, pitch: aiN.pitch, vel: 0 });
          }
        }
      }
    }

    // Sort Channel 0 events chronologically (Note Off before Note On at simultaneous ticks)
    channel0Events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      return a.type - b.type;
    });

    let lastTrackTick = 0;
    for (let i = 0; i < channel0Events.length; i++) {
      const ev = channel0Events[i];
      const eventTick = Math.max(lastTrackTick, Math.min(totalTimelineTicks, ev.tick));
      const delta = eventTick - lastTrackTick;
      lastTrackTick = eventTick;

      trackWriter.pushVLQ(delta);
      if (ev.type === 1) {
        trackWriter.pushByte(0x90);
        trackWriter.pushByte(ev.pitch);
        trackWriter.pushByte(127);
        totalNotesEncoded++;
      } else {
        trackWriter.pushByte(0x80);
        trackWriter.pushByte(ev.pitch);
        trackWriter.pushByte(0x00);
      }
    }

    // End of Track meta event
    trackWriter.pushVLQ(0);
    trackWriter.pushBytes([0xff, 0x2f, 0x00]);
    allTrackParts.push(trackWriter.finishTrackChunk());

    currentStep += subStepsPerChannel;
    onProgress({
      step: currentStep,
      totalSteps,
      stageName: `Encoded ${chName}`,
      percent: Math.min(95, Math.max(4, Math.round((totalNotesEncoded / targetNotes) * 91) + 4)),
      currentNotes: totalNotesEncoded,
      targetNotes,
      currentChannel: 0,
      log: `[${chName}] Original melody & harmony doubled across ${songRepeats} sections (${totalNotesEncoded.toLocaleString()} notes, Velocity 127)...`,
    });
    await new Promise((r) => setTimeout(r, 0));
  }

  // =========================================================================
  // CHANNELS 1 to 15: Black MIDI Multi-Million / Billion Density Layers
  // - High-performance chronological direct byte streaming (zero intermediate JS object arrays)
  // - Anti-lag polyphonic voice allocation: distinct keys across the piano roll (NO 1000 identical notes on 1 key)
  // - Fully honors target minimum note count without stalling or terminating prematurely
  // - Black notes muted by default (Velocity 1) unless notesHearable is toggled
  // =========================================================================

  const remainingNotesNeeded = Math.max(0, targetNotes - totalNotesEncoded);
  let remainingToDistribute = remainingNotesNeeded;
  const channelNotesAllocations: number[] = [];

  for (let ch = 1; ch <= 15; ch++) {
    const chTarget = ch === 15
      ? remainingToDistribute
      : Math.ceil(remainingToDistribute / (16 - ch));
    channelNotesAllocations.push(chTarget);
    remainingToDistribute -= chTarget;
  }

  for (let ch = 1; ch <= 15; ch++) {
    if (signal?.aborted) throw new Error('Export cancelled');

    const chName = CHANNEL_LABELS[ch] || `Channel ${ch + 1}`;
    const chNotesTarget = channelNotesAllocations[ch - 1];
    const trackWriter = new ChunkedTrackWriter();

    // 1. Track Name Meta Event
    const chNameBytes = new TextEncoder().encode(chName);
    trackWriter.pushVLQ(0);
    trackWriter.pushBytes([0xff, 0x03]);
    trackWriter.pushVLQ(chNameBytes.length);
    trackWriter.pushBytes(chNameBytes);

    // 2. Program Change for channel (Acoustic Grand Piano 0)
    trackWriter.pushVLQ(0);
    trackWriter.pushBytes([0xc0 | ch, 0x00]);

    // If no notes needed for this channel, finish track chunk cleanly
    if (chNotesTarget <= 0) {
      trackWriter.pushVLQ(0);
      trackWriter.pushBytes([0xff, 0x2f, 0x00]);
      allTrackParts.push(trackWriter.finishTrackChunk());
      currentStep += subStepsPerChannel;
      continue;
    }

    // Calculate timeline step grid:
    // Guarantees all channels span the entire timeline up to totalTimelineTicks synchronously with Channel 0!
    const minSpacingTicks = chNotesTarget > 2000000 ? 1 : 4;
    const maxSteps = Math.max(16, Math.floor((totalTimelineTicks - 48) / minSpacingTicks));
    const desiredSteps = Math.max(16, Math.min(chNotesTarget, maxSteps));
    const tickSpacing = Math.max(minSpacingTicks, Math.floor((totalTimelineTicks - 48) / desiredSteps));
    const totalSteps = Math.max(1, Math.floor((totalTimelineTicks - 48) / tickSpacing));

    // Pre-calculate the integral of energy multipliers across all steps
    const { multipliers: stepMultipliers, totalSum: totalMultiplierSum } =
      energyProfile.getIntegratedMultiplierSum(totalSteps, tickSpacing, ticksPerSecond, baseDurationTicks);

    const safeMultiplierSum = totalMultiplierSum > 0.001 ? totalMultiplierSum : totalSteps;
    const subStepInterval = Math.max(1, Math.floor(totalSteps / subStepsPerChannel));
    const maxNotesPerTick = Math.max(12, Math.min(keySpan, 96));

    let notesCreated = 0;
    let lastTrackTick = 0;
    let noteAccumulator = 0;
    let lastReportedStep = 0;
    let currentSubStep = 0;

    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
      if (signal?.aborted) throw new Error('Export cancelled');

      const curTick = stepIndex * tickSpacing;

      // Dynamic Section Density Modulation Curve
      const relProgress = (curTick % totalTimelineTicks) / totalTimelineTicks;
      const localSongTime = (curTick % baseDurationTicks) / ticksPerSecond;
      const dynState = energyProfile.getStateAtTime(localSongTime);
      const densityInfo = getDynamicSectionDensity(relProgress, dynState);

      // Optional dramatic pre-drop blackout gap (0.2s pause right before major climax bursts)
      const isBlackoutWindow =
        config.videoDropSilenceCuts !== false &&
        ((relProgress > 0.425 && relProgress < 0.442) || (relProgress > 0.755 && relProgress < 0.768));

      // Exact proportional share of target notes for this step based on song energy
      const stepWeight = stepMultipliers[stepIndex] / safeMultiplierSum;
      noteAccumulator += stepWeight * chNotesTarget;

      if (isBlackoutWindow && stepIndex < totalSteps - 1) {
        // Carry noteAccumulator forward into the post-blackout drop instead of discarding notes!
        continue;
      }

      let notesInThisStep = Math.floor(noteAccumulator);
      noteAccumulator -= notesInThisStep;

      // Cap single-tick polyphony cleanly while adapting if remaining timeline steps need higher throughput
      const remainingSteps = Math.max(1, totalSteps - 1 - stepIndex);
      const adaptiveStepCap = Math.min(
        keySpan,
        Math.max(maxNotesPerTick, Math.ceil((notesInThisStep + noteAccumulator) / remainingSteps))
      );
      if (notesInThisStep > adaptiveStepCap) {
        const overflow = notesInThisStep - adaptiveStepCap;
        notesInThisStep = adaptiveStepCap;
        noteAccumulator += overflow;
      }

      if (notesInThisStep <= 0 && stepIndex < totalSteps - 1) {
        continue;
      }

      if (notesInThisStep <= 0) {
        continue;
      }

      const dOn = curTick - lastTrackTick;
      lastTrackTick = curTick;

      // Multi-movement visual art sequencing (7 distinct parts including AI song variation & thick artwork)
      const partDurationTicks = PPQ * 32; // 32 quarter notes per visual movement
      const part = Math.floor(curTick / partDurationTicks) % 7;
      const cycleTicks = PPQ * 8; // 8 quarter notes per visual wave / wing flap
      const cycleProgress = (curTick % cycleTicks) / cycleTicks; // 0.0 to 1.0
      const isRushVideoOpus = config.visualNoteArt === 'rush_video_opus';
      const midRangeMidi = Math.round((minKeyMidi + maxKeyMidi) / 2);
      const halfKeySpan = Math.floor(keySpan * 0.44);

      // Musical context: Sample original melody at this timeline position
      const localTick = curTick % baseDurationTicks;
      const origIdx = Math.floor((localTick / baseDurationTicks) * numOriginals) % numOriginals;
      const sampleOrig = sortedOriginals[origIdx];
      const origPitch = Math.max(21, Math.min(108, Math.round(sampleOrig.midi)));
      const baseVel = getNoteVelocity(
        config.notesHearable,
        sampleOrig.velocity,
        false,
        config.ghostMelodyCloak === true
      );

      const pitches: number[] = [];
      const usedPitches = new Set<number>();

      for (let p = 0; p < notesInThisStep; p++) {
        let pMidi = origPitch;
        // Ribbon thickness offset (-1, 0, +1 semitones) for bold visual artwork
        const thickness = (p % 3) - 1;

        if (isRushVideoOpus && (ch === 4 || ch === 8 || ch === 5 || ch === 14)) {
          // Reference Video Twin Double-Helix Sine Loops + Moire Grid + Gold Chevron Rails
          const phase = (curTick / PPQ) * 1.4;
          if (ch === 4) {
            pMidi = midRangeMidi + Math.round(Math.sin(phase) * halfKeySpan * 0.72) + thickness;
          } else if (ch === 8) {
            pMidi = midRangeMidi + Math.round(Math.cos(phase * 1.15) * halfKeySpan * 0.72) + thickness;
          } else if (ch === 5) {
            // Moire concentric eye interference
            pMidi = midRangeMidi + Math.round(Math.sin(phase * 2.1 + (p % 4)) * halfKeySpan * 0.88) + thickness;
          } else {
            // Golden chevron X-lattice & bass pillar
            const chev = (stepIndex * 2) % keySpan;
            pMidi = (p % 2 === 0 ? minKeyMidi + chev : maxKeyMidi - chev) + thickness;
          }
        } else if (densityInfo.isClimax) {
          // MULTI-PATTERN SIMULTANEOUS DENSE LAYERING DURING CLIMAX / WALL OF NOTES
          if (ch === 1) {
            // Ascending Double Staircase (Rush E alternating steps)
            const stairStep = (stepIndex * 2 + Math.floor(p / 3)) % 72;
            pMidi = 24 + stairStep + thickness + (Math.floor(p / 3) % 2) * 12;
          } else if (ch === 2) {
            // Descending Double Staircase
            const stairStep = (stepIndex * 2 + Math.floor(p / 3)) % 72;
            pMidi = 104 - stairStep + thickness - (Math.floor(p / 3) % 2) * 12;
          } else if (ch === 3) {
            // Thick Left Angel Wing Outer Plume
            const wingSpread = Math.sin(Math.PI * cycleProgress) * 44;
            pMidi = origPitch - Math.round(wingSpread + (p % 4) * 4) + thickness;
          } else if (ch === 4) {
            // Thick Right Angel Wing Outer Plume
            const wingSpread = Math.sin(Math.PI * cycleProgress) * 44;
            pMidi = origPitch + Math.round(wingSpread + (p % 4) * 4) + thickness;
          } else if (ch === 5 || ch === 7) {
            // Torrential Waterfall Cascades
            pMidi = 108 - ((stepIndex * 3 + p * 6) % 80) + thickness;
          } else if (ch === 9) {
            // Criss-Cross X-Stairs (Climbing Arm)
            pMidi = 24 + Math.round((stepIndex % 48) * 1.7) + thickness + (p % 2) * 12;
          } else if (ch === 10) {
            // Criss-Cross X-Stairs (Descending Arm)
            pMidi = 104 - Math.round((stepIndex % 48) * 1.7) + thickness - (p % 2) * 12;
          } else if (ch === 11 || ch === 12) {
            // Sacred Diamond Crystals & Geometric Polyhedra
            const diamondRadius = (1 - Math.abs(2 * ((curTick % (PPQ * 2)) / (PPQ * 2)) - 1)) * 26;
            const sign = (p % 2 === 0 ? 1 : -1);
            pMidi = origPitch + sign * Math.round(diamondRadius + Math.floor(p / 2) * 4) + thickness;
          } else if (ch === 13) {
            // Terraced Stepped Stairs
            const tread = Math.floor(stepIndex / 4) * 2;
            pMidi = 28 + (tread % 72) + thickness + (p % 3) * 12;
          } else if (ch === 14) {
            // Machine-Gun Tremolo Ratchet + High Octave Clusters
            pMidi = origPitch + ((p % 5) - 2) * 12 + thickness;
          } else if (ch === 15) {
            // Celestial Treble Halo (Octaves 7-8)
            pMidi = 96 + ((stepIndex * 2 + p * 3) % 18) + thickness;
          } else if (ch === 6) {
            // Deep Sub-Bass Foundation (strictly anchored to song's harmonic root MIDI 21-38)
            pMidi = dynState.subBassRootPitch + (p % 2) * 12;
          } else {
            // Full Spectrum Harmonics
            const overtones = [-24, -12, 0, 7, 12, 19, 24, 28, 31, 36];
            pMidi = origPitch + overtones[p % overtones.length] + thickness;
          }
        } else {
          // SECTION MOVEMENTS (Contrasting focused visual artwork & AI cadenza)
          switch (part) {
          case 0: {
            // MOVEMENT I: THICK STAIRCASE GATEWAY (Bold Ascending & Stepped Stairs)
            if (ch === 1 || ch === 9) {
              // Ascending Staircase climbing 24 to 104 with 3-semitone thick ribbon
              const stairStep = (stepIndex * 2 + Math.floor(p / 3)) % 78;
              pMidi = 24 + stairStep + thickness + (Math.floor(p / 3) % 2) * 12;
            } else if (ch === 2 || ch === 10) {
              // Descending Staircase cascading 104 down to 24 with thick ribbon
              const stairStep = (stepIndex * 2 + Math.floor(p / 3)) % 78;
              pMidi = 104 - stairStep + thickness - (Math.floor(p / 3) % 2) * 12;
            } else if (ch === 13) {
              // Stepped Terraced Stairs (horizontal steps before stepping up)
              const tread = Math.floor(stepIndex / 4) * 2;
              pMidi = 28 + (tread % 72) + thickness + (p % 3) * 12;
            } else if (ch === 3 || ch === 4) {
              // Harmonic Parallel Climbing Stairs (+7 5ths, +12 octaves)
              const stairStep = (stepIndex * 2) % 64;
              pMidi = 36 + stairStep + thickness + (p % 3) * 7;
            } else if (ch === 6) {
              // Deep sub-bass staircase ground anchored to harmonic root
              pMidi = dynState.subBassRootPitch + ((stepIndex + p) % 2) * 12;
            } else {
              // Harmonic staircase echoes
              const octShift = ((p % 5) - 2) * 12;
              const stairStep = (stepIndex * 2) % 48;
              pMidi = origPitch + (ch % 2 === 0 ? stairStep - 24 : 24 - stairStep) + octShift + thickness;
            }
            break;
          }

          case 1: {
            // MOVEMENT II: THICK ANGEL WINGS OPUS (Layered Feathered Symmetrical Wings)
            const centerPitch = Math.max(48, Math.min(74, origPitch));
            const wingSpread = Math.sin(Math.PI * cycleProgress) * 44;

            if (ch === 3 || ch === 1) {
              // Outer Left Wing Plume & Thick Feathers
              const feather = (p % 4) * 4;
              pMidi = centerPitch - Math.round(wingSpread + feather) + thickness;
            } else if (ch === 4 || ch === 2) {
              // Outer Right Wing Plume & Thick Feathers
              const feather = (p % 4) * 4;
              pMidi = centerPitch + Math.round(wingSpread + feather) + thickness;
            } else if (ch === 5 || ch === 7) {
              // Mid-Wing Feather Layer (Dense Inner Plumes)
              const midSpread = wingSpread * 0.65;
              const side = (p % 2 === 0 ? -1 : 1);
              pMidi = centerPitch + side * Math.round(midSpread + (p % 3) * 5) + thickness;
            } else if (ch === 14) {
              // Golden Angel Spine & Heart Pillar
              pMidi = centerPitch + ((p % 5) - 2) * 3 + thickness;
            } else if (ch === 15) {
              // Celestial Halo (High Treble Octave 7-8)
              pMidi = 96 + ((stepIndex * 2 + p * 3) % 18) + thickness;
            } else if (ch === 6) {
              // Deep Ground Anchor strictly anchored to song root
              pMidi = dynState.subBassRootPitch + (p % 2) * 12;
            } else {
              // Angel Wing Inner Covert Plumes
              const innerSpread = wingSpread * 0.38;
              const side = (ch % 2 === 0 ? 1 : -1);
              pMidi = centerPitch + side * Math.round(innerSpread + (p % 3) * 6) + thickness;
            }
            break;
          }

          case 2: {
            // MOVEMENT III: CRISS-CROSS X-STAIRS (Thick Double Helix & Interlocking Beams)
            const xProgress = (stepIndex % 48); // 48 steps per X-cross
            if (ch % 2 === 1) {
              // Climbing arm of X (24 to 104 with thick ribbon)
              pMidi = 24 + Math.round(xProgress * 1.7) + thickness + (p % 2) * 12;
            } else {
              // Descending arm of X (104 down to 24 with thick ribbon)
              pMidi = 104 - Math.round(xProgress * 1.7) + thickness - (p % 2) * 12;
            }
            break;
          }

          case 3: {
            // MOVEMENT IV: Thematic Arpeggio Ribbons (uses AI Solo only if AI Variation mode is enabled!)
            const basePitch =
              useAiVariation && aiNotes.length > 0
                ? (aiNotes[(stepIndex + p) % aiNotes.length]?.pitch || origPitch)
                : origPitch;

            if (ch === 3 || ch === 4) {
              const aiWing = Math.sin(Math.PI * cycleProgress) * 32;
              pMidi = (ch === 3 ? basePitch - Math.round(aiWing) : basePitch + Math.round(aiWing)) + thickness;
            } else if (ch === 1 || ch === 2 || ch === 9 || ch === 10) {
              const cadenzaStep = (stepIndex * 3 + p * 4) % 48;
              pMidi = basePitch + cadenzaStep - 24 + thickness;
            } else if (ch === 5 || ch === 7 || ch === 14) {
              pMidi = basePitch + ((p % 5) - 2) * 7 + thickness;
            } else if (ch === 6) {
              pMidi = dynState.subBassRootPitch + (p % 2) * 12;
            } else {
              pMidi = basePitch + (p % 2 === 0 ? 7 : 19) + thickness;
            }
            break;
          }

          case 4: {
            // MOVEMENT V: SACRED DIAMOND CRYSTALS & THICK GEOMETRIC POLYHEDRA
            const diamondCycle = (curTick % (PPQ * 2)) / (PPQ * 2);
            const diamondRadius = (1 - Math.abs(2 * diamondCycle - 1)) * 26;
            const center = origPitch;

            if (ch === 5 || ch === 7 || ch === 14 || ch === 13) {
              // Thick double-bordered diamond rhombus contours
              const sign = (p % 2 === 0 ? 1 : -1);
              pMidi = center + sign * Math.round(diamondRadius + Math.floor(p / 2) * 4) + thickness;
            } else if (ch === 3) {
              // Machine-gun tremolo center core
              pMidi = origPitch + ((p % 3) - 1) * 12 + thickness;
            } else if (ch === 6) {
              // Sub-bass crystal foundation strictly anchored to song root
              pMidi = dynState.subBassRootPitch + (p % 2) * 12;
            } else {
              // Diamond crystal corners
              pMidi = center + ((p % 4) - 1.5) * 16 + thickness;
            }
            break;
          }

          case 5: {
            // MOVEMENT VI: TORRENTIAL WATERFALL CASCADES & WAVE UNDULATIONS
            if (ch === 4 || ch === 8 || ch === 12 || ch === 15) {
              // Thick multi-lane cascading water curtain
              pMidi = 108 - ((stepIndex * 3 + p * 6) % 80) + thickness;
            } else if (ch === 6) {
              // Sub-bass waterfall basin anchored to harmonic root
              pMidi = dynState.subBassRootPitch + ((stepIndex + p) % 2) * 12;
            } else {
              // Undulating sine waves across octaves
              const wave = Math.sin((stepIndex + p * 3) * 0.18) * 22;
              pMidi = origPitch + Math.round(wave) + (p % 3) * 12 + thickness;
            }
            break;
          }

          case 6:
          default: {
            // MOVEMENT VII: GRAND CLIMAX (GRAND THICK ANGELS + DUAL CLIMBING STAIRS)
            const centerPitch = Math.max(50, Math.min(72, origPitch));
            const giantWing = Math.sin(Math.PI * cycleProgress) * 48;

            if (ch === 3) {
              // Grand Thick Left Angel Wing
              pMidi = centerPitch - Math.round(giantWing + (p % 4) * 4) + thickness;
            } else if (ch === 4) {
              // Grand Thick Right Angel Wing
              pMidi = centerPitch + Math.round(giantWing + (p % 4) * 4) + thickness;
            } else if (ch === 1 || ch === 9 || ch === 13) {
              // Grand Climbing Stairs shooting through the angel wings
              pMidi = 21 + ((stepIndex * 2 + p * 5) % 86) + thickness;
            } else if (ch === 2 || ch === 10) {
              // Grand Descending Stairs
              pMidi = 108 - ((stepIndex * 2 + p * 5) % 86) + thickness;
            } else if (ch === 14) {
              // Golden Angel Spine
              pMidi = centerPitch + ((p % 5) - 2) * 4 + thickness;
            } else if (ch === 6) {
              // Sub-bass thunder anchored to harmonic root
              pMidi = dynState.subBassRootPitch + (p % 2) * 12;
            } else {
              // Climax full-spectrum overtone avalanche
              const overtones = [-24, -12, 0, 7, 12, 19, 24, 28, 31, 36, 42];
              pMidi = origPitch + overtones[p % overtones.length] + thickness;
            }
            break;
          }
        }
      }

        // Clamp to custom Key Range (e.g. 14 to 113 for 100-key piano)
        while (pMidi < minKeyMidi) pMidi += 12;
        while (pMidi > maxKeyMidi) pMidi -= 12;
        pMidi = Math.max(minKeyMidi, Math.min(maxKeyMidi, Math.round(pMidi)));

        // Guarantee distinct pitch in this step (anti-lag: never 1000 identical notes on 1 key!)
        while (usedPitches.has(pMidi) && pMidi < maxKeyMidi) {
          pMidi++;
        }
        while (usedPitches.has(pMidi) && pMidi > minKeyMidi) {
          pMidi--;
        }
        usedPitches.add(pMidi);
        pitches.push(pMidi);

        // Note On
        const delta = p === 0 ? dOn : 0;
        trackWriter.pushVLQ(delta);
        trackWriter.pushByte(0x90 | ch);
        trackWriter.pushByte(pMidi);
        trackWriter.pushByte(baseVel);

        notesCreated++;
        totalNotesEncoded++;
      }

      // Note Off: Thick temporal block (4 to 8 ticks for bold luminous rectangles in visualizer)
      if (pitches.length > 0) {
        const thickDur = Math.max(4, Math.min(Math.round(tickSpacing * 0.8), Math.round(PPQ / 16)));
        const offTick = curTick + thickDur;
        const dOff = offTick - lastTrackTick;
        lastTrackTick = offTick;

        for (let p = 0; p < pitches.length; p++) {
          const delta = p === 0 ? dOff : 0;
          trackWriter.pushVLQ(delta);
          trackWriter.pushByte(0x80 | ch);
          trackWriter.pushByte(pitches[p]);
          trackWriter.pushByte(0x00);
        }
      }

      // Yield to browser and report sub-step progress with active movement and dynamic section density
      if (stepIndex - lastReportedStep >= subStepInterval || stepIndex === totalSteps - 1) {
        lastReportedStep = stepIndex;
        currentSubStep++;
        currentStep++;

        const percent = Math.min(
          96,
          Math.max(4, Math.round((totalNotesEncoded / targetNotes) * 91) + 4)
        );

        const currentMovement =
          part === 3 && !useAiVariation
            ? 'Movement IV: Original Theme Arpeggio Ribbons'
            : PART_NAMES[part];
        const stageLog = densityInfo.isClimax
          ? `[${chName}] ${densityInfo.sectionName} • Multi-pattern Wall of Notes • ${totalNotesEncoded.toLocaleString()} notes (${percent}%)...`
          : `[${chName}] ${currentMovement} (${densityInfo.sectionName}) • Sub-step ${Math.min(subStepsPerChannel, currentSubStep)}/${subStepsPerChannel} • ${totalNotesEncoded.toLocaleString()} notes (${percent}%)...`;

        onProgress({
          step: currentStep,
          totalSteps,
          stageName: `Encoding ${chName}`,
          percent,
          currentNotes: totalNotesEncoded,
          targetNotes,
          currentChannel: ch,
          log: stageLog,
        });

        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // GUARANTEED TARGET FULFILLMENT FLUSH:
    // If blackout windows, short timelines, or single-tick caps left notesCreated < chNotesTarget,
    // emit remaining notes in crisp anti-lag multi-key clusters so exported MIDI NEVER has fewer notes than set!
    let deficitGuardBatches = 0;
    const flushBaseVel = getNoteVelocity(config.notesHearable, 0.75, false, config.ghostMelodyCloak === true);
    while (notesCreated < chNotesTarget) {
      if (signal?.aborted) throw new Error('Export cancelled');
      const remaining = chNotesTarget - notesCreated;
      const batchSize = Math.min(remaining, Math.max(maxNotesPerTick, keySpan));
      const canAdvance = lastTrackTick + 2 <= maxAllowedTicks;
      const onDelta = canAdvance ? 1 : 0;
      if (canAdvance) lastTrackTick += 1;

      for (let b = 0; b < batchSize; b++) {
        const pitch = minKeyMidi + ((deficitGuardBatches * 7 + b) % keySpan);
        trackWriter.pushVLQ(b === 0 ? onDelta : 0);
        trackWriter.pushByte(0x90 | ch);
        trackWriter.pushByte(pitch);
        trackWriter.pushByte(flushBaseVel);
      }

      const offDelta = canAdvance ? 1 : 0;
      if (canAdvance) lastTrackTick += 1;
      for (let b = 0; b < batchSize; b++) {
        const pitch = minKeyMidi + ((deficitGuardBatches * 7 + b) % keySpan);
        trackWriter.pushVLQ(b === 0 ? offDelta : 0);
        trackWriter.pushByte(0x80 | ch);
        trackWriter.pushByte(pitch);
        trackWriter.pushByte(0x00);
      }

      notesCreated += batchSize;
      totalNotesEncoded += batchSize;
      deficitGuardBatches++;

      if (deficitGuardBatches % 2000 === 0) {
        onProgress({
          step: currentStep,
          totalSteps,
          stageName: `Finalizing Target Density (${chName})`,
          percent: Math.min(96, Math.max(4, Math.round((totalNotesEncoded / targetNotes) * 91) + 4)),
          currentNotes: totalNotesEncoded,
          targetNotes,
          currentChannel: ch,
          log: `[${chName}] Guaranteeing exact note target: ${totalNotesEncoded.toLocaleString()} / ${targetNotes.toLocaleString()} notes...`,
        });
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // End of Track meta event aligned to totalTimelineTicks
    const finalDelta = Math.max(0, totalTimelineTicks - lastTrackTick);
    trackWriter.pushVLQ(finalDelta);
    trackWriter.pushBytes([0xff, 0x2f, 0x00]);

    // Finalize track chunk (Length header matches data bytes to the exact byte!)
    allTrackParts.push(trackWriter.finishTrackChunk());
  }

  // =========================================================================
  // Final SMF Binary Assembly
  // =========================================================================
  currentStep++;
  onProgress({
    step: currentStep,
    totalSteps,
    stageName: 'Compiling Final SMF Binary',
    percent: 97,
    currentNotes: totalNotesEncoded,
    targetNotes,
    currentChannel: 16,
    log: `Assembling SMF Type 1 binary (1 Conductor + 16 Channels, ${totalNotesEncoded.toLocaleString()} notes, Max duration: 1 Hour)...`,
  });

  await new Promise((r) => setTimeout(r, 10));

  const totalTracks = allTrackParts.length;
  const headerBytes = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Chunk length 6
    0x00, 0x01,             // Format 1 (Type 1 multi-track synchronous)
    ...uint16ToBytes(totalTracks),
    ...uint16ToBytes(PPQ),   // Time division 480 PPQ
  ]);

  // If writableStream was pre-opened on user click (via File System Access API)
  if (writableStream) {
    try {
      await writableStream.write(headerBytes);
      for (const trackPartList of allTrackParts) {
        for (const chunk of trackPartList) {
          await writableStream.write(chunk);
        }
      }
      await writableStream.close();

      currentStep++;
      onProgress({
        step: currentStep,
        totalSteps,
        stageName: 'Download Ready',
        percent: 100,
        currentNotes: totalNotesEncoded,
        targetNotes,
        currentChannel: 16,
        log: `SUCCESS: Streamed directly to disk (${totalNotesEncoded.toLocaleString()} notes, Duration <= 1 Hour, 100% Zenith compatible). Saved!`,
      });
      return;
    } catch (streamErr: any) {
      console.warn('Stream write error, falling back to Blob:', streamErr);
    }
  }

  // Blob assembly and browser download
  const blobParts: any[] = [headerBytes];
  for (const trackPartList of allTrackParts) {
    for (const chunk of trackPartList) {
      blobParts.push(chunk);
    }
  }

  const midiBlob = new Blob(blobParts, { type: 'audio/midi' });

  // Download Ready Step
  currentStep++;
  onProgress({
    step: currentStep,
    totalSteps,
    stageName: 'Download Ready',
    percent: 100,
    currentNotes: totalNotesEncoded,
    targetNotes,
    currentChannel: 16,
    log: `SUCCESS: Black MIDI binary compiled (${totalNotesEncoded.toLocaleString()} notes, ${(midiBlob.size / (1024 * 1024)).toFixed(1)} MB, Duration <= 1 Hour). Downloading!`,
  });

  await new Promise((r) => setTimeout(r, 20));

  // Trigger browser download cleanly if in browser DOM
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const url = URL.createObjectURL(midiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
