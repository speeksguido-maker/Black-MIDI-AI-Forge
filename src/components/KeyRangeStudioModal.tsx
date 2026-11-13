import React, { useState } from 'react';
import {
  BlackMidiConfig,
  KeyRangePreset,
  SpeedRampMode,
  VelocityLimitCurve,
  MidiNote,
} from '../types/midi';
import {
  KEY_RANGE_PRESETS,
  getPitchName,
  getKeyCoverageStats,
} from '../utils/keyRangeFillEngine';
import {
  X,
  Flame,
  CheckCircle2,
  Sliders,
  Sparkles,
  Zap,
  Gauge,
  Volume2,
  Layers,
  Music,
  ArrowRight,
  ShieldCheck,
  Activity,
  Bot,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface KeyRangeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BlackMidiConfig;
  onChange: (patch: Partial<BlackMidiConfig>) => void;
  currentNotes: MidiNote[];
}

export const KeyRangeStudioModal: React.FC<KeyRangeStudioModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  currentNotes,
}) => {
  if (!isOpen) return null;

  const currentLowest = config.lowestMidiNote ?? 14;
  const currentCount = config.keyCount ?? 100;
  const currentPreset = config.keyRangePreset ?? 'keyboard_100';

  const stats = getKeyCoverageStats(currentNotes, currentLowest, currentCount);

  const handleSelectPreset = (presetId: KeyRangePreset) => {
    const info = KEY_RANGE_PRESETS[presetId];
    if (!info) return;

    onChange({
      keyRangePreset: presetId,
      lowestMidiNote: info.lowestMidi,
      keyCount: info.keyCount,
      aiKeySaturation: true,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#ef4444', '#dc2626', '#fbbf24'],
    });
  };

  const handleCustomCountChange = (val: number) => {
    const safeCount = Math.max(12, Math.min(128 - currentLowest, val));
    onChange({
      keyRangePreset: 'custom',
      keyCount: safeCount,
      aiKeySaturation: true,
    });
  };

  const handleLowestNoteChange = (val: number) => {
    const safeLowest = Math.max(0, Math.min(127 - 12, val));
    const safeCount = Math.min(128 - safeLowest, currentCount);
    onChange({
      keyRangePreset: 'custom',
      lowestMidiNote: safeLowest,
      keyCount: safeCount,
      aiKeySaturation: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-red-900/60 shadow-2xl shadow-red-950/60 p-6 sm:p-8 flex flex-col gap-6 text-zinc-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-400 shadow-lg shadow-red-950/50">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
                  Black MIDI Power Suite
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>100% Key Fill Engine</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Piano Key Range Studio & AI Key Saturator
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Convert your Black MIDI to any piano size (100-key piano, 88-key grand, 128 full range). The AI guarantees every single key is filled with active notes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. KEY COVERAGE METER & HEATMAP STRIP */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-red-800/50 flex flex-col gap-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Live Piano Key Coverage Spectrum
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">
                Range: <strong className="text-red-300 font-bold">{getPitchName(currentLowest)}</strong> ({currentLowest}) → <strong className="text-red-300 font-bold">{getPitchName(currentLowest + currentCount - 1)}</strong> ({currentLowest + currentCount - 1})
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600/70 font-bold">
                {stats.activeKeyCount} / {stats.keyCount} Keys Active ({stats.coveragePercent}%)
              </span>
            </div>
          </div>

          {/* Interactive Keyboard Heatmap Strip */}
          <div className="w-full h-12 bg-black rounded-xl p-1.5 border border-zinc-800 flex gap-[2px] items-end overflow-hidden">
            {stats.keyHitCounts.map((count, idx) => {
              const midi = currentLowest + idx;
              const pc = ((midi % 12) + 12) % 12;
              const isBlackKey = [1, 3, 6, 8, 10].includes(pc);
              const maxCount = Math.max(...stats.keyHitCounts, 1);
              const heightPct = count > 0 ? Math.max(15, Math.min(100, Math.round((count / maxCount) * 100))) : 8;

              return (
                <div
                  key={idx}
                  style={{ height: `${heightPct}%` }}
                  className={`flex-1 rounded-sm transition-all relative group cursor-pointer ${
                    count === 0
                      ? 'bg-zinc-800 opacity-40'
                      : isBlackKey
                      ? 'bg-gradient-to-t from-red-600 to-rose-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                      : 'bg-gradient-to-t from-amber-500 to-yellow-300 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                  }`}
                  title={`${getPitchName(midi)} (MIDI ${midi}): ${count.toLocaleString()} notes`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Low: {getPitchName(currentLowest)}</span>
            <span className="text-emerald-400 font-bold">
              {stats.coveragePercent === 100 ? '✓ Every single key actively plays notes!' : 'AI Saturation enabled: filling remaining keys'}
            </span>
            <span>High: {getPitchName(currentLowest + currentCount - 1)}</span>
          </div>
        </div>

        {/* 2. PIANO RANGE PRESETS GRID */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-red-400" />
              Choose Piano Size / MIDI Key Span
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Click to convert Black MIDI to that exact piano range
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.values(KEY_RANGE_PRESETS).map((p) => {
              const isSelected = currentPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-b from-red-950/80 to-zinc-900 border-red-500 ring-2 ring-red-500/80 shadow-lg shadow-red-950/50'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </span>
                    {p.id === 'keyboard_100' && (
                      <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-red-600 text-white uppercase tracking-wider animate-pulse">
                        Requested
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 leading-relaxed">{p.desc}</span>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-400">
                    <span>{p.keyCount} Keys Total</span>
                    <span className="text-red-400 font-bold">
                      {getPitchName(p.lowestMidi)} → {getPitchName(p.highestMidi)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. CUSTOM KEY RANGE FINE-TUNER */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-amber-400" />
              Custom Key Count & Starting Note Sliders
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              Active: {currentCount} Keys ({getPitchName(currentLowest)} to {getPitchName(currentLowest + currentCount - 1)})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Key Count Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Total Keys: <strong className="text-white">{currentCount} keys</strong></span>
                <span>Range: 12 - 128</span>
              </div>
              <input
                type="range"
                min={12}
                max={128}
                step={1}
                value={currentCount}
                onChange={(e) => handleCustomCountChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>25 (Pocket)</span>
                <span>61 (Synth)</span>
                <span className="text-red-400 font-bold">88 (Grand)</span>
                <span className="text-amber-400 font-bold">100 (Hyper)</span>
                <span>128 (Full)</span>
              </div>
            </div>

            {/* Lowest MIDI Note Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Starting Pitch: <strong className="text-white">{getPitchName(currentLowest)} (MIDI {currentLowest})</strong></span>
                <span>0 - 115</span>
              </div>
              <input
                type="range"
                min={0}
                max={115}
                step={1}
                value={currentLowest}
                onChange={(e) => handleLowestNoteChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0 (C-1)</span>
                <span>12 (C0 Bösendorfer)</span>
                <span className="text-amber-400 font-bold">14 (D-1 100-Key)</span>
                <span className="text-red-400 font-bold">21 (A0 Grand)</span>
                <span>36 (C2)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. SURPRISE HANDY POWER TOOLS MATRIX */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-red-400 animate-pulse" />
              Surprise Handy Black MIDI Tools
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Soundfont Limiter, Hypersonic Accelerando, AI Key Fill
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tool 1: AI 100% Key Fill Saturation */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    AI 100% Key Coverage Fill
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    {config.aiKeySaturation !== false ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Guarantees that every key on your {currentCount}-key piano is filled with musical notes.
                </p>
              </div>

              <button
                onClick={() => onChange({ aiKeySaturation: !(config.aiKeySaturation !== false) })}
                className={`w-full py-2 rounded-xl text-xs font-mono font-bold border transition ${
                  config.aiKeySaturation !== false
                    ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500 shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                }`}
              >
                {config.aiKeySaturation !== false ? '✓ Force 100% Keys Filled (ON)' : 'Fill Inactive Keys'}
              </button>
            </div>

            {/* Tool 2: Soundfont Headroom / Velocity Limiter */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    Soundfont Anti-Clipping Limiter
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800 font-bold uppercase">
                    {(config.velocityLimitCurve || 'transparent_soft_limit').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Prevents harsh ear-bleed and soundfont distortion in OmniMIDI, Keppy’s and DAWs.
                </p>
              </div>

              <select
                value={config.velocityLimitCurve || 'transparent_soft_limit'}
                onChange={(e) => onChange({ velocityLimitCurve: e.target.value as VelocityLimitCurve })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="transparent_soft_limit">Transparent Soft Limit (-3dB headroom)</option>
                <option value="black_wall">Black Wall (Maximum Visual Loudness)</option>
                <option value="s_curve">Sigmoid S-Curve Dynamics</option>
                <option value="dynamic_humanize">Humanize Micro-Dynamics (±5%)</option>
                <option value="off">Off (Raw Velocity)</option>
              </select>
            </div>

            {/* Tool 3: Hypersonic Accelerando Speed Ramp */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    Speed Overdrive Accelerando
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-bold uppercase">
                    {(config.speedRampMode || 'constant').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Accelerates the tempo smoothly towards the climax (classic YouTube Black MIDI speed-up).
                </p>
              </div>

              <select
                value={config.speedRampMode || 'constant'}
                onChange={(e) => onChange({ speedRampMode: e.target.value as SpeedRampMode })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="constant">Constant Speed (No Accelerando)</option>
                <option value="linear_accel">Linear Accelerando (1.0x → 2.5x speed)</option>
                <option value="exponential_rush">Exponential Rush (Rocket near end)</option>
                <option value="climax_burst">Climax Hyper-Burst (2.5x drop)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active: <strong>{currentCount} Keys</strong> ({getPitchName(currentLowest)} to {getPitchName(currentLowest + currentCount - 1)})</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectPreset('keyboard_100')}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700 transition"
            >
              Reset to 100-Key Hyper-Piano 🎹
            </button>

            <button
              onClick={() => {
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#ef4444', '#f59e0b', '#10b981'],
                });
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-950 transition active:scale-95 flex items-center gap-2"
            >
              <span>Apply & Return to Forge</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
