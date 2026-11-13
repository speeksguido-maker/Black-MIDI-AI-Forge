import React, { useState, useEffect } from 'react';
import { MidiNote, MidiColorPalette } from '../types/midi';
import { SongEnergyProfile } from '../utils/songEnergyAnalyzer';
import { audioEngine } from '../audio/audioEngine';
import {
  Flame,
  Zap,
  Download,
  Play,
  Pause,
  RotateCcw,
  Palette,
  FileMusic,
  Disc3,
  Layers,
  Sparkles,
  BarChart3,
  Volume2,
  VolumeX,
  Headphones,
  Brain,
  Activity,
  Music,
  Sliders,
} from 'lucide-react';

interface NoteCountMasterHUDProps {
  notes: MidiNote[];
  originalNotes: MidiNote[];
  title: string;
  bpm: number;
  colorPalette: MidiColorPalette;
  targetMinimumNotes: number;
  notesHearable: boolean;
  energyProfile?: SongEnergyProfile | null;
  onOpenEnergyInspector?: () => void;
  onToggleHearable: () => void;
  onToggleLiveVisualizer?: () => void;
  isLiveVisualizerOpen?: boolean;
  onOpenBenchmark?: () => void;
  melodyMode?: 'original' | 'ai_variation';
  onToggleMelodyMode?: () => void;
  onDownloadMidi: () => void;
  onExportWav: () => void;
  isExportingWav: boolean;
  keyCount?: number;
  lowestMidi?: number;
  onOpenKeyStudio?: () => void;
}

const PALETTE_CHANNEL_COLORS: Record<MidiColorPalette, string[]> = {
  synthesia_rainbow: [
    '#3b82f6', '#ef4444', '#10b981', '#eab308',
    '#06b6d4', '#ec4899', '#f97316', '#84cc16',
    '#8b5cf6', '#f43f5e', '#14b8a6', '#f59e0b',
    '#a855f7', '#fb7185', '#eab308', '#ffffff'
  ],
  cyber_neon: [
    '#00f0ff', '#ff007f', '#a855f7', '#10b981',
    '#00f0ff', '#ff007f', '#a855f7', '#10b981',
    '#00f0ff', '#ff007f', '#a855f7', '#10b981',
    '#00f0ff', '#ff007f', '#a855f7', '#ffffff'
  ],
  crimson_hellfire: [
    '#ef4444', '#f97316', '#eab308', '#dc2626',
    '#b91c1c', '#f97316', '#fbbf24', '#7f1d1d',
    '#ef4444', '#f97316', '#eab308', '#dc2626',
    '#b91c1c', '#f97316', '#fbbf24', '#ffffff'
  ],
  gold_obsidian: [
    '#fbbf24', '#f59e0b', '#d97706', '#78350f',
    '#fef08a', '#f59e0b', '#b45309', '#451a03',
    '#fbbf24', '#f59e0b', '#d97706', '#78350f',
    '#fef08a', '#f59e0b', '#b45309', '#ffffff'
  ],
  toxic_matrix: [
    '#22c55e', '#84cc16', '#06b6d4', '#ffffff',
    '#15803d', '#4d7c0f', '#0891b2', '#f0fdf4',
    '#22c55e', '#84cc16', '#06b6d4', '#ffffff',
    '#15803d', '#4d7c0f', '#0891b2', '#f0fdf4'
  ],
  synthwave_sunset: [
    '#ec4899', '#f97316', '#8b5cf6', '#00f0ff',
    '#be185d', '#c2410c', '#6d28d9', '#0284c7',
    '#ec4899', '#f97316', '#8b5cf6', '#00f0ff',
    '#be185d', '#c2410c', '#6d28d9', '#ffffff'
  ],
  octave_spectrum: [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
    '#fb7185', '#fda4af', '#67e8f9', '#a5b4fc',
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
    '#fb7185', '#fda4af', '#67e8f9', '#ffffff'
  ],
};

export const NoteCountMasterHUD: React.FC<NoteCountMasterHUDProps> = ({
  notes,
  originalNotes,
  title,
  bpm,
  colorPalette,
  targetMinimumNotes,
  notesHearable,
  energyProfile,
  onOpenEnergyInspector,
  onToggleHearable,
  onToggleLiveVisualizer,
  isLiveVisualizerOpen,
  onOpenBenchmark,
  melodyMode = 'original',
  onToggleMelodyMode,
  onDownloadMidi,
  onExportWav,
  isExportingWav,
  keyCount = 100,
  lowestMidi = 14,
  onOpenKeyStudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync to audio engine
  useEffect(() => {
    audioEngine.loadSequence(notes);
  }, [notes]);

  useEffect(() => {
    audioEngine.setHearable(notesHearable);
  }, [notesHearable]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(audioEngine.getIsPlaying());
      setCurrentTime(audioEngine.getCurrentTime());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const totalNotes = Math.max(notes.length, targetMinimumNotes || 1);
  const originalCount = originalNotes.length;
  const multiplier = originalCount > 0 ? (totalNotes / originalCount).toFixed(1) : '1.0';

  // Real-time musical energy state at playhead position
  const currentDynState = energyProfile ? energyProfile.getStateAtTime(currentTime) : null;

  // Calculate note distribution across 16 MIDI channels
  const channelCounts = React.useMemo(() => {
    const counts = new Array<number>(16).fill(0);
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (!n) continue;
      const ch = typeof n.channel === 'number' && n.channel >= 0 && n.channel < 16
        ? n.channel
        : (typeof n.track === 'number' ? n.track % 16 : 0);
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
    return counts;
  }, [notes]);

  // Estimated MIDI file size
  const estimatedSizeBytes = totalNotes * 8 + 256;
  const estimatedSizeStr = estimatedSizeBytes > 1024 * 1024 * 1024
    ? `${(estimatedSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    : estimatedSizeBytes > 1024 * 1024
    ? `${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(estimatedSizeBytes / 1024).toFixed(0)} KB`;

  // Complexity level badge
  let tierLabel = 'CASUAL';
  let tierColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';

  if (totalNotes >= 1000000000) {
    tierLabel = '1 BILLION NOTE OBLIVION (MAXIMUM TIER)';
    tierColor = 'text-red-400 border-red-500/60 bg-red-500/25 animate-pulse';
  } else if (totalNotes >= 100000000) {
    tierLabel = '100 MILLION APOCALYPSE';
    tierColor = 'text-rose-400 border-rose-500/50 bg-rose-500/20';
  } else if (totalNotes >= 1000000) {
    tierLabel = '1 MILLION NOTE BLACKOUT';
    tierColor = 'text-purple-400 border-purple-500/40 bg-purple-500/15';
  } else if (totalNotes >= 100000) {
    tierLabel = 'TORRENTIAL BLACK MIDI';
    tierColor = 'text-amber-400 border-amber-500/40 bg-amber-500/15';
  } else if (totalNotes >= 20000) {
    tierLabel = 'DENSE RUSH E AVALANCHE';
    tierColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15';
  }

  const paletteColors = PALETTE_CHANNEL_COLORS[colorPalette] || PALETTE_CHANNEL_COLORS.synthesia_rainbow;

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleRewind = () => {
    audioEngine.seek(0);
    setCurrentTime(0);
  };

  return (
    <div className="relative w-full rounded-3xl bg-black border border-red-900/60 shadow-2xl shadow-red-950/40 overflow-hidden p-6 sm:p-8 flex flex-col gap-6 select-none">
      {/* Top Header & Track Name */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-400 shadow-lg shadow-red-950/50">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
                Black MIDI Density HUD
              </span>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${tierColor}`}>
                {tierLabel}
              </span>
              {currentDynState && (
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                    currentDynState.isCrazy
                      ? 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse'
                      : currentDynState.isRelaxed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {currentDynState.isCrazy ? 'CRAZY CLIMAX (3.2x)' : currentDynState.isRelaxed ? 'RELAXED (0.3x)' : 'DYNAMIC PACING'}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                melodyMode === 'ai_variation'
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}>
                {melodyMode === 'ai_variation' ? '🤖 Active: AI Thematic Cadenza Variation' : '🎵 Active: Original Song Arrangement'}
              </span>
            </div>
          </div>
        </div>

        {/* Audio Audition Quick Bar & AI Energy Inspector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI SONG VARIATION TOGGLE (User requested: add a toggle for ai song variation for the toggle between original song and ai song variation) */}
          {onToggleMelodyMode && (
            <button
              onClick={onToggleMelodyMode}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition shadow-md active:scale-95 cursor-pointer ${
                melodyMode === 'ai_variation'
                  ? 'bg-gradient-to-r from-red-700 via-rose-600 to-amber-600 text-white border-amber-400 ring-2 ring-red-500 shadow-red-950/50'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700'
              }`}
              title="Click to toggle between the Original Song melody and the AI-composed thematic variation"
            >
              {melodyMode === 'ai_variation' ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>AI Song Variation 🤖</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 text-red-400" />
                  <span>Original Song 🎵</span>
                </>
              )}
            </button>
          )}
          {/* LIVE PIANO ROLL WATERFALL (SYNTHESIA VIEW) BUTTON */}
          {onToggleLiveVisualizer && (
            <button
              onClick={onToggleLiveVisualizer}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-black border transition shadow-lg active:scale-95 ${
                isLiveVisualizerOpen
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white border-red-400 ring-2 ring-red-500'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-amber-600/50 hover:border-amber-500'
              }`}
              title="Toggle Live Falling Note Waterfall with 88-Key Piano Keyboard"
            >
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{isLiveVisualizerOpen ? 'Hide Waterfall' : 'Live Waterfall (Synthesia) 🎹'}</span>
            </button>
          )}

          {/* PIANO KEY RANGE & AI SATURATION STUDIO BUTTON */}
          {onOpenKeyStudio && (
            <button
              onClick={onOpenKeyStudio}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-amber-300 hover:text-white border border-amber-600/60 shadow-sm transition active:scale-95 cursor-pointer"
              title="Open Piano Key Range Studio & AI 100-Key Saturation Engine"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>🎹 {keyCount || 100} Keys (100% Filled)</span>
            </button>
          )}

          {/* POLYPHONY BENCHMARK SIMULATOR BUTTON */}
          {onOpenBenchmark && (
            <button
              onClick={onOpenBenchmark}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 shadow-sm transition active:scale-95"
              title="Test Soundfont hardware polyphony and voice limits"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Voice Benchmark ⚡</span>
            </button>
          )}

          {/* AI ENERGY INSPECTOR BUTTON */}
          {onOpenEnergyInspector && (
            <button
              onClick={onOpenEnergyInspector}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-red-950/80 hover:bg-red-900/90 text-red-300 border border-red-700/60 shadow-sm transition active:scale-95"
              title="Inspect AI musical energy curve, harmonic tension & sub-bass anchors"
            >
              <Brain className="w-4 h-4 text-red-400 animate-pulse" />
              <span>AI Energy Inspector</span>
            </button>
          )}

          {/* BLACK NOTES AUDIO TOGGLE (Muted by default; original piece remains audible) */}
          <button
            onClick={onToggleHearable}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition shadow-sm ${
              notesHearable
                ? 'bg-red-600/25 text-red-300 border-red-500/60 shadow-red-950/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="Black notes audio is muted by default. The original melody always remains audible."
          >
            {notesHearable ? (
              <>
                <Volume2 className="w-4 h-4 text-red-400" />
                <span>Black Notes: AUDIBLE (ON)</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-zinc-500" />
                <span>Black Notes: MUTED (DEFAULT)</span>
              </>
            )}
          </button>

          {/* Audio Play/Pause */}
          <button
            onClick={handleRewind}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
            title="Rewind"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs border border-zinc-700 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-red-400" /> : <Play className="w-4 h-4 text-red-400 fill-red-400" />}
            <span>{isPlaying ? 'Pause' : 'Play Test'}</span>
          </button>
        </div>
      </div>

      {/* GIANT CENTERPIECE: NOTE COUNT DISPLAY (UP TO 1 BILLION!) */}
      <div className="relative rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-950 to-black border border-red-950/80 p-8 flex flex-col items-center justify-center text-center shadow-inner overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute w-96 h-96 rounded-full bg-red-600/15 filter blur-3xl pointer-events-none -top-24" />

        <span className="relative text-xs sm:text-sm font-mono uppercase tracking-widest text-zinc-400 font-semibold mb-2">
          TOTAL NOTES IN THIS BLACK MIDI
        </span>

        {/* The Giant Number with Billions formatting */}
        <div className="relative flex flex-wrap items-baseline justify-center gap-3">
          <span className="font-mono text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-amber-400 drop-shadow-[0_0_35px_rgba(239,68,68,0.45)]">
            {totalNotes.toLocaleString()}
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-red-400/80">
            {totalNotes >= 1000000000 ? 'NOTES (1 BILLION)' : totalNotes >= 1000000 ? 'NOTES (MILLIONS)' : 'NOTES'}
          </span>
        </div>

        {/* Sub-stat pill */}
        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
            Original: <strong className="text-white">{originalCount.toLocaleString()}</strong> notes
          </span>
          <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-300">
            Expansion: <strong className="text-emerald-400 font-bold">{multiplier}x</strong>
          </span>
          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
            Est. File Size: <strong className="text-amber-300">{estimatedSizeStr}</strong>
          </span>
        </div>
      </div>

      {/* MIDI COLOR PALETTES & 16-CHANNEL DISTRIBUTION */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-red-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Exported MIDI Color Palettes (Channels 1-16)
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Notes separated into colored channels for Synthesia, Piano From Above & FL Studio
          </span>
        </div>

        {/* Segmented Color Spectrum Bar */}
        <div className="w-full h-3.5 rounded-full overflow-hidden flex border border-slate-700/80 bg-slate-950">
          {channelCounts.map((count, ch) => {
            if (count === 0) return null;
            const pct = (count / (notes.length || 1)) * 100;
            const color = paletteColors[ch % paletteColors.length];
            return (
              <div
                key={ch}
                style={{ width: `${Math.max(1, pct)}%`, backgroundColor: color }}
                className="h-full transition-all"
                title={`Channel ${ch + 1}: ${count.toLocaleString()} notes (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* 16 Channel Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-2">
          {channelCounts.map((count, ch) => {
            const color = paletteColors[ch % paletteColors.length];
            return (
              <div
                key={ch}
                className={`p-2 rounded-xl border flex flex-col gap-0.5 text-[11px] font-mono transition ${
                  count > 0
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-slate-950/30 border-slate-900 opacity-40'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm border border-white/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-400 text-[10px]">Ch {ch + 1}</span>
                </div>
                <span className="font-bold text-white truncate text-[11px]">
                  {count > 0 ? count.toLocaleString() : '0'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Instant Action Download Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span>Tempo: <strong className="text-white">{bpm} BPM</strong></span>
          <span>•</span>
          <span>Channels: <strong className="text-cyan-400">{channelCounts.filter(c => c > 0).length} Active</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportWav}
            disabled={isExportingWav}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs border border-slate-700 transition"
          >
            <Disc3 className={`w-4 h-4 text-amber-400 ${isExportingWav ? 'animate-spin' : ''}`} />
            <span>{isExportingWav ? 'Rendering WAV...' : 'Export Audio (.wav)'}</span>
          </button>

          <button
            onClick={onDownloadMidi}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Black MIDI (.mid)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
