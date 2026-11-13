import React, { useState, useRef, useEffect } from 'react';
import {
  FileAudio,
  Upload,
  Play,
  Pause,
  Zap,
  Download,
  Sparkles,
  Sliders,
  CheckCircle2,
  Music2,
  RefreshCw,
  Info,
  Radio,
  Layers,
  Volume2,
} from 'lucide-react';
import { MidiSequence, MidiNote } from '../types/midi';
import {
  convertAudioBufferToMidi,
  generateSyntheticAudioSample,
  AudioToMidiOptions,
  DEFAULT_AUDIO_TO_MIDI_OPTIONS,
  AudioConversionProgress,
  midiToFrequency,
} from '../utils/audioToMidi';
import { downloadMidiFile } from '../utils/midiExport';

interface AudioToMidiTabProps {
  onLoadIntoForge: (sequence: MidiSequence) => void;
  onSetAiCommentary: (text: string) => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiNoteToName(midi: number): string {
  const note = NOTE_NAMES[Math.round(midi) % 12];
  const octave = Math.floor(Math.round(midi) / 12) - 1;
  return `${note}${octave}`;
}

export const AudioToMidiTab: React.FC<AudioToMidiTabProps> = ({
  onLoadIntoForge,
  onSetAiCommentary,
}) => {
  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioTitle, setAudioTitle] = useState<string>('No Audio Loaded');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  // Conversion options
  const [options, setOptions] = useState<AudioToMidiOptions>(DEFAULT_AUDIO_TO_MIDI_OPTIONS);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [progress, setProgress] = useState<AudioConversionProgress | null>(null);

  // Result state
  const [transcribedSequence, setTranscribedSequence] = useState<MidiSequence | null>(null);

  // Audio Context & Player Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas Refs
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get or initialize AudioContext
  const getAudioContext = (): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Stop playback when unmounting or loading new audio
  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore already stopped errors
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioBuffer) return;
    const ctx = getAudioContext();

    if (isPlaying) {
      // Pause
      pauseOffsetRef.current = ctx.currentTime - startTimeRef.current;
      stopAudio();
      setPlaybackTime(pauseOffsetRef.current);
    } else {
      // Play
      const offset = pauseOffsetRef.current % audioBuffer.duration;
      const src = ctx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(ctx.destination);
      src.onended = () => {
        setIsPlaying(false);
        pauseOffsetRef.current = 0;
        setPlaybackTime(0);
      };
      src.start(0, offset);
      sourceNodeRef.current = src;
      startTimeRef.current = ctx.currentTime - offset;
      setIsPlaying(true);

      const updateProgress = () => {
        if (!sourceNodeRef.current) return;
        const current = ctx.currentTime - startTimeRef.current;
        if (current >= audioBuffer.duration) {
          setIsPlaying(false);
          pauseOffsetRef.current = 0;
          setPlaybackTime(0);
        } else {
          setPlaybackTime(current);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  // Load ArrayBuffer into AudioBuffer and reset state
  const loadAudioBuffer = async (buffer: AudioBuffer, title: string, file: File | null = null) => {
    stopAudio();
    pauseOffsetRef.current = 0;
    setPlaybackTime(0);
    setAudioBuffer(buffer);
    setAudioTitle(title);
    setAudioFile(file);
    setTranscribedSequence(null);
    setProgress(null);

    drawWaveform(buffer);
  };

  // Handle File Input Upload (MP3, WAV, etc.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      await loadAudioBuffer(decodedBuffer, file.name.replace(/\.[^/.]+$/, ''), file);
      onSetAiCommentary(`Loaded "${file.name}" (${decodedBuffer.duration.toFixed(1)}s, ${decodedBuffer.numberOfChannels}ch). Click "Convert Audio to MIDI" to transcribe pitch!`);
    } catch (err: any) {
      console.error('Failed to decode audio file:', err);
      alert(`Could not decode "${file.name}". Please ensure it is a valid audio file (MP3, WAV, OGG, M4A).`);
    }
  };

  // Load a built-in synthetic audio demo
  const handleLoadDemo = (type: 'synth_lead' | 'piano_chords' | 'retro_bass') => {
    const names = {
      synth_lead: 'Demo Synth Lead (Vocal/Melody)',
      piano_chords: 'Demo Piano Harmony (Chords)',
      retro_bass: 'Demo Sub-Bass Groove',
    };
    const buffer = generateSyntheticAudioSample(type);
    loadAudioBuffer(buffer, names[type], null);

    // Auto-adjust mode based on sample
    if (type === 'piano_chords') {
      setOptions((prev) => ({ ...prev, mode: 'polyphonic' }));
    } else {
      setOptions((prev) => ({ ...prev, mode: 'monophonic' }));
    }

    onSetAiCommentary(`Loaded 6-second ${names[type]}. Ready for pitch-to-MIDI transcription!`);
  };

  // Run the Pitch to MIDI Conversion
  const handleConvert = async () => {
    if (!audioBuffer) return;

    setIsConverting(true);
    setProgress({
      stage: 'analyzing',
      progress: 0,
      message: 'Starting pitch detection...',
      notesFound: 0,
    });

    try {
      const sequence = await convertAudioBufferToMidi(
        audioBuffer,
        options,
        (p) => setProgress(p)
      );

      sequence.name = `${audioTitle} (Transcribed MIDI)`;
      setTranscribedSequence(sequence);

      onSetAiCommentary(
        `Transcribed ${sequence.notes.length.toLocaleString()} pitch notes from "${audioTitle}" using ${
          options.mode === 'monophonic' ? 'YIN Autocorrelation' : 'Polyphonic Spectral'
        } engine!`
      );
    } catch (err: any) {
      console.error('Audio to MIDI conversion failed:', err);
      alert(`Transcription failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Render Audio Waveform on Canvas
  const drawWaveform = (buf: AudioBuffer) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subdued grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const data = buf.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2.2;

    const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
    waveGrad.addColorStop(0, '#06b6d4'); // Cyan
    waveGrad.addColorStop(0.5, '#3b82f6'); // Blue
    waveGrad.addColorStop(1, '#a855f7'); // Purple
    ctx.fillStyle = waveGrad;

    for (let x = 0; x < width; x++) {
      let min = 1.0;
      let max = -1.0;
      const start = x * step;
      const end = Math.min(start + step, data.length);

      for (let j = start; j < end; j++) {
        const val = data[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      if (max < min) {
        min = 0;
        max = 0;
      }

      const yTop = (1 + min) * amp;
      const barHeight = Math.max(2, (max - min) * amp);
      ctx.fillRect(x, height / 2 - barHeight / 2, 1, barHeight);
    }
  };

  // Redraw waveform and playback marker when time updates
  useEffect(() => {
    if (!audioBuffer) return;
    drawWaveform(audioBuffer);

    // Draw playhead cursor
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (audioBuffer.duration > 0 && playbackTime > 0) {
      const x = (playbackTime / audioBuffer.duration) * canvas.width;
      ctx.strokeStyle = '#f43f5e'; // Rose playhead
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Glowing dot at top
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(x, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [audioBuffer, playbackTime]);

  // Draw Transcribed Notes Piano Roll preview
  useEffect(() => {
    if (!transcribedSequence || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Canvas background
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    // Grid lines for octaves
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let m = 24; m <= 108; m += 12) {
      const y = height - ((m - 21) / (108 - 21)) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const duration = Math.max(0.1, transcribedSequence.duration);
    const notes = transcribedSequence.notes;

    // Draw transcribed notes
    notes.forEach((note) => {
      const x = (note.time / duration) * width;
      const noteW = Math.max(3, (note.duration / duration) * width);
      const y = height - ((note.midi - 21) / (108 - 21)) * height;
      const noteH = Math.max(3, height / 87);

      // Color based on pitch octave
      const hue = ((note.midi * 19) % 360);
      ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
      ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y - noteH / 2, noteW, noteH, 2) : ctx.rect(x, y - noteH / 2, noteW, noteH);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }, [transcribedSequence]);

  // Statistics of transcribed notes
  const noteStats = React.useMemo(() => {
    if (!transcribedSequence || transcribedSequence.notes.length === 0) return null;
    const notes = transcribedSequence.notes;
    let minM = 127;
    let maxM = 0;
    let velSum = 0;
    notes.forEach((n) => {
      if (n.midi < minM) minM = n.midi;
      if (n.midi > maxM) maxM = n.midi;
      velSum += n.velocity;
    });

    return {
      count: notes.length,
      pitchRange: `${midiNoteToName(minM)} (${minM}) → ${midiNoteToName(maxM)} (${maxM})`,
      avgVelocity: Math.round((velSum / notes.length) * 100),
      duration: transcribedSequence.duration.toFixed(2),
    };
  }, [transcribedSequence]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-red-950/30 to-black border border-red-900/60 p-6 shadow-2xl shadow-red-950/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-red-700 via-rose-600 to-red-500 shadow-xl shadow-red-600/30">
              <FileAudio className="w-8 h-8 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-300 to-amber-300">
                  AUDIO TO MIDI (PITCH TRANSCRIBER)
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-700/60">
                  MP3 / WAV / OGG
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                Import any audio track (MP3, WAV, M4A, Voice, Synth or Instrument) and extract exact musical pitch sequences using high-accuracy YIN Autocorrelation and Multi-Harmonic Spectral Peak Tracking. Then directly send the transcribed notes into the Black MIDI Forge to multiply up to 1,000,000,000 notes!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Audio Input & Waveform (Left) + Pitch Detection Settings (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Audio Source & Player (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">1. Audio Source</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {audioBuffer ? `${audioBuffer.duration.toFixed(1)}s • ${audioBuffer.sampleRate} Hz` : 'No file loaded'}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Drag & Drop or Click Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const fakeEvent = { target: { files: [file] } } as any;
                  handleFileUpload(fakeEvent);
                }
              }}
              className="group cursor-pointer border-2 border-dashed border-zinc-800 hover:border-red-500/80 rounded-2xl p-6 bg-black/60 hover:bg-red-950/15 transition-all flex flex-col items-center justify-center text-center gap-2.5"
            >
              <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-red-600/20 group-hover:scale-110 transition">
                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200 group-hover:text-white">
                  Drop MP3, WAV, OGG, or M4A audio here, or <span className="text-red-400 underline">browse</span>
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Decoded client-side in browser • Supports vocals, synths, pianos, guitars, basslines
                </p>
              </div>
            </div>

            {/* Or Quick Test Clips */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Or test with instant built-in audio samples:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleLoadDemo('synth_lead')}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-red-600/20 hover:border-red-500/50 border border-zinc-800 text-xs text-zinc-200 hover:text-red-300 font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span>Lead Melody</span>
                </button>
                <button
                  onClick={() => handleLoadDemo('piano_chords')}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-purple-500/20 hover:border-purple-500/50 border border-slate-700/60 text-xs text-slate-200 hover:text-purple-300 font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Piano Chords</span>
                </button>
                <button
                  onClick={() => handleLoadDemo('retro_bass')}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-700/60 text-xs text-slate-200 hover:text-amber-300 font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sub-Bass Groove</span>
                </button>
              </div>
            </div>

            {/* Waveform Canvas & Playback Bar */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 truncate max-w-[240px]">
                    {audioTitle}
                  </span>
                  {audioBuffer && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      Loaded
                    </span>
                  )}
                </div>

                {audioBuffer && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      {playbackTime.toFixed(1)}s / {audioBuffer.duration.toFixed(1)}s
                    </span>
                    <button
                      onClick={togglePlay}
                      className={`p-2 rounded-xl flex items-center gap-1.5 text-xs font-bold transition shadow-md ${
                        isPlaying
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black shadow-cyan-600/30'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Play Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Canvas Waveform */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <canvas
                  ref={waveformCanvasRef}
                  width={640}
                  height={110}
                  className="w-full h-28 block"
                />
                {!audioBuffer && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                    Waveform visualization will appear here upon loading audio
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pitch Detection Settings & Action (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">2. Pitch Detection Tuning</h3>
              </div>
              <button
                onClick={() => setOptions(DEFAULT_AUDIO_TO_MIDI_OPTIONS)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                title="Reset to recommended defaults"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Mode: Monophonic vs Polyphonic */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Detection Engine Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, mode: 'monophonic' }))}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    options.mode === 'monophonic'
                      ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-500/30'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Monophonic Lead</span>
                    {options.mode === 'monophonic' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    YIN Autocorrelation. Best for vocals, solos, flute & clean melodies.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, mode: 'polyphonic' }))}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    options.mode === 'polyphonic'
                      ? 'bg-purple-500/15 border-purple-500/60 text-purple-200 ring-1 ring-purple-500/30'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Polyphonic Chords</span>
                    {options.mode === 'polyphonic' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    Spectral Harmonics. Extracts multi-note piano chords & layered stems.
                  </span>
                </button>
              </div>
            </div>

            {/* Pitch Sensitivity Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Pitch Sensitivity Threshold</span>
                <span className="font-mono text-cyan-400">{options.sensitivity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.01"
                value={options.sensitivity}
                onChange={(e) => setOptions((prev) => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Lower = stricter pitch confidence (less noise); Higher = catches softer pitches.
              </span>
            </div>

            {/* Noise Gate Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Noise Gate Floor</span>
                <span className="font-mono text-purple-400">{options.noiseGateDb} dB</span>
              </div>
              <input
                type="range"
                min="-60"
                max="-25"
                step="1"
                value={options.noiseGateDb}
                onChange={(e) => setOptions((prev) => ({ ...prev, noiseGateDb: parseInt(e.target.value) }))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Rejects background audio hiss and room reverberation below this decibel volume.
              </span>
            </div>

            {/* Min Duration & Quantization */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-300">Min Note Length</span>
                <select
                  value={options.minDuration}
                  onChange={(e) => setOptions((prev) => ({ ...prev, minDuration: parseFloat(e.target.value) }))}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value={0.04}>40ms (Fast Runs)</option>
                  <option value={0.06}>60ms (Standard)</option>
                  <option value={0.10}>100ms (Clean Sustains)</option>
                  <option value={0.15}>150ms (Slow Legato)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-300">Semitone Quantization</span>
                <button
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, quantizePitch: !prev.quantizePitch }))}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center justify-between ${
                    options.quantizePitch
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{options.quantizePitch ? '12-TET Standard' : 'Continuous'}</span>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${options.quantizePitch ? 'text-cyan-400' : 'opacity-0'}`} />
                </button>
              </div>
            </div>

            {/* Big Action Button: Convert Audio to MIDI */}
            <button
              onClick={handleConvert}
              disabled={!audioBuffer || isConverting}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide shadow-xl transition flex items-center justify-center gap-2 ${
                !audioBuffer
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : isConverting
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white cursor-wait animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-600 hover:from-cyan-400 hover:to-pink-500 text-white shadow-cyan-600/25 active:scale-95'
              }`}
            >
              {isConverting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Transcribing Audio Pitches ({progress?.progress || 0}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Convert Audio to MIDI (Pitch Extraction)</span>
                </>
              )}
            </button>

            {/* Live Progress Bar if Converting */}
            {isConverting && progress && (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 font-mono">{progress.message}</span>
                  <span className="text-white font-mono font-bold">{progress.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-150"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Transcribed MIDI Results & Actions (shown when transcription is complete) */}
      {transcribedSequence && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex flex-col gap-5 shadow-2xl animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Pitch Transcription Successful</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {transcribedSequence.notes.length.toLocaleString()} Notes
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track: <strong className="text-slate-200">{transcribedSequence.name}</strong> • Duration: {transcribedSequence.duration.toFixed(1)}s
                </p>
              </div>
            </div>

            {/* Dual Main Actions: Load into Forge OR Download .MID */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  downloadMidiFile(
                    transcribedSequence.notes,
                    `${transcribedSequence.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mid`,
                    120
                  );
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 shadow-md transition active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download .MID</span>
              </button>

              <button
                onClick={() => onLoadIntoForge(transcribedSequence)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Load into Black MIDI Forge</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {noteStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-slate-400">Total Notes</span>
                <span className="text-lg font-black text-cyan-400">{noteStats.count.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-slate-400">Pitch Range</span>
                <span className="text-xs font-mono font-bold text-indigo-300 mt-1">{noteStats.pitchRange}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-slate-400">Avg Velocity</span>
                <span className="text-lg font-black text-pink-400">{noteStats.avgVelocity}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
                <span className="text-[10px] font-mono uppercase text-slate-400">Audio Track Length</span>
                <span className="text-lg font-black text-amber-400">{noteStats.duration}s</span>
              </div>
            </div>
          )}

          {/* Transcribed Notes Piano Roll Preview Canvas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Piano Roll Note Visualization (C1 to C8)</span>
              <span>Showing all transcribed pitch positions & durations</span>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#050811]">
              <canvas
                ref={previewCanvasRef}
                width={800}
                height={160}
                className="w-full h-40 block"
              />
            </div>
          </div>
        </div>
      )}

      {/* Helpful Tips Card */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-300">Tips for Best Audio-to-MIDI Transcription Quality:</span>
          <p className="leading-relaxed">
            • <strong>Isolated stems or clean recordings</strong> (e.g. acapella voice, solo piano, lead synthesizer, clean guitar) produce the cleanest pitch contours.
            <br />
            • For single-instrument melody lines, select <strong>Monophonic Lead (YIN)</strong> for exact pitch tracking and vibrato resilience.
            <br />
            • For full keyboard performances or chords, select <strong>Polyphonic Chords</strong> to extract multiple simultaneous harmonic peaks.
            <br />
            • Once transcribed, click <strong>"Load into Black MIDI Forge"</strong> to apply multi-channel color palettes, AI musical energy curves, and multiply notes into the millions!
          </p>
        </div>
      </div>
    </div>
  );
};
