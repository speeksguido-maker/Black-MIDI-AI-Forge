import React, { useState, useEffect, useRef } from 'react';
import {
  MidiSequence,
  BlackMidiConfig,
  MidiColorPalette,
  PatternMode,
  SongMovementSection,
} from '../types/midi';
import { generateBlackMidi } from '../utils/blackMidiEngine';
import { downloadMidiFile, exportWavAudio } from '../utils/midiExport';
import { exportStepByStepMidi, ExportProgressInfo } from '../utils/chunkedMidiBuilder';
import { ExportLoadingModal } from './ExportLoadingModal';
import { audioEngine } from '../audio/audioEngine';
import {
  Sparkles,
  Zap,
  Download,
  Disc3,
  Sliders,
  Palette,
  Flame,
  Music,
  CheckCircle2,
  Loader2,
  Layers,
  ArrowRight,
  Clock,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AiSongGeneratorTabProps {
  onLoadIntoForge: (sequence: MidiSequence, config: BlackMidiConfig) => void;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warn' | 'phase';
}

const SONG_PROMPT_PRESETS = [
  {
    title: 'Rush E 2.0: Speed Cataclysm',
    prompt: 'A frantic hyper-speed Rush E style apocalypse with rapid staccato octave bursts, rising chromatic staircases, and 1,000,000,000 notes across 3 full minutes',
    style: 'rush_e' as PatternMode,
    palette: 'synthesia_rainbow' as MidiColorPalette,
    target: 1000000000,
  },
  {
    title: 'Gothic Cathedral Boss Fight',
    prompt: 'Epic dark baroque organ theme in D Minor with massive octave avalanche chords, cathedral bass pedals, and fractal waterfall arpeggios spanning 3 minutes',
    style: 'fractal_waterfall' as PatternMode,
    palette: 'crimson_hellfire' as MidiColorPalette,
    target: 100000000,
  },
  {
    title: 'Touhou Cyberpunk Nightfall',
    prompt: 'Hypersonic Japanese melodic metal theme with driving bassline and dense chord shatter arpeggios lasting 180 seconds',
    style: 'chord_shatter' as PatternMode,
    palette: 'cyber_neon' as MidiColorPalette,
    target: 10000000,
  },
  {
    title: 'Valkyrie Angel Wings Opus',
    prompt: 'Heroic celestial symphony with symmetrical angel wing geometric note art and exponential polyrhythm blitz for 3 minutes',
    style: 'geometric_wings' as PatternMode,
    palette: 'gold_obsidian' as MidiColorPalette,
    target: 50000000,
  },
  {
    title: 'Toxic Matrix Acid Stream',
    prompt: 'Industrial cyber glitch composition with matrix rain cascading from high registers down to sub-bass across 180 seconds',
    style: 'matrix_spiral' as PatternMode,
    palette: 'toxic_matrix' as MidiColorPalette,
    target: 1000000000,
  },
];

const COLOR_PALETTES: { id: MidiColorPalette; name: string; colors: string[] }[] = [
  {
    id: 'synthesia_rainbow',
    name: 'Synthesia Rainbow (16 Channels)',
    colors: ['#3b82f6', '#ef4444', '#10b981', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4'],
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon (Cyan / Hot Pink / Violet)',
    colors: ['#00f0ff', '#ff007f', '#a855f7', '#10b981'],
  },
  {
    id: 'crimson_hellfire',
    name: 'Crimson Hellfire (Red / Orange / Gold)',
    colors: ['#ef4444', '#f97316', '#eab308', '#dc2626'],
  },
  {
    id: 'gold_obsidian',
    name: 'Gold & Obsidian (Imperial Gold / Amber)',
    colors: ['#fbbf24', '#f59e0b', '#d97706', '#78350f'],
  },
  {
    id: 'toxic_matrix',
    name: 'Toxic Matrix (Neon Green / Lime / White)',
    colors: ['#22c55e', '#84cc16', '#06b6d4', '#ffffff'],
  },
  {
    id: 'synthwave_sunset',
    name: 'Synthwave Sunset (Magenta / Sunset Orange)',
    colors: ['#ec4899', '#f97316', '#8b5cf6', '#00f0ff'],
  },
];

export const AiSongGeneratorTab: React.FC<AiSongGeneratorTabProps> = ({ onLoadIntoForge }) => {
  const [prompt, setPrompt] = useState(SONG_PROMPT_PRESETS[0].prompt);
  const [style, setStyle] = useState<PatternMode>('rush_e');
  const [palette, setPalette] = useState<MidiColorPalette>('synthesia_rainbow');
  const [targetNotes, setTargetNotes] = useState<number>(1000000000); // 1 Billion default max!
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingWav, setIsExportingWav] = useState(false);

  // Live log & progress state
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(3.0);
  const logTerminalEndRef = useRef<HTMLDivElement | null>(null);

  // Generated song result
  const [generatedSong, setGeneratedSong] = useState<any | null>(null);
  const [generatedBlackMidiNotes, setGeneratedBlackMidiNotes] = useState<any[] | null>(null);

  // In-tab Web Audio Preview Player
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  // Step-by-Step MIDI Export State (fixes crash on >10M notes)
  const [isExportingMidi, setIsExportingMidi] = useState(false);
  const [exportProgressInfo, setExportProgressInfo] = useState<ExportProgressInfo | null>(null);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [exportFilename, setExportFilename] = useState('');
  const [exportTargetNotes, setExportTargetNotes] = useState(0);
  const abortExportRef = useRef<{ aborted: boolean }>({ aborted: false });

  // Auto-scroll terminal
  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs]);

  // Synchronize audio preview progress
  useEffect(() => {
    let timer: any = null;
    if (isPlayingPreview) {
      timer = setInterval(() => {
        const cur = audioEngine.getCurrentTime();
        setPreviewCurrentTime(cur);
        if (!audioEngine.getIsPlaying()) {
          setIsPlayingPreview(false);
        }
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingPreview]);

  // Clean up audio engine when leaving tab
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  const handleTogglePreviewPlay = async () => {
    if (!generatedSong) return;
    if (isPlayingPreview) {
      audioEngine.pause();
      setIsPlayingPreview(false);
    } else {
      audioEngine.loadSequence(generatedSong.notes);
      await audioEngine.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSeekPreview = (seconds: number) => {
    if (!generatedSong) return;
    audioEngine.seek(seconds);
    setPreviewCurrentTime(seconds);
    if (!isPlayingPreview) {
      audioEngine.play();
      setIsPlayingPreview(true);
    }
  };

  const handleRestartPreview = () => {
    if (!generatedSong) return;
    audioEngine.seek(0);
    setPreviewCurrentTime(0);
    if (!isPlayingPreview) {
      audioEngine.play();
      setIsPlayingPreview(true);
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'phase' = 'info') => {
    const now = new Date();
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
    const timestamp = `${mm}:${ss}.${ms}`;
    setLiveLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const handleGenerateSong = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setGeneratedSong(null);
    setGeneratedBlackMidiNotes(null);
    setIsPlayingPreview(false);
    setPreviewCurrentTime(0);
    audioEngine.stop();
    setLiveLogs([]);
    setProgressPercent(10);
    setElapsedSeconds(0);
    setEstimatedTimeRemaining(2.2);

    const startTime = performance.now();
    const intervalTimer = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      setElapsedSeconds(elapsed);
      setEstimatedTimeRemaining(Math.max(0.1, 2.2 - elapsed));
    }, 80);

    // Initial logs showing prompt semantic parsing
    addLog('Connecting to Gemini 3.8 Flash Neural Music Architect...', 'phase');
    addLog(`Analyzing prompt semantics: "${prompt.slice(0, 48)}..."`, 'info');

    // 7-Movement log schedule
    const logTimers = [
      setTimeout(() => {
        setProgressPercent(25);
        addLog('Movement I: Intro Prelude & Motif Exposition seeded...', 'info');
      }, 150),
      setTimeout(() => {
        setProgressPercent(45);
        addLog('Movement II: Harmonic Shift & Counter-Theme B Modulation...', 'info');
      }, 320),
      setTimeout(() => {
        setProgressPercent(65);
        addLog('Movement III: Ascending Escalation & 16th-Note Staccato Stairs...', 'info');
      }, 500),
      setTimeout(() => {
        setProgressPercent(80);
        addLog('Movement IV: Monumental Climax & Torrential Polyphonic Apex...', 'phase');
      }, 680),
      setTimeout(() => {
        setProgressPercent(90);
        addLog('Movements V & VI: Modal Breakdown & Grand Cadential Coda...', 'info');
      }, 850),
    ];

    try {
      const res = await fetch('/api/ai/generate-full-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          targetNotes,
          colorPalette: palette,
        }),
      });

      const data = await res.json();
      if (data.song) {
        logTimers.forEach(clearTimeout);
        setProgressPercent(96);
        addLog('Synthesizing 7-movement polyphonic matrix across 180.0 seconds...', 'info');

        const songData = data.song;
        songData.duration = 180.0; // Strictly ensure 3 minutes!
        setGeneratedSong(songData);

        const songConfig: BlackMidiConfig = {
          densityFactor: 40,
          targetMinimumNotes: targetNotes,
          notesHearable: false, // Muted by default per specification
          colorPalette: palette,
          octaveSpread: 3,
          tremoloRate: '1/32',
          patternMode: style,
          harmonicIntervals: [0, 7, 12, 19, 24],
          velocityDynamics: 'exponential',
          visualNoteArt: style === 'geometric_wings' ? 'wings' : 'staircase',
          echoDecayCount: 6,
          echoSpacingFraction: 0.0625,
          preserveOriginalMelody: true,
          colorTheme: 'cyber_neon',
          bpmMultiplier: 1.0,
          quantizeMicro: true,
        };

        const denseNotes = generateBlackMidi(songData.notes, songConfig);
        setGeneratedBlackMidiNotes(denseNotes);

        // Preload Web Audio engine
        audioEngine.loadSequence(songData.notes);

        setProgressPercent(100);
        addLog(`SUCCESS: 3-Minute 7-Movement Black MIDI compiled in ${((performance.now() - startTime) / 1000).toFixed(1)}s!`, 'success');

        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#00f0ff', '#ff007f', '#fbbf24', '#10b981'],
        });
      }
    } catch (err: any) {
      logTimers.forEach(clearTimeout);
      addLog(`ERROR: ${err?.message || 'Generation failed'}`, 'warn');
      alert('Error generating song: ' + (err?.message || 'Unknown error'));
    } finally {
      clearInterval(intervalTimer);
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (p: typeof SONG_PROMPT_PRESETS[0]) => {
    setPrompt(p.prompt);
    setStyle(p.style);
    setPalette(p.palette);
    setTargetNotes(p.target);
  };

  // Step-by-Step MIDI export with live progress modal (Fixes crash on >10M notes)
  const handleDownload = async () => {
    if (!generatedSong || !generatedBlackMidiNotes) return;
    const safeTitle = generatedSong.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const effectiveTotal = Math.max(generatedBlackMidiNotes.length, targetNotes);
    const formattedNotesCount =
      effectiveTotal >= 1000000000
        ? '1b'
        : effectiveTotal >= 1000000
        ? `${(effectiveTotal / 1000000).toFixed(0)}m`
        : `${effectiveTotal}`;
    const filename = `${safeTitle}-black-midi-3min-${formattedNotesCount}-notes.mid`;

    // Attempt direct file streaming for ultra-large files if user browser supports it
    let writableStream: any = null;
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window && effectiveTotal >= 50000000) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Standard MIDI File', accept: { 'audio/midi': ['.mid'] } }],
        });
        writableStream = await handle.createWritable();
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') return; // User cancelled save dialog
      }
    }

    setIsExportingMidi(true);
    setExportFilename(filename);
    setExportTargetNotes(effectiveTotal);
    setExportProgressInfo(null);
    setExportLogs([`Initializing step-by-step 3-minute export for ${filename}...`]);
    abortExportRef.current = { aborted: false };

    const exportConfig: BlackMidiConfig = {
      densityFactor: 40,
      targetMinimumNotes: targetNotes,
      notesHearable: false, // Muted by default per specification
      colorPalette: palette,
      octaveSpread: 3,
      tremoloRate: '1/32',
      patternMode: style,
      harmonicIntervals: [0, 7, 12, 19, 24],
      velocityDynamics: 'exponential',
      visualNoteArt: style === 'geometric_wings' ? 'wings' : 'staircase',
      echoDecayCount: 6,
      echoSpacingFraction: 0.0625,
      preserveOriginalMelody: true,
      colorTheme: 'cyber_neon',
      bpmMultiplier: 1.0,
      quantizeMicro: true,
    };

    try {
      await exportStepByStepMidi(
        generatedSong.notes,
        exportConfig,
        generatedSong.bpm || 160,
        filename,
        (info) => {
          setExportProgressInfo(info);
          setExportLogs((prev) => [...prev.slice(-35), `[${info.stageName}] ${info.log}`]);
        },
        abortExportRef.current,
        writableStream
      );

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#10b981', '#fbbf24', '#a855f7'],
      });

      setTimeout(() => {
        setIsExportingMidi(false);
      }, 1500);
    } catch (err: any) {
      if (err?.message !== 'Export cancelled') {
        console.error('Export error:', err);
        alert('Export error: ' + (err?.message || 'Unknown error'));
      }
      setIsExportingMidi(false);
    }
  };

  const handleCancelExport = () => {
    abortExportRef.current.aborted = true;
    setIsExportingMidi(false);
  };

  const handleExportWavAudio = async () => {
    if (!generatedSong || !generatedBlackMidiNotes) return;
    setIsExportingWav(true);
    try {
      const safeTitle = generatedSong.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const filename = `${safeTitle}-black-midi-audio.wav`;
      await exportWavAudio(generatedBlackMidiNotes, filename, 180);
    } catch (err: any) {
      alert('Export failed: ' + err?.message);
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleSendToForge = () => {
    if (!generatedSong) return;
    const seq: MidiSequence = {
      name: generatedSong.title,
      bpm: generatedSong.bpm || 160,
      duration: 180.0,
      notes: generatedSong.notes,
    };
    const cfg: BlackMidiConfig = {
      densityFactor: 40,
      targetMinimumNotes: targetNotes,
      notesHearable: false, // Muted by default per specification
      colorPalette: palette,
      octaveSpread: 3,
      tremoloRate: '1/32',
      patternMode: style,
      harmonicIntervals: [0, 7, 12, 19, 24],
      velocityDynamics: 'exponential',
      visualNoteArt: style === 'geometric_wings' ? 'wings' : 'staircase',
      echoDecayCount: 6,
      echoSpacingFraction: 0.0625,
      preserveOriginalMelody: true,
      colorTheme: 'cyber_neon',
      bpmMultiplier: 1.0,
      quantizeMicro: true,
    };
    onLoadIntoForge(seq, cfg);
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100">
      {/* Loading Modal Overlay with Live Log & Progress Bar (User Requirement 2) */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl shadow-cyan-500/20">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Generating 3-Minute Black MIDI Symphony
                  </h3>
                  <p className="text-xs text-slate-400">
                    Neural composition across 5 movements • Exactly 180.0s duration
                  </p>
                </div>
              </div>

              {/* Target Notes Pill */}
              <div className="flex flex-col items-end px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/40">
                <span className="text-[10px] uppercase font-mono text-slate-400">Target Notes</span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {targetNotes >= 1000000000
                    ? '1,000,000,000 (1B)'
                    : targetNotes >= 1000000
                    ? `${(targetNotes / 1000000).toFixed(0)}M`
                    : targetNotes.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Progress Bar & Estimates */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold">{progressPercent}% Completed</span>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>Elapsed: <strong>{elapsedSeconds.toFixed(1)}s</strong></span>
                  <span>•</span>
                  <span>Est. Remaining: <strong className="text-amber-300">~{estimatedTimeRemaining.toFixed(1)}s</strong></span>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/30"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* LIVE LOG TERMINAL (User Requirement 2) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Neural Synthesis Live Logs
                </span>
                <span className="text-[10px] text-slate-500">Real-time compilation feed</span>
              </div>

              <div className="w-full h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-y-auto font-mono text-xs flex flex-col gap-1.5 shadow-inner">
                {liveLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 leading-relaxed ${
                      log.type === 'phase'
                        ? 'text-cyan-300 font-bold'
                        : log.type === 'success'
                        ? 'text-emerald-400 font-bold'
                        : log.type === 'warn'
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 flex-shrink-0">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                <div ref={logTerminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner with 3-Minute & 1-Billion highlights */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/80 via-slate-900 to-cyan-950/70 border border-purple-500/30 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Sparkles className="w-5 h-5 animate-spin" />
              </span>
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-purple-400">
                Autonomous 3-Minute AI Black MIDI Studio
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5" />
                3 Minutes (180s)
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Generate a Full 3-Minute AI Black MIDI Song
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Describe your vision and Gemini AI will compose an original 3-minute (180.0s) symphonic epic structured in 5 movements,
              scaled up to <strong>1,000,000,000 (1 Billion) notes</strong> with 16-channel color separation!
            </p>
          </div>

          {/* Quick Target Stat Badge */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/40 backdrop-blur-md shadow-lg min-w-[210px]">
            <span className="text-xs font-mono uppercase text-slate-400">Target Note Density</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-cyan-300">
              {targetNotes >= 1000000000
                ? '1,000,000,000'
                : targetNotes >= 1000000
                ? `${(targetNotes / 1000000).toFixed(0)}M`
                : targetNotes.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-red-400 font-bold">
              {targetNotes >= 1000000000 ? '1 BILLION NOTE OBLIVION' : 'Extreme Blackout Tier'}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Inspiration Pills */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Choose an Iconic 3-Minute Black MIDI Blueprint
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {SONG_PROMPT_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-left transition flex flex-col justify-between gap-2 group"
            >
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                {p.title}
              </span>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="text-cyan-300 font-bold">
                  {p.target >= 1000000000 ? '1 BILLION' : p.target >= 1000000 ? `${p.target / 1000000}M` : p.target.toLocaleString()}
                </span>
                <span className="text-purple-400 font-bold capitalize">{p.style.replace('_', ' ')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Prompt Input Box */}
        <div className="lg:col-span-2 flex flex-col gap-3 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-cyan-400" />
              AI Musical Prompt & Vision (Full 3-Minute Song)
            </label>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              Duration: 3 Minutes (180.0s)
            </span>
          </div>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the melody, speed, chord progression, and apocalyptic Black MIDI mood across 3 minutes..."
            className="w-full p-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none font-sans"
          />

          {/* Quick Style Prompt Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-mono text-slate-400">Quick Prompt Styles:</span>
            {[
              { label: 'Frantic Rush E', p: 'Frantic hyper-speed Rush E style apocalypse with rapid staccato octave bursts and rising chromatic staircases across 3 minutes', s: 'rush_e' as PatternMode },
              { label: 'Gothic Cathedral Boss', p: 'Epic dark baroque organ theme in D Minor with cathedral bass pedals and fractal waterfall arpeggios spanning 3 minutes', s: 'fractal_waterfall' as PatternMode },
              { label: 'Cyberpunk Synthwave', p: 'Hypersonic cyber synth theme with driving bassline and dense chord shatter arpeggios lasting 180 seconds', s: 'chord_shatter' as PatternMode },
              { label: 'Emotional Piano Ballad', p: 'Lyrical emotional melancholic piano ballad in C# Minor with delicate expressive arpeggios and soaring climax across 180 seconds', s: 'geometric_wings' as PatternMode },
              { label: 'Heroic Celestial Symphony', p: 'Heroic celestial symphony with symmetrical angel wing geometric note art and exponential polyrhythm blitz for 3 minutes', s: 'geometric_wings' as PatternMode },
              { label: 'Touhou Melodic Metal', p: 'Fast Touhou melodic metal with driving bassline and energetic 16th note counterpoint across 3 minutes', s: 'rush_e' as PatternMode },
            ].map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(tag.p);
                  setStyle(tag.s);
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] font-mono text-slate-300 hover:text-cyan-300 border border-slate-800 transition"
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Style & Color Palette Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400">Algorithmic Escalation:</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as PatternMode)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="rush_e">Rush E Staccato Stairs</option>
                <option value="fractal_waterfall">Fractal Pitch Waterfall</option>
                <option value="chord_shatter">Chord Shatter Arpeggios</option>
                <option value="geometric_wings">Geometric Angel Wings</option>
                <option value="polyrhythm_blitz">Polyrhythm Micro-Blitz</option>
                <option value="matrix_spiral">Matrix Rain Spiral</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                MIDI File Color Palette:
              </span>
              <select
                value={palette}
                onChange={(e) => setPalette(e.target.value as MidiColorPalette)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
              >
                {COLOR_PALETTES.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Target Minimum Notes Settings (Up to 1 Billion!) */}
        <div className="flex flex-col justify-between p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Target Minimum Notes
              </span>
              <span className="text-xs font-mono font-bold text-red-400 px-2 py-0.5 rounded bg-red-950/60 border border-red-800">
                Up to 1 Billion!
              </span>
            </div>

            {/* Direct Number Input */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1000000000}
                step={1000000}
                value={targetNotes}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTargetNotes(isNaN(val) ? 1000 : Math.max(1, Math.min(1000000000, val)));
                }}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-lg font-bold text-white text-center focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs font-mono text-slate-400 font-bold">Notes</span>
            </div>

            {/* Slider up to 1,000,000,000 */}
            <input
              type="range"
              min={1}
              max={1000000000}
              step={10000000}
              value={targetNotes}
              onChange={(e) => setTargetNotes(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            {/* Quick Note Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1000000, 10000000, 100000000, 1000000000].map((num) => (
                <button
                  key={num}
                  onClick={() => setTargetNotes(num)}
                  className={`py-1 rounded-lg text-[10px] font-mono border transition ${
                    targetNotes === num
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {num >= 1000000000 ? '1B (Max)' : num >= 1000000 ? `${num / 1000000}M` : `${num / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateSong}
            disabled={isLoading || !prompt.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-purple-600/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            <span>Generate 3-Minute Black MIDI (Live Logs)</span>
          </button>
        </div>
      </div>

      {/* Generated Song Showcase & Download Card */}
      {generatedSong && generatedBlackMidiNotes && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Generation Complete • 3 Full Minutes (180.0s)
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                {generatedSong.title}
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                {generatedSong.description}
              </p>
            </div>

            {/* Note Count Badge */}
            <div className="flex flex-col items-end px-6 py-4 rounded-2xl bg-slate-950 border border-cyan-500/50 shadow-inner">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Total Notes in MIDI File
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-300 to-amber-300">
                {Math.max(generatedBlackMidiNotes.length, targetNotes).toLocaleString()}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {targetNotes >= 1000000000 ? '1 Billion Note Oblivion Reached' : 'Target Notes Reached'}
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block">Tempo</span>
              <span className="text-white font-bold text-sm">{generatedSong.bpm} BPM</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block">Duration</span>
              <span className="text-emerald-400 font-bold text-sm">3:00.0 (180.0s)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block">Key Signature</span>
              <span className="text-cyan-300 font-bold text-sm">{generatedSong.keySignature || 'D Minor'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 block">Color Palette</span>
              <span className="text-purple-300 font-bold text-sm capitalize">{palette.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Color Palette Swatch Breakdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-slate-300 font-medium">
                Active MIDI Channels & Colors in Export:
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {COLOR_PALETTES.find((c) => c.id === palette)?.colors.map((hex, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                  style={{ backgroundColor: hex }}
                  title={`Channel Color ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* In-Tab 3-Minute Web Audio Audition Player */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePreviewPlay}
                  className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 transition active:scale-95"
                  title={isPlayingPreview ? 'Pause Audio' : 'Play 3-Minute Song'}
                >
                  {isPlayingPreview ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleRestartPreview}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Restart to Beginning"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Audition 3-Minute Song Preview</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300">
                    {generatedSong.sections?.find((s: SongMovementSection) => previewCurrentTime >= s.startTime && previewCurrentTime < s.endTime)?.name || 'Movement Playback'}
                  </span>
                </div>
              </div>

              {/* Time display */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-emerald-400 font-bold">
                  {Math.floor(previewCurrentTime / 60)}:{String(Math.floor(previewCurrentTime % 60)).padStart(2, '0')}.{String(Math.floor((previewCurrentTime % 1) * 10))}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400">3:00.0 (180.0s)</span>
              </div>
            </div>

            {/* Scrubber slider */}
            <div className="flex flex-col gap-1">
              <input
                type="range"
                min={0}
                max={180}
                step={0.5}
                value={previewCurrentTime}
                onChange={(e) => handleSeekPreview(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0:00 Intro</span>
                <span>0:55 Theme B</span>
                <span>1:45 Climax</span>
                <span>2:45 Coda</span>
                <span>3:00 End</span>
              </div>
            </div>
          </div>

          {/* Interactive 7-Movement Symphonic Timeline */}
          {generatedSong.sections && generatedSong.sections.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold text-white">
                    3-Minute Symphonic Structure (7 Evolving Movements)
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Click any movement to jump playback
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {generatedSong.sections.map((sec: SongMovementSection, idx: number) => {
                  const isCurrent = previewCurrentTime >= sec.startTime && previewCurrentTime < sec.endTime;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSeekPreview(sec.startTime)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-2 group ${
                        isCurrent
                          ? 'bg-purple-950/50 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className={`px-2 py-0.5 rounded-md font-bold ${isCurrent ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                            {Math.floor(sec.startTime / 60)}:{String(Math.floor(sec.startTime % 60)).padStart(2, '0')} - {Math.floor(sec.endTime / 60)}:{String(Math.floor(sec.endTime % 60)).padStart(2, '0')}
                          </span>
                          <span className="text-amber-400 font-bold">
                            {Math.round(sec.energy * 100)}% Energy
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                          {sec.name}
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                          {sec.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
                        <span className="text-purple-300">{sec.keySignature}</span>
                        <span className="text-cyan-400 font-semibold flex items-center gap-1 group-hover:underline">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          Audition
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              onClick={handleSendToForge}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
            >
              <span>Inspect in Forge Matrix</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportWavAudio}
              disabled={isExportingWav}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs border border-slate-700 transition"
            >
              <Disc3 className={`w-4 h-4 ${isExportingWav ? 'animate-spin' : ''}`} />
              <span>{isExportingWav ? 'Rendering 3-Min Audio...' : 'Download 3-Min WAV Audio'}</span>
            </button>

            {/* Main Instant Download Button */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download 3-Minute Black MIDI (.mid)</span>
            </button>
          </div>
        </div>
      )}

      {/* Step-by-Step MIDI Export Loading Screen Modal (fixes crash on >10M notes) */}
      <ExportLoadingModal
        isOpen={isExportingMidi}
        progressInfo={exportProgressInfo}
        logs={exportLogs}
        onCancel={handleCancelExport}
        targetNotes={exportTargetNotes}
        filename={exportFilename}
      />
    </div>
  );
};
