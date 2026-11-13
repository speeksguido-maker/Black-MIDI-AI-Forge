import { MidiNote, BlackMidiConfig, VisualNoteArt, MidiColorPalette } from '../types/midi';
import { getNotesDuration } from './safeMath';
import { analyzeSongEnergyProfile, SongEnergyProfile } from './songEnergyAnalyzer';
import { processKeyRangeAndPowerTools } from './keyRangeFillEngine';
import {
  generateRushVideoOpusArt,
  applyVideoDropCutsAndGlitches,
} from './rushVideoPatternEngine';

// Assign channel (0-15) based on color palette and note features
export function assignChannel(
  palette: MidiColorPalette,
  pitch: number,
  layerType: 'original' | 'octave' | 'tremolo' | 'harmonic' | 'echo' | 'art',
  layerIndex: number,
  time: number
): number {
  switch (palette) {
    case 'synthesia_rainbow': {
      // Synthesia assigns vivid rainbow colors to Channels 0 - 15
      if (layerType === 'original') return 0; // Blue/White primary
      if (layerType === 'octave') return (1 + (layerIndex % 4)); // Red, Green, Yellow
      if (layerType === 'harmonic') return (5 + (layerIndex % 5)); // Magenta, Orange, Lime, Violet
      if (layerType === 'tremolo') return (10 + (layerIndex % 3)); // Turquoise, Amber, Lavender
      if (layerType === 'art') return 14; // Gold
      return (Math.floor(time * 4) + layerIndex) % 16;
    }
    case 'cyber_neon': {
      // Cyan (Ch 4), Hot Pink (Ch 5), Purple (Ch 8), Lime (Ch 7)
      if (layerType === 'original') return 4; // Cyan
      if (layerType === 'octave') return 5; // Hot Pink
      if (layerType === 'harmonic') return 8; // Purple
      if (layerType === 'tremolo') return 7; // Neon Lime
      return layerIndex % 2 === 0 ? 4 : 5;
    }
    case 'crimson_hellfire': {
      // Red (Ch 1), Orange (Ch 6), Yellow (Ch 3), Amber (Ch 11)
      if (layerType === 'original') return 1; // Pure Red
      if (layerType === 'octave') return 6; // Orange
      if (layerType === 'harmonic') return 3; // Yellow
      if (layerType === 'tremolo') return 11; // Amber
      return layerIndex % 2 === 0 ? 1 : 6;
    }
    case 'gold_obsidian': {
      // Gold (Ch 14), Yellow (Ch 3), Amber (Ch 11), Deep Blue/Black (Ch 0)
      if (layerType === 'original') return 14; // Gold
      if (layerType === 'octave') return 3; // Bright Yellow
      if (layerType === 'harmonic') return 11; // Warm Amber
      return 0;
    }
    case 'toxic_matrix': {
      // Green (Ch 2), Lime (Ch 7), Turquoise (Ch 10), White (Ch 15)
      if (layerType === 'original') return 15; // White
      if (layerType === 'octave') return 2; // Matrix Green
      if (layerType === 'harmonic') return 7; // Neon Lime
      return 10;
    }
    case 'synthwave_sunset': {
      // Magenta (Ch 5), Orange (Ch 6), Purple (Ch 8), Cyan (Ch 4)
      if (layerType === 'original') return 5; // Magenta
      if (layerType === 'octave') return 6; // Sunset Orange
      if (layerType === 'harmonic') return 8; // Deep Purple
      return 4; // Cyan
    }
    case 'octave_spectrum':
    default: {
      // Distribute channels by pitch register (0-15)
      const octave = Math.floor(pitch / 8);
      return Math.max(0, Math.min(15, octave));
    }
  }
}

// Generate Black MIDI notes from original notes and config
// Supports targetMinimumNotes from 1 to 1,000,000!
export function generateBlackMidi(
  originalNotes: MidiNote[],
  config: BlackMidiConfig
): MidiNote[] {
  if (!originalNotes || originalNotes.length === 0) return [];

  const targetMin = Math.max(1, Math.min(1000000000, config.targetMinimumNotes || 1));
  const palette = config.colorPalette || 'synthesia_rainbow';
  // Maximum notes kept in memory for 60fps UI rendering and Web Audio auditioning
  const MAX_MEMORY_PREVIEW_NOTES = 35000;
  const targetMemoryLimit = Math.min(targetMin, MAX_MEMORY_PREVIEW_NOTES);

  // If density is 1x and target is <= originalNotes.length, return original notes with colors
  if (
    config.densityFactor <= 1 &&
    targetMin <= originalNotes.length &&
    config.octaveSpread === 0 &&
    config.tremoloRate === 'off' &&
    config.visualNoteArt === 'none' &&
    config.harmonicIntervals.length <= 1 &&
    config.echoDecayCount === 0
  ) {
    return originalNotes.map((n, i) => ({
      ...n,
      id: `orig-${i}`,
      isOriginal: true,
      channel: assignChannel(palette, n.midi, 'original', 0, n.time),
      track: 0,
      time: n.time / (config.bpmMultiplier || 1),
      duration: n.duration / (config.bpmMultiplier || 1),
    }));
  }

  const bpmMult = config.bpmMultiplier || 1.0;
  const result: MidiNote[] = [];

  // Sort notes by time
  const sortedNotes = [...originalNotes].sort((a, b) => a.time - b.time);
  const totalDuration = getNotesDuration(sortedNotes) || 10;

  // Determine tremolo subdivision
  let tremoloStep = 0;
  if (config.tremoloRate === '1/16') tremoloStep = 0.125 / bpmMult;
  else if (config.tremoloRate === '1/32') tremoloStep = 0.0625 / bpmMult;
  else if (config.tremoloRate === '1/64') tremoloStep = 0.03125 / bpmMult;
  else if (config.tremoloRate === '1/128') tremoloStep = 0.015625 / bpmMult;

  // Calculate density multiplier
  let effectiveDensity = Math.max(1, Math.min(60, config.densityFactor));
  const octaveRange = Math.max(0, Math.min(3, config.octaveSpread));
  const intervals = config.harmonicIntervals.length > 0 ? config.harmonicIntervals : [0, 7, 12];

  // Helper for velocity modulation
  const getVelocityMod = (time: number, pitch: number): number => {
    switch (config.velocityDynamics) {
      case 'sine_swell':
        return 0.5 + 0.45 * Math.sin(time * 3 + pitch * 0.1);
      case 'exponential': {
        const progress = Math.min(1, time / (totalDuration || 1));
        return 0.3 + 0.65 * Math.pow(progress, 1.5);
      }
      case 'sawtooth':
        return 0.25 + 0.7 * (1 - ((time * 2) % 1));
      case 'heartbeat': {
        const beatTime = (time * 2) % 1;
        return beatTime < 0.2 ? 0.95 : beatTime < 0.4 ? 0.8 : 0.35;
      }
      case 'random_chaos':
        return 0.35 + 0.6 * Math.random();
      case 'none':
      default:
        return 0.85;
    }
  };

  let noteCounter = 0;
  const energyProfile = analyzeSongEnergyProfile(sortedNotes, totalDuration);
  let lastSubBassTime = -999;

  // 1. Process base notes
  for (let idx = 0; idx < sortedNotes.length; idx++) {
    if (result.length >= targetMemoryLimit) break;

    const orig = sortedNotes[idx];
    const origTime = orig.time / bpmMult;
    const origDur = Math.max(0.03, orig.duration / bpmMult);

    // Dynamic section analysis based on the imported MIDI's actual musical energy
    // If the imported MIDI is relaxed, black notes are gentle and non-chaotic.
    // If the imported MIDI gets crazy, black notes burst into intense multi-pattern walls!
    const dynState = energyProfile.getStateAtTime(orig.time);
    const isClimaxSection = dynState.isCrazy;
    const isQuietSection = dynState.isRelaxed;
    const sectionDensityMult = dynState.densityMultiplier;

    // Original note
    result.push({
      id: `orig-${noteCounter++}`,
      midi: orig.midi,
      time: origTime,
      duration: origDur,
      velocity: config.preserveOriginalMelody ? 1.0 : orig.velocity,
      isOriginal: true,
      channel: assignChannel(palette, orig.midi, 'original', 0, origTime),
      track: 0,
    });

    // INJECT DARK, LOW-PITCHED SUB-BASS NOTES FOR REAL DYNAMICS:
    // When the song reaches driving or crazy energy, add resonant sub-bass octaves (MIDI 21 to 38)
    // strictly aligned to the song's root pitch class (e.g. C1=24 & C2=36, or A0=21 & A1=33).
    // In relaxed sections, this is skipped so the intro/breakdown remains calm and serene.
    if (dynState.energy >= 0.48 && (origTime - lastSubBassTime >= 0.25)) {
      lastSubBassTime = origTime;
      const subPitches = dynState.isCrazy ? dynState.subBassOctaves : [dynState.subBassRootPitch];
      for (const bPitch of subPitches) {
        if (result.length >= targetMemoryLimit) break;
        result.push({
          id: `subbass-${noteCounter++}`,
          midi: bPitch,
          time: origTime,
          duration: Math.max(0.12, origDur * 1.2),
          velocity: dynState.isCrazy ? 1.0 : 0.88,
          isOriginal: true, // Marked as original so it plays audibly in the browser audio engine!
          channel: assignChannel(palette, bPitch, 'original', 0, origTime),
          track: 0,
        });
      }
    }

    // Tremolo ratcheting (only in active or crazy sections, skipped in quiet sections)
    if (!isQuietSection && tremoloStep > 0 && origDur > tremoloStep * 1.5) {
      const numSlices = Math.min(32, Math.floor(origDur / tremoloStep));
      const sliceDur = tremoloStep * 0.8;
      for (let s = 1; s < numSlices; s++) {
        if (result.length >= targetMemoryLimit) break;
        const sliceTime = origTime + s * tremoloStep;
        const vMod = getVelocityMod(sliceTime, orig.midi);
        result.push({
          id: `trem-${noteCounter++}`,
          midi: orig.midi,
          time: sliceTime,
          duration: sliceDur,
          velocity: Math.max(0.2, orig.velocity * 0.85 * vMod),
          isOriginal: false,
          channel: assignChannel(palette, orig.midi, 'tremolo', s, sliceTime),
          track: 1,
        });
      }
    }

    // Harmonic & Octave Avalanches (density varies dynamically by section!)
    const harmonicPasses = isQuietSection
      ? Math.min(2, Math.max(1, Math.ceil(effectiveDensity / 8)))
      : Math.min(intervals.length, Math.max(1, Math.ceil((effectiveDensity * sectionDensityMult) / 3)));

    for (let hIdx = 0; hIdx < harmonicPasses; hIdx++) {
      if (result.length >= targetMemoryLimit) break;
      const interval = intervals[hIdx % intervals.length];
      if (interval === 0 && hIdx > 0) continue;

      const minOct = -Math.min(2, octaveRange);
      const maxOct = Math.min(3, octaveRange);

      for (let oct = minOct; oct <= maxOct; oct++) {
        if (result.length >= targetMemoryLimit) break;
        if (oct === 0 && interval === 0) continue;

        const newPitch = orig.midi + interval + oct * 12;
        if (newPitch < 12 || newPitch > 120) continue;

        let timeOffset = 0;
        let noteDur = origDur;

        // In climax sections, layer multiple patterns together (Rush E + Waterfall + Matrix)
        const activePattern = isClimaxSection && oct % 2 !== 0
          ? (idx % 2 === 0 ? 'rush_e' : 'fractal_waterfall')
          : config.patternMode;

        if (activePattern === 'rush_e') {
          timeOffset = ((oct + 2) * 0.015) / bpmMult;
          noteDur = Math.min(origDur, 0.08);
        } else if (activePattern === 'fractal_waterfall') {
          timeOffset = ((120 - newPitch) * 0.0035) / bpmMult;
          noteDur = Math.max(0.04, origDur * 0.6);
        } else if (activePattern === 'chord_shatter') {
          timeOffset = (hIdx * 0.02 + oct * 0.01) / bpmMult;
        } else if (activePattern === 'polyrhythm_blitz') {
          timeOffset = ((idx % 5) * 0.025) / bpmMult;
        } else if (activePattern === 'matrix_spiral') {
          const angle = idx * 0.4 + oct;
          timeOffset = (Math.sin(angle) * 0.035) / bpmMult;
        }

        const noteTime = Math.max(0, origTime + timeOffset);
        const vMod = getVelocityMod(noteTime, newPitch);
        const octDamping = 1 - Math.abs(oct) * 0.12;

        result.push({
          id: `harm-${noteCounter++}`,
          midi: newPitch,
          time: noteTime,
          duration: Math.max(0.03, noteDur),
          velocity: Math.max(0.15, Math.min(0.9, orig.velocity * octDamping * vMod * 0.85)),
          isOriginal: false,
          channel: assignChannel(palette, newPitch, 'octave', oct + 3, noteTime),
          track: 2,
        });

        // Micro-shimmer bursts
        if (effectiveDensity >= 10 && idx % 2 === 0) {
          const microCount = Math.min(4, Math.floor(effectiveDensity / 8));
          const microStep = 0.02 / bpmMult;
          for (let m = 1; m <= microCount; m++) {
            if (result.length >= targetMemoryLimit) break;
            const mTime = noteTime + m * microStep;
            result.push({
              id: `micro-${noteCounter++}`,
              midi: newPitch,
              time: mTime,
              duration: microStep * 0.7,
              velocity: Math.max(0.1, orig.velocity * 0.5 * (1 - m / (microCount + 1))),
              isOriginal: false,
              channel: assignChannel(palette, newPitch, 'harmonic', m, mTime),
              track: 3,
            });
          }
        }
      }
    }

    // Echo Decay Trails
    if (config.echoDecayCount > 0) {
      const echoCount = Math.min(8, config.echoDecayCount);
      const echoSpacing = (config.echoSpacingFraction || 0.0625) * (0.5 / bpmMult);

      for (let e = 1; e <= echoCount; e++) {
        if (result.length >= targetMemoryLimit) break;
        const echoTime = origTime + e * echoSpacing;
        const decayFactor = Math.pow(0.82, e);
        const pitchDrift = config.patternMode === 'fractal_waterfall' ? (e % 2 === 0 ? 12 : -12) : 0;
        const echoPitch = Math.min(115, Math.max(20, orig.midi + pitchDrift));

        result.push({
          id: `echo-${noteCounter++}`,
          midi: echoPitch,
          time: echoTime,
          duration: Math.max(0.03, origDur * 0.5),
          velocity: Math.max(0.1, orig.velocity * decayFactor * 0.75),
          isOriginal: false,
          channel: assignChannel(palette, echoPitch, 'echo', e, echoTime),
          track: 4,
        });
      }
    }
  }

  // 2. Visual Note Art (includes Rush Video Opus with Pixel Text, Twin Helices & Moire Grids!)
  if (config.visualNoteArt !== 'none' && result.length < targetMemoryLimit) {
    if (config.visualNoteArt === 'rush_video_opus') {
      generateRushVideoOpusArt(
        result,
        sortedNotes,
        bpmMult,
        effectiveDensity,
        palette,
        energyProfile,
        config
      );
    } else {
      addVisualNoteArt(
        result,
        config.visualNoteArt,
        sortedNotes,
        bpmMult,
        effectiveDensity,
        palette,
        energyProfile,
        config.smartArtHarmonization !== false,
        config.ghostMelodyCloak === true
      );
    }
  }

  // 2.5 Apply dramatic pre-drop blackout gaps and Black MIDI Glitch Stutter Clusters BEFORE target fill
  // so blackout deletions never reduce final note count below the user's set Target Minimum Notes!
  const effectiveDuration = Math.max(2, totalDuration / bpmMult);
  let glitchedNotes = applyVideoDropCutsAndGlitches(result, config, effectiveDuration);

  // 3. TARGET MINIMUM DENSITY MULTIPLIER / RECURSIVE FILL
  // Strictly guarantees result.length >= targetMemoryLimit (never fewer notes than set!)
  if (glitchedNotes.length < targetMemoryLimit) {
    const existing = [...glitchedNotes];
    let pass = 1;

    while (glitchedNotes.length < targetMemoryLimit && existing.length > 0) {
      const needed = targetMemoryLimit - glitchedNotes.length;
      const stride = Math.max(1, Math.floor(existing.length / (needed + 1)));
      let addedThisPass = 0;

      for (let i = 0; i < existing.length; i += stride) {
        if (glitchedNotes.length >= targetMemoryLimit) break;

        const base = existing[i];
        const baseSongTime = base.time * bpmMult;
        const dyn = energyProfile.getStateAtTime(baseSongTime);

        // Allow relaxed skips only during the first 3 passes so target is always guaranteed
        if (dyn.isRelaxed && pass <= 3 && needed < 5000) continue;

        const octaveShift = (pass % 5) - 2;
        const targetPitch = Math.min(120, Math.max(12, base.midi + octaveShift * 12));
        const microOffset = ((pass % 16) * 0.008) / bpmMult;
        const noteTime = Math.min(effectiveDuration - 0.02, Math.max(0, (base.time + microOffset) % effectiveDuration));

        glitchedNotes.push({
          id: `dens-${noteCounter++}`,
          midi: targetPitch,
          time: noteTime,
          duration: Math.max(0.02, base.duration * 0.75),
          velocity: Math.max(0.15, base.velocity * 0.75),
          isOriginal: false,
          channel: assignChannel(palette, targetPitch, 'art', pass, noteTime),
          track: (pass % 8) + 1,
        });
        addedThisPass++;
      }

      if (addedThisPass === 0 && pass > 5) break;
      pass++;
      if (pass > 200) break;
    }

    // Hard guarantee top-up if still below targetMemoryLimit
    let guardIdx = 0;
    while (glitchedNotes.length < targetMemoryLimit && sortedNotes.length > 0) {
      const src = sortedNotes[guardIdx % sortedNotes.length];
      const oct = ((guardIdx % 7) - 3) * 12;
      const targetPitch = Math.min(120, Math.max(12, src.midi + oct));
      const t = Math.min(effectiveDuration - 0.02, Math.max(0, (src.time / bpmMult) + ((guardIdx % 25) * 0.004)));
      glitchedNotes.push({
        id: `dens-guar-${noteCounter++}`,
        midi: targetPitch,
        time: t,
        duration: 0.03,
        velocity: config.notesHearable ? 0.6 : 0.02,
        isOriginal: false,
        channel: assignChannel(palette, targetPitch, 'art', guardIdx, t),
        track: (guardIdx % 8) + 1,
      });
      guardIdx++;
    }
  }

  // Sort notes by time for standard MIDI compatibility
  glitchedNotes.sort((a, b) => a.time - b.time);

  // Apply custom Key Range (e.g. 100-key piano), AI 100% Key Saturation, Velocity Limiter, and Speed Overdrive Ramps
  return processKeyRangeAndPowerTools(glitchedNotes, config, effectiveDuration);
}

// Quantize raw geometric MIDI pitch to the nearest scale degree or chord tone of the song's root
function quantizeToHarmonic(
  rawPitch: number,
  rootPitchClass: number,
  mode: 'Major' | 'Minor',
  enableHarmonization: boolean
): number {
  const bounded = Math.max(18, Math.min(118, Math.round(rawPitch)));
  if (!enableHarmonization) return bounded;

  // Diatonic scale steps relative to root
  const intervals = mode === 'Major'
    ? [0, 2, 4, 5, 7, 9, 11] // Major diatonic
    : [0, 2, 3, 5, 7, 8, 10]; // Minor natural / harmonic

  const pc = ((bounded % 12) + 12) % 12;
  const relPc = ((pc - rootPitchClass) % 12 + 12) % 12;

  // Find nearest scale interval
  let bestDist = 999;
  let bestInterval = 0;
  for (const interval of intervals) {
    const dist = Math.abs(relPc - interval);
    if (dist < bestDist) {
      bestDist = dist;
      bestInterval = interval;
    }
  }

  const shift = bestInterval - relPc;
  const harmonized = bounded + shift;
  return Math.max(18, Math.min(118, harmonized));
}

// Inject geometric visual note art across the timeline
// Guarantees real artistic forms (Wings, Mandalas, Lightning Stairs, Fractals)
// that are harmonically quantized to the song rather than arbitrary random noise.
function addVisualNoteArt(
  result: MidiNote[],
  artType: VisualNoteArt,
  notes: MidiNote[],
  bpmMult: number,
  density: number,
  palette: MidiColorPalette,
  energyProfile: SongEnergyProfile,
  smartHarmonization = true,
  ghostMelodyCloak = false
) {
  const totalNotesDuration = notes.length > 0 ? notes[notes.length - 1].time / bpmMult : 30;
  const partDuration = Math.max(4, totalNotesDuration / 6);
  const step = Math.max(2, Math.floor(notes.length / Math.min(24, Math.floor(density / 4) + 6)));
  let artCounter = 0;

  // Master velocity for art notes: near-inaudible if ghostMelodyCloak is active
  const baseArtVelocity = ghostMelodyCloak ? 0.02 : 0.72;

  for (let i = 0; i < notes.length; i += step) {
    if (result.length >= 35000) break;
    const centerNote = notes[i];
    const centerTime = centerNote.time / bpmMult;
    const centerPitch = Math.min(84, Math.max(44, centerNote.midi));
    const part = Math.floor(centerTime / partDuration) % 6;
    const dynState = energyProfile.getStateAtTime(centerNote.time);
    const rootPc = dynState.subBassRootPitch % 12;
    const mode = energyProfile.detectedMode || 'Minor';

    // If imported song is relaxed here, don't overcrowd: keep ornaments delicate and spaced
    if (dynState.isRelaxed && i % (step * 2) !== 0) {
      continue;
    }

    // Determine the active visual art archetype
    let currentShape: VisualNoteArt = artType;
    if (artType === 'none') {
      return;
    } else if (artType === 'ai_masterpiece_curator') {
      // Smart AI curator assigns the optimal artistic architecture per movement:
      if (dynState.isCrazy) {
        currentShape = (part % 2 === 0) ? 'wings' : 'sierpinski_pyramid';
      } else if (dynState.isRelaxed) {
        currentShape = 'sacred_mandala';
      } else if (part === 1 || part === 3) {
        currentShape = 'lightning_stairs';
      } else {
        currentShape = 'celestial_constellation';
      }
    }

    switch (currentShape) {
      case 'wings': {
        // Masterpiece Symmetrical Feathered Angel Wings
        const wingPoints = dynState.isRelaxed
          ? 14
          : dynState.isCrazy
          ? Math.min(64, Math.floor(density) + 20)
          : Math.min(44, Math.floor(density / 2) + 12);
        const timeSpan = (dynState.isRelaxed ? 0.35 : 0.7) / bpmMult;

        for (let p = 0; p < wingPoints; p++) {
          if (result.length >= 35000) break;
          const frac = p / wingPoints;
          const tOffset = (frac - 0.5) * timeSpan;
          const noteTime = Math.max(0, centerTime + tOffset);

          // Golden-ratio logarithmic curvature for wings: W(x) = sin(pi * x) * amplitude
          const wingSpread = Math.sin(Math.PI * frac) * 44;

          const rawLeft = centerPitch - wingSpread;
          const rawRight = centerPitch + wingSpread;
          const leftPitch = quantizeToHarmonic(rawLeft, rootPc, mode, smartHarmonization);
          const rightPitch = quantizeToHarmonic(rawRight, rootPc, mode, smartHarmonization);

          // Left Wing Primary Ribbon
          result.push({
            id: `art-w-l-${artCounter++}`,
            midi: leftPitch,
            time: noteTime,
            duration: 0.045,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, leftPitch, 'art', 3, noteTime),
            track: 3,
          });

          // Right Wing Primary Ribbon
          result.push({
            id: `art-w-r-${artCounter++}`,
            midi: rightPitch,
            time: noteTime,
            duration: 0.045,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, rightPitch, 'art', 4, noteTime),
            track: 4,
          });

          // Central Golden Spine (Channel 14 Gold)
          if (p % 4 === 0) {
            const spinePitch = quantizeToHarmonic(centerPitch, rootPc, mode, smartHarmonization);
            result.push({
              id: `art-w-spine-${artCounter++}`,
              midi: spinePitch,
              time: noteTime,
              duration: 0.035,
              velocity: baseArtVelocity * 0.9,
              isOriginal: false,
              channel: assignChannel(palette, spinePitch, 'art', 14, noteTime),
              track: 14,
            });
          }

          // Inner Feather Layer (Harmonic Octave / Third)
          if (p % 2 === 0) {
            const innerLeft = quantizeToHarmonic(centerPitch - wingSpread * 0.52, rootPc, mode, smartHarmonization);
            const innerRight = quantizeToHarmonic(centerPitch + wingSpread * 0.52, rootPc, mode, smartHarmonization);

            result.push({
              id: `art-w-il-${artCounter++}`,
              midi: innerLeft,
              time: noteTime,
              duration: 0.04,
              velocity: baseArtVelocity * 0.8,
              isOriginal: false,
              channel: assignChannel(palette, innerLeft, 'art', 5, noteTime),
              track: 5,
            });
            result.push({
              id: `art-w-ir-${artCounter++}`,
              midi: innerRight,
              time: noteTime,
              duration: 0.04,
              velocity: baseArtVelocity * 0.8,
              isOriginal: false,
              channel: assignChannel(palette, innerRight, 'art', 6, noteTime),
              track: 6,
            });
          }
        }
        break;
      }

      case 'sacred_mandala': {
        // Concentric Sacred Mandala: Interlocking expanding & contracting harmonic rhombuses
        const rings = dynState.isCrazy ? 4 : 3;
        const petalsPerRing = 16;
        const timeRadius = (dynState.isRelaxed ? 0.3 : 0.55) / bpmMult;

        for (let r = 1; r <= rings; r++) {
          const radiusPitch = r * 9;
          for (let p = 0; p < petalsPerRing; p++) {
            if (result.length >= 35000) break;
            const angle = (p / petalsPerRing) * Math.PI * 2;
            const tOffset = Math.sin(angle) * timeRadius * (r / rings);
            const pOffset = Math.cos(angle) * radiusPitch;
            const noteTime = Math.max(0, centerTime + tOffset);

            const pitch = quantizeToHarmonic(centerPitch + pOffset, rootPc, mode, smartHarmonization);
            result.push({
              id: `art-mnd-${artCounter++}`,
              midi: pitch,
              time: noteTime,
              duration: 0.04,
              velocity: baseArtVelocity,
              isOriginal: false,
              channel: assignChannel(palette, pitch, 'art', r * 3, noteTime),
              track: r,
            });
          }
        }
        break;
      }

      case 'lightning_stairs': {
        // Double-Helix Interlocking Lightning Staircases
        const numSteps = Math.min(48, Math.floor(density / 2) + 16);
        const stepTime = 0.015 / bpmMult;

        for (let s = 0; s < numSteps; s++) {
          if (result.length >= 35000) break;
          const sTime = Math.max(0, centerTime + s * stepTime);

          // Helix 1: Ascending
          const p1 = quantizeToHarmonic(28 + (s * 1.8), rootPc, mode, smartHarmonization);
          result.push({
            id: `art-lt-asc-${artCounter++}`,
            midi: p1,
            time: sTime,
            duration: 0.04,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, p1, 'art', 1, sTime),
            track: 1,
          });

          // Helix 2: Descending
          const p2 = quantizeToHarmonic(108 - (s * 1.8), rootPc, mode, smartHarmonization);
          result.push({
            id: `art-lt-dsc-${artCounter++}`,
            midi: p2,
            time: sTime,
            duration: 0.04,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, p2, 'art', 2, sTime),
            track: 2,
          });

          // Interlocking Cross-Rungs on 16th beats
          if (s % 4 === 0) {
            const midP = quantizeToHarmonic((p1 + p2) / 2, rootPc, mode, smartHarmonization);
            result.push({
              id: `art-lt-cross-${artCounter++}`,
              midi: midP,
              time: sTime,
              duration: 0.035,
              velocity: baseArtVelocity * 0.75,
              isOriginal: false,
              channel: assignChannel(palette, midP, 'art', 8, sTime),
              track: 8,
            });
          }
        }
        break;
      }

      case 'sierpinski_pyramid': {
        // Fractal Sierpinski 3-Tier Stained-Glass Pyramid
        const tiers = 3;
        const spanTime = 0.6 / bpmMult;
        for (let t = 0; t < tiers; t++) {
          const tierNotes = 12 * (t + 1);
          const apexPitch = centerPitch + 24 - t * 16;
          for (let n = 0; n < tierNotes; n++) {
            if (result.length >= 35000) break;
            const frac = n / tierNotes;
            const tOffset = (frac - 0.5) * spanTime * (1 - t * 0.25);
            const pitchSpread = frac * (18 + t * 8);
            const p = quantizeToHarmonic(apexPitch - pitchSpread, rootPc, mode, smartHarmonization);
            const noteTime = Math.max(0, centerTime + tOffset);

            result.push({
              id: `art-pyr-${artCounter++}`,
              midi: p,
              time: noteTime,
              duration: 0.038,
              velocity: baseArtVelocity,
              isOriginal: false,
              channel: assignChannel(palette, p, 'art', t * 4 + 1, noteTime),
              track: t + 1,
            });
          }
        }
        break;
      }

      case 'celestial_constellation': {
        // Celestial Starbursts & Comet Trails
        const stars = 20;
        const timeRadius = 0.45 / bpmMult;
        for (let s = 0; s < stars; s++) {
          if (result.length >= 35000) break;
          const theta = (s / stars) * Math.PI * 2;
          const dist = 12 + (s % 3) * 10;
          const tOffset = Math.sin(theta) * timeRadius;
          const p = quantizeToHarmonic(centerPitch + Math.cos(theta) * dist, rootPc, mode, smartHarmonization);
          const noteTime = Math.max(0, centerTime + tOffset);

          result.push({
            id: `art-cel-${artCounter++}`,
            midi: p,
            time: noteTime,
            duration: 0.05,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, p, 'art', (s % 6) + 4, noteTime),
            track: 7,
          });

          // Comet tail cascading downward
          if (s % 3 === 0) {
            const cometP = quantizeToHarmonic(p - 12, rootPc, mode, smartHarmonization);
            result.push({
              id: `art-cel-tail-${artCounter++}`,
              midi: cometP,
              time: noteTime + 0.04 / bpmMult,
              duration: 0.035,
              velocity: baseArtVelocity * 0.7,
              isOriginal: false,
              channel: assignChannel(palette, cometP, 'art', 11, noteTime + 0.04 / bpmMult),
              track: 8,
            });
          }
        }
        break;
      }

      case 'diamond_burst': {
        const diamondRadius = 18;
        const numRays = Math.min(32, Math.floor(density / 2) + 8);
        const timeRadius = 0.4 / bpmMult;
        for (let r = 0; r < numRays; r++) {
          if (result.length >= 35000) break;
          const frac = r / numRays;
          const tOffset = (frac - 0.5) * timeRadius * 2;
          const pOffset = Math.round((1 - Math.abs(2 * frac - 1)) * diamondRadius);

          const upP = quantizeToHarmonic(centerPitch + pOffset, rootPc, mode, smartHarmonization);
          const downP = quantizeToHarmonic(centerPitch - pOffset, rootPc, mode, smartHarmonization);
          const noteTime = Math.max(0, centerTime + tOffset);

          result.push({
            id: `art-dia-u-${artCounter++}`,
            midi: upP,
            time: noteTime,
            duration: 0.03,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, upP, 'art', 5, noteTime),
            track: 5,
          });

          result.push({
            id: `art-dia-d-${artCounter++}`,
            midi: downP,
            time: noteTime,
            duration: 0.03,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, downP, 'art', 7, noteTime),
            track: 7,
          });
        }
        break;
      }

      case 'staircase': {
        const numSteps = Math.min(44, Math.floor(density / 2) + 14);
        const stepTime = 0.016 / bpmMult;
        const isDescending = (i / step) % 2 === 1;

        for (let s = 0; s < numSteps; s++) {
          if (result.length >= 35000) break;
          const rawP = isDescending ? 104 - s * 2 : 24 + s * 2;
          const p = quantizeToHarmonic(rawP, rootPc, mode, smartHarmonization);
          const sTime = Math.max(0, centerTime + s * stepTime);

          result.push({
            id: `art-stair-${artCounter++}`,
            midi: p,
            time: sTime,
            duration: 0.045,
            velocity: baseArtVelocity,
            isOriginal: false,
            channel: assignChannel(palette, p, 'art', isDescending ? 2 : 1, sTime),
            track: isDescending ? 2 : 1,
          });

          // Parallel thickness step
          const pThick = quantizeToHarmonic(isDescending ? p + 1 : p - 1, rootPc, mode, smartHarmonization);
          result.push({
            id: `art-stair-th-${artCounter++}`,
            midi: pThick,
            time: sTime,
            duration: 0.04,
            velocity: baseArtVelocity * 0.85,
            isOriginal: false,
            channel: assignChannel(palette, pThick, 'art', isDescending ? 2 : 1, sTime),
            track: isDescending ? 2 : 1,
          });
        }
        break;
      }

      case 'matrix_rain': {
        const drops = Math.min(24, Math.floor(density / 4) + 6);
        for (let d = 0; d < drops; d++) {
          if (result.length >= 35000) break;
          const p = quantizeToHarmonic(108 - d * 4, rootPc, mode, smartHarmonization);
          const tOffset = (d * 0.02) / bpmMult;
          const noteTime = Math.max(0, centerTime + tOffset);

          result.push({
            id: `art-rain-${artCounter++}`,
            midi: p,
            time: noteTime,
            duration: 0.04,
            velocity: baseArtVelocity * 0.7,
            isOriginal: false,
            channel: assignChannel(palette, p, 'art', 10, noteTime),
            track: 10,
          });
        }
        break;
      }

      default:
        break;
    }
  }
}
