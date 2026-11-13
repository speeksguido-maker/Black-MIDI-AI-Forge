export type MidiColorPalette =
  | 'synthesia_rainbow'
  | 'cyber_neon'
  | 'crimson_hellfire'
  | 'gold_obsidian'
  | 'toxic_matrix'
  | 'synthwave_sunset'
  | 'octave_spectrum';

export interface MidiNote {
  id: string;
  midi: number; // 0 - 127
  time: number; // seconds
  duration: number; // seconds
  velocity: number; // 0 - 1
  isOriginal?: boolean;
  color?: string;
  track?: number;
  channel?: number; // 0 - 15 (MIDI channels for Synthesia / DAW color rendering)
}

export interface MidiSequence {
  name: string;
  bpm: number;
  duration: number;
  notes: MidiNote[];
}

export type PatternMode =
  | 'rush_e'
  | 'fractal_waterfall'
  | 'chord_shatter'
  | 'geometric_wings'
  | 'polyrhythm_blitz'
  | 'matrix_spiral'
  | 'harmonic_cascade';

export type TremoloRate = 'off' | '1/16' | '1/32' | '1/64' | '1/128';

export type VelocityDynamics =
  | 'none'
  | 'exponential'
  | 'sine_swell'
  | 'sawtooth'
  | 'random_chaos'
  | 'heartbeat';

export type VisualNoteArt =
  | 'none'
  | 'rush_video_opus'
  | 'wings'
  | 'sacred_mandala'
  | 'lightning_stairs'
  | 'sierpinski_pyramid'
  | 'celestial_constellation'
  | 'diamond_burst'
  | 'staircase'
  | 'pyramid'
  | 'matrix_rain'
  | 'ai_masterpiece_curator';

export type GlitchMode = 'off' | 'subtle_stutter' | 'black_midi_lag' | 'rush_chaos';

export type ColorTheme =
  | 'cyber_neon'
  | 'obsidian_gold'
  | 'toxic_acid'
  | 'synthwave_sunset'
  | 'crimson_hellfire';

export type TargetNotesMode = 'manual' | 'randomized' | 'ai_what_black_midi_needs';
export type MelodyMode = 'original' | 'ai_variation';

export type KeyRangePreset =
  | 'standard_88'
  | 'keyboard_100'
  | 'bosendorfer_97'
  | 'stuart_108'
  | 'full_128'
  | 'stage_76'
  | 'synth_61'
  | 'studio_49'
  | 'pocket_25'
  | 'custom';

export type SpeedRampMode = 'constant' | 'linear_accel' | 'exponential_rush' | 'climax_burst';
export type VelocityLimitCurve = 'off' | 'transparent_soft_limit' | 'black_wall' | 's_curve' | 'dynamic_humanize';

export interface BlackMidiConfig {
  densityFactor: number; // 1 to 200
  targetMinimumNotes: number; // 1 to 1,000,000,000 notes (1 Billion)!
  targetNotesMode?: TargetNotesMode;
  melodyMode?: MelodyMode; // Toggle between original song and AI-composed thematic variation
  notesHearable: boolean; // Toggle if black MIDI notes sound is hearable or muted (muted by default: false)
  colorPalette: MidiColorPalette; // Channels & track color assignments for Synthesia / DAWs
  octaveSpread: number; // 0 to 4
  tremoloRate: TremoloRate;
  patternMode: PatternMode;
  harmonicIntervals: number[]; // semitone offsets, e.g. [0, 7, 12, 19, 24]
  velocityDynamics: VelocityDynamics;
  visualNoteArt: VisualNoteArt;
  smartArtHarmonization?: boolean; // Harmonically quantize visual art notes to song's chord scale degrees
  ghostMelodyCloak?: boolean; // Keep visual art visible in piano roll while keeping it completely silent
  echoDecayCount: number; // 0 to 12
  echoSpacingFraction: number; // in beats, e.g. 0.0625 = 1/64
  preserveOriginalMelody: boolean;
  colorTheme: ColorTheme;
  bpmMultiplier: number; // 0.5 to 3.0
  quantizeMicro: boolean;

  // PIANO KEY RANGE & AI KEY SATURATION CONVERTER (User requested: convert black midi to custom key count like 100-key piano and fill all 100 keys!)
  keyRangePreset?: KeyRangePreset;
  keyCount?: number; // e.g. 100 keys, 88 keys, 128 keys (12 to 128)
  lowestMidiNote?: number; // Starting MIDI pitch (0 to 127, default 21 for 88 keys, 14 for 100 keys)
  aiKeySaturation?: boolean; // When true, AI guarantees 100% of keys are populated with notes!
  aiKeyFillDensity?: number; // 1 to 10 density of AI saturation notes

  // SURPRISE POWER TOOLS
  speedRampMode?: SpeedRampMode; // Hypersonic speed ramp / accelerando curve
  speedRampPeakBpmMult?: number; // Peak speed multiplier (1.0 to 5.0x)
  velocityLimitCurve?: VelocityLimitCurve; // Soundfont anti-clipping limiter curve
  synthesiaChannelSplit?: boolean; // Auto-stratify registers across 16 channels

  // GLITCH FX & REFERENCE VIDEO STYLE ENGINE
  glitchMode?: GlitchMode; // Periodic Black MIDI stutter, CPU-lag freeze, & glitch buzz sounds
  glitchIntensity?: number; // 0 to 100
  introPixelWord?: string; // Pixel-art text rendered in falling MIDI notes at intro (e.g. 'RUSH')
  videoDropSilenceCuts?: boolean; // Dramatic brief blackout silences right before climax drops
  showVideoNoteCounter?: boolean; // Top-center giant live note counter in waterfall visualizer
}

export interface AiTransformRecipe {
  styleTitle: string;
  commentary: string;
  densityFactor: number;
  targetMinimumNotes?: number;
  colorPalette?: MidiColorPalette;
  octaveSpread: number;
  harmonicIntervals: number[];
  patternMode: PatternMode;
  tremoloSubdivision: number;
  dynamicVelocityWave: string;
  visualNoteArt: VisualNoteArt;
  echoDecayCount: number;
  suggestedBpmMultiplier: number;
  recommendedColorTheme: ColorTheme;
}

export interface SongMovementSection {
  name: string;
  startTime: number;
  endTime: number;
  description: string;
  keySignature: string;
  energy: number; // 0.1 to 1.0
  chords: string[];
  melodyStyle: string;
}

export interface AiGeneratedSong {
  title: string;
  description: string;
  bpm: number;
  keySignature: string;
  targetNotes: number;
  colorPalette: MidiColorPalette;
  patternMode: PatternMode;
  duration: number;
  sections?: SongMovementSection[];
  notes: MidiNote[];
}

