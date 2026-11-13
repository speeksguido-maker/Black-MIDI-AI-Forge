import { MidiNote, MidiSequence } from '../types/midi';

// Helper to construct note lists easily
function createNote(midi: number, time: number, duration: number, velocity = 0.85): MidiNote {
  return {
    id: `orig-${midi}-${time.toFixed(3)}`,
    midi,
    time,
    duration,
    velocity,
    isOriginal: true,
  };
}

// 1. Rush E (Iconic Black MIDI anthem - Sheet Music Boss)
export function getRushE(): MidiSequence {
  const bpm = 160;
  const beat = 60 / bpm; // 0.375s
  const sixteenth = beat / 4;
  const notes: MidiNote[] = [];

  // Repeated E tremolo intro + melody
  const e5 = 76;
  const e4 = 64;
  const a4 = 69;
  const c5 = 72;
  const b4 = 71;
  const gSharp4 = 68;

  let t = 0;
  // Intro: 16 rapid E notes (the trademark Rush E staccato)
  for (let i = 0; i < 16; i++) {
    notes.push(createNote(e5, t, sixteenth * 0.8, 0.9));
    notes.push(createNote(e4, t, sixteenth * 0.8, 0.75));
    t += sixteenth;
  }

  // Theme phrase 1
  const melody = [
    { p: e5, d: 2 }, { p: b4, d: 2 }, { p: c5, d: 2 }, { p: b4, d: 2 },
    { p: a4, d: 2 }, { p: gSharp4, d: 2 }, { p: a4, d: 2 }, { p: b4, d: 2 },
    { p: e5, d: 4 }, { p: c5, d: 2 }, { p: b4, d: 2 }, { p: a4, d: 4 },
  ];

  for (const item of melody) {
    const dur = item.d * sixteenth;
    // Rapid retriggering characteristic of Rush E
    for (let sub = 0; sub < item.d; sub++) {
      notes.push(createNote(item.p, t + sub * sixteenth, sixteenth * 0.85, 0.95));
      // Bass octave
      notes.push(createNote(item.p - 12, t + sub * sixteenth, sixteenth * 0.85, 0.7));
    }
    // Harmony accompaniment
    notes.push(createNote(item.p - 24, t, dur, 0.8));
    t += dur;
  }

  // Climax tremolo run
  for (let i = 0; i < 24; i++) {
    const pitch = 64 + (i % 12);
    notes.push(createNote(pitch, t, sixteenth * 0.7, 0.9));
    notes.push(createNote(pitch + 12, t, sixteenth * 0.7, 0.85));
    t += sixteenth * 0.5;
  }

  return {
    name: 'Rush E (Black MIDI Theme)',
    bpm,
    duration: t + 0.5,
    notes,
  };
}

// 2. Beethoven - Für Elise
export function getFurElise(): MidiSequence {
  const bpm = 136;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const eighth = beat / 2;
  const notes: MidiNote[] = [];

  let t = 0;
  // E5, D#5, E5, D#5, E5, B4, D5, C5, A4
  const motif = [
    76, 75, 76, 75, 76, 71, 74, 72, 69,
  ];

  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 0; i < motif.length; i++) {
      const dur = i === motif.length - 1 ? beat : sixteenth * 1.5;
      notes.push(createNote(motif[i], t, dur * 0.9, 0.9));
      if (i === motif.length - 1) {
        // Am chord in bass
        notes.push(createNote(45, t, beat * 2, 0.7)); // A2
        notes.push(createNote(52, t, beat * 2, 0.7)); // E3
        notes.push(createNote(57, t, beat * 2, 0.7)); // A3
        notes.push(createNote(60, t, beat * 2, 0.7)); // C4
      }
      t += dur;
    }

    // Follow-up: C4, E4, A4, B4
    const nextPhrase = [60, 64, 69, 71];
    for (const p of nextPhrase) {
      notes.push(createNote(p, t, eighth * 0.85, 0.85));
      t += eighth;
    }
    // E major in bass
    notes.push(createNote(40, t, beat * 2, 0.7)); // E2
    notes.push(createNote(52, t, beat * 2, 0.7)); // E3
    notes.push(createNote(56, t, beat * 2, 0.7)); // G#3
    notes.push(createNote(59, t, beat * 2, 0.7)); // B3
    notes.push(createNote(76, t, beat * 1.5, 0.9)); // E5
    t += beat * 1.5;
  }

  return {
    name: 'Beethoven - Für Elise',
    bpm,
    duration: t + 0.5,
    notes,
  };
}

// 3. Bad Apple!! (Touhou Project)
export function getBadApple(): MidiSequence {
  const bpm = 138;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const eighth = beat / 2;
  const notes: MidiNote[] = [];

  let t = 0;
  // Dm key: D4, E4, F4, G4, A4, Bb4...
  const melody = [
    { p: 62, d: eighth }, { p: 64, d: eighth }, { p: 65, d: beat },
    { p: 67, d: eighth }, { p: 69, d: eighth }, { p: 70, d: beat },
    { p: 69, d: eighth }, { p: 67, d: eighth }, { p: 65, d: eighth }, { p: 64, d: eighth },
    { p: 62, d: beat * 1.5 },
    { p: 60, d: eighth }, { p: 62, d: beat * 2 },
  ];

  // Repeat twice with driving bass
  for (let rep = 0; rep < 2; rep++) {
    for (const m of melody) {
      notes.push(createNote(m.p, t, m.d * 0.9, 0.92));
      notes.push(createNote(m.p + 12, t, m.d * 0.9, 0.8)); // Octave lead

      // Driving bass 16ths
      const steps = Math.floor(m.d / sixteenth);
      for (let s = 0; s < steps; s++) {
        notes.push(createNote(38, t + s * sixteenth, sixteenth * 0.7, 0.75));
        notes.push(createNote(50, t + s * sixteenth, sixteenth * 0.7, 0.65));
      }

      t += m.d;
    }
  }

  return {
    name: 'ZUN - Bad Apple!!',
    bpm,
    duration: t + 0.5,
    notes,
  };
}

// 4. Megalovania (Toby Fox)
export function getMegalovania(): MidiSequence {
  const bpm = 120;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const notes: MidiNote[] = [];

  let t = 0;
  const roots = [62, 60, 59, 58]; // D4, C4, B3, Bb3

  for (const root of roots) {
    // [root, root, root+12, root+7, root+6, root+5, root+3, root, root+3, root+5]
    // D4, D4, D5, A4, Ab4, G4, F4, D4, F4, G4
    const seq = [
      { p: root, d: sixteenth },
      { p: root, d: sixteenth },
      { p: root + 12, d: sixteenth * 2 },
      { p: root + 7, d: sixteenth * 2 },
      { p: root + 6, d: sixteenth * 2 },
      { p: root + 5, d: sixteenth * 2 },
      { p: root + 3, d: sixteenth * 2 },
      { p: root, d: sixteenth },
      { p: root + 3, d: sixteenth },
      { p: root + 5, d: sixteenth },
    ];

    for (const s of seq) {
      notes.push(createNote(s.p, t, s.d * 0.85, 0.95));
      notes.push(createNote(s.p - 12, t, s.d * 0.85, 0.75));
      t += s.d;
    }
  }

  return {
    name: 'Toby Fox - Megalovania',
    bpm,
    duration: t + 0.5,
    notes,
  };
}

// 5. Canon in D
export function getCanonInD(): MidiSequence {
  const bpm = 100;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const eighth = beat / 2;
  const notes: MidiNote[] = [];

  let t = 0;
  // D, A, Bm, F#m, G, D, G, A
  const chords = [
    { bass: 50, harmony: [62, 66, 69] }, // D
    { bass: 45, harmony: [57, 61, 64] }, // A
    { bass: 47, harmony: [59, 62, 66] }, // Bm
    { bass: 42, harmony: [54, 57, 61] }, // F#m
    { bass: 43, harmony: [55, 59, 62] }, // G
    { bass: 50, harmony: [57, 62, 66] }, // D
    { bass: 43, harmony: [55, 59, 62] }, // G
    { bass: 45, harmony: [57, 61, 64] }, // A
  ];

  for (const c of chords) {
    // Bass note
    notes.push(createNote(c.bass, t, beat * 2, 0.8));
    // Arpeggiate harmony
    let subT = t;
    for (let i = 0; i < 4; i++) {
      const pitch = c.harmony[i % c.harmony.length] + (i >= 3 ? 12 : 0);
      notes.push(createNote(pitch, subT, eighth * 0.85, 0.85));
      notes.push(createNote(pitch + 12, subT + sixteenth, sixteenth * 0.7, 0.75));
      subT += eighth;
    }
    t += beat * 2;
  }

  return {
    name: 'Pachelbel - Canon in D',
    bpm,
    duration: t + 0.5,
    notes,
  };
}

// 6. Flight of the Bumblebee
export function getFlightOfBumblebee(): MidiSequence {
  const bpm = 175;
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const notes: MidiNote[] = [];

  let t = 0;
  // Chromatic downward/upward runs
  const basePitches = [72, 71, 70, 69, 70, 71, 72, 73, 74, 73, 72, 71, 70, 69, 68, 67];

  for (let rep = 0; rep < 4; rep++) {
    const shift = rep * 2;
    for (const p of basePitches) {
      notes.push(createNote(p + shift, t, sixteenth * 0.75, 0.88));
      // Staccato bass hit on quarter notes
      if (Math.floor(t / beat) !== Math.floor((t - sixteenth) / beat)) {
        notes.push(createNote(48 + (rep % 4), t, beat * 0.6, 0.9));
      }
      t += sixteenth;
    }
  }

  return {
    name: 'Rimsky-Korsakov - Bumblebee',
    bpm,
    duration: t + 0.5,
    notes,
  };
}

export const PRESET_LIST = [
  { id: 'rush_e', title: 'Rush E (Black MIDI Anthem)', loader: getRushE, tags: ['Extreme', 'Memes', 'Fast'] },
  { id: 'bad_apple', title: 'ZUN - Bad Apple!!', loader: getBadApple, tags: ['Touhou', 'Iconic', 'Driving'] },
  { id: 'fur_elise', title: 'Beethoven - Für Elise', loader: getFurElise, tags: ['Classical', 'Dynamic', 'Popular'] },
  { id: 'megalovania', title: 'Toby Fox - Megalovania', loader: getMegalovania, tags: ['Gaming', 'Syncopated', 'Heavy'] },
  { id: 'canon_in_d', title: 'Pachelbel - Canon in D', loader: getCanonInD, tags: ['Baroque', 'Harmonic', 'Majestic'] },
  { id: 'bumblebee', title: 'Flight of the Bumblebee', loader: getFlightOfBumblebee, tags: ['Chromatic', 'Ultra-Speed'] },
];
