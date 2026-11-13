import { MidiNote, MidiSequence } from '../types/midi';
import { SongEnergyProfile } from './songEnergyAnalyzer';

/**
 * Generates an intelligent, musical AI song variation grounded in the original piece.
 * Analyzes the song's pitch classes, motif rhythm, key signature, and melodic contour,
 * composing a virtuosic thematic variation that mirrors the structure of the original song.
 */
export function generateAiSongVariationSequence(
  originalSeq: MidiSequence,
  energyProfile?: SongEnergyProfile | null
): MidiSequence {
  const origNotes = originalSeq.notes || [];
  if (origNotes.length === 0) {
    return {
      name: `${originalSeq.name} (AI Variation)`,
      bpm: originalSeq.bpm || 120,
      duration: originalSeq.duration || 30,
      notes: [],
    };
  }

  const sorted = [...origNotes].sort((a, b) => a.time - b.time);
  const totalDuration = Math.max(5, originalSeq.duration || sorted[sorted.length - 1].time + 2);
  const bpm = originalSeq.bpm || 120;
  const beatSec = 60 / bpm;
  const sixteenthSec = beatSec / 4;

  // Extract root and motif (first 16 notes)
  const rootMidi = Math.round(sorted[0]?.midi || 60);
  const motifLen = Math.min(16, sorted.length);
  const motifPitches: number[] = [];
  for (let i = 0; i < motifLen; i++) {
    motifPitches.push(Math.round(sorted[i].midi));
  }

  // Detect mode & scale intervals
  const isMinor = energyProfile ? energyProfile.detectedMode === 'Minor' : true;
  const scaleDegrees = isMinor
    ? [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24] // Natural minor
    : [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24]; // Major

  const rootPc = rootMidi % 12;

  // Snap pitch to closest note in the song's scale
  const snapToScale = (raw: number): number => {
    const pc = ((Math.round(raw) % 12) + 12) % 12;
    const rel = ((pc - rootPc) % 12 + 12) % 12;
    let closestDiff = 999;
    let bestInterval = 0;
    for (const deg of scaleDegrees.slice(0, 7)) {
      const diff = Math.abs(rel - deg);
      if (diff < closestDiff) {
        closestDiff = diff;
        bestInterval = deg;
      }
    }
    const octave = Math.floor(raw / 12);
    return Math.max(24, Math.min(108, octave * 12 + rootPc + bestInterval));
  };

  const aiNotes: MidiNote[] = [];
  let noteId = 0;
  let curTime = 0;
  let phraseIndex = 0;

  // Generate musical phrases across the entire song duration
  while (curTime < totalDuration - 0.2) {
    const progress = curTime / totalDuration;
    const dyn = energyProfile ? energyProfile.getStateAtTime(curTime) : null;
    const isClimax = dyn ? dyn.isCrazy : (progress > 0.4 && progress < 0.6) || (progress > 0.8 && progress < 0.95);
    const isRelaxed = dyn ? dyn.isRelaxed : (progress < 0.2 || (progress > 0.65 && progress < 0.75));

    // Choose rhythmic subdivision based on musical energy
    const subdivision = isClimax
      ? sixteenthSec / 2 // 32nd notes for blazing climax
      : isRelaxed
      ? beatSec / 2 // 8th notes for serene passages
      : sixteenthSec; // 16th notes for standard passage

    const notesInPhrase = isClimax ? 32 : isRelaxed ? 8 : 16;
    const phraseType = phraseIndex % 4;

    for (let n = 0; n < notesInPhrase; n++) {
      if (curTime >= totalDuration - 0.1) break;

      const motifP = motifPitches[n % motifPitches.length];
      let targetPitch = motifP;

      switch (phraseType) {
        case 0: {
          // Phrase 1: Thematic Ornamentation (rising arpeggio turns on motif)
          const arpOffset = scaleDegrees[n % scaleDegrees.length];
          targetPitch = snapToScale(motifP + arpOffset);
          break;
        }
        case 1: {
          // Phrase 2: Inverted Counter-Subject (melodic mirror)
          const delta = motifP - rootMidi;
          targetPitch = snapToScale(rootMidi - delta + (n % 4) * 2);
          break;
        }
        case 2: {
          // Phrase 3: Virtuosic Cadenza Cascade (sweeping across registers)
          const wave = Math.sin((n / notesInPhrase) * Math.PI * 2) * 24;
          targetPitch = snapToScale(rootMidi + 12 + wave);
          break;
        }
        case 3:
        default: {
          // Phrase 4: Harmonic Choral Resolution (octave jumps & fifths)
          const fifthOffset = (n % 2 === 0 ? 0 : 7) + (n % 4 === 0 ? 12 : 0);
          targetPitch = snapToScale(motifP + fifthOffset);
          break;
        }
      }

      // Add main melody note
      const noteDur = Math.max(0.04, subdivision * 0.88);
      const vel = isClimax ? 1.0 : isRelaxed ? 0.75 : 0.9;

      aiNotes.push({
        id: `ai-var-${noteId++}`,
        midi: targetPitch,
        time: curTime,
        duration: noteDur,
        velocity: vel,
        isOriginal: true, // Counts as audible primary melody in audio engine
        channel: 0,
        track: 0,
      });

      // Octave doubling in climax sections for immense presence
      if (isClimax && n % 2 === 0 && targetPitch <= 96) {
        aiNotes.push({
          id: `ai-var-oct-${noteId++}`,
          midi: targetPitch + 12,
          time: curTime,
          duration: noteDur,
          velocity: vel * 0.9,
          isOriginal: true,
          channel: 1,
          track: 0,
        });
      }

      // Harmonic bass anchor on downbeats
      if (n % 8 === 0) {
        const subBass = Math.max(24, Math.min(36, rootPc + 24));
        aiNotes.push({
          id: `ai-var-bass-${noteId++}`,
          midi: subBass,
          time: curTime,
          duration: subdivision * 4,
          velocity: 0.95,
          isOriginal: true,
          channel: 6,
          track: 0,
        });
      }

      curTime += subdivision;
    }

    phraseIndex++;
  }

  aiNotes.sort((a, b) => a.time - b.time);

  return {
    name: `${originalSeq.name} (AI Variation)`,
    bpm,
    duration: totalDuration,
    notes: aiNotes,
  };
}
