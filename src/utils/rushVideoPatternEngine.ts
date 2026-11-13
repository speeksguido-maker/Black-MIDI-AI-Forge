import { MidiNote, MidiColorPalette, BlackMidiConfig } from '../types/midi';
import { SongEnergyProfile } from './songEnergyAnalyzer';

// Crisp 5x7 bitmap font for MIDI Piano Roll Text Art (R, U, S, H, etc. like reference video 0:00-0:03)
const PIXEL_FONT_5X7: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['10001', '10001', '10001', '11111', '00001', '00001', '00001'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
};

/**
 * Generates crisp MIDI falling pixel blocks spelling out a short title word (e.g. "RUSH")
 * right inside the piano roll just like frames 0:00 - 0:03 of the reference video!
 */
export function generatePixelWordArtNotes(
  wordRaw: string,
  startTime: number,
  durationSeconds: number,
  lowestMidi: number,
  keyCount: number,
  palette: MidiColorPalette,
  ghostSilent: boolean
): MidiNote[] {
  const cleanWord = (wordRaw || 'RUSH')
    .toUpperCase()
    .replace(/[^A-Z0-9!]/g, '')
    .slice(0, 6);
  if (!cleanWord) return [];

  const letters = cleanWord.split('');
  const colsPerChar = 5;
  const gapCols = 2;
  const totalCols = letters.length * colsPerChar + (letters.length - 1) * gapCols;

  // Map horizontally across the middle 70% of the active piano range
  const margin = Math.max(4, Math.floor(keyCount * 0.14));
  const usableSpan = Math.max(20, keyCount - margin * 2);
  const semitoneStep = usableSpan / totalCols;

  const rows = 7;
  const rowDur = durationSeconds / rows;
  const pixelNotes: MidiNote[] = [];
  let counter = 0;

  // Red / Orange channel matching reference video letter color
  const letterChannel = palette === 'crimson_hellfire' ? 1 : 1;

  letters.forEach((char, charIdx) => {
    const glyph = PIXEL_FONT_5X7[char] || PIXEL_FONT_5X7['R'];
    const charBaseCol = charIdx * (colsPerChar + gapCols);

    for (let r = 0; r < rows; r++) {
      // Top row of glyph hits later in time (because waterfall scrolls downward!)
      // So row 0 (top of letter) is furthest in time: startTime + (rows - 1 - r) * rowDur
      const noteTime = startTime + (rows - 1 - r) * rowDur;
      const line = glyph[r];
      for (let c = 0; c < colsPerChar; c++) {
        if (line[c] !== '1') continue;
        const colIdx = charBaseCol + c;
        const pitch = Math.max(
          lowestMidi,
          Math.min(lowestMidi + keyCount - 1, Math.round(lowestMidi + margin + colIdx * semitoneStep))
        );

        pixelNotes.push({
          id: `pixword-${counter++}`,
          midi: pitch,
          time: noteTime,
          duration: Math.max(0.05, rowDur * 0.85),
          velocity: ghostSilent ? 0.015 : 0.25,
          isOriginal: false,
          channel: letterChannel,
          track: 1,
        });

        // Double-thick width when piano has plenty of keys
        if (semitoneStep >= 1.6 && pitch + 1 <= lowestMidi + keyCount - 1) {
          pixelNotes.push({
            id: `pixword-${counter++}`,
            midi: pitch + 1,
            time: noteTime,
            duration: Math.max(0.05, rowDur * 0.85),
            velocity: ghostSilent ? 0.015 : 0.2,
            isOriginal: false,
            channel: letterChannel,
            track: 1,
          });
        }
      }
    }
  });

  return pixelNotes;
}

/**
 * Generates the iconic Reference Video visual note-art structures:
 * 1. Intro Pixel Banner ("RUSH" / custom word)
 * 2. Concentric Moire Interference Eye Waves (0:08-0:12)
 * 3. Twin Interlocking Neon Blue/Purple Double-Helix Sine Spirals (0:15-0:26)
 * 4. Golden/Yellow Chevron X-Lattice (0:28-0:30)
 * 5. Diagonal Sweeping Finale Cascades (0:31-0:32)
 */
export function generateRushVideoOpusArt(
  result: MidiNote[],
  notes: MidiNote[],
  bpmMult: number,
  density: number,
  palette: MidiColorPalette,
  energyProfile: SongEnergyProfile,
  config: BlackMidiConfig
): void {
  const lowestMidi = Math.max(0, Math.min(127, config.lowestMidiNote ?? 14));
  const keyCount = Math.max(12, Math.min(128 - lowestMidi, config.keyCount ?? 100));
  const highestMidi = lowestMidi + keyCount - 1;
  const midMidi = Math.round((lowestMidi + highestMidi) / 2);

  const totalDuration = Math.max(
    8,
    notes.length > 0 ? notes[notes.length - 1].time / bpmMult : 30
  );
  const baseVel = config.ghostMelodyCloak ? 0.02 : 0.78;
  const MAX_ART_TOTAL = 34000;
  let artCounter = 0;

  // 1. Intro Pixel Word Art (like "RUSH" at 0:00 - 0:03 of video)
  const introWord = (config.introPixelWord || 'RUSH').trim();
  if (introWord.length > 0 && result.length < MAX_ART_TOTAL - 400) {
    const pixNotes = generatePixelWordArtNotes(
      introWord,
      0.35,
      Math.min(1.6, totalDuration * 0.08),
      lowestMidi,
      keyCount,
      palette,
      config.ghostMelodyCloak === true
    );
    for (const pn of pixNotes) {
      if (result.length >= MAX_ART_TOTAL) break;
      result.push(pn);
    }
  }

  // Timeline sweeps at ultra-fine 40ms-60ms resolution for smooth video curves
  const stepSec = Math.max(0.032, Math.min(0.075, totalDuration / Math.min(520, 140 + density * 2.5)));
  const spanRadius = Math.floor(keyCount * 0.44);

  for (let t = Math.min(2.0, totalDuration * 0.08); t < totalDuration; t += stepSec) {
    if (result.length >= MAX_ART_TOTAL) break;

    const progress = t / totalDuration;
    const dynState = energyProfile.getStateAtTime(t * bpmMult);

    // Subtle pre-drop gap right before 45% and 78% marks when drop silence cuts are enabled
    if (config.videoDropSilenceCuts !== false) {
      if ((progress > 0.425 && progress < 0.445) || (progress > 0.755 && progress < 0.77)) {
        continue;
      }
    }

    // MOVEMENT A (8% - 34%): Concentric Moire Eye & Wave Interference (0:08 - 0:12 in video)
    if (progress < 0.34) {
      const wavePhase = t * 5.2;
      const waves = dynState.isCrazy ? 4 : 3;
      for (let w = 0; w < waves; w++) {
        if (result.length >= MAX_ART_TOTAL) break;
        const offset = (w / waves) * Math.PI;
        const p1 = Math.round(midMidi + Math.sin(wavePhase + offset) * spanRadius);
        const p2 = Math.round(midMidi - Math.sin(wavePhase + offset) * spanRadius);

        for (const pRaw of [p1, p2]) {
          const p = Math.max(lowestMidi, Math.min(highestMidi, pRaw));
          result.push({
            id: `rv-moire-${artCounter++}`,
            midi: p,
            time: t,
            duration: stepSec * 1.15,
            velocity: baseVel,
            isOriginal: false,
            channel: (w * 3 + 5) % 16, // Purple/Magenta/Orange vibrant weave
            track: w + 1,
          });
        }
      }
    }
    // MOVEMENT B (34% - 43%): Bass Mountain Pyramid & Rapid Staccato Bounce (0:13 in video)
    else if (progress < 0.43) {
      const localP = (progress - 0.34) / 0.09;
      const pyramidHeight = 1 - Math.abs(2 * localP - 1);
      const peakPitch = Math.round(lowestMidi + 10 + pyramidHeight * (keyCount * 0.48));
      for (let k = lowestMidi + 4; k <= peakPitch; k += 3) {
        if (result.length >= MAX_ART_TOTAL) break;
        result.push({
          id: `rv-pyr-${artCounter++}`,
          midi: Math.min(highestMidi, k),
          time: t,
          duration: stepSec * 0.85,
          velocity: baseVel * 0.9,
          isOriginal: false,
          channel: 1, // Vivid red pyramid blocks
          track: 2,
        });
      }
    }
    // MOVEMENT C (43% - 76%): Twin Neon Blue & Purple Double-Helix Sine Loops + Multi-Color Grid (0:15 - 0:26)
    else if (progress < 0.76) {
      const helixPhase = t * 4.4;
      const centerDrift = Math.sin(t * 1.4) * (spanRadius * 0.28);
      const helixA = Math.round(midMidi + centerDrift + Math.sin(helixPhase) * (spanRadius * 0.62));
      const helixB = Math.round(midMidi - centerDrift + Math.cos(helixPhase * 1.15) * (spanRadius * 0.62));

      // Thick 3-semitone glowing Blue & Purple Sine Ribbons (Channels 0 & 4 Blue/Cyan, 8 Purple)
      for (let thick = -1; thick <= 1; thick++) {
        if (result.length >= MAX_ART_TOTAL) break;
        const pA = Math.max(lowestMidi, Math.min(highestMidi, helixA + thick));
        const pB = Math.max(lowestMidi, Math.min(highestMidi, helixB + thick));

        result.push({
          id: `rv-hlxA-${artCounter++}`,
          midi: pA,
          time: t,
          duration: stepSec * 1.4,
          velocity: baseVel,
          isOriginal: false,
          channel: 0, // Vibrant blue ribbon
          track: 3,
        });
        result.push({
          id: `rv-hlxB-${artCounter++}`,
          midi: pB,
          time: t,
          duration: stepSec * 1.4,
          velocity: baseVel,
          isOriginal: false,
          channel: 4, // Cyan/purple twin helix
          track: 4,
        });
      }

      // Outer Green/Gold border rails like frames 0:15 - 0:25
      if (Math.floor(t * 20) % 2 === 0) {
        const leftRail = Math.min(highestMidi, lowestMidi + ((Math.floor(t * 14)) % 10));
        const rightRail = Math.max(lowestMidi, highestMidi - ((Math.floor(t * 14)) % 10));
        result.push({
          id: `rv-railL-${artCounter++}`,
          midi: leftRail,
          time: t,
          duration: stepSec * 1.1,
          velocity: baseVel * 0.85,
          isOriginal: false,
          channel: 2, // Green left pillar
          track: 5,
        });
        result.push({
          id: `rv-railR-${artCounter++}`,
          midi: rightRail,
          time: t,
          duration: stepSec * 1.1,
          velocity: baseVel * 0.85,
          isOriginal: false,
          channel: 5, // Magenta/Purple right pillar
          track: 6,
        });
      }
    }
    // MOVEMENT D (76% - 89%): Golden & Yellow Chevron X-Lattice (0:27 - 0:30 in video)
    else if (progress < 0.89) {
      const chevSpeed = (t * 28) % spanRadius;
      const pUp = Math.max(lowestMidi, Math.min(highestMidi, lowestMidi + Math.round(chevSpeed * 2)));
      const pDn = Math.max(lowestMidi, Math.min(highestMidi, highestMidi - Math.round(chevSpeed * 2)));
      const pMidSine = Math.max(
        lowestMidi,
        Math.min(highestMidi, Math.round(midMidi + Math.sin(t * 6.5) * (spanRadius * 0.55)))
      );

      for (let thick = 0; thick <= 1; thick++) {
        if (result.length >= MAX_ART_TOTAL) break;
        result.push({
          id: `rv-chvU-${artCounter++}`,
          midi: Math.min(highestMidi, pUp + thick),
          time: t,
          duration: stepSec * 1.2,
          velocity: baseVel,
          isOriginal: false,
          channel: 14, // Gold chevron arm
          track: 7,
        });
        result.push({
          id: `rv-chvD-${artCounter++}`,
          midi: Math.max(lowestMidi, pDn - thick),
          time: t,
          duration: stepSec * 1.2,
          velocity: baseVel,
          isOriginal: false,
          channel: 3, // Yellow chevron arm
          track: 8,
        });
      }

      result.push({
        id: `rv-chvB-${artCounter++}`,
        midi: pMidSine,
        time: t,
        duration: stepSec * 1.5,
        velocity: baseVel,
        isOriginal: false,
        channel: 0, // Sweeping neon blue core wave
        track: 9,
      });
    }
    // MOVEMENT E (89% - 100%): Yellow Bass Wall Anchor + Sweeping Diagonal Waterfall Ribbons (0:31 - 0:32)
    else {
      const cascadePos = ((t * 48) % keyCount);
      for (let ribbon = 0; ribbon < 3; ribbon++) {
        if (result.length >= MAX_ART_TOTAL) break;
        const p = Math.max(
          lowestMidi,
          Math.min(highestMidi, Math.round(highestMidi - ((cascadePos + ribbon * 22) % (keyCount - 12))))
        );
        result.push({
          id: `rv-fin-${artCounter++}`,
          midi: p,
          time: t,
          duration: stepSec * 1.3,
          velocity: baseVel,
          isOriginal: false,
          channel: ribbon === 0 ? 2 : ribbon === 1 ? 4 : 1, // Green / Cyan / Red sweeps
          track: 10 + ribbon,
        });
      }

      // Sustained yellow sub-bass wall anchor on left 12 keys
      for (let b = 0; b < 6; b += 2) {
        if (result.length >= MAX_ART_TOTAL) break;
        result.push({
          id: `rv-bass-${artCounter++}`,
          midi: Math.min(highestMidi, lowestMidi + b),
          time: t,
          duration: stepSec * 1.2,
          velocity: baseVel * 0.9,
          isOriginal: false,
          channel: 3, // Bright gold/yellow bass wall
          track: 14,
        });
      }
    }
  }
}

/**
 * Applies dramatic Black MIDI pre-drop silence gaps (0:19 & 0:27 blackout cuts)
 * and injects ultra-rapid Glitch Stutter Clusters (32nd/64th/128th machine-gun bursts
 * & chromatic lag glitches) into the MIDI note sequence!
 */
export function applyVideoDropCutsAndGlitches(
  notes: MidiNote[],
  config: BlackMidiConfig,
  totalDuration: number
): MidiNote[] {
  if (!notes || notes.length === 0) return notes;

  const glitchMode = config.glitchMode || 'black_midi_lag';
  const glitchIntensity = Math.max(0, Math.min(100, config.glitchIntensity ?? 55));
  const useSilenceCuts = config.videoDropSilenceCuts !== false;
  const lowestMidi = Math.max(0, Math.min(127, config.lowestMidiNote ?? 14));
  const keyCount = Math.max(12, Math.min(128 - lowestMidi, config.keyCount ?? 100));
  const highestMidi = lowestMidi + keyCount - 1;

  // Define brief blackout drop-silence windows (0.18s-0.24s) right before huge impacts
  const cutWindows: [number, number][] = useSilenceCuts && totalDuration > 10
    ? [
        [totalDuration * 0.43, totalDuration * 0.43 + 0.22],
        [totalDuration * 0.76, totalDuration * 0.76 + 0.18],
      ]
    : [];

  let filtered = notes;
  if (cutWindows.length > 0) {
    filtered = notes.filter((n) => {
      if (n.isOriginal) return true; // Never delete user's imported original notes!
      for (const [startCut, endCut] of cutWindows) {
        if (n.time >= startCut && n.time <= endCut) {
          return false;
        }
      }
      return true;
    });
  }

  if (glitchMode === 'off' || glitchIntensity <= 0) {
    return filtered;
  }

  // Inject Black MIDI Glitch Stutter Bursts at key climax & impact timestamps
  const numGlitchEvents =
    glitchMode === 'subtle_stutter'
      ? Math.max(2, Math.round((glitchIntensity / 100) * 5))
      : glitchMode === 'black_midi_lag'
      ? Math.max(3, Math.round((glitchIntensity / 100) * 9))
      : Math.max(5, Math.round((glitchIntensity / 100) * 14));

  const glitchNotes: MidiNote[] = [];
  let gCounter = 0;

  for (let g = 0; g < numGlitchEvents; g++) {
    if (filtered.length + glitchNotes.length >= 34800) break;

    // Anchor glitch events around dramatic moments (e.g. drops right after cuts + climax surges)
    const frac = g === 0 && cutWindows.length > 0
      ? 0.448
      : g === 1 && cutWindows.length > 1
      ? 0.772
      : 0.16 + ((g * 0.79) / numGlitchEvents) * 0.8;

    const anchorTime = Math.min(totalDuration - 0.3, Math.max(0.5, frac * totalDuration));

    // Find nearest original melody note for harmonic grounding
    let anchorPitch = Math.round((lowestMidi + highestMidi) / 2);
    for (let i = 0; i < filtered.length; i += Math.max(1, Math.floor(filtered.length / 80))) {
      if (filtered[i].isOriginal && Math.abs(filtered[i].time - anchorTime) < 1.5) {
        anchorPitch = filtered[i].midi;
        break;
      }
    }

    const stutterRepeats = glitchMode === 'rush_chaos' ? 12 : 7;
    const stutterDt = glitchMode === 'rush_chaos' ? 0.014 : 0.02;

    for (let r = 0; r < stutterRepeats; r++) {
      const t = anchorTime + r * stutterDt;
      // Chromatic stutter / octave glitch snap
      const pitchShift = r % 3 === 0 ? 0 : r % 3 === 1 ? 12 : -12;
      const p = Math.max(lowestMidi, Math.min(highestMidi, anchorPitch + pitchShift));

      glitchNotes.push({
        id: `glitch-stut-${gCounter++}`,
        midi: p,
        time: t,
        duration: stutterDt * 0.75,
        velocity: config.notesHearable ? 0.92 : 0.05,
        isOriginal: false,
        channel: (r % 2 === 0 ? 5 : 10), // Hot Magenta / Turquoise Glitch burst channels
        track: 10,
      });

      // Explosive chord slam on drop impact after blackout cut
      if (r === 0 && g <= 1) {
        for (let slam = -2; slam <= 2; slam++) {
          const sp = Math.max(lowestMidi, Math.min(highestMidi, anchorPitch + slam * 12));
          glitchNotes.push({
            id: `glitch-slam-${gCounter++}`,
            midi: sp,
            time: t,
            duration: 0.14,
            velocity: config.notesHearable ? 0.95 : 0.05,
            isOriginal: false,
            channel: 1,
            track: 1,
          });
        }
      }
    }
  }

  return [...filtered, ...glitchNotes];
}
