import { MidiNote } from '../types/midi';

export interface DynamicSectionState {
  energy: number; // 0.0 (peaceful/relaxed) to 1.0 (hyper-crazy/intense)
  isCrazy: boolean; // true when energy >= 0.60
  isRelaxed: boolean; // true when energy < 0.35
  densityMultiplier: number; // 0.25x (relaxed) to 3.2x (crazy)
  subBassRootPitch: number; // Deepest dark note (MIDI 21-38) aligned to chord root
  subBassOctaves: number[]; // [P0, P0 + 12] dark resonant bass octaves
  harmonicTension: number; // 0.0 to 1.0 dissonance & modal tension
  registerSpread: number; // Semitone span between lowest and highest notes
  polyphonyCount: number; // Number of simultaneous active voices
  activePatternName: string;
}

export interface AnalyzedMovement {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  character: 'relaxed' | 'building' | 'moderate' | 'intense' | 'apocalyptic';
  avgEnergy: number;
  detectedChordRoot: string;
  description: string;
  noteCount: number;
}

export interface EnergyWaveformPoint {
  time: number;
  energy: number;
  tension: number;
  isCrazy: boolean;
  isRelaxed: boolean;
  rootName: string;
  polyphony: number;
}

export interface SongEnergyProfile {
  totalDuration: number;
  averageEnergy: number;
  maxNoteRate: number;
  detectedKey: string;
  detectedMode: 'Major' | 'Minor';
  dynamicRangeDb: number;
  movements: AnalyzedMovement[];
  waveformPoints: EnergyWaveformPoint[];
  getStateAtTime(timeSeconds: number): DynamicSectionState;
  getStateAtTick(tick: number, ticksPerSecond: number): DynamicSectionState;
  getIntegratedMultiplierSum(totalSteps: number, tickSpacing: number, ticksPerSecond: number, baseDurationTicks: number): {
    multipliers: Float32Array;
    totalSum: number;
  };
}

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Schmuckler Key Profiles (Cognitive music theory weights for 12 pitch classes)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Calculates the exact dark sub-bass anchor pitches (MIDI 21 to 38)
 * strictly aligned to the song's root pitch class (NOT random pitches!).
 *
 * MIDI 21 = A0 (27.5 Hz)
 * MIDI 22 = A#0 (29.1 Hz)
 * MIDI 23 = B0 (30.9 Hz)
 * MIDI 24 = C1 (32.7 Hz)
 * MIDI 36 = C2 (65.4 Hz)
 * MIDI 38 = D2 (73.4 Hz)
 */
export function getHarmonicSubBassPitches(rootPitchClass: number): { root: number; octaves: number[] } {
  const pc = ((Math.round(rootPitchClass) % 12) + 12) % 12;

  // Find lowest standard piano key >= 21 matching this pitch class
  let lowestMidi = 21;
  while (lowestMidi % 12 !== pc && lowestMidi < 33) {
    lowestMidi++;
  }

  const octaves: number[] = [lowestMidi];
  if (lowestMidi + 12 <= 42) {
    octaves.push(lowestMidi + 12);
  }

  return {
    root: lowestMidi,
    octaves,
  };
}

/**
 * Detects Key Signature using the Krumhansl-Schmuckler cognitive music key-finding algorithm.
 */
function detectKeySignature(pitchClassTally: Float32Array): { key: string; mode: 'Major' | 'Minor' } {
  let bestScore = -Infinity;
  let bestRoot = 0;
  let bestMode: 'Major' | 'Minor' = 'Minor';

  // Normalize tally
  let tallySum = 0;
  for (let i = 0; i < 12; i++) tallySum += pitchClassTally[i];
  if (tallySum === 0) return { key: 'C Minor', mode: 'Minor' };

  const normTally = new Float32Array(12);
  for (let i = 0; i < 12; i++) normTally[i] = pitchClassTally[i] / tallySum;

  for (let r = 0; r < 12; r++) {
    // Check Major profile correlation
    let majScore = 0;
    let minScore = 0;
    for (let i = 0; i < 12; i++) {
      const idx = (r + i) % 12;
      majScore += normTally[idx] * MAJOR_PROFILE[i];
      minScore += normTally[idx] * MINOR_PROFILE[i];
    }

    if (majScore > bestScore) {
      bestScore = majScore;
      bestRoot = r;
      bestMode = 'Major';
    }
    if (minScore > bestScore) {
      bestScore = minScore;
      bestRoot = r;
      bestMode = 'Minor';
    }
  }

  return {
    key: `${PITCH_CLASS_NAMES[bestRoot]} ${bestMode}`,
    mode: bestMode,
  };
}

/**
 * Advanced Multi-Feature AI Musical Energy Analyzer
 * Analyzes:
 * 1. Note Onset Rate & Temporal Acceleration (notes/sec)
 * 2. Harmonic Dissonance & Modal Tension Index (tritones, minor seconds vs consonant octaves/fifths)
 * 3. Spatial Register Spread (lowest bass vs soaring treble)
 * 4. Polyphony Thickness (number of active concurrent voices)
 * 5. Velocity Dynamics & Accent Bursts
 * 6. Harmonic Root & Sub-Bass Anchor Extraction (MIDI 21 to 38)
 * 7. Macro-Form Movement Segmentation
 *
 * Pre-computes smooth 0.5s sliding window buckets for O(1) instant queries.
 */
export function analyzeSongEnergyProfile(
  notes: MidiNote[],
  songDuration: number
): SongEnergyProfile {
  const duration = Math.max(1, songDuration);
  const BUCKET_SEC = 0.5;
  const numBuckets = Math.max(2, Math.ceil(duration / BUCKET_SEC) + 2);

  const bucketNoteCount = new Float32Array(numBuckets);
  const bucketVelSum = new Float32Array(numBuckets);
  const bucketShortNotes = new Float32Array(numBuckets);
  const bucketLowestPitch = new Int16Array(numBuckets).fill(127);
  const bucketHighestPitch = new Int16Array(numBuckets).fill(0);
  const bucketPitchClassCount: Uint16Array[] = Array.from({ length: numBuckets }, () => new Uint16Array(12));
  const globalPitchClassTally = new Float32Array(12);

  // Active notes for dissonance and polyphony analysis
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const bStart = Math.max(0, Math.min(numBuckets - 1, Math.floor(n.time / BUCKET_SEC)));
    const bEnd = Math.max(0, Math.min(numBuckets - 1, Math.floor((n.time + Math.max(0.04, n.duration)) / BUCKET_SEC)));

    const p = Math.max(12, Math.min(120, Math.round(n.midi)));
    const vel = n.velocity || 0.8;
    const isShort = n.duration < 0.22;
    const pc = p % 12;

    globalPitchClassTally[pc] += vel;

    for (let b = bStart; b <= bEnd; b++) {
      bucketNoteCount[b] += 1;
      bucketVelSum[b] += vel;
      if (isShort) bucketShortNotes[b] += 1;
      if (p < bucketLowestPitch[b]) bucketLowestPitch[b] = p;
      if (p > bucketHighestPitch[b]) bucketHighestPitch[b] = p;
      // Bass notes (< 60) have 3x weight for harmonic foundation
      bucketPitchClassCount[b][pc] += (p < 60 ? 3 : 1);
    }
  }

  // Detect Key Signature
  const keyInfo = detectKeySignature(globalPitchClassTally);

  // Compute raw multidimensional energy per bucket
  const rawScores = new Float32Array(numBuckets);
  const harmonicTensions = new Float32Array(numBuckets);
  let maxRate = 0;

  for (let b = 0; b < numBuckets; b++) {
    const count = bucketNoteCount[b];
    if (count === 0) {
      rawScores[b] = 0;
      harmonicTensions[b] = 0;
      continue;
    }

    const rate = count / BUCKET_SEC;
    if (rate > maxRate) maxRate = rate;

    const avgVel = bucketVelSum[b] / count;
    const shortRatio = bucketShortNotes[b] / count;

    // Register spread (distance between highest and lowest note)
    const lowP = bucketLowestPitch[b] < 127 ? bucketLowestPitch[b] : 60;
    const highP = bucketHighestPitch[b] > 0 ? bucketHighestPitch[b] : 60;
    const spread = Math.max(0, highP - lowP);
    const spreadFactor = 1.0 + Math.min(1.0, spread / 48); // Wide 4-octave spread adds up to 2x presence

    // Harmonic Dissonance / Tension:
    // Check semitone distance between active pitch classes
    let dissonanceCount = 0;
    let comparisonCount = 0;
    const pcArr = bucketPitchClassCount[b];
    for (let pc1 = 0; pc1 < 12; pc1++) {
      if (pcArr[pc1] === 0) continue;
      for (let pc2 = pc1 + 1; pc2 < 12; pc2++) {
        if (pcArr[pc2] === 0) continue;
        const diff = (pc2 - pc1) % 12;
        // Minor 2nd (1), Major 7th (11), Tritone (6) represent high tension
        if (diff === 1 || diff === 11 || diff === 6) {
          dissonanceCount += (pcArr[pc1] * pcArr[pc2]);
        }
        comparisonCount += (pcArr[pc1] * pcArr[pc2]);
      }
    }
    const tension = comparisonCount > 0 ? Math.min(1.0, (dissonanceCount / comparisonCount) * 2.5) : 0.1;
    harmonicTensions[b] = tension;

    // Multidimensional score: Rate * Velocity Dynamics * Short note subdivisions * Register Spread * Tension
    const score = rate *
      (0.35 + 0.65 * avgVel) *
      (0.85 + 0.45 * shortRatio) *
      spreadFactor *
      (0.85 + 0.35 * tension);

    rawScores[b] = score;
  }

  // Smooth scores using Gaussian 7-bucket (3.5s) window for organic musical transitions
  const smoothedScores = new Float32Array(numBuckets);
  let minScore = Infinity;
  let maxScore = -Infinity;

  for (let b = 0; b < numBuckets; b++) {
    let sum = 0;
    let weightSum = 0;
    for (let offset = -4; offset <= 4; offset++) {
      const idx = b + offset;
      if (idx >= 0 && idx < numBuckets) {
        // Gaussian bell curve weights
        const w = Math.exp(-(offset * offset) / 4.5);
        sum += rawScores[idx] * w;
        weightSum += w;
      }
    }
    const smoothed = weightSum > 0 ? sum / weightSum : 0;
    smoothedScores[b] = smoothed;
    if (smoothed < minScore) minScore = smoothed;
    if (smoothed > maxScore) maxScore = smoothed;
  }

  // Pre-compute normalized energy & section states
  const scoreRange = maxScore - minScore;
  const bucketStates: DynamicSectionState[] = new Array(numBuckets);
  const waveformPoints: EnergyWaveformPoint[] = [];
  let totalEnergySum = 0;

  let lastKnownRoot = 60; // fallback C4

  for (let b = 0; b < numBuckets; b++) {
    const rawE = scoreRange > 0.001
      ? Math.max(0, Math.min(1, (smoothedScores[b] - minScore) / scoreRange))
      : 0.45;

    totalEnergySum += rawE;

    // Detect chord root for this bucket
    let bestPc = -1;
    let maxPcCount = 0;
    const pcCounts = bucketPitchClassCount[b];
    for (let pc = 0; pc < 12; pc++) {
      if (pcCounts[pc] > maxPcCount) {
        maxPcCount = pcCounts[pc];
        bestPc = pc;
      }
    }

    if (bestPc !== -1) {
      lastKnownRoot = bestPc;
    } else if (bucketLowestPitch[b] < 127) {
      lastKnownRoot = bucketLowestPitch[b] % 12;
    }

    const subBassInfo = getHarmonicSubBassPitches(lastKnownRoot);

    const isCrazy = rawE >= 0.60;
    const isRelaxed = rawE < 0.35;

    // Continuous dynamic density curve:
    // Relaxed: 0.25x - 0.45x (airy, delicate, no chaotic note clutter)
    // Moderate: 0.7x - 1.5x (steady building momentum)
    // Crazy: 2.2x - 3.2x (apocalyptic torrent / wall of notes matching song insanity)
    let densityMult = 1.0;
    if (isRelaxed) {
      densityMult = 0.25 + rawE * 0.55; // 0.25x - 0.44x
    } else if (isCrazy) {
      const crazyProgress = (rawE - 0.60) / 0.40;
      densityMult = 2.2 + crazyProgress * 1.0; // 2.2x - 3.2x
    } else {
      const midProgress = (rawE - 0.35) / 0.25;
      densityMult = 0.65 + midProgress * 1.15; // 0.65x - 1.8x
    }

    let patternName = 'Balanced Harmonics';
    if (isRelaxed) {
      patternName = 'Relaxed Shimmer & Soft Octaves (Delicate)';
    } else if (isCrazy) {
      patternName = 'APOCALYPTIC DROP: Multi-Pattern Wall of Notes & Thunder Sub-Bass (Crazy)';
    } else {
      patternName = 'Ascending Staircase & Flowing Angel Wings (Dynamic)';
    }

    const lowP = bucketLowestPitch[b] < 127 ? bucketLowestPitch[b] : 60;
    const highP = bucketHighestPitch[b] > 0 ? bucketHighestPitch[b] : 60;

    bucketStates[b] = {
      energy: rawE,
      isCrazy,
      isRelaxed,
      densityMultiplier: densityMult,
      subBassRootPitch: subBassInfo.root,
      subBassOctaves: subBassInfo.octaves,
      harmonicTension: harmonicTensions[b],
      registerSpread: Math.max(0, highP - lowP),
      polyphonyCount: bucketNoteCount[b],
      activePatternName: patternName,
    };

    // Keep representative waveform sample point every 1 second (every 2 buckets)
    if (b % 2 === 0 || b === numBuckets - 1) {
      waveformPoints.push({
        time: b * BUCKET_SEC,
        energy: rawE,
        tension: harmonicTensions[b],
        isCrazy,
        isRelaxed,
        rootName: PITCH_CLASS_NAMES[lastKnownRoot],
        polyphony: bucketNoteCount[b],
      });
    }
  }

  const averageEnergy = totalEnergySum / Math.max(1, numBuckets);

  // Dynamic Range in Decibels estimation
  const dynamicRangeDb = Math.round(20 * Math.log10(Math.max(1.1, (maxScore + 1) / (minScore + 0.1))));

  // Automatically segment song into 4 to 6 macro movements based on energy inflection points
  const movements: AnalyzedMovement[] = [];
  const numMovements = Math.max(3, Math.min(6, Math.round(duration / 30)));
  const movementDuration = duration / numMovements;

  for (let m = 0; m < numMovements; m++) {
    const mStart = m * movementDuration;
    const mEnd = Math.min(duration, (m + 1) * movementDuration);
    const bStart = Math.max(0, Math.floor(mStart / BUCKET_SEC));
    const bEnd = Math.min(numBuckets - 1, Math.floor(mEnd / BUCKET_SEC));

    let mEnergySum = 0;
    let mCount = 0;
    let mNotes = 0;
    for (let b = bStart; b <= bEnd; b++) {
      mEnergySum += bucketStates[b]?.energy || 0;
      mNotes += bucketNoteCount[b];
      mCount++;
    }
    const avgM = mCount > 0 ? mEnergySum / mCount : 0.5;

    let char: AnalyzedMovement['character'] = 'moderate';
    let name = `Movement ${m + 1}: Thematic Passage`;
    let desc = 'Balanced harmonic counterpoint and flowing dynamic ribbons.';

    if (avgM < 0.32) {
      char = 'relaxed';
      name = m === 0 ? 'Movement I: Intimate Prelude' : `Movement ${m + 1}: Serene Breakdown`;
      desc = 'Delicate, airy texture with gentle shimmering overtones; non-chaotic spacing.';
    } else if (avgM >= 0.65) {
      char = 'apocalyptic';
      name = m === numMovements - 1 ? `Movement ${m + 1}: Grand Apocalyptic Finale` : `Movement ${m + 1}: Climax Drop & Wall of Notes`;
      desc = 'Hyper-dense torrent: dual climbing stairs, feathered angel wings, and thunderous sub-bass roots.';
    } else if (avgM >= 0.50) {
      char = 'intense';
      name = `Movement ${m + 1}: Polyphonic Escalation`;
      desc = 'Driving momentum with accelerating ratchets and expansive register leaps.';
    } else if (avgM >= 0.38) {
      char = 'building';
      name = `Movement ${m + 1}: Ascending Exposition`;
      desc = 'Stepped melodic ascension and harmonic octave expansion.';
    }

    movements.push({
      id: m + 1,
      name,
      startTime: mStart,
      endTime: mEnd,
      character: char,
      avgEnergy: avgM,
      detectedChordRoot: keyInfo.key,
      description: desc,
      noteCount: Math.round(mNotes),
    });
  }

  return {
    totalDuration: duration,
    averageEnergy,
    maxNoteRate: maxRate,
    detectedKey: keyInfo.key,
    detectedMode: keyInfo.mode,
    dynamicRangeDb,
    movements,
    waveformPoints,

    getStateAtTime(timeSeconds: number): DynamicSectionState {
      const safeTime = Math.max(0, timeSeconds % duration);
      const b = Math.max(0, Math.min(numBuckets - 1, Math.floor(safeTime / BUCKET_SEC)));
      return bucketStates[b];
    },

    getStateAtTick(tick: number, ticksPerSecond: number): DynamicSectionState {
      const timeSeconds = tick / Math.max(1, ticksPerSecond);
      return this.getStateAtTime(timeSeconds);
    },

    getIntegratedMultiplierSum(
      totalSteps: number,
      tickSpacing: number,
      ticksPerSecond: number,
      baseDurationTicks: number
    ): { multipliers: Float32Array; totalSum: number } {
      const count = Math.max(1, totalSteps);
      const multipliers = new Float32Array(count);
      let totalSum = 0;

      for (let s = 0; s < count; s++) {
        const stepTick = s * tickSpacing;
        const localTime = (stepTick % baseDurationTicks) / Math.max(1, ticksPerSecond);
        const st = this.getStateAtTime(localTime);
        multipliers[s] = st.densityMultiplier;
        totalSum += st.densityMultiplier;
      }

      return { multipliers, totalSum };
    },
  };
}

export interface WhatBlackMidiNeedsResult {
  targetNotes: number;
  reason: string;
  idealArt: 'wings' | 'sacred_mandala' | 'lightning_stairs' | 'sierpinski_pyramid' | 'celestial_constellation' | 'ai_masterpiece_curator';
  targetMultiplier: number;
  recommendedOctaves: number;
  recommendedTremolo: 'off' | '1/16' | '1/32' | '1/64' | '1/128';
  harmonicContext: string;
}

/**
 * Intelligent "What Black MIDI Needs" AI analyzer:
 * Determines the mathematically optimal note density, geometric art form,
 * and polyphonic structure tailored specifically to the song's musical characteristics.
 */
export function calculateWhatBlackMidiNeeds(
  notes: MidiNote[],
  songDuration: number,
  profile?: SongEnergyProfile | null
): WhatBlackMidiNeedsResult {
  const dur = Math.max(5, songDuration);
  const origCount = Math.max(1, notes.length);
  const nps = origCount / dur;

  // Use provided profile or calculate quick summary
  const avgEnergy = profile ? profile.averageEnergy : 0.5;
  const key = profile ? profile.detectedKey : 'Chromatic';
  const hasCrazyClimaxes = profile ? profile.movements.some((m) => m.character === 'apocalyptic' || m.character === 'intense') : true;

  // Calculate golden-ratio note volume:
  // Density should scale with duration and energy:
  // E.g. fast aggressive track (Rush E / Bad Apple): 1M - 10M notes
  // Moderate classical track (Moonlight Sonata / Fur Elise): 250k - 1.5M notes
  // Long symphonic epic: 5M - 25M notes
  let baseTargetMultiplier = 40;
  if (avgEnergy > 0.65) {
    baseTargetMultiplier = 120 + Math.round(nps * 15);
  } else if (avgEnergy > 0.45) {
    baseTargetMultiplier = 60 + Math.round(nps * 8);
  } else {
    baseTargetMultiplier = 25 + Math.round(nps * 5);
  }

  // Factor in duration
  const timeFactor = Math.min(6, Math.max(1, dur / 30));
  let calculatedTarget = Math.round(origCount * baseTargetMultiplier * timeFactor);

  // Round to aesthetic rounded intervals
  if (calculatedTarget < 50000) {
    calculatedTarget = Math.round(calculatedTarget / 5000) * 5000;
  } else if (calculatedTarget < 500000) {
    calculatedTarget = Math.round(calculatedTarget / 25000) * 25000;
  } else if (calculatedTarget < 5000000) {
    calculatedTarget = Math.round(calculatedTarget / 100000) * 100000;
  } else {
    calculatedTarget = Math.round(calculatedTarget / 500000) * 500000;
  }

  calculatedTarget = Math.max(25000, Math.min(50000000, calculatedTarget));

  // Determine ideal art based on musical character
  let idealArt: WhatBlackMidiNeedsResult['idealArt'] = 'ai_masterpiece_curator';
  let tremolo: WhatBlackMidiNeedsResult['recommendedTremolo'] = '1/32';
  let octaves = 2;

  if (avgEnergy >= 0.62) {
    idealArt = 'wings';
    tremolo = '1/64';
    octaves = 3;
  } else if (avgEnergy < 0.38) {
    idealArt = 'sacred_mandala';
    tremolo = '1/16';
    octaves = 1;
  } else if (nps > 10) {
    idealArt = 'lightning_stairs';
    tremolo = '1/32';
    octaves = 2;
  } else {
    idealArt = 'sierpinski_pyramid';
    tremolo = '1/32';
    octaves = 2;
  }

  const mins = Math.floor(dur / 60);
  const secs = Math.round(dur % 60);
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return {
    targetNotes: calculatedTarget,
    reason: `Optimal Golden-Ratio Density for ${timeStr} duration in ${key}: balances ${calculatedTarget.toLocaleString()} notes with dynamic contrast so the original piece breathes and art cascades harmoniously.`,
    idealArt,
    targetMultiplier: Math.round(calculatedTarget / origCount),
    recommendedOctaves: octaves,
    recommendedTremolo: tremolo,
    harmonicContext: `${key} • ${Math.round(avgEnergy * 100)}% Intensity • ${hasCrazyClimaxes ? 'High Dynamic Range' : 'Lyrical Polyphony'}`,
  };
}

