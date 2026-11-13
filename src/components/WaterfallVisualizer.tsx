import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MidiNote, ColorTheme } from '../types/midi';
import { audioEngine } from '../audio/audioEngine';
import { Play, Pause, RotateCcw, Maximize2, Sparkles, Zap, Flame } from 'lucide-react';

interface WaterfallVisualizerProps {
  notes: MidiNote[];
  originalNotes: MidiNote[];
  colorTheme: ColorTheme;
  title: string;
}

// Particle spark for note hit
interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

const THEME_PALETTES: Record<ColorTheme, {
  bg: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  keyGlow: string;
  originalGlow: string;
}> = {
  cyber_neon: {
    bg: '#05070f',
    primary: '#00f0ff',
    secondary: '#ff007f',
    accent: '#a855f7',
    glow: 'rgba(0, 240, 255, 0.7)',
    keyGlow: 'rgba(255, 0, 127, 0.85)',
    originalGlow: '#ffffff',
  },
  obsidian_gold: {
    bg: '#090805',
    primary: '#f59e0b',
    secondary: '#fbbf24',
    accent: '#d97706',
    glow: 'rgba(245, 158, 11, 0.7)',
    keyGlow: 'rgba(251, 191, 36, 0.85)',
    originalGlow: '#fffbeb',
  },
  toxic_acid: {
    bg: '#040d06',
    primary: '#10b981',
    secondary: '#84cc16',
    accent: '#06b6d4',
    glow: 'rgba(132, 204, 22, 0.7)',
    keyGlow: 'rgba(16, 185, 129, 0.85)',
    originalGlow: '#f0fdf4',
  },
  synthwave_sunset: {
    bg: '#0c0714',
    primary: '#ec4899',
    secondary: '#f97316',
    accent: '#8b5cf6',
    glow: 'rgba(236, 72, 153, 0.7)',
    keyGlow: 'rgba(249, 115, 22, 0.85)',
    originalGlow: '#fdf2f8',
  },
  crimson_hellfire: {
    bg: '#0d0404',
    primary: '#ef4444',
    secondary: '#f97316',
    accent: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.75)',
    keyGlow: 'rgba(249, 115, 22, 0.9)',
    originalGlow: '#fff1f2',
  },
};

// 88 Piano keys standard range: MIDI 21 (A0) to 108 (C8)
const PIANO_MIN_MIDI = 21;
const PIANO_MAX_MIDI = 108;
const TOTAL_KEYS = PIANO_MAX_MIDI - PIANO_MIN_MIDI + 1; // 88

const IS_BLACK_KEY = [
  false, true, false, true, false, false, true, false, true, false, true, false,
]; // C, C#, D, D#, E, F, F#, G, G#, A, A#, B

export const WaterfallVisualizer: React.FC<WaterfallVisualizerProps> = ({
  notes,
  originalNotes,
  colorTheme,
  title,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waterfallSpeed, setWaterfallSpeed] = useState(2.2); // seconds visible on screen
  const [fps, setFps] = useState(60);
  const [currentNps, setCurrentNps] = useState(0);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  // Active key press states
  const activeKeysRef = useRef<Map<number, { velocity: number; triggerTime: number }>>(new Map());
  const particlesRef = useRef<SparkParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Sync sequence to audio engine
  useEffect(() => {
    audioEngine.loadSequence(notes);
    setDuration(audioEngine.getDuration());
  }, [notes]);

  // Handle note triggers from audio engine
  useEffect(() => {
    const unsub = audioEngine.subscribeNoteTrigger((midi, vel) => {
      activeKeysRef.current.set(midi, {
        velocity: vel,
        triggerTime: performance.now(),
      });

      // Spawn sparks if enabled
      if (particlesEnabled && canvasRef.current) {
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        const keyboardHeight = Math.max(70, height * 0.14);
        const keyY = height - keyboardHeight;

        const keyIndex = midi - PIANO_MIN_MIDI;
        const keyWidth = width / TOTAL_KEYS;
        const keyX = keyIndex * keyWidth + keyWidth / 2;

        const palette = THEME_PALETTES[colorTheme];
        const numParticles = Math.min(8, Math.max(2, Math.floor(vel * 8)));

        for (let p = 0; p < numParticles; p++) {
          particlesRef.current.push({
            x: keyX + (Math.random() - 0.5) * keyWidth,
            y: keyY,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 5 - 2,
            color: Math.random() > 0.4 ? palette.primary : palette.secondary,
            life: 1.0,
            maxLife: 20 + Math.random() * 15,
            size: 2 + Math.random() * 3,
          });
        }
      }
    });

    return () => {
      unsub();
    };
  }, [colorTheme, particlesEnabled]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const now = performance.now();
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 500) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      // Time sync
      const time = audioEngine.getCurrentTime();
      setCurrentTime(time);
      setIsPlaying(audioEngine.getIsPlaying());

      const width = canvas.width;
      const height = canvas.height;
      const palette = THEME_PALETTES[colorTheme];

      // Keyboard dimensions
      const keyboardHeight = Math.max(68, height * 0.14);
      const waterfallHeight = height - keyboardHeight;
      const keyWidth = width / TOTAL_KEYS;

      // 1. Clear background
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle vertical key grid lane guides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= TOTAL_KEYS; i++) {
        const x = i * keyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, waterfallHeight);
        ctx.stroke();
      }

      // 3. Falling notes
      // Visible time window: from time to time + waterfallSpeed
      const windowStart = time - 0.1;
      const windowEnd = time + waterfallSpeed;

      // NPS calculation window (notes passing hitline right now)
      let npsCount = 0;

      // Clean old active keys (> 150ms ago)
      activeKeysRef.current.forEach((val, key) => {
        if (now - val.triggerTime > 180) {
          activeKeysRef.current.delete(key);
        }
      });

      // High-performance binary search to find visible notes in time window
      let low = 0;
      let high = notes.length - 1;
      let startIndex = 0;
      const searchTarget = windowStart - 5.0; // safe window for note duration

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (notes[mid].time < searchTarget) {
          low = mid + 1;
        } else {
          startIndex = mid;
          high = mid - 1;
        }
      }

      for (let i = startIndex; i < notes.length; i++) {
        const note = notes[i];
        if (note.time > windowEnd) break;
        if (note.time + note.duration < windowStart) continue;

        // NPS check
        if (note.time >= time - 0.5 && note.time <= time + 0.5) {
          npsCount++;
        }

        const keyIndex = note.midi - PIANO_MIN_MIDI;
        if (keyIndex < 0 || keyIndex >= TOTAL_KEYS) continue;

        const x = keyIndex * keyWidth;
        const w = Math.max(2, keyWidth - 1);

        // Calculate Y position:
        // note.time === time -> hits bottom (y = waterfallHeight)
        // note.time === time + waterfallSpeed -> at top (y = 0)
        const noteTopFraction = 1 - (note.time + note.duration - time) / waterfallSpeed;
        const noteBottomFraction = 1 - (note.time - time) / waterfallSpeed;

        const y1 = noteTopFraction * waterfallHeight;
        const y2 = noteBottomFraction * waterfallHeight;
        const h = Math.max(2.5, y2 - y1);

        // Pitch hue for gradient
        const pitchNorm = (note.midi - PIANO_MIN_MIDI) / TOTAL_KEYS;

        if (note.isOriginal) {
          // Highlight original notes so they glow fiercely through the black MIDI swarm!
          ctx.fillStyle = palette.originalGlow;
          ctx.shadowColor = palette.primary;
          ctx.shadowBlur = 10;
          ctx.fillRect(x - 0.5, y1, w + 1, h);
          ctx.shadowBlur = 0;
        } else {
          // Black MIDI note coloring
          let color: string;
          if (colorTheme === 'cyber_neon') {
            const hue = Math.floor(180 + pitchNorm * 140);
            color = `hsl(${hue}, 100%, ${45 + note.velocity * 25}%)`;
          } else if (colorTheme === 'obsidian_gold') {
            const l = Math.floor(35 + note.velocity * 30);
            color = `hsl(42, 100%, ${l}%)`;
          } else if (colorTheme === 'toxic_acid') {
            const hue = Math.floor(80 + pitchNorm * 80);
            color = `hsl(${hue}, 95%, ${40 + note.velocity * 25}%)`;
          } else if (colorTheme === 'synthwave_sunset') {
            const hue = Math.floor(300 - pitchNorm * 70);
            color = `hsl(${hue}, 100%, ${45 + note.velocity * 25}%)`;
          } else {
            // crimson_hellfire
            const hue = Math.floor(0 + pitchNorm * 35);
            color = `hsl(${hue}, 95%, ${45 + note.velocity * 25}%)`;
          }

          ctx.fillStyle = color;
          ctx.fillRect(x, y1, w, h);
        }
      }

      setCurrentNps(npsCount);

      // 4. Hit line / Horizon separator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, waterfallHeight - 2, width, 2);

      // 5. Draw Particles
      if (particlesEnabled && particlesRef.current.length > 0) {
        ctx.save();
        for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
          const p = particlesRef.current[pIdx];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 1 / p.maxLife;

          if (p.life <= 0) {
            particlesRef.current.splice(pIdx, 1);
            continue;
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 6. Draw 88 Piano Keys at bottom
      const keyY = waterfallHeight;

      // Draw white keys first
      for (let i = 0; i < TOTAL_KEYS; i++) {
        const midi = PIANO_MIN_MIDI + i;
        const noteInOct = (midi - 12) % 12;
        const isBlack = IS_BLACK_KEY[noteInOct];

        if (!isBlack) {
          const kx = i * keyWidth;
          const active = activeKeysRef.current.get(midi);

          if (active) {
            ctx.fillStyle = palette.keyGlow;
            ctx.shadowColor = palette.secondary;
            ctx.shadowBlur = 14;
          } else {
            ctx.fillStyle = '#e5e7eb';
            ctx.shadowBlur = 0;
          }

          ctx.fillRect(kx, keyY, keyWidth - 0.5, keyboardHeight);
          ctx.strokeStyle = '#374151';
          ctx.strokeRect(kx, keyY, keyWidth - 0.5, keyboardHeight);
          ctx.shadowBlur = 0;
        }
      }

      // Draw black keys on top
      const blackKeyHeight = keyboardHeight * 0.62;
      for (let i = 0; i < TOTAL_KEYS; i++) {
        const midi = PIANO_MIN_MIDI + i;
        const noteInOct = (midi - 12) % 12;
        const isBlack = IS_BLACK_KEY[noteInOct];

        if (isBlack) {
          const kx = i * keyWidth;
          const active = activeKeysRef.current.get(midi);

          if (active) {
            ctx.fillStyle = palette.primary;
            ctx.shadowColor = palette.primary;
            ctx.shadowBlur = 16;
          } else {
            ctx.fillStyle = '#111827';
            ctx.shadowBlur = 0;
          }

          ctx.fillRect(kx, keyY, keyWidth + 0.5, blackKeyHeight);
          ctx.strokeStyle = '#000000';
          ctx.strokeRect(kx, keyY, keyWidth + 0.5, blackKeyHeight);
          ctx.shadowBlur = 0;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [notes, colorTheme, waterfallSpeed, particlesEnabled]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = Math.floor(rect.width);
        canvasRef.current.height = Math.floor(rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Complexity level label based on total notes
  const totalNotes = notes.length;
  let complexityLabel = 'STANDARD';
  let complexityColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let ComplexityIcon = Sparkles;

  if (totalNotes > 50000) {
    complexityLabel = 'CPU MELTDOWN';
    complexityColor = 'text-red-400 border-red-500/40 bg-red-500/20 animate-pulse';
    ComplexityIcon = Flame;
  } else if (totalNotes > 20000) {
    complexityLabel = 'BLACKOUT EXTREME';
    complexityColor = 'text-rose-400 border-rose-500/30 bg-rose-500/15';
    ComplexityIcon = Flame;
  } else if (totalNotes > 6000) {
    complexityLabel = 'TORRENTIAL CASCADE';
    complexityColor = 'text-amber-400 border-amber-500/30 bg-amber-500/15';
    ComplexityIcon = Zap;
  } else if (totalNotes > 1000) {
    complexityLabel = 'BLACK MIDI DENSE';
    complexityColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/15';
    ComplexityIcon = Zap;
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] lg:h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col select-none group"
    >
      {/* HUD Bar (Top overlay) */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Black MIDI Synthesia
            </span>
            <h3 className="text-sm font-semibold text-white truncate max-w-[220px] sm:max-w-xs md:max-w-md">
              {title}
            </h3>
          </div>
        </div>

        {/* Real-time stats pills */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Complexity Tier */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${complexityColor}`}>
            <ComplexityIcon className="w-3.5 h-3.5" />
            <span>{complexityLabel}</span>
          </div>

          {/* Total Notes */}
          <div className="flex flex-col items-end px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400">Notes</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {totalNotes.toLocaleString()}
            </span>
          </div>

          {/* Live NPS */}
          <div className="hidden md:flex flex-col items-end px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400">NPS</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {currentNps.toLocaleString()}/s
            </span>
          </div>

          {/* FPS */}
          <div className="hidden lg:flex flex-col items-end px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400">FPS</span>
            <span className="text-xs font-mono font-medium text-emerald-400">{fps}</span>
          </div>

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full flex-1 block cursor-pointer"
        onClick={togglePlay}
      />

      {/* Playhead Scrubber & Control Footer */}
      <div className="z-20 px-4 py-2.5 bg-slate-950/95 border-t border-slate-800/80 flex flex-col gap-2">
        {/* Scrubber slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 min-w-[50px]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 10}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
          <span className="text-xs font-mono text-slate-400 min-w-[50px] text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRewind}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Rewind to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play Black MIDI'}</span>
            </button>
          </div>

          {/* Quick waterfall display controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Zoom/Speed:</span>
              <input
                type="range"
                min={1.0}
                max={4.0}
                step={0.2}
                value={waterfallSpeed}
                onChange={(e) => setWaterfallSpeed(parseFloat(e.target.value))}
                className="w-20 h-1 bg-slate-800 accent-cyan-400 rounded cursor-pointer"
                title="Waterfall lookahead duration"
              />
            </div>

            <button
              onClick={() => setParticlesEnabled(!particlesEnabled)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition ${
                particlesEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="Toggle Spark Particles on Key Hits"
            >
              ✦ Sparks {particlesEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
