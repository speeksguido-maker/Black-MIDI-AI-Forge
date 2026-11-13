import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Google Site Verification Route
app.get('/google8bd1c823e66af755.html', (_req, res) => {
  res.type('text/html').send('google-site-verification: google8bd1c823e66af755.html');
});

// Shared Gemini client with telemetry header
const getAiClient = () => {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// AI Black MIDI Transformation Recipe Endpoint
app.post('/api/ai/transform', async (req, res) => {
  try {
    const { prompt, midiStats, currentStyle } = req.body;

    const ai = getAiClient();

    const systemInstruction = `You are an elite Black MIDI composer and algorithmic music theorist.
Black MIDI is an extreme musical genre featuring MIDI files with tens of thousands to millions of notes, creating visual art on piano rolls (waterfalls, angel wings, geometric shapes) and overwhelming polyphony while preserving or wildly remixing the underlying musical harmony.

Analyze the user's request and MIDI characteristics, then return a JSON configuration for the Black MIDI densification algorithm.
Parameters to provide in JSON:
- styleTitle: Creative title for this Black MIDI arrangement (e.g., "Cataclysmic Organ Cascade Opus 99", "Neon Valkyrie Harmonic Blackout")
- commentary: A thrilling 2-sentence musical explanation of the techniques applied (e.g. "Augmented with 64th-note tremolos across 4 octaves and Fibonacci fractal waterfalls.")
- densityFactor: A recommended density multiplier between 5 and 150 (integer)
- octaveSpread: 1, 2, 3, or 4 octaves of harmonic doubling
- harmonicIntervals: Array of integer semitones to harmonically layer (e.g. [0, 7, 12, 19, 24] for open fifths & octaves, or [0, 3, 7, 10, 14] for dense jazz extensions, or [0, 12, 24, 36])
- patternMode: One of: "cascade", "rush_e", "fractal_waterfall", "chord_shatter", "geometric_wings", "polyrhythm_blitz", "matrix_spiral"
- tremoloSubdivision: 8, 16, 32, 64, or 128 (how finely notes are sliced into machine-gun bursts)
- dynamicVelocityWave: "exponential", "sine_swell", "sawtooth_crush", "random_chaos", or "heartbeat"
- visualNoteArt: "wings", "staircase", "diamond_burst", "matrix_rain", "pyramid", or "waterfall"
- echoDecayCount: Integer between 2 and 16 (number of rhythmic delay echoes)
- suggestedBpmMultiplier: Number between 0.8 and 2.0 (tempo acceleration)
- recommendedColorTheme: "cyber_neon", "obsidian_gold", "toxic_acid", "synthwave_sunset", or "crimson_hellfire"

Return ONLY valid JSON matching this schema.`;

    const contents = `User Request: "${prompt || 'Turn this into an intense, breathtaking Black MIDI masterpiece'}"
Original MIDI Stats:
- Note Count: ${midiStats?.noteCount || 100}
- Unique Pitches: ${midiStats?.uniquePitches || 12}
- Pitch Range: ${midiStats?.pitchRange || 'MIDI 48-84'}
- Duration: ${midiStats?.durationSeconds ? midiStats.durationSeconds.toFixed(1) + 's' : '30s'}
- Current Style: ${currentStyle || 'default'}

Design an awe-inspiring Black MIDI transformation!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = {
        styleTitle: 'Neural Harmonic Blackout',
        commentary: 'Massive multi-octave harmonic resonance infused with high-frequency 64th-note cascading arpeggios.',
        densityFactor: 35,
        octaveSpread: 3,
        harmonicIntervals: [0, 7, 12, 19, 24],
        patternMode: 'fractal_waterfall',
        tremoloSubdivision: 32,
        dynamicVelocityWave: 'sine_swell',
        visualNoteArt: 'wings',
        echoDecayCount: 8,
        suggestedBpmMultiplier: 1.1,
        recommendedColorTheme: 'cyber_neon',
      };
    }

    res.json({ success: true, recipe: data });
  } catch (error: any) {
    console.error('Gemini transform error:', error);
    // Provide intelligent fallback recipe so user flow is never interrupted
    res.json({
      success: true,
      recipe: {
        styleTitle: 'Cyber Valkyrie Black MIDI',
        commentary: 'Dense polyphonic octave avalanches layered with hypersonic staccato micro-bursts and fractal waterfall decays.',
        densityFactor: 40,
        octaveSpread: 3,
        harmonicIntervals: [0, 7, 12, 19, 24, 31],
        patternMode: 'rush_e',
        tremoloSubdivision: 32,
        dynamicVelocityWave: 'exponential',
        visualNoteArt: 'staircase',
        echoDecayCount: 8,
        suggestedBpmMultiplier: 1.15,
        recommendedColorTheme: 'crimson_hellfire',
      },
      fallback: true,
      error: error?.message,
    });
  }
});

// Full AI Black MIDI Song Generator - Truly prompt-based 3-minute (180.0s) symphonic composer
app.post('/api/ai/generate-full-song', async (req, res) => {
  const { prompt, style, targetNotes, colorPalette } = req.body;
  try {
    const ai = getAiClient();

    const systemInstruction = `You are a virtuoso Black MIDI composer and algorithmic music theorist.
Analyze the user's prompt (style, mood, tempo, harmony, and instrumentation).
Compose a rich 3-minute (180.0s) symphonic composition structured across 7 evolving movements.
CRITICAL RULE: DO NOT repeat the same short motif across the 3 minutes! Each movement must have its own distinct melody, chord progression, and emotional intensity.

Return ONLY valid JSON matching this schema:
{
  "title": string (epic evocative title),
  "description": string (2-sentence synopsis of the 3-minute musical journey),
  "bpm": integer (between 120 and 188),
  "keySignature": string (e.g. "D Minor", "A Minor", "F# Dorian", "C# Minor", "D Lydian", "Eb Major"),
  "patternMode": "rush_e" | "fractal_waterfall" | "chord_shatter" | "geometric_wings" | "polyrhythm_blitz" | "matrix_spiral",
  "sections": [
    {
      "name": string (e.g. "Intro Prelude", "Theme A Exposition", "Theme B Modulation", "Rising Escalation", "Grand Climax", "Breakdown & Solitude", "Final Coda"),
      "startTime": number (start in seconds, 0 to 180),
      "endTime": number (end in seconds, 0 to 180),
      "description": string (musical texture and mood),
      "chords": [
        {
          "root": integer (MIDI bass pitch 28 to 48),
          "harmony": [integer, integer, integer, integer] (4 chord pitches in mid register 48 to 72)
        }
      ],
      "melody": [integer] (array of 16 to 24 distinct MIDI pitches 60 to 96 forming a complete melodic phrase for this movement),
      "melodyRhythm": [number] (note durations in 16th beats e.g. 1, 2, 4),
      "bassStyle": "ostinato" | "walking" | "pedal" | "arpeggio",
      "energy": number (0.3 to 1.0)
    }
  ]
}
Provide exactly 7 sequential sections covering 0.0s to 180.0s seamlessly.`;

    const userPrompt = `Compose an original 3-minute (180.0s) piece strictly tailored to this prompt:
"${prompt || 'Hypersonic Gothic Cyberpunk Boss Battle'}"
Algorithmic escalation mode: "${style || 'rush_e'}"
Ensure 7 distinct evolving movements with non-repetitive melodies and rich harmonic progression.`;

    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout')), 3500)
    );

    const response: any = await Promise.race([aiPromise, timeoutPromise]);

    const text = response.text || '{}';
    let blueprint: any;
    try {
      blueprint = JSON.parse(text);
    } catch {
      blueprint = null;
    }

    const song = buildFullSongFromBlueprint(blueprint, prompt, style, targetNotes, colorPalette);
    res.json({ success: true, song });
  } catch (error: any) {
    console.error('Generate full song Gemini call error (using intelligent musical fallback):', error);
    const fallback = buildFullSongFromBlueprint(null, prompt, style, targetNotes, colorPalette);
    res.json({ success: true, song: fallback, isFallback: true });
  }
});

interface SectionBlueprint {
  name: string;
  startTime: number;
  endTime: number;
  description: string;
  chords: { root: number; harmony: number[] }[];
  melody: number[];
  melodyRhythm?: number[];
  bassStyle: 'ostinato' | 'walking' | 'pedal' | 'arpeggio';
  energy: number;
}

// Deep semantic musical analysis of user prompt keywords
function analyzePromptSemantics(promptText: string) {
  const p = (promptText || '').toLowerCase();

  // 1. Frantic / Speed / Rush E / Machine-gun
  if (p.includes('rush') || p.includes('speed') || p.includes('fast') || p.includes('frantic') || p.includes('hyper') || p.includes('chaos')) {
    return {
      category: 'rush_speed',
      bpm: 180,
      keySignature: 'A Minor',
      rootPitch: 33, // A1
      scale: [0, 2, 3, 5, 7, 8, 11], // A Harmonic Minor
      themeA: [69, 72, 71, 69, 68, 69, 72, 76, 77, 76, 74, 72, 71, 72, 74, 68],
      themeB: [76, 77, 79, 77, 76, 74, 72, 74, 76, 72, 69, 71, 72, 69, 68, 64],
      escalation: [68, 69, 71, 72, 74, 76, 77, 80, 81, 80, 77, 76, 81, 83, 84, 88],
      climax: [81, 84, 83, 81, 80, 81, 84, 88, 89, 88, 86, 84, 83, 84, 86, 89],
      breakdown: [69, 67, 65, 64, 65, 67, 69, 72, 71, 69, 68, 64, 65, 67, 68, 69],
      coda: [84, 83, 81, 80, 77, 76, 74, 72, 71, 69, 68, 65, 64, 60, 57, 57],
      chordRoots: [33, 41, 38, 40], // Am - F - Dm - E
    };
  }

  // 2. Gothic / Cathedral / Dark Boss / Organ / Hell
  if (p.includes('gothic') || p.includes('cathedral') || p.includes('boss') || p.includes('dark') || p.includes('demon') || p.includes('hell') || p.includes('organ') || p.includes('vampire')) {
    return {
      category: 'gothic_boss',
      bpm: 162,
      keySignature: 'D Minor',
      rootPitch: 38, // D2
      scale: [0, 2, 3, 5, 7, 8, 11], // D Harmonic Minor
      themeA: [74, 73, 74, 77, 76, 74, 73, 70, 69, 70, 73, 74, 77, 76, 74, 69],
      themeB: [77, 76, 77, 81, 79, 77, 76, 74, 73, 74, 76, 77, 74, 70, 69, 65],
      escalation: [70, 73, 74, 76, 77, 79, 81, 82, 85, 86, 85, 82, 81, 79, 77, 86],
      climax: [86, 85, 86, 89, 88, 86, 85, 82, 81, 82, 85, 86, 89, 88, 86, 93],
      breakdown: [62, 65, 69, 73, 74, 70, 69, 67, 65, 64, 62, 61, 62, 65, 69, 74],
      coda: [86, 85, 82, 81, 77, 76, 74, 73, 70, 69, 65, 64, 62, 58, 57, 50],
      chordRoots: [38, 34, 36, 33, 41, 39], // Dm - Bb - C - A - F - Eb
    };
  }

  // 3. Cyberpunk / Synthwave / Neon / Matrix / Acid
  if (p.includes('cyber') || p.includes('synth') || p.includes('neon') || p.includes('matrix') || p.includes('acid') || p.includes('industrial') || p.includes('glitch')) {
    return {
      category: 'cyberpunk_synth',
      bpm: 150,
      keySignature: 'F# Dorian',
      rootPitch: 42, // F#2
      scale: [0, 2, 3, 5, 7, 9, 10], // Dorian
      themeA: [66, 69, 71, 73, 75, 73, 71, 69, 66, 64, 66, 69, 71, 73, 71, 69],
      themeB: [73, 75, 76, 78, 76, 75, 73, 71, 69, 71, 73, 75, 78, 76, 75, 71],
      escalation: [66, 68, 69, 71, 73, 75, 76, 78, 80, 81, 83, 85, 87, 85, 83, 90],
      climax: [78, 81, 83, 85, 87, 85, 83, 81, 78, 76, 78, 81, 83, 85, 87, 90],
      breakdown: [54, 57, 61, 64, 66, 69, 71, 73, 71, 69, 66, 64, 61, 57, 54, 42],
      coda: [85, 83, 81, 78, 76, 75, 73, 71, 69, 66, 64, 62, 59, 57, 54, 42],
      chordRoots: [42, 38, 40, 45], // F#m - D - E - A
    };
  }

  // 4. Emotional / Sad / Ballad / Melancholy / Piano / Rain
  if (p.includes('sad') || p.includes('emotion') || p.includes('ballad') || p.includes('melanchol') || p.includes('rain') || p.includes('piano') || p.includes('calm') || p.includes('peaceful')) {
    return {
      category: 'emotional_ballad',
      bpm: 128,
      keySignature: 'C# Minor',
      rootPitch: 37, // C#2
      scale: [0, 2, 3, 5, 7, 8, 11], // Harmonic Minor
      themeA: [73, 75, 76, 80, 76, 75, 73, 71, 69, 71, 73, 76, 75, 73, 71, 68],
      themeB: [76, 80, 83, 85, 83, 80, 76, 75, 73, 76, 80, 83, 85, 83, 80, 76],
      escalation: [69, 71, 73, 75, 76, 78, 80, 81, 83, 85, 87, 88, 92, 90, 88, 95],
      climax: [85, 88, 92, 95, 92, 88, 85, 83, 80, 83, 85, 88, 92, 95, 92, 97],
      breakdown: [61, 64, 68, 71, 73, 76, 80, 76, 73, 71, 68, 64, 61, 56, 49, 37],
      coda: [85, 83, 80, 76, 75, 73, 71, 69, 68, 64, 61, 59, 56, 52, 49, 37],
      chordRoots: [37, 33, 35, 40], // C#m - A - B - E
    };
  }

  // 5. Epic / Celestial / Angel / Hero / Orchestral / Triumphant
  if (p.includes('epic') || p.includes('celestial') || p.includes('angel') || p.includes('hero') || p.includes('orchestr') || p.includes('fantasy') || p.includes('triumph')) {
    return {
      category: 'epic_celestial',
      bpm: 146,
      keySignature: 'D Lydian / Major',
      rootPitch: 38, // D2
      scale: [0, 2, 4, 6, 7, 9, 11], // D Lydian
      themeA: [74, 78, 81, 85, 86, 85, 81, 78, 76, 78, 81, 83, 81, 78, 76, 74],
      themeB: [81, 83, 85, 88, 90, 88, 85, 83, 81, 78, 81, 83, 85, 88, 86, 81],
      escalation: [74, 76, 78, 80, 81, 83, 85, 86, 88, 90, 92, 93, 95, 97, 98, 102],
      climax: [86, 90, 93, 97, 98, 97, 93, 90, 86, 88, 90, 93, 97, 98, 100, 102],
      breakdown: [62, 66, 69, 73, 74, 78, 81, 78, 74, 73, 69, 66, 62, 57, 50, 38],
      coda: [90, 88, 86, 85, 81, 78, 76, 74, 73, 69, 66, 62, 57, 54, 50, 38],
      chordRoots: [38, 42, 45, 47], // D - F#m - A - Bm
    };
  }

  // Default Touhou / Melodic Metal / Baroque
  return {
    category: 'touhou_melodic',
    bpm: 170,
    keySignature: 'D Minor',
    rootPitch: 38,
    scale: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
    themeA: [74, 72, 74, 77, 76, 74, 72, 69, 70, 69, 70, 74, 72, 70, 69, 65],
    themeB: [77, 79, 81, 82, 81, 79, 77, 76, 74, 76, 77, 79, 77, 76, 74, 70],
    escalation: [69, 70, 72, 74, 76, 77, 79, 81, 82, 84, 86, 88, 89, 91, 93, 96],
    climax: [86, 84, 86, 89, 88, 86, 84, 81, 82, 81, 82, 86, 84, 82, 81, 93],
    breakdown: [62, 65, 69, 72, 74, 77, 81, 77, 74, 72, 69, 65, 62, 57, 53, 50],
    coda: [86, 84, 81, 79, 77, 76, 74, 72, 70, 69, 67, 65, 62, 58, 57, 50],
    chordRoots: [34, 36, 33, 38], // Bb - C - Am - Dm (Royal Road)
  };
}

// Builds full 3-minute 180s multi-movement note matrix tailored to the prompt
function buildFullSongFromBlueprint(
  blueprint: any,
  prompt?: string,
  style?: string,
  targetNotes?: number,
  colorPalette?: string
) {
  const semantics = analyzePromptSemantics(prompt || '');
  const bpm = Math.max(120, Math.min(190, blueprint?.bpm || semantics.bpm));
  const beat = 60 / bpm;
  const sixteenth = beat / 4;
  const totalSeconds = 180.0; // Strictly 3 minutes (180.0s)
  const notes: any[] = [];

  // Define the 7 chronological sections covering the full 180 seconds
  const defaultSections: SectionBlueprint[] = [
    {
      name: 'Intro: Atmospheric Motif Prelude',
      startTime: 0.0,
      endTime: 25.0,
      description: 'Sparse harmonic pedals establishing key center with evocative melodic calls and delicate echoes.',
      chords: [
        { root: semantics.chordRoots[0], harmony: [semantics.chordRoots[0] + 12, semantics.chordRoots[0] + 15, semantics.chordRoots[0] + 19, semantics.chordRoots[0] + 24] },
        { root: semantics.chordRoots[1] || semantics.chordRoots[0] + 5, harmony: [semantics.chordRoots[0] + 17, semantics.chordRoots[0] + 20, semantics.chordRoots[0] + 24, semantics.chordRoots[0] + 29] },
      ],
      melody: semantics.themeA.slice(0, 8),
      bassStyle: 'pedal',
      energy: 0.4,
    },
    {
      name: 'Movement I: Main Theme A Exposition',
      startTime: 25.0,
      endTime: 55.0,
      description: 'Full-tempo entrance of the signature prompt melody with driving 16th-note bass ostinato.',
      chords: semantics.chordRoots.map((r) => ({
        root: r,
        harmony: [r + 12, r + 15, r + 19, r + 24],
      })),
      melody: semantics.themeA,
      bassStyle: 'ostinato',
      energy: 0.7,
    },
    {
      name: 'Movement II: Modulation & Counter-Theme B',
      startTime: 55.0,
      endTime: 85.0,
      description: 'Harmonic shift to relative key with an intricate contrasting counter-melody and syncopated polyphony.',
      chords: [
        { root: semantics.chordRoots[1], harmony: [semantics.chordRoots[1] + 12, semantics.chordRoots[1] + 16, semantics.chordRoots[1] + 19, semantics.chordRoots[1] + 24] },
        { root: semantics.chordRoots[2] || semantics.chordRoots[0] + 7, harmony: [semantics.chordRoots[2] + 12, semantics.chordRoots[2] + 15, semantics.chordRoots[2] + 19, semantics.chordRoots[2] + 24] },
        { root: semantics.chordRoots[0], harmony: [semantics.chordRoots[0] + 12, semantics.chordRoots[0] + 15, semantics.chordRoots[0] + 19, semantics.chordRoots[0] + 24] },
      ],
      melody: semantics.themeB,
      bassStyle: 'walking',
      energy: 0.8,
    },
    {
      name: 'Movement III: Rising Escalation & Staircase',
      startTime: 85.0,
      endTime: 115.0,
      description: 'Accelerating rhythmic tension, ascending scalar staircases, and doubling octave tremolos.',
      chords: semantics.chordRoots.map((r) => ({
        root: r,
        harmony: [r + 12, r + 16, r + 19, r + 26],
      })),
      melody: semantics.escalation,
      bassStyle: 'ostinato',
      energy: 0.9,
    },
    {
      name: 'Movement IV: The Grand Climax & Torrential Apex',
      startTime: 115.0,
      endTime: 145.0,
      description: 'The monumental peak: full polyphonic explosion of the primary theme in soaring high registers with thunderous bass.',
      chords: semantics.chordRoots.map((r) => ({
        root: r - 12, // Sub-octave bass
        harmony: [r + 12, r + 15, r + 19, r + 24, r + 31],
      })),
      melody: semantics.climax,
      bassStyle: 'ostinato',
      energy: 1.0,
    },
    {
      name: 'Movement V: Breakdown & Modal Shift',
      startTime: 145.0,
      endTime: 165.0,
      description: 'Sudden dynamic drop into a reflective modal solitude, delicate solo phrasing, and ambient space.',
      chords: [
        { root: semantics.chordRoots[0], harmony: [semantics.chordRoots[0] + 12, semantics.chordRoots[0] + 15, semantics.chordRoots[0] + 19, semantics.chordRoots[0] + 26] },
        { root: semantics.chordRoots[1], harmony: [semantics.chordRoots[1] + 12, semantics.chordRoots[1] + 16, semantics.chordRoots[1] + 19, semantics.chordRoots[1] + 24] },
      ],
      melody: semantics.breakdown,
      bassStyle: 'pedal',
      energy: 0.5,
    },
    {
      name: 'Movement VI: Final Coda & Grand Cadence',
      startTime: 165.0,
      endTime: 180.0,
      description: 'Accelerating grand cadence with torrential chromatic waterfall runs resolving onto the majestic tonic.',
      chords: [
        { root: semantics.chordRoots[2] || semantics.chordRoots[0] + 7, harmony: [semantics.chordRoots[0] + 16, semantics.chordRoots[0] + 19, semantics.chordRoots[0] + 23, semantics.chordRoots[0] + 28] },
        { root: semantics.chordRoots[0], harmony: [semantics.chordRoots[0] + 12, semantics.chordRoots[0] + 15, semantics.chordRoots[0] + 19, semantics.chordRoots[0] + 24] },
      ],
      melody: semantics.coda,
      bassStyle: 'walking',
      energy: 0.95,
    },
  ];

  // If Gemini provided valid sections, incorporate them; otherwise use our semantic sections
  const activeSections: SectionBlueprint[] =
    blueprint?.sections && Array.isArray(blueprint.sections) && blueprint.sections.length >= 4
      ? blueprint.sections.map((s: any, idx: number) => ({
          name: s.name || defaultSections[idx % defaultSections.length].name,
          startTime: typeof s.startTime === 'number' ? s.startTime : defaultSections[idx % defaultSections.length].startTime,
          endTime: typeof s.endTime === 'number' ? s.endTime : defaultSections[idx % defaultSections.length].endTime,
          description: s.description || defaultSections[idx % defaultSections.length].description,
          chords: Array.isArray(s.chords) && s.chords.length > 0 ? s.chords : defaultSections[idx % defaultSections.length].chords,
          melody: Array.isArray(s.melody) && s.melody.length > 0 ? s.melody : defaultSections[idx % defaultSections.length].melody,
          melodyRhythm: s.melodyRhythm,
          bassStyle: s.bassStyle || defaultSections[idx % defaultSections.length].bassStyle,
          energy: typeof s.energy === 'number' ? s.energy : defaultSections[idx % defaultSections.length].energy,
        }))
      : defaultSections;

  let noteId = 0;

  // Render each section across the 180-second timeline
  for (const sec of activeSections) {
    const sStart = Math.max(0, sec.startTime);
    const sEnd = Math.min(totalSeconds, sec.endTime);
    if (sEnd <= sStart) continue;

    const secDuration = sEnd - sStart;
    const chords = sec.chords.length > 0 ? sec.chords : defaultSections[0].chords;
    const melody = sec.melody.length > 0 ? sec.melody : defaultSections[0].melody;
    const chordDuration = beat * 4; // 1 measure per chord
    const numMeasures = Math.ceil(secDuration / chordDuration);

    let t = sStart;
    let chordIdx = 0;
    let melodyNoteIdx = 0;

    for (let m = 0; m < numMeasures; m++) {
      if (t >= sEnd) break;
      const ch = chords[chordIdx % chords.length];
      chordIdx++;
      const rootPitch = Math.max(20, Math.min(48, ch.root || 36));

      // 1. Bass Voice (Channel 6 for sub-root, Channel 1 for driving ostinato)
      const bassDuration = Math.min(chordDuration, sEnd - t);

      // Deep root hit
      notes.push({
        id: `song-b-${noteId++}`,
        midi: rootPitch,
        time: t,
        duration: Math.min(beat * 2, bassDuration),
        velocity: Math.min(1.0, 0.75 + sec.energy * 0.25),
        channel: 6,
        isOriginal: true,
      });

      if (sec.bassStyle === 'ostinato') {
        // 16th-note driving bass pulse
        const steps = Math.floor(bassDuration / sixteenth);
        for (let s = 0; s < steps; s++) {
          const bTime = t + s * sixteenth;
          if (bTime >= sEnd) break;
          const octPitch = rootPitch + (s % 4 === 0 ? 0 : 12);
          notes.push({
            id: `song-bo-${noteId++}`,
            midi: octPitch,
            time: bTime,
            duration: sixteenth * 0.75,
            velocity: 0.65 + (s % 4 === 0 ? 0.2 : 0.05),
            channel: 1,
            isOriginal: true,
          });
        }
      } else if (sec.bassStyle === 'walking') {
        // Quarter-note walking bass
        const steps = Math.floor(bassDuration / beat);
        for (let s = 0; s < steps; s++) {
          const bTime = t + s * beat;
          if (bTime >= sEnd) break;
          const walkOffset = [0, 7, 10, 12][s % 4];
          notes.push({
            id: `song-bw-${noteId++}`,
            midi: rootPitch + walkOffset,
            time: bTime,
            duration: beat * 0.8,
            velocity: 0.75,
            channel: 1,
            isOriginal: true,
          });
        }
      }

      // 2. Harmony Chords (Channel 2)
      const chordPitches = Array.isArray(ch.harmony) && ch.harmony.length > 0 ? ch.harmony : [rootPitch + 12, rootPitch + 15, rootPitch + 19, rootPitch + 24];
      for (const hp of chordPitches) {
        notes.push({
          id: `song-h-${noteId++}`,
          midi: Math.max(36, Math.min(96, hp)),
          time: t,
          duration: bassDuration * 0.9,
          velocity: 0.7 + sec.energy * 0.15,
          channel: 2,
          isOriginal: true,
        });
      }

      // 3. Lead Melody (Channel 0 with isOriginal: true)
      // Plays through the section's unique melody notes with rhythmic interest
      const melodySteps = Math.floor(bassDuration / sixteenth);
      let step = 0;

      while (step < melodySteps) {
        const mTime = t + step * sixteenth;
        if (mTime >= sEnd) break;

        const basePitch = melody[melodyNoteIdx % melody.length];
        melodyNoteIdx++;

        // Determine note duration based on section energy and rhythm
        let stepSpan = 2; // Default 8th note
        if (sec.energy >= 0.85) {
          stepSpan = step % 4 === 0 ? 1 : 1; // rapid 16ths in climaxes
        } else if (sec.energy <= 0.5) {
          stepSpan = 4; // quarter notes in intro / breakdown
        }

        const noteDur = Math.min(sEnd - mTime, stepSpan * sixteenth * 0.88);
        const pitchOctave = sec.energy >= 0.95 ? 12 : 0; // Climax plays in upper octave!
        const finalPitch = Math.max(50, Math.min(108, basePitch + pitchOctave));

        notes.push({
          id: `song-m-${noteId++}`,
          midi: finalPitch,
          time: mTime,
          duration: Math.max(0.04, noteDur),
          velocity: 0.95,
          channel: 0,
          isOriginal: true, // Primary melody note
        });

        // 4. Counterpoint voice (Channel 4) during movements II, III, IV, VI
        if (sec.energy >= 0.75 && step % 2 === 0) {
          notes.push({
            id: `song-cp-${noteId++}`,
            midi: Math.max(48, finalPitch - 12),
            time: mTime,
            duration: sixteenth * 0.7,
            velocity: 0.65,
            channel: 4,
            isOriginal: true,
          });
        }

        step += stepSpan;
      }

      t += bassDuration;
    }
  }

  // Format UI section cards
  const displaySections = activeSections.map((s) => ({
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    description: s.description,
    keySignature: blueprint?.keySignature || semantics.keySignature,
    energy: s.energy,
    chords: s.chords.map((c) => `MIDI Root ${c.root}`),
    melodyStyle: s.bassStyle,
  }));

  const generatedTitle =
    blueprint?.title ||
    (prompt ? `${prompt.slice(0, 32).trim()} Opus` : `Valkyrie 3-Minute ${semantics.category.replace('_', ' ')} Opus`);

  const generatedDesc =
    blueprint?.description ||
    `Dynamic 3-minute (180.0s) symphonic composition in ${semantics.keySignature} at ${bpm} BPM, meticulously structured across 7 evolving movements with tailored melodies, counterpoint, and escalating polyphony.`;

  return {
    title: generatedTitle,
    description: generatedDesc,
    bpm,
    keySignature: blueprint?.keySignature || semantics.keySignature,
    patternMode: blueprint?.patternMode || style || 'rush_e',
    colorPalette: colorPalette || 'synthesia_rainbow',
    suggestedTargetNotes: targetNotes || 1000000000,
    duration: 180.0,
    sections: displaySections,
    notes: notes.sort((a, b) => a.time - b.time),
  };
}


// Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(port),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
