/**
 * Safe mathematical utilities for Black MIDI processing.
 * Avoids `Math.max(...spread)` which throws RangeError: Maximum call stack size exceeded
 * when arrays have thousands or tens of thousands of items.
 */

export function getNotesDuration(notes: { time: number; duration: number }[]): number {
  if (!notes || notes.length === 0) return 0;
  let maxEndTime = 0;
  for (let i = 0; i < notes.length; i++) {
    const end = (notes[i].time || 0) + (notes[i].duration || 0);
    if (end > maxEndTime) {
      maxEndTime = end;
    }
  }
  return maxEndTime;
}

export function getNotesPitchRange(notes: { midi: number }[]): { min: number; max: number } {
  if (!notes || notes.length === 0) return { min: 48, max: 84 };
  let min = 127;
  let max = 0;
  for (let i = 0; i < notes.length; i++) {
    const m = notes[i].midi;
    if (typeof m === 'number' && !isNaN(m)) {
      if (m < min) min = m;
      if (m > max) max = m;
    }
  }
  return {
    min: min === 127 ? 48 : Math.max(0, min),
    max: max === 0 ? 84 : Math.min(127, max),
  };
}
