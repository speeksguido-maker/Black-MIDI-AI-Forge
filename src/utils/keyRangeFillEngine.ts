import { MidiNote, BlackMidiConfig, KeyRangePreset, MidiColorPalette } from '../types/midi';

export interface KeyRangeInfo {
  id: KeyRangePreset;
  label: string;
  lowestMidi: number;
  highestMidi: number;
  keyCount: number;
  desc: string;
  icon: string;
}

export const KEY_RANGE_PRESETS: Record<KeyRangePreset, KeyRangeInfo> = {
  keyboard_100: {
    id: 'keyboard_100',
    label: '100-Key Hyper-Piano (D-1 to F8)',
    lowestMidi: 14,
    highestMidi: 113,
    keyCount: 100,
    desc: 'Massive custom 100-key piano with extreme sub-bass to soaring crystal bells',
    icon: '🎹',
  },
  standard_88: {
    id: 'standard_88',
    label: '88-Key Standard Grand (A0 to C8)',
    lowestMidi: 21,
    highestMidi: 108,
    keyCount: 88,
    desc: 'Traditional concert grand piano keyboard range',
    icon: '🏛️',
  },
  bosendorfer_97: {
    id: 'bosendorfer_97',
    label: '97-Key Bösendorfer Imperial 290 (C0 to C8)',
    lowestMidi: 12,
    highestMidi: 108,
    keyCount: 97,
    desc: 'Iconic Austrian concert grand with 9 extra black sub-bass keys down to 16.35Hz',
    icon: '👑',
  },
  stuart_108: {
    id: 'stuart_108',
    label: '108-Key Stuart & Sons 9-Octave (C0 to B8)',
    lowestMidi: 12,
    highestMidi: 119,
    keyCount: 108,
    desc: 'The world’s first acoustic piano spanning 9 complete octaves',
    icon: '🦖',
  },
  full_128: {
    id: 'full_128',
    label: '128-Key Full MIDI Omnipresence (C-1 to G9)',
    lowestMidi: 0,
    highestMidi: 127,
    keyCount: 128,
    desc: 'Absolute maximum capacity of the MIDI specification (all 128 pitches filled)',
    icon: '⚡',
  },
  stage_76: {
    id: 'stage_76',
    label: '76-Key Stage Piano (E1 to G7)',
    lowestMidi: 28,
    highestMidi: 103,
    keyCount: 76,
    desc: 'Popular gigging stage piano and vintage electric keyboard span',
    icon: '🎸',
  },
  synth_61: {
    id: 'synth_61',
    label: '61-Key Synth Workstation (C2 to C7)',
    lowestMidi: 36,
    highestMidi: 96,
    keyCount: 61,
    desc: 'Standard 5-octave electronic synthesizer controller',
    icon: '🎛️',
  },
  studio_49: {
    id: 'studio_49',
    label: '49-Key Studio Keyboard (C2 to C6)',
    lowestMidi: 36,
    highestMidi: 84,
    keyCount: 49,
    desc: 'Compact 4-octave desktop music production controller',
    icon: '🎧',
  },
  pocket_25: {
    id: 'pocket_25',
    label: '25-Key Pocket Mini-Synth (C3 to C5)',
    lowestMidi: 48,
    highestMidi: 72,
    keyCount: 25,
    desc: 'Ultra-portable 2-octave backpack synthesizer keyboard',
    icon: '🎒',
  },
  custom: {
    id: 'custom',
    label: 'Custom Key Range (User Defined)',
    lowestMidi: 21,
    highestMidi: 108,
    keyCount: 88,
    desc: 'Freely choose any starting pitch and key count (12 to 128 keys)',
    icon: '⚙️',
  },
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getPitchName(midi: number): string {
  const bounded = Math.max(0, Math.min(127, Math.round(midi)));
  const octave = Math.floor(bounded / 12) - 1;
  const name = NOTE_NAMES[bounded % 12];
  return `${name}${octave}`;
}

export interface KeyCoverageStats {
  keyCount: number;
  lowestMidi: number;
  highestMidi: number;
  totalNotes: number;
  activeKeyCount: number;
  coveragePercent: number; // 0 to 100
  keyHitCounts: number[]; // Index 0 is lowestMidi, index keyCount - 1 is highestMidi
  unfilledPitches: number[];
}

/**
 * Calculates how many of the specified keys in [lowestMidi, highestMidi] have active notes.
 */
export function getKeyCoverageStats(
  notes: MidiNote[],
  lowestMidi: number,
  keyCount: number
): KeyCoverageStats {
  const safeLowest = Math.max(0, Math.min(127, lowestMidi));
  const safeCount = Math.max(1, Math.min(128 - safeLowest, keyCount));
  const safeHighest = safeLowest + safeCount - 1;

  const hitCounts = new Array<number>(safeCount).fill(0);
  let notesInsideRange = 0;

  for (let i = 0; i < notes.length; i++) {
    const p = Math.round(notes[i].midi);
    if (p >= safeLowest && p <= safeHighest) {
      hitCounts[p - safeLowest]++;
      notesInsideRange++;
    }
  }

  const unfilledPitches: number[] = [];
  let activeKeyCount = 0;

  for (let k = 0; k < safeCount; k++) {
    if (hitCounts[k] > 0) {
      activeKeyCount++;
    } else {
      unfilledPitches.push(safeLowest + k);
    }
  }

  const coveragePercent = Math.round((activeKeyCount / safeCount) * 100);

  return {
    keyCount: safeCount,
    lowestMidi: safeLowest,
    highestMidi: safeHighest,
    totalNotes: notesInsideRange,
    activeKeyCount,
    coveragePercent,
    keyHitCounts: hitCounts,
    unfilledPitches,
  };
}

/**
 * Applies key range clamping/wrapping, AI key saturation (guaranteeing 100% of keys are filled with notes),
 * velocity limiting curve, and hypersonic speed ramps.
 */
export function processKeyRangeAndPowerTools(
  inputNotes: MidiNote[],
  config: BlackMidiConfig,
  songDuration: number
): MidiNote[] {
  if (!inputNotes || inputNotes.length === 0) return [];

  const lowestMidi = Math.max(0, Math.min(127, config.lowestMidiNote ?? 21));
  const keyCount = Math.max(12, Math.min(128 - lowestMidi, config.keyCount ?? 88));
  const highestMidi = lowestMidi + keyCount - 1;
  const enableAiSaturation = config.aiKeySaturation !== false; // Default true!
  const duration = Math.max(5, songDuration);

  // Step 1: Fold existing notes so they fit cleanly within [lowestMidi, highestMidi]
  const notesWithinRange: MidiNote[] = [];
  const keyHitTracker = new Set<number>();

  for (let i = 0; i < inputNotes.length; i++) {
    const orig = inputNotes[i];
    let pitch = Math.round(orig.midi);

    // If outside range, fold by octaves
    while (pitch < lowestMidi) pitch += 12;
    while (pitch > highestMidi) pitch -= 12;

    pitch = Math.max(lowestMidi, Math.min(highestMidi, pitch));
    keyHitTracker.add(pitch);

    notesWithinRange.push({
      ...orig,
      midi: pitch,
    });
  }

  // Step 2: AI 100% Key Saturation
  // If the user set e.g. a 100-key piano, every single key from 14 to 113 that doesn't yet have notes
  // is populated with harmonically sound notes (sub-bass rumbles, harmonic arpeggios, crystal cascades)!
  if (enableAiSaturation) {
    const unfilledPitches: number[] = [];
    for (let p = lowestMidi; p <= highestMidi; p++) {
      if (!keyHitTracker.has(p)) {
        unfilledPitches.push(p);
      }
    }

    if (unfilledPitches.length > 0) {
      let aiNoteCounter = 0;
      const densityMultiplier = Math.max(1, Math.min(8, config.aiKeyFillDensity || 3));
      const beatsPerBar = 4;
      const numBars = Math.max(4, Math.floor(duration / 2));

      for (let pIdx = 0; pIdx < unfilledPitches.length; pIdx++) {
        const pitch = unfilledPitches[pIdx];
        const isSubBass = pitch < lowestMidi + Math.min(18, Math.floor(keyCount * 0.2));
        const isUltraHigh = pitch > highestMidi - Math.min(18, Math.floor(keyCount * 0.2));

        // Determine how many note events to scatter across the piece for this key
        const noteEventsCount = isSubBass
          ? Math.max(3, Math.min(16, numBars)) // Rhythmic pedal points
          : isUltraHigh
          ? Math.max(6, Math.min(32, numBars * densityMultiplier)) // High-speed crystal cascades
          : Math.max(4, Math.min(24, numBars * 2)); // Melodic counterpoint / arpeggio

        const timeStep = duration / (noteEventsCount + 1);

        for (let step = 1; step <= noteEventsCount; step++) {
          const baseTime = step * timeStep + ((pIdx % 7) * 0.04);
          if (baseTime >= duration - 0.1) break;

          const noteDur = isSubBass
            ? Math.max(0.15, Math.min(0.8, timeStep * 0.75))
            : isUltraHigh
            ? 0.04
            : Math.max(0.06, timeStep * 0.4);

          const vel = isSubBass ? 0.95 : isUltraHigh ? 0.8 : 0.85;

          // Assign channel according to register
          const registerChannel = isSubBass ? 6 : isUltraHigh ? 13 : ((pitch % 8) + 1);

          notesWithinRange.push({
            id: `ai-keyfill-${pitch}-${aiNoteCounter++}`,
            midi: pitch,
            time: baseTime,
            duration: noteDur,
            velocity: config.notesHearable ? vel : 0.01,
            isOriginal: false,
            channel: registerChannel,
            track: registerChannel,
          });
        }
      }
    }
  }

  // Step 3: Soundfont Headroom & Velocity Limiter Curve
  let processedNotes = notesWithinRange;
  if (config.velocityLimitCurve && config.velocityLimitCurve !== 'off') {
    processedNotes = processedNotes.map((n) => {
      let vel = n.velocity;
      switch (config.velocityLimitCurve) {
        case 'transparent_soft_limit':
          // Soft ceiling at -3dB (vel ~0.70) to prevent soundfont clipping
          vel = Math.min(0.72, vel * 0.85);
          break;
        case 'black_wall':
          // Maximum visual velocity punch with soft limiter
          vel = config.notesHearable ? 0.92 : 0.01;
          break;
        case 's_curve': {
          // Smooth sigmoid dynamic curve
          const norm = Math.max(0, Math.min(1, vel));
          vel = 1 / (1 + Math.exp(-6 * (norm - 0.5)));
          break;
        }
        case 'dynamic_humanize': {
          const jitter = (Math.random() - 0.5) * 0.08;
          vel = Math.max(0.2, Math.min(1.0, vel + jitter));
          break;
        }
      }
      return { ...n, velocity: vel };
    });
  }

  // Step 4: Hypersonic Speed Accelerando Ramps
  if (config.speedRampMode && config.speedRampMode !== 'constant') {
    const peakMult = Math.max(1.1, Math.min(5.0, config.speedRampPeakBpmMult || 2.2));
    processedNotes = processedNotes.map((n) => {
      const progress = Math.max(0, Math.min(1, n.time / duration));
      let currentSpeedMult = 1.0;

      switch (config.speedRampMode) {
        case 'linear_accel':
          // Linear acceleration from 1.0 to peakMult
          currentSpeedMult = 1.0 + progress * (peakMult - 1.0);
          break;
        case 'exponential_rush':
          // Exponential rush: slow at first, rocket speed near the end!
          currentSpeedMult = 1.0 + Math.pow(progress, 2.5) * (peakMult - 1.0);
          break;
        case 'climax_burst':
          // Sudden hyper-burst between 60% and 90% timeline
          if (progress > 0.6 && progress < 0.9) {
            const burstProgress = Math.sin(((progress - 0.6) / 0.3) * Math.PI);
            currentSpeedMult = 1.0 + burstProgress * (peakMult - 1.0);
          } else {
            currentSpeedMult = 1.0;
          }
          break;
      }

      return {
        ...n,
        time: n.time / currentSpeedMult,
        duration: Math.max(0.015, n.duration / currentSpeedMult),
      };
    });
  }

  // Sort notes chronologically
  processedNotes.sort((a, b) => a.time - b.time);
  return processedNotes;
}
