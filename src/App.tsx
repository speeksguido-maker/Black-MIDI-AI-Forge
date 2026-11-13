import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MidiNote,
  MidiSequence,
  BlackMidiConfig,
  AiTransformRecipe,
  GlitchMode,
} from './types/midi';
import { PRESET_LIST, getRushE } from './utils/presets';
import { generateBlackMidi } from './utils/blackMidiEngine';
import { parseMidiFile, downloadMidiFile, exportWavAudio } from './utils/midiExport';
import { exportStepByStepMidi, ExportProgressInfo } from './utils/chunkedMidiBuilder';
import { NoteCountMasterHUD } from './components/NoteCountMasterHUD';
import { DensityControls } from './components/DensityControls';
import { PianoRollCreator } from './components/PianoRollCreator';
import { AiSongGeneratorTab } from './components/AiSongGeneratorTab';
import { AiAlchemistModal } from './components/AiAlchemistModal';
import { ExportLoadingModal } from './components/ExportLoadingModal';
import { AiEnergyLoadingModal } from './components/AiEnergyLoadingModal';
import { AudioToMidiTab } from './components/AudioToMidiTab';
import { HomeScreen } from './components/HomeScreen';
import { LivePianoRollVisualizer } from './components/LivePianoRollVisualizer';
import { PolyphonyBenchmarkModal } from './components/PolyphonyBenchmarkModal';
import { KeyRangeStudioModal } from './components/KeyRangeStudioModal';
import { analyzeSongEnergyProfile } from './utils/songEnergyAnalyzer';
import { generateAiSongVariationSequence } from './utils/aiSongVariationEngine';
import { audioEngine } from './audio/audioEngine';
import {
  Download,
  Upload,
  Sparkles,
  Music,
  Flame,
  Volume2,
  VolumeX,
  FileMusic,
  Disc3,
  Sliders,
  Zap,
  Loader2,
  Wand2,
  FileAudio,
  Home,
} from 'lucide-react';
import confetti from 'canvas-confetti';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Black MIDI App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-full">
              <Flame className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Black MIDI Density Overload</h2>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || 'An unexpected error occurred while processing this MIDI composition.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition"
            >
              Reset to Rush E
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BlackMidiApp />
    </ErrorBoundary>
  );
}

function BlackMidiApp() {
  // Current loaded sequence (original melody & chords)
  const [currentSequence, setCurrentSequence] = useState<MidiSequence>(() => getRushE());

  // Black MIDI configuration settings (with Target Minimum Notes 1 to 1B, Hearable Toggle, and Color Palettes)
  const [config, setConfig] = useState<BlackMidiConfig>({
    densityFactor: 30,
    targetMinimumNotes: 50000,
    targetNotesMode: 'manual',
    notesHearable: false, // Muted by default per user requirement (original song melody remains audible)
    colorPalette: 'synthesia_rainbow',
    octaveSpread: 2,
    tremoloRate: '1/32',
    patternMode: 'rush_e',
    harmonicIntervals: [0, 7, 12, 19, 24],
    velocityDynamics: 'exponential',
    visualNoteArt: 'rush_video_opus',
    smartArtHarmonization: true, // Harmonically quantize visual art to chords
    ghostMelodyCloak: false, // Mute visual art notes while keeping them 100% visible on canvas
    echoDecayCount: 4,
    echoSpacingFraction: 0.0625,
    preserveOriginalMelody: true,
    colorTheme: 'crimson_hellfire',
    bpmMultiplier: 1.0,
    quantizeMicro: true,
    melodyMode: 'original',
    keyRangePreset: 'keyboard_100',
    keyCount: 100,
    lowestMidiNote: 14,
    aiKeySaturation: true,
    aiKeyFillDensity: 3,
    speedRampMode: 'constant',
    velocityLimitCurve: 'transparent_soft_limit',
    glitchMode: 'black_midi_lag',
    glitchIntensity: 60,
    introPixelWord: 'RUSH',
    videoDropSilenceCuts: true,
    showVideoNoteCounter: true,
  });

  // Active view tab: 'home' | 'forge' | 'audio_to_midi' | 'ai_song' | 'composer' | 'presets'
  const [activeTab, setActiveTab] = useState<'home' | 'forge' | 'audio_to_midi' | 'ai_song' | 'composer' | 'presets'>('home');

  // Modals & UI states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isKeyStudioOpen, setIsKeyStudioOpen] = useState(false);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isLiveVisualizerOpen, setIsLiveVisualizerOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [activeAiCommentary, setActiveAiCommentary] = useState<string | null>(
    'Synthesizing extreme Black MIDI polyphony with 1/32nd-note machine-gun ratchets, multi-channel color palettes, and octave escalations.'
  );

  // Step-by-Step MIDI Export State (fixes crash on >10M notes)
  const [isExportingMidi, setIsExportingMidi] = useState(false);
  const [exportProgressInfo, setExportProgressInfo] = useState<ExportProgressInfo | null>(null);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [exportFilename, setExportFilename] = useState('');
  const [exportTargetNotes, setExportTargetNotes] = useState(0);
  const abortExportRef = useRef<{ aborted: boolean }>({ aborted: false });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // AI Musical Energy Intelligence Modal state
  const [isAiEnergyModalOpen, setIsAiEnergyModalOpen] = useState(false);
  const [isAiEnergyAnalyzing, setIsAiEnergyAnalyzing] = useState(false);

  // Deep musical energy profile computed for current loaded sequence
  const currentEnergyProfile = useMemo(() => {
    if (!currentSequence.notes || currentSequence.notes.length === 0) return null;
    return analyzeSongEnergyProfile(currentSequence.notes, currentSequence.duration || 10);
  }, [currentSequence]);

  // AI-composed thematic variation sequence (ONLY computed when melodyMode === 'ai_variation')
  const aiVariationSequence = useMemo(() => {
    if ((config.melodyMode || 'original') !== 'ai_variation') return currentSequence;
    return generateAiSongVariationSequence(currentSequence, currentEnergyProfile);
  }, [config.melodyMode, currentSequence, currentEnergyProfile]);

  // Active melody sequence (toggled between Original Song and AI Song Variation)
  const activeMelodySequence = useMemo(() => {
    return (config.melodyMode || 'original') === 'ai_variation' ? aiVariationSequence : currentSequence;
  }, [config.melodyMode, aiVariationSequence, currentSequence]);

  // Generate black MIDI notes (memoized for fast slider interactions)
  const blackMidiNotes = useMemo(() => {
    return generateBlackMidi(activeMelodySequence.notes, config);
  }, [activeMelodySequence.notes, config]);

  // Sync Black MIDI Glitch FX parameters live to Web Audio Engine
  useEffect(() => {
    audioEngine.setGlitchSettings(
      config.glitchMode || 'black_midi_lag',
      config.glitchIntensity ?? 60
    );
  }, [config.glitchMode, config.glitchIntensity]);

  // Volume & Mute handling
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMuted(nextMute);
  };

  const handleToggleHearable = () => {
    const nextHearable = !config.notesHearable;
    setConfig((prev) => ({ ...prev, notesHearable: nextHearable }));
    audioEngine.setHearable(nextHearable);
  };

  // Import MIDI file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setIsUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      audioEngine.stop();
      const parsed = await parseMidiFile(file);
      if (parsed.notes.length === 0) {
        alert('No musical notes found in the uploaded MIDI file. Ensure the file contains active note tracks.');
        setIsUploading(false);
        return;
      }

      // Adaptive initial density for imported files
      if (parsed.notes.length > 5000) {
        setConfig((prev) => ({
          ...prev,
          densityFactor: 2,
          targetMinimumNotes: Math.max(prev.targetMinimumNotes, parsed.notes.length),
          octaveSpread: 1,
          tremoloRate: 'off',
        }));
      } else if (parsed.notes.length > 1500) {
        setConfig((prev) => ({
          ...prev,
          densityFactor: 5,
          targetMinimumNotes: Math.max(prev.targetMinimumNotes, 25000),
          octaveSpread: 1,
          tremoloRate: '1/16',
        }));
      }

      setCurrentSequence(parsed);
      setIsAiEnergyAnalyzing(true);
      setIsAiEnergyModalOpen(true);
      setActiveAiCommentary(`Imported "${file.name}" (${parsed.notes.length.toLocaleString()} original notes). Calibrated AI Musical Energy & Sub-Bass Anchors.`);
      setActiveTab('forge');

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00f0ff', '#a855f7'],
      });
    } catch (err: any) {
      console.error('Failed to parse MIDI:', err);
      alert(`Could not parse "${file.name}". Error: ${err?.message || 'Unsupported format'}. Ensure it is a standard MIDI (.mid/.midi) file.`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Step-by-Step MIDI export with live progress modal (Fixes crash on >10M notes)
  const handleDownloadMidi = async () => {
    const effectiveTotal = Math.max(config.targetMinimumNotes || 1, blackMidiNotes.length);
    const safeTitle = activeMelodySequence.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const formattedNotesCount =
      effectiveTotal >= 1000000000
        ? '1b'
        : effectiveTotal >= 1000000
        ? `${(effectiveTotal / 1000000).toFixed(0)}m`
        : `${effectiveTotal}`;
    const filename = `${safeTitle}-black-midi-${formattedNotesCount}-notes.mid`;

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
    setExportLogs([`Initializing step-by-step export for ${filename}...`]);
    abortExportRef.current = { aborted: false };

    try {
      await exportStepByStepMidi(
        activeMelodySequence.notes,
        config,
        activeMelodySequence.bpm,
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

      // Keep success message visible briefly before closing
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

  // Download Original or AI Variation MIDI file
  const handleDownloadOriginal = () => {
    const isAiVar = (config.melodyMode || 'original') === 'ai_variation';
    const safeTitle = activeMelodySequence.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `${safeTitle}-${isAiVar ? 'ai-variation' : 'original'}.mid`;
    downloadMidiFile(activeMelodySequence.notes, filename, activeMelodySequence.bpm, config.colorPalette);
  };

  // Export Audio WAV
  const handleExportWav = async () => {
    setIsExportingWav(true);
    try {
      const safeTitle = activeMelodySequence.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const filename = `${safeTitle}-black-midi-audio.wav`;
      await exportWavAudio(blackMidiNotes, filename, Math.min(60, activeMelodySequence.duration + 2));
    } catch (err: any) {
      console.error('Audio export error:', err);
      alert('Failed to export audio: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingWav(false);
    }
  };

  // Apply recipe from AI
  const handleApplyRecipe = (recipe: AiTransformRecipe) => {
    setConfig((prev) => ({
      ...prev,
      densityFactor: recipe.densityFactor || prev.densityFactor,
      targetMinimumNotes: recipe.targetMinimumNotes || prev.targetMinimumNotes,
      colorPalette: recipe.colorPalette || prev.colorPalette,
      octaveSpread: recipe.octaveSpread !== undefined ? recipe.octaveSpread : prev.octaveSpread,
      patternMode: recipe.patternMode || prev.patternMode,
      harmonicIntervals: recipe.harmonicIntervals || prev.harmonicIntervals,
      visualNoteArt: recipe.visualNoteArt || prev.visualNoteArt,
      tremoloRate: recipe.tremoloSubdivision === 128
        ? '1/128'
        : recipe.tremoloSubdivision === 64
        ? '1/64'
        : recipe.tremoloSubdivision === 32
        ? '1/32'
        : recipe.tremoloSubdivision === 16
        ? '1/16'
        : '1/32',
    }));

    setActiveAiCommentary(`${recipe.styleTitle}: ${recipe.commentary}`);
    setActiveTab('forge');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-red-600/40 selection:text-red-200">
      {/* Hidden File Input for MIDI import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".mid,.midi,audio/midi"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-red-950/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative p-1 rounded-xl bg-gradient-to-tr from-red-700 via-rose-600 to-red-500 shadow-lg shadow-red-600/40 group-hover:scale-105 transition overflow-hidden">
              <img
                src="/icoon.jpg"
                alt="Black MIDI AI Forge Logo"
                className="w-8 h-8 rounded-lg object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-red-400">
                  BLACK MIDI
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-700/60 font-bold">
                  AI FORGE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Crimson Hellfire • 1 Billion Notes • Free for YouTube • Audio to MIDI
              </p>
            </div>
          </div>

          {/* Navigation Tabs - Hidden on Home page so user focuses on reading first without getting confused */}
          {activeTab !== 'home' && (
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 animate-in fade-in duration-150">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveTab('forge')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'forge'
                    ? 'bg-red-600/25 text-red-300 border border-red-600/50 shadow-sm shadow-red-950/40'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Forge & Note HUD</span>
              </button>
              <button
                onClick={() => setActiveTab('audio_to_midi')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'audio_to_midi'
                    ? 'bg-gradient-to-r from-red-600/30 to-rose-600/30 text-rose-200 border border-red-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-rose-300'
                }`}
              >
                <FileAudio className="w-3.5 h-3.5 text-red-400" />
                <span>Audio to MIDI (MP3)</span>
              </button>
              <button
                onClick={() => setActiveTab('ai_song')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'ai_song'
                    ? 'bg-gradient-to-r from-red-700/30 to-amber-600/30 text-amber-200 border border-red-500/50 shadow-sm'
                    : 'text-zinc-400 hover:text-amber-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>AI Song Generator</span>
              </button>
              <button
                onClick={() => setActiveTab('composer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'composer'
                    ? 'bg-red-950/60 text-red-200 border border-red-700/50 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Make Melody</span>
              </button>
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileMusic className="w-3.5 h-3.5" />
                <span>Preset Classics</span>
              </button>
            </div>
          )}

          {/* Top Actions: Focused "Enter Forge" CTA on home page; full tool controls on tool pages */}
          {activeTab === 'home' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab('forge');
                  confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.6 },
                    colors: ['#ef4444', '#dc2626', '#b91c1c'],
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-red-900/40 transition active:scale-95 border border-red-400/30 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Launch Forge</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-800 hover:border-red-600/50 transition shadow-sm cursor-pointer"
                title="Import .mid or .midi file"
              >
                <Upload className="w-3.5 h-3.5 text-red-400" />
                <span>Import MIDI</span>
              </button>

              <button
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-700 via-rose-600 to-red-600 hover:from-red-600 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-900/30 transition active:scale-95 border border-red-500/30 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Densify</span>
              </button>

              <button
                onClick={handleDownloadMidi}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 transition active:scale-95 cursor-pointer"
                title="Download standard .mid file directly with color channels"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .MID</span>
              </button>

              {/* Black Notes Audio Toggle (Muted by default; original piece melody remains audible) */}
              <button
                onClick={handleToggleHearable}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-sm cursor-pointer ${
                  config.notesHearable
                    ? 'bg-red-600/25 text-red-300 border-red-500/60 hover:bg-red-600/30 shadow-red-950/50'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Black notes audio is muted by default so the original piece is clearly heard. Click to toggle black notes sound on/off."
              >
                {config.notesHearable ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden sm:inline">Black Notes:</span>
                    <span className="font-bold text-red-300">Audible</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="hidden sm:inline">Black Notes:</span>
                    <span className="font-bold text-zinc-400">Muted (Default)</span>
                  </>
                )}
              </button>

              {/* Volume toggle */}
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-800">
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-zinc-800 rounded accent-red-500 cursor-pointer"
                  title="Master Volume"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Active AI Commentary Banner */}
        {activeAiCommentary && activeTab !== 'home' && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-200 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-mono text-red-300/90 font-medium">
                {activeAiCommentary}
              </span>
            </div>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="text-red-400 hover:text-red-200 underline font-semibold flex-shrink-0"
            >
              Prompt Gemini
            </button>
          </div>
        )}

        {/* Tab 0: Home Screen */}
        {activeTab === 'home' && (
          <HomeScreen
            onNavigate={(tab) => {
              setActiveTab(tab);
              if (tab === 'forge') {
                confetti({
                  particleCount: 50,
                  spread: 60,
                  origin: { y: 0.6 },
                  colors: ['#ef4444', '#dc2626', '#b91c1c'],
                });
              }
            }}
            currentSongTitle={currentSequence.name}
          />
        )}

        {/* Tab 1: Forge & Note Count Master HUD (Preview deleted per request; giant Note Count HUD shown!) */}
        {activeTab === 'forge' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            {/* Note Count Master HUD */}
            <NoteCountMasterHUD
              notes={blackMidiNotes}
              originalNotes={activeMelodySequence.notes}
              title={activeMelodySequence.name}
              bpm={activeMelodySequence.bpm}
              colorPalette={config.colorPalette}
              targetMinimumNotes={config.targetMinimumNotes}
              notesHearable={config.notesHearable}
              melodyMode={config.melodyMode || 'original'}
              keyCount={config.keyCount ?? 100}
              lowestMidi={config.lowestMidiNote ?? 14}
              onOpenKeyStudio={() => setIsKeyStudioOpen(true)}
              onToggleMelodyMode={() =>
                setConfig((prev) => ({
                  ...prev,
                  melodyMode: (prev.melodyMode || 'original') === 'original' ? 'ai_variation' : 'original',
                }))
              }
              energyProfile={currentEnergyProfile}
              onOpenEnergyInspector={() => {
                setIsAiEnergyAnalyzing(false);
                setIsAiEnergyModalOpen(true);
              }}
              onToggleHearable={handleToggleHearable}
              onToggleLiveVisualizer={() => setIsLiveVisualizerOpen((prev) => !prev)}
              isLiveVisualizerOpen={isLiveVisualizerOpen}
              onOpenBenchmark={() => setIsBenchmarkOpen(true)}
              onDownloadMidi={handleDownloadMidi}
              onExportWav={handleExportWav}
              isExportingWav={isExportingWav}
            />

            {/* LIVE PIANO ROLL WATERFALL (SYNTHESIA / REFERENCE VIDEO VIEW) */}
            {isLiveVisualizerOpen && (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <LivePianoRollVisualizer
                  notes={blackMidiNotes}
                  originalNotes={activeMelodySequence.notes}
                  colorPalette={config.colorPalette}
                  title={activeMelodySequence.name}
                  minMidi={config.lowestMidiNote ?? 14}
                  totalKeys={config.keyCount ?? 100}
                  targetMinimumNotes={config.targetMinimumNotes}
                  glitchMode={config.glitchMode || 'black_midi_lag'}
                  showVideoNoteCounter={config.showVideoNoteCounter !== false}
                  onCycleGlitchMode={() => {
                    const order: GlitchMode[] = ['black_midi_lag', 'rush_chaos', 'subtle_stutter', 'off'];
                    const cur = config.glitchMode || 'black_midi_lag';
                    const next = order[(order.indexOf(cur) + 1) % order.length];
                    setConfig((prev) => ({ ...prev, glitchMode: next }));
                  }}
                  onClose={() => setIsLiveVisualizerOpen(false)}
                  isDocked={true}
                />
              </div>
            )}

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
              <div className="flex items-center flex-wrap gap-2.5">
                <span className="font-mono text-zinc-400">Track:</span>
                <span className="font-bold text-white bg-zinc-900 px-3 py-1 rounded-lg border border-red-950 max-w-[200px] truncate" title={activeMelodySequence.name}>
                  {activeMelodySequence.name}
                </span>

                {/* AI Song Variation Toggle Button */}
                <button
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      melodyMode: (prev.melodyMode || 'original') === 'original' ? 'ai_variation' : 'original',
                    }))
                  }
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${
                    (config.melodyMode || 'original') === 'ai_variation'
                      ? 'bg-red-600 hover:bg-red-500 text-white border border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                  title="Toggle between Original Song and AI Song Variation"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>
                    {(config.melodyMode || 'original') === 'ai_variation'
                      ? 'AI Song Variation 🤖'
                      : 'Original Song 🎵'}
                  </span>
                </button>

                {/* 100-Key Piano Range Button */}
                <button
                  onClick={() => setIsKeyStudioOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition shadow-sm bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-600/60"
                  title="Open Piano Key Range Studio & AI 100-Key Saturation Engine"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>🎹 {config.keyCount || 100} Keys (100% Filled)</span>
                </button>

                <span className="text-zinc-400">
                  Base Notes: <strong className="text-red-400">{activeMelodySequence.notes.length.toLocaleString()}</strong>
                </span>
                <span className="text-zinc-400">
                  Target Density: <strong className="text-emerald-400 font-bold">{Math.max(blackMidiNotes.length, config.targetMinimumNotes || 1).toLocaleString()} notes</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadMidi}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .MID ({config.colorPalette.replace('_', ' ')})</span>
                </button>

                <button
                  onClick={handleExportWav}
                  disabled={isExportingWav}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-700 transition"
                  title="Render and download high quality WAV audio"
                >
                  <Disc3 className={`w-3.5 h-3.5 text-red-400 ${isExportingWav ? 'animate-spin' : ''}`} />
                  <span>{isExportingWav ? 'Rendering WAV...' : 'Export WAV'}</span>
                </button>

                <button
                  onClick={() => setIsLiveVisualizerOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    isLiveVisualizerOpen
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isLiveVisualizerOpen ? 'Close Waterfall' : 'Synthesia Waterfall 🎹'}</span>
                </button>

                <button
                  onClick={handleDownloadOriginal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs border border-zinc-700 transition"
                  title={(config.melodyMode || 'original') === 'ai_variation' ? "Download AI Variation MIDI without Black MIDI multipliers" : "Download unmodified original MIDI"}
                >
                  <FileMusic className="w-3.5 h-3.5" />
                  <span>{(config.melodyMode || 'original') === 'ai_variation' ? 'AI Variation .mid' : 'Original .mid'}</span>
                </button>
              </div>
            </div>

            {/* Density & Complexity Controls Matrix with Target Notes (1 to 1B), Randomize, What Black MIDI Needs & Masterpiece Art */}
            <DensityControls
              config={config}
              onChange={setConfig}
              totalNotes={Math.max(blackMidiNotes.length, config.targetMinimumNotes || 1)}
              originalNotesCount={activeMelodySequence.notes.length}
              currentSequence={activeMelodySequence}
              energyProfile={currentEnergyProfile}
              onOpenKeyStudio={() => setIsKeyStudioOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: Audio to MIDI Pitch Transcriber (MP3 / WAV / OGG to MIDI based on pitch) */}
        {activeTab === 'audio_to_midi' && (
          <div className="animate-in fade-in duration-150">
            <AudioToMidiTab
              onLoadIntoForge={(seq) => {
                const count = seq.notes.length;
                if (count > 5000) {
                  setConfig((prev) => ({
                    ...prev,
                    densityFactor: 2,
                    targetMinimumNotes: Math.max(prev.targetMinimumNotes, count),
                    octaveSpread: 1,
                    tremoloRate: 'off',
                  }));
                } else if (count > 1000) {
                  setConfig((prev) => ({
                    ...prev,
                    densityFactor: 8,
                    targetMinimumNotes: Math.max(prev.targetMinimumNotes, 35000),
                    octaveSpread: 1,
                    tremoloRate: '1/16',
                  }));
                } else {
                  setConfig((prev) => ({
                    ...prev,
                    densityFactor: 25,
                    targetMinimumNotes: Math.max(prev.targetMinimumNotes, 50000),
                    octaveSpread: 2,
                    tremoloRate: '1/32',
                  }));
                }

                setCurrentSequence(seq);
                setIsAiEnergyAnalyzing(true);
                setIsAiEnergyModalOpen(true);
                setActiveAiCommentary(
                  `Transcribed ${count.toLocaleString()} notes from audio pitch. Calibrating AI Musical Energy & Sub-Bass Anchors!`
                );
                setActiveTab('forge');
                confetti({
                  particleCount: 60,
                  spread: 60,
                  origin: { y: 0.65 },
                  colors: ['#00f0ff', '#6366f1', '#ec4899'],
                });
              }}
              onSetAiCommentary={setActiveAiCommentary}
            />
          </div>
        )}

        {/* Tab 3: Full AI Black MIDI Song Generator */}
        {activeTab === 'ai_song' && (
          <div className="animate-in fade-in duration-150">
            <AiSongGeneratorTab
              onLoadIntoForge={(seq, cfg) => {
                setCurrentSequence(seq);
                setConfig(cfg);
                setActiveTab('forge');
                setActiveAiCommentary(`Loaded AI composition "${seq.name}". Configured with ${seq.notes.length.toLocaleString()} base notes.`);
                confetti({
                  particleCount: 70,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              }}
            />
          </div>
        )}

        {/* Tab 3: Make Melody / Piano Roll Creator */}
        {activeTab === 'composer' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            <PianoRollCreator
              onApplyMelody={(seq) => {
                setCurrentSequence(seq);
                setActiveTab('forge');
                setActiveAiCommentary(`Loaded custom composition "${seq.name}". Ready for Black MIDI densification!`);
                confetti({
                  particleCount: 50,
                  spread: 60,
                  origin: { y: 0.6 },
                });
              }}
            />
          </div>
        )}

        {/* Tab 4: Presets Library */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Iconic Black MIDI Preset Library
                </h3>
                <p className="text-xs text-slate-400">
                  Select a classic melody to forge into extreme Black MIDI polyphony with custom color palettes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {PRESET_LIST.map((preset) => {
                const isCurrent = currentSequence.name.startsWith(preset.title.split(' ')[0]);
                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? 'bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400 font-semibold">
                          PRESET
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white">{preset.title}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {preset.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const seq = preset.loader();
                        setCurrentSequence(seq);
                        setActiveTab('forge');
                        setActiveAiCommentary(`Loaded "${seq.name}". Ready for Black MIDI densification!`);
                      }}
                      className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-red-600 hover:text-white text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <span>Load into Forge</span>
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-red-950/80 bg-black/95 px-6 py-4 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-300 font-bold">Black MIDI AI Forge</span>
            <span className="text-red-500">•</span>
            <span>Crimson Hellfire • 1 to 1,000,000,000 Notes • Free for YouTube</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Compatible with Synthesia, FL Studio, Ableton & Piano From Above</span>
          </div>
        </div>
      </footer>

      {/* Uploading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="flex flex-col items-center gap-3 p-6 bg-zinc-950 border border-red-600/40 rounded-2xl shadow-2xl shadow-red-950/60">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <h4 className="text-sm font-bold text-white">Importing & Parsing MIDI Tracks...</h4>
            <p className="text-xs text-zinc-400">Analyzing notes and preparing Black MIDI file</p>
          </div>
        </div>
      )}

      {/* AI Alchemist Modal */}
      <AiAlchemistModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentSequence={currentSequence}
        currentConfig={config}
        onApplyRecipe={handleApplyRecipe}
      />

      {/* Step-by-Step MIDI Export Loading Screen Modal (fixes crash on >10M notes) */}
      <ExportLoadingModal
        isOpen={isExportingMidi}
        progressInfo={exportProgressInfo}
        logs={exportLogs}
        onCancel={handleCancelExport}
        targetNotes={exportTargetNotes}
        filename={exportFilename}
      />

      {/* AI Musical Energy Intelligence & Loading Modal */}
      <AiEnergyLoadingModal
        isOpen={isAiEnergyModalOpen}
        isAnalyzing={isAiEnergyAnalyzing}
        profile={currentEnergyProfile}
        songTitle={currentSequence.name}
        originalNotesCount={currentSequence.notes.length}
        bpm={currentSequence.bpm}
        onClose={() => setIsAiEnergyModalOpen(false)}
      />

      {/* Soundfont Polyphony Benchmark Simulator Tool Modal */}
      <PolyphonyBenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        totalNotes={Math.max(blackMidiNotes.length, config.targetMinimumNotes)}
        durationSeconds={currentSequence.duration || 10}
        bpm={currentSequence.bpm}
      />

      {/* Piano Key Range Studio & AI Key Saturation Modal (100-key piano, 88-key, 128-key full range) */}
      <KeyRangeStudioModal
        isOpen={isKeyStudioOpen}
        onClose={() => setIsKeyStudioOpen(false)}
        config={config}
        onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
        currentNotes={blackMidiNotes}
      />
    </div>
  );
}
