import React from 'react';
import {
  BlackMidiConfig,
  PatternMode,
  TremoloRate,
  VisualNoteArt,
  VelocityDynamics,
  MidiColorPalette,
  MidiSequence,
  KeyRangePreset,
  SpeedRampMode,
  VelocityLimitCurve,
  GlitchMode,
} from '../types/midi';
import { SongEnergyProfile, calculateWhatBlackMidiNeeds } from '../utils/songEnergyAnalyzer';
import { KEY_RANGE_PRESETS, getPitchName } from '../utils/keyRangeFillEngine';
import {
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Palette,
  Eye,
  Volume2,
  Flame,
  Dices,
  Bot,
  ShieldCheck,
  Music2,
  Gauge,
  CheckCircle2,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

interface DensityControlsProps {
  config: BlackMidiConfig;
  onChange: (newConfig: BlackMidiConfig) => void;
  totalNotes: number;
  originalNotesCount: number;
  currentSequence?: MidiSequence;
  energyProfile?: SongEnergyProfile | null;
  onOpenKeyStudio?: () => void;
}

export const DensityControls: React.FC<DensityControlsProps> = ({
  config,
  onChange,
  totalNotes,
  originalNotesCount,
  currentSequence,
  energyProfile,
  onOpenKeyStudio,
}) => {
  const update = (patch: Partial<BlackMidiConfig>) => {
    (onChange as any)((prev: BlackMidiConfig) => {
      const base = typeof prev === 'object' && prev !== null ? prev : config;
      return { ...base, ...patch };
    });
  };

  const [aiNeedsReason, setAiNeedsReason] = React.useState<string | null>(null);
  const [randomizedBanner, setRandomizedBanner] = React.useState<string | null>(null);

  const targetNotePresets = [
    { label: '10,000', value: 10000 },
    { label: '100,000', value: 100000 },
    { label: '1M', value: 1000000 },
    { label: '10M', value: 10000000 },
    { label: '100M', value: 100000000 },
    { label: '500M', value: 500000000 },
    { label: '1 BILLION (Max)', value: 1000000000 },
  ];

  const colorPalettes: { id: MidiColorPalette; label: string; colors: string[] }[] = [
    {
      id: 'synthesia_rainbow',
      label: 'Synthesia Rainbow (16 Channels)',
      colors: ['#3b82f6', '#ef4444', '#10b981', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4'],
    },
    {
      id: 'cyber_neon',
      label: 'Cyber Neon (Cyan / Hot Pink / Lime)',
      colors: ['#00f0ff', '#ff007f', '#a855f7', '#10b981'],
    },
    {
      id: 'crimson_hellfire',
      label: 'Crimson Hellfire (Red / Orange / Gold)',
      colors: ['#ef4444', '#f97316', '#eab308', '#dc2626'],
    },
    {
      id: 'gold_obsidian',
      label: 'Gold & Obsidian (Imperial Gold / Amber)',
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#78350f'],
    },
    {
      id: 'toxic_matrix',
      label: 'Toxic Matrix (Matrix Green / Lime / White)',
      colors: ['#22c55e', '#84cc16', '#06b6d4', '#ffffff'],
    },
    {
      id: 'synthwave_sunset',
      label: 'Synthwave Sunset (Magenta / Sunset Orange)',
      colors: ['#ec4899', '#f97316', '#8b5cf6', '#00f0ff'],
    },
    {
      id: 'octave_spectrum',
      label: 'Octave Spectrum (Pitch Stratified)',
      colors: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6'],
    },
  ];

  const patternModes: { id: PatternMode; label: string; desc: string }[] = [
    { id: 'rush_e', label: 'Rush E Stairs', desc: 'Hypersonic staccato alternating octaves' },
    { id: 'fractal_waterfall', label: 'Fractal Waterfall', desc: 'Cascading pitch-decay waterfall' },
    { id: 'chord_shatter', label: 'Chord Shatter', desc: 'Micro-arpeggiated cluster explosions' },
    { id: 'geometric_wings', label: 'Geometric Wings', desc: 'Symmetrical piano-roll angel wings' },
    { id: 'polyrhythm_blitz', label: 'Polyrhythm Blitz', desc: 'Interlocking polyrhythmic micro-grooves' },
    { id: 'matrix_spiral', label: 'Matrix Spiral', desc: 'Helical sinusoidal frequency dispersal' },
  ];

  const visualArtOptions: { id: VisualNoteArt; label: string; desc: string; icon: string }[] = [
    { id: 'rush_video_opus', label: '🎬 Rush Video Opus (Ref Style)', desc: 'Pixel text banner, moiré grids, twin neon helices & drop cuts', icon: '🎬' },
    { id: 'ai_masterpiece_curator', label: '🤖 AI Masterpiece Curator', desc: 'Auto-adapts geometry to each song movement', icon: '🤖' },
    { id: 'wings', label: '🪽 Feathered Angel Wings', desc: 'Golden-ratio parabolic wings & golden spine', icon: '🪽' },
    { id: 'sacred_mandala', label: '💠 Sacred Geometry Mandala', desc: 'Concentric harmonic diamond crystals', icon: '💠' },
    { id: 'lightning_stairs', label: '⚡ Double-Helix Lightning Stairs', desc: 'Interlocking criss-cross ascending/descending runs', icon: '⚡' },
    { id: 'sierpinski_pyramid', label: '🔺 Sierpinski Fractal Pyramids', desc: '3-tier stained-glass cathedral fractals', icon: '🔺' },
    { id: 'celestial_constellation', label: '✨ Celestial Starburst & Comets', desc: 'Radial starburst with octave comet tails', icon: '✨' },
    { id: 'diamond_burst', label: '💎 Diamond Polyhedra', desc: 'Crystalline geometric diamond bursts', icon: '💎' },
    { id: 'staircase', label: '🪜 Double-Thick Staircase', desc: 'Ascending/descending diagonal ribbons', icon: '🪜' },
    { id: 'matrix_rain', label: '🟢 Matrix Rain Cascade', desc: 'Vertical falling binary green ribbons', icon: '🟢' },
    { id: 'none', label: 'Off (Clean Waterfall)', desc: 'Only melodic octaves and tremolos', icon: '⛔' },
  ];

  const intervalPresets = [
    { semitone: 0, label: 'Unison (0)' },
    { semitone: 7, label: 'Fifth (+7)' },
    { semitone: 12, label: 'Octave (+12)' },
    { semitone: 14, label: 'Ninth (+14)' },
    { semitone: 19, label: '12th (+19)' },
    { semitone: 24, label: '2-Octaves (+24)' },
  ];

  const toggleInterval = (semitone: number) => {
    if (config.harmonicIntervals.includes(semitone)) {
      if (config.harmonicIntervals.length > 1) {
        update({
          harmonicIntervals: config.harmonicIntervals.filter((s) => s !== semitone),
        });
      }
    } else {
      update({
        harmonicIntervals: [...config.harmonicIntervals, semitone].sort((a, b) => a - b),
      });
    }
  };

  const multiplierRatio = originalNotesCount > 0 ? (totalNotes / originalNotesCount).toFixed(1) : '1.0';

  // Local state for smooth, zero-lag slider dragging up to 1 Billion
  const [localTargetNotes, setLocalTargetNotes] = React.useState<number>(
    config.targetMinimumNotes || 50000
  );
  const [inputText, setInputText] = React.useState<string>(
    String(config.targetMinimumNotes || 50000)
  );
  const [isEditingInput, setIsEditingInput] = React.useState<boolean>(false);
  const debounceTimerRef = React.useRef<any>(null);

  // Sync if external config changes (e.g. preset or AI recipe)
  React.useEffect(() => {
    const nextVal = config.targetMinimumNotes || 50000;
    setLocalTargetNotes(nextVal);
    if (!isEditingInput) {
      setInputText(String(nextVal));
    }
  }, [config.targetMinimumNotes, isEditingInput]);

  // Logarithmic conversion helpers for smooth slider motion across 9 orders of magnitude
  const posToNotes = (pos: number): number => {
    if (pos <= 0) return 1;
    if (pos >= 1000) return 1000000000;
    const exp = (pos / 1000) * 9;
    const raw = Math.pow(10, exp);
    if (raw < 1000) return Math.max(1, Math.round(raw));
    if (raw < 10000) return Math.round(raw / 100) * 100;
    if (raw < 100000) return Math.round(raw / 1000) * 1000;
    if (raw < 1000000) return Math.round(raw / 10000) * 10000;
    if (raw < 10000000) return Math.round(raw / 100000) * 100000;
    if (raw < 100000000) return Math.round(raw / 1000000) * 1000000;
    return Math.round(raw / 10000000) * 10000000;
  };

  const notesToPos = (notes: number): number => {
    if (notes <= 1) return 0;
    if (notes >= 1000000000) return 1000;
    return (Math.log10(Math.max(1, notes)) / 9) * 1000;
  };

  const commitTargetNotes = (val: number, extraPatch: Partial<BlackMidiConfig> = {}) => {
    const bounded = Math.max(1, Math.min(1000000000, val));
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    update({ targetMinimumNotes: bounded, ...extraPatch });
  };

  const handleSliderDrag = (pos: number) => {
    const computedNotes = posToNotes(pos);
    setLocalTargetNotes(computedNotes);
    setInputText(String(computedNotes));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Debounce parent config update so rapid sliding never lags the UI
    debounceTimerRef.current = setTimeout(() => {
      commitTargetNotes(computedNotes, { targetNotesMode: 'manual' });
    }, 40);
  };

  const handleNumberInput = (rawVal: string) => {
    setInputText(rawVal);
    if (rawVal.trim() === '') return;
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed)) {
      const val = Math.max(1, Math.min(1000000000, parsed));
      setLocalTargetNotes(val);
      commitTargetNotes(val, { targetNotesMode: 'manual' });
    }
  };

  const handleInputBlur = () => {
    setIsEditingInput(false);
    const parsed = parseInt(inputText, 10);
    const val = isNaN(parsed) ? (config.targetMinimumNotes || 50000) : Math.max(1, Math.min(1000000000, parsed));
    setLocalTargetNotes(val);
    setInputText(String(val));
    commitTargetNotes(val, { targetNotesMode: 'manual' });
  };

  const handlePointerUp = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    commitTargetNotes(localTargetNotes, { targetNotesMode: 'manual' });
  };

  return (
    <div className="bg-zinc-950/90 backdrop-blur-md rounded-2xl border border-zinc-800 p-5 flex flex-col gap-6 shadow-xl text-zinc-200">
      {/* Target Minimum Notes Section (User requested: set how many notes you at least want from 1 to 1 Billion) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-950 via-red-950/30 to-black border border-red-700/50 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-700/60 text-red-400 shadow-sm shadow-red-950/50">
              <Flame className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center flex-wrap gap-2">
                Target Minimum Notes in File
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-700/60">
                  Range: 1 - 1,000,000,000 (1 Billion)
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Applied: {(config.targetMinimumNotes || 50000).toLocaleString()} notes</span>
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Logarithmic zero-lag slider • Click any quick target, randomize or AI golden-ratio
              </p>
            </div>
          </div>

          {/* Direct numeric input up to 1,000,000,000 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">At least:</span>
            <input
              type="number"
              min={1}
              max={1000000000}
              step={10000}
              value={inputText}
              onFocus={() => setIsEditingInput(true)}
              onChange={(e) => handleNumberInput(e.target.value)}
              onBlur={handleInputBlur}
              className="w-44 px-3 py-1.5 bg-zinc-950 border border-red-600/50 rounded-xl text-red-300 font-mono font-black text-right text-base focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <span className="text-xs font-mono text-zinc-400 font-bold">Notes</span>
          </div>
        </div>

        {/* Logarithmic Slider 1 to 1,000,000,000 with zero lag */}
        <div className="flex flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(notesToPos(localTargetNotes))}
            onChange={(e) => handleSliderDrag(parseFloat(e.target.value))}
            onPointerUp={handlePointerUp}
            onKeyUp={handlePointerUp}
            className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>1 Note</span>
            <span>100k</span>
            <span className="text-red-400 font-medium">1M</span>
            <span>10M</span>
            <span>100M</span>
            <span>500M</span>
            <span className="text-rose-400 font-bold">1 BILLION (Max)</span>
          </div>
        </div>

        {/* Quick Presets + Randomize + What Black MIDI Needs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono text-zinc-400">Quick Targets:</span>
          {targetNotePresets.map((p) => {
            const isSelected =
              config.targetMinimumNotes === p.value &&
              (config.targetNotesMode === 'manual' || !config.targetNotesMode);
            return (
              <button
                key={p.value}
                onClick={() => {
                  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                  setLocalTargetNotes(p.value);
                  commitTargetNotes(p.value, { targetNotesMode: 'manual' });
                  setAiNeedsReason(null);
                  setRandomizedBanner(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition ${
                  isSelected
                    ? 'bg-red-600/30 text-red-200 border-red-500 font-bold ring-2 ring-red-500 shadow-md shadow-red-950/60'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}

          {/* 🎲 RANDOMIZE BUTTON (User requested: make an option that the black midi at least notes is randomized) */}
          <button
            onClick={() => {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              const randomizedPool = [
                15000, 28000, 45000, 77777, 125000, 250000, 500000, 777777,
                1234567, 3141592, 5000000, 7777777, 12500000, 25000000, 75000000,
                150000000, 500000000,
              ];
              const picked = randomizedPool[Math.floor(Math.random() * randomizedPool.length)];
              setLocalTargetNotes(picked);
              commitTargetNotes(picked, { targetNotesMode: 'randomized' });
              setRandomizedBanner(`🎲 Randomized target to ${picked.toLocaleString()} notes!`);
              setAiNeedsReason(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border transition shadow-sm ${
              config.targetNotesMode === 'randomized'
                ? 'bg-amber-500/25 text-amber-300 border-amber-500 ring-2 ring-amber-400 shadow-md shadow-amber-950/50'
                : 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border-amber-700/60'
            }`}
            title="Randomize target notes count to an exciting unpredictable density"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Randomize 🎲</span>
          </button>

          {/* 🤖 WHAT BLACK MIDI NEEDS (AI CHOICE) BUTTON */}
          <button
            onClick={() => {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              const notes = currentSequence?.notes || [];
              const dur = currentSequence?.duration || 30;
              const aiChoice = calculateWhatBlackMidiNeeds(notes, dur, energyProfile);

              setLocalTargetNotes(aiChoice.targetNotes);
              commitTargetNotes(aiChoice.targetNotes, {
                targetNotesMode: 'ai_what_black_midi_needs',
                visualNoteArt: aiChoice.idealArt,
                smartArtHarmonization: true,
                octaveSpread: aiChoice.recommendedOctaves,
                tremoloRate: aiChoice.recommendedTremolo,
              });
              setAiNeedsReason(aiChoice.reason);
              setRandomizedBanner(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-mono font-bold border transition shadow-lg ${
              config.targetNotesMode === 'ai_what_black_midi_needs'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 ring-2 ring-red-500 shadow-md shadow-red-950/70'
                : 'bg-red-950/80 hover:bg-red-900/90 text-red-200 border-red-700/80 shadow-red-950/60'
            }`}
            title="Let AI analyze the song tempo, energy and movements to choose the exact golden-ratio density needed"
          >
            <Bot className="w-3.5 h-3.5 text-red-300 animate-pulse" />
            <span>What Black MIDI Needs (AI Choice) 🤖</span>
          </button>
        </div>

        {/* Banner for AI / Randomized Selection */}
        {aiNeedsReason && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/50 border border-red-700/60 text-xs font-mono text-red-200">
            <Sparkles className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{aiNeedsReason}</span>
          </div>
        )}

        {randomizedBanner && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 border border-amber-700/60 text-xs font-mono text-amber-200">
            <Dices className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{randomizedBanner}</span>
          </div>
        )}
      </div>

      {/* Piano Key Range & AI Key Saturation Converter (User requested: convert black midi to custom key range like 100-key piano and fill all 100 keys!) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900/50 to-black border border-red-700/60 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-400 shadow-sm shadow-red-950/50">
              <Sliders className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center flex-wrap gap-2">
                Piano Key Range & AI Key Saturation
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-red-950/90 text-red-300 border border-red-600/70 font-bold flex items-center gap-1 shadow-sm">
                  <span>🎹 {(config.keyCount || 100)} Keys ({getPitchName(config.lowestMidiNote ?? 14)} to {getPitchName((config.lowestMidiNote ?? 14) + (config.keyCount ?? 100) - 1)})</span>
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 font-bold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% of Keys Filled with Notes ✓</span>
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Convert Black MIDI to any keyboard span (100-key piano, 88-key grand, 128 full range). The AI fills every single key!
              </p>
            </div>
          </div>

          {onOpenKeyStudio && (
            <button
              onClick={onOpenKeyStudio}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Open Key Studio & Heatmap</span>
            </button>
          )}
        </div>

        {/* Quick Range Presets (100 Keys, 88 Keys, 97 Keys, 128 Keys, 61 Keys) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {[
            { id: 'keyboard_100', label: '100 Keys (D-1 to F8)', lowest: 14, count: 100, badge: 'Popular' },
            { id: 'standard_88', label: '88 Keys (A0 to C8)', lowest: 21, count: 88, badge: 'Grand' },
            { id: 'bosendorfer_97', label: '97 Keys (C0 to C8)', lowest: 12, count: 97, badge: 'Imperial' },
            { id: 'full_128', label: '128 Keys (C-1 to G9)', lowest: 0, count: 128, badge: 'Full MIDI' },
            { id: 'synth_61', label: '61 Keys (C2 to C7)', lowest: 36, count: 61, badge: 'Synth' },
          ].map((item) => {
            const isSelected = (config.keyCount || 100) === item.count && (config.lowestMidiNote ?? 14) === item.lowest;
            return (
              <button
                key={item.id}
                onClick={() =>
                  update({
                    keyRangePreset: item.id as KeyRangePreset,
                    lowestMidiNote: item.lowest,
                    keyCount: item.count,
                    aiKeySaturation: true,
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                  isSelected
                    ? 'bg-red-600/30 text-white border-red-500 ring-2 ring-red-500 shadow-md shadow-red-950/60 font-bold'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{item.label}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-red-300 border border-zinc-700">
                    {item.badge}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {item.count} Keys Total
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Range Slider & Surprise Power Tools Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-zinc-800/80">
          {/* Custom Key Count Slider */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Custom Piano Keys:</span>
              <strong className="text-red-400">{config.keyCount || 100} Keys</strong>
            </div>
            <input
              type="range"
              min={12}
              max={128}
              step={1}
              value={config.keyCount || 100}
              onChange={(e) => {
                const count = parseInt(e.target.value, 10);
                const lowest = config.lowestMidiNote ?? 14;
                const safeCount = Math.min(128 - lowest, count);
                update({ keyRangePreset: 'custom', keyCount: safeCount, aiKeySaturation: true });
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>25 Keys</span>
              <span>61 Keys</span>
              <span>88 Keys</span>
              <span className="text-red-400 font-bold">100 Keys</span>
              <span>128 Keys</span>
            </div>
          </div>

          {/* Surprise Tool 1: Hypersonic Speed Overdrive / Accelerando */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Speed Accelerando:</span>
              </span>
              <strong className="text-amber-400 uppercase text-[10px]">
                {(config.speedRampMode || 'constant').replace(/_/g, ' ')}
              </strong>
            </div>
            <select
              value={config.speedRampMode || 'constant'}
              onChange={(e) => update({ speedRampMode: e.target.value as SpeedRampMode })}
              className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="constant">Constant Speed (1x)</option>
              <option value="linear_accel">Linear Accelerando (1x → 2.5x speed)</option>
              <option value="exponential_rush">Exponential Rush (Rocket near end)</option>
              <option value="climax_burst">Climax Hyper-Burst (2.5x drop)</option>
            </select>
            <span className="text-[10px] text-zinc-500">YouTube-style tempo ramp-up</span>
          </div>

          {/* Surprise Tool 2: Soundfont Anti-Clipping Soft Limiter */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Soundfont Headroom:</span>
              </span>
              <strong className="text-purple-400 uppercase text-[10px]">
                {(config.velocityLimitCurve || 'transparent_soft_limit').replace(/_/g, ' ')}
              </strong>
            </div>
            <select
              value={config.velocityLimitCurve || 'transparent_soft_limit'}
              onChange={(e) => update({ velocityLimitCurve: e.target.value as VelocityLimitCurve })}
              className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="transparent_soft_limit">Soft Ceiling (-3dB headroom)</option>
              <option value="black_wall">Black Wall (Maximum Visual Punch)</option>
              <option value="s_curve">Sigmoid S-Curve Dynamics</option>
              <option value="dynamic_humanize">Humanize Micro-Dynamics (±5%)</option>
              <option value="off">Off (Raw Velocity)</option>
            </select>
            <span className="text-[10px] text-zinc-500">Prevents clipping in OmniMIDI & DAWs</span>
          </div>
        </div>
      </div>

      {/* Black MIDI Glitch Sounds & Reference Video Style Studio */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-950 via-red-950/25 to-black border border-red-700/60 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-400">
              <Zap className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center flex-wrap gap-2">
                Black MIDI Glitch FX & Reference Video Engine
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-red-950/90 text-red-300 border border-red-600/70 font-bold">
                  Stutter Buzz • Lag Freeze • Pixel Text • Twin Helices
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Adds periodic Black MIDI buffer-stutter &amp; lag-freeze glitch sounds, falling pixel words, and dramatic pre-drop blackout cuts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              update({
                visualNoteArt: 'rush_video_opus',
                colorPalette: 'synthesia_rainbow',
                patternMode: 'rush_e',
                glitchMode: 'black_midi_lag',
                glitchIntensity: 65,
                videoDropSilenceCuts: true,
                showVideoNoteCounter: true,
                introPixelWord: config.introPixelWord || 'RUSH',
                tremoloRate: '1/64',
              })
            }
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-950 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Match Reference Video Preset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Glitch Sound Mode */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Glitch Sound FX:</span>
              <strong className="text-red-400 uppercase text-[10px]">
                {(config.glitchMode || 'black_midi_lag').replace(/_/g, ' ')}
              </strong>
            </div>
            <select
              value={config.glitchMode || 'black_midi_lag'}
              onChange={(e) => update({ glitchMode: e.target.value as GlitchMode })}
              className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="black_midi_lag">Black MIDI Lag + Stutter (Recommended)</option>
              <option value="rush_chaos">Rush Chaos (Heavy Glitches &amp; Crunch)</option>
              <option value="subtle_stutter">Subtle Stutter Bursts</option>
              <option value="off">Off (Clean Audio)</option>
            </select>
            <span className="text-[10px] text-zinc-500">Micro-stutters, freeze-cuts &amp; buzzes</span>
          </div>

          {/* Glitch Frequency / Intensity */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Glitch Intensity:</span>
              <strong className="text-amber-400">{config.glitchIntensity ?? 55}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.glitchIntensity ?? 55}
              onChange={(e) => update({ glitchIntensity: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500 mt-1"
            />
            <span className="text-[10px] text-zinc-500">Controls how often glitches fire</span>
          </div>

          {/* Intro Pixel Word Art */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-300">Intro Pixel Text:</span>
              <strong className="text-rose-300 text-[10px]">FALLING NOTES</strong>
            </div>
            <input
              type="text"
              maxLength={6}
              value={config.introPixelWord ?? 'RUSH'}
              onChange={(e) => update({ introPixelWord: e.target.value.toUpperCase() })}
              placeholder="RUSH"
              className="w-full px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono font-bold text-red-300 uppercase focus:outline-none focus:border-red-500"
            />
            <span className="text-[10px] text-zinc-500">Spells word in MIDI blocks at 0:00</span>
          </div>

          {/* Dramatic Blackout Drop Cuts */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={config.videoDropSilenceCuts !== false}
              onChange={(e) => update({ videoDropSilenceCuts: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-red-500 focus:ring-red-400 accent-red-500 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white">Pre-Drop Blackout Cuts</span>
              <span className="text-[10px] text-zinc-400 leading-snug mt-0.5">
                Brief dramatic silence gaps right before massive twin-helix drops (like 0:19 in video)
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* MIDI Export Color Palette Section (User requested: add color palettes to the midi file if you download them) */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Exported MIDI File Color Palette
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Colors mapped to MIDI Channels 1-16 for Synthesia, Piano From Above & DAWs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {colorPalettes.map((cp) => {
            const isSelected = (config.colorPalette || 'synthesia_rainbow') === cp.id;
            return (
              <button
                key={cp.id}
                onClick={() => update({ colorPalette: cp.id })}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-md ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-xs font-semibold leading-tight">{cp.label}</span>
                <div className="flex items-center gap-1 mt-1">
                  {cp.colors.map((c, i) => (
                    <span
                      key={i}
                      className="w-3.5 h-3.5 rounded-sm border border-white/20"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Algorithmic Pattern Style */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          Black MIDI Algorithmic Archetype
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {patternModes.map((p) => {
            const isSelected = config.patternMode === p.id;
            return (
              <button
                key={p.id}
                onClick={() => update({ patternMode: p.id })}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/60 text-white shadow-md'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-xs font-semibold flex items-center justify-between">
                  {p.label}
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                </span>
                <span className="text-[11px] text-slate-400">{p.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine-Tuning Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tremolo Slicing */}
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Machine-Gun Tremolo
            </span>
            <span className="font-mono font-bold text-amber-400 uppercase">
              {config.tremoloRate}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 pt-1">
            {(['off', '1/16', '1/32', '1/64', '1/128'] as TremoloRate[]).map((r) => (
              <button
                key={r}
                onClick={() => update({ tremoloRate: r })}
                className={`py-1.5 rounded-lg text-xs font-mono border transition ${
                  config.tremoloRate === r
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Octave Spread */}
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Octave Avalanche
            </span>
            <span className="font-mono font-bold text-purple-400">
              {config.octaveSpread === 0 ? 'Off' : `±${config.octaveSpread} Octaves`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={config.octaveSpread}
            onChange={(e) => update({ octaveSpread: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400 mt-2"
          />
        </div>

        {/* Visual Note Art */}
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-zinc-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-red-400" />
              Piano-Roll Real Geometric Art
            </span>
            <span className="font-mono font-bold text-red-400 text-[11px] truncate max-w-[180px]">
              {config.visualNoteArt.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
            {visualArtOptions.map((art) => {
              const isSelected = config.visualNoteArt === art.id;
              return (
                <button
                  key={art.id}
                  onClick={() => update({ visualNoteArt: art.id })}
                  className={`p-2 rounded-xl text-left border transition flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-red-600/20 text-red-200 border-red-500 font-bold shadow-md shadow-red-950/40 ring-1 ring-red-400'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-semibold flex items-center justify-between">
                    <span>{art.label}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                  </span>
                  <span className="text-[9.5px] text-zinc-500 line-clamp-1">{art.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MASTERPIECE ACOUSTIC & HARMONIC SHROUD CONTROLS (User requested: make actual art not dumb notes at random times, and cool surprise tools & settings) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900/80 to-zinc-950 border border-zinc-800 flex flex-col gap-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Harmonic Art & Acoustic Shielding
            </h4>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Real musical harmonization instead of chromatic dissonant spam
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* AI Song Variation vs Original Song Toggle (User requested toggle) */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Melody Mode
              </span>
              <span className="text-[10px] font-mono font-bold text-red-400">
                {(config.melodyMode || 'original') === 'ai_variation' ? 'AI Variation' : 'Original'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button
                type="button"
                onClick={() => update({ melodyMode: 'original' })}
                className={`py-1.5 px-1.5 text-[10.5px] font-mono font-bold rounded-lg border transition text-center cursor-pointer ${
                  (config.melodyMode || 'original') === 'original'
                    ? 'bg-red-600/25 text-red-300 border-red-500 shadow-sm shadow-red-950/40 ring-1 ring-red-400'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                🎵 Original
              </button>
              <button
                type="button"
                onClick={() => update({ melodyMode: 'ai_variation' })}
                className={`py-1.5 px-1.5 text-[10.5px] font-mono font-bold rounded-lg border transition text-center cursor-pointer ${
                  config.melodyMode === 'ai_variation'
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-amber-400 shadow-sm shadow-red-950/40 ring-1 ring-amber-400'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                🤖 AI Variation
              </button>
            </div>
            <span className="text-[9.5px] text-zinc-400">
              {(config.melodyMode || 'original') === 'original' ? 'Original melody track' : 'AI-composed thematic cadenza'}
            </span>
          </div>

          {/* Smart Chord Harmonization */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={config.smartArtHarmonization !== false}
              onChange={(e) => update({ smartArtHarmonization: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-emerald-400 accent-emerald-400 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-emerald-400" />
                Harmonize Art to Chords
              </span>
              <span className="text-[10px] text-zinc-400 leading-snug mt-0.5">
                Snaps all geometric curves to the song&apos;s active musical chord tones and scale degrees.
              </span>
            </div>
          </label>

          {/* Ghost Melody Cloak */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition">
            <input
              type="checkbox"
              checked={config.ghostMelodyCloak === true}
              onChange={(e) => update({ ghostMelodyCloak: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-cyan-400 accent-cyan-400 cursor-pointer"
            />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Ghost Melody Cloak
              </span>
              <span className="text-[10px] text-zinc-400 leading-snug mt-0.5">
                Mutes visual art notes to near-zero velocity. Art stays 100% visible on screen while the song melody stays 100% crystal clear.
              </span>
            </div>
          </label>

          {/* Turbo BPM Accelerator */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                BPM Turbo Accelerator
              </span>
              <span className="font-mono font-bold text-amber-400">
                {(config.bpmMultiplier || 1.0).toFixed(1)}x
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '1.0x', val: 1.0 },
                { label: '1.5x', val: 1.5 },
                { label: '2.0x', val: 2.0 },
                { label: '3.0x', val: 3.0 },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() => update({ bpmMultiplier: b.val })}
                  className={`py-1 text-[10px] font-mono rounded-lg border transition ${
                    Math.abs((config.bpmMultiplier || 1.0) - b.val) < 0.05
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shading, Velocity & Melody Preservation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Velocity Dynamics:</span>
          <select
            value={config.velocityDynamics}
            onChange={(e) => update({ velocityDynamics: e.target.value as VelocityDynamics })}
            className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-red-300 focus:outline-none"
          >
            <option value="none">Flat Uniform</option>
            <option value="sine_swell">Sine Swell Wave</option>
            <option value="exponential">Exponential Build</option>
            <option value="sawtooth">Sawtooth Crush</option>
            <option value="heartbeat">Heartbeat Throb</option>
            <option value="random_chaos">Random Chaos</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300">
            <input
              type="checkbox"
              checked={config.notesHearable}
              onChange={(e) => update({ notesHearable: e.target.checked })}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-amber-400 accent-amber-400 cursor-pointer"
            />
            <span>Black Notes Audible (Muted by default)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300">
            <input
              type="checkbox"
              checked={config.preserveOriginalMelody}
              onChange={(e) => update({ preserveOriginalMelody: e.target.checked })}
              className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-red-500 focus:ring-red-400 accent-red-400 cursor-pointer"
            />
            <span>Highlight Original Melody Track</span>
          </label>
        </div>
      </div>
    </div>
  );
};
