import React, { useEffect, useRef, useState } from 'react';
import { MidiNote, MidiColorPalette, GlitchMode } from '../types/midi';
import { audioEngine, GlitchBurstType } from '../audio/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Flame,
  Zap,
  Hash,
} from 'lucide-react';

interface LivePianoRollVisualizerProps {
  notes: MidiNote[];
  originalNotes: MidiNote[];
  colorPalette: MidiColorPalette;
  title: string;
  onClose?: () => void;
  isDocked?: boolean;
  minMidi?: number;
  totalKeys?: number;
  targetMinimumNotes?: number;
  glitchMode?: GlitchMode;
  onCycleGlitchMode?: () => void;
  showVideoNoteCounter?: boolean;
}

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

const PALETTE_CHANNEL_COLORS: Record<MidiColorPalette, string[]> = {
  synthesia_rainbow: [
    '#3b82f6', '#ef4444', '#10b981', '#eab308',
    '#06b6d4', '#ec4899', '#f97316', '#84cc16',
    '#8b5cf6', '#f43f5e', '#14b8a6', '#f59e0b',
    '#a855f7', '#fb7185', '#eab308', '#ffffff',
  ],
  cyber_neon: [
    '#00f0ff', '#ff007f', '#a855f7', '#10b981',
    '#00f0ff', '#ff007f', '#a855f7', '#10b981',
    '#00f0ff', '#ff007f', '#a855f7', '#10b981',
    '#00f0ff', '#ff007f', '#a855f7', '#ffffff',
  ],
  crimson_hellfire: [
    '#ef4444', '#f97316', '#eab308', '#dc2626',
    '#b91c1c', '#f97316', '#fbbf24', '#7f1d1d',
    '#3b82f6', '#a855f7', '#10b981', '#ec4899',
    '#b91c1c', '#f97316', '#fbbf24', '#ffffff',
  ],
  gold_obsidian: [
    '#fbbf24', '#f59e0b', '#d97706', '#78350f',
    '#fef08a', '#f59e0b', '#b45309', '#451a03',
    '#fbbf24', '#f59e0b', '#d97706', '#78350f',
    '#fef08a', '#f59e0b', '#b45309', '#ffffff',
  ],
  toxic_matrix: [
    '#22c55e', '#84cc16', '#06b6d4', '#ffffff',
    '#15803d', '#4d7c0f', '#0891b2', '#f0fdf4',
    '#22c55e', '#84cc16', '#06b6d4', '#ffffff',
    '#15803d', '#4d7c0f', '#0891b2', '#f0fdf4',
  ],
  synthwave_sunset: [
    '#ec4899', '#f97316', '#8b5cf6', '#00f0ff',
    '#be185d', '#c2410c', '#6d28d9', '#0284c7',
    '#ec4899', '#f97316', '#8b5cf6', '#00f0ff',
    '#be185d', '#c2410c', '#6d28d9', '#ffffff',
  ],
  octave_spectrum: [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
    '#fb7185', '#fda4af', '#67e8f9', '#a5b4fc',
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
    '#fb7185', '#fda4af', '#67e8f9', '#ffffff',
  ],
};

const IS_BLACK_KEY = [
  false, true, false, true, false, false, true, false, true, false, true, false,
]; // C, C#, D, D#, E, F, F#, G, G#, A, A#, B

export const LivePianoRollVisualizer: React.FC<LivePianoRollVisualizerProps> = ({
  notes,
  colorPalette,
  onClose,
  isDocked = false,
  minMidi = 14,
  totalKeys = 100,
  targetMinimumNotes = 50000,
  glitchMode = 'black_midi_lag',
  onCycleGlitchMode,
  showVideoNoteCounter = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [waterfallSpeed, setWaterfallSpeed] = useState(2.1); // Crisp Rush E pace
  const [activeVoiceCount, setActiveVoiceCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHudCounter, setShowHudCounter] = useState(showVideoNoteCounter);

  // Active key hit states & glitch flash sync
  const activeKeysRef = useRef<Map<number, { velocity: number; color: string; triggerTime: number }>>(new Map());
  const glitchVisualRef = useRef<{ type: GlitchBurstType; intensity: number; until: number } | null>(null);
  const particlesRef = useRef<SparkParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const effectiveTotalNotesRef = useRef<number>(Math.max(notes.length, targetMinimumNotes || notes.length));

  useEffect(() => {
    effectiveTotalNotesRef.current = Math.max(notes.length, targetMinimumNotes || notes.length);
  }, [notes.length, targetMinimumNotes]);

  const paletteColors = PALETTE_CHANNEL_COLORS[colorPalette] || PALETTE_CHANNEL_COLORS.synthesia_rainbow;

  // Load notes into audio engine
  useEffect(() => {
    audioEngine.loadSequence(notes);
    setDuration(audioEngine.getDuration() || 10);
  }, [notes]);

  // Subscribe to audio engine note triggers & Black MIDI Glitch events
  useEffect(() => {
    const unsubNotes = audioEngine.subscribeNoteTrigger((midi, vel) => {
      const chColor = paletteColors[(midi % paletteColors.length)] || '#ef4444';
      activeKeysRef.current.set(midi, {
        velocity: vel,
        color: chColor,
        triggerTime: performance.now(),
      });

      if (canvasRef.current && particlesRef.current.length < 180) {
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        const keyboardHeight = Math.max(68, height * 0.16);
        const keyY = height - keyboardHeight;
        const keyWidth = width / totalKeys;
        const keyIndex = midi - minMidi;
        if (keyIndex >= 0 && keyIndex < totalKeys) {
          const keyX = keyIndex * keyWidth + keyWidth / 2;
          for (let p = 0; p < 2; p++) {
            particlesRef.current.push({
              x: keyX + (Math.random() - 0.5) * keyWidth,
              y: keyY,
              vx: (Math.random() - 0.5) * 3.5,
              vy: -Math.random() * 4.5 - 1.5,
              color: chColor,
              life: 1.0,
              maxLife: 16 + Math.random() * 8,
              size: 1.8 + Math.random() * 2,
            });
          }
        }
      }
    });

    const unsubGlitch = audioEngine.subscribeGlitchTrigger((type, intensity) => {
      glitchVisualRef.current = {
        type,
        intensity,
        until: performance.now() + 145,
      };
    });

    return () => {
      unsubNotes();
      unsubGlitch();
    };
  }, [paletteColors, minMidi, totalKeys]);

  // Handle Resize
  const handleResize = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvasRef.current.width = Math.floor(rect.width * dpr);
    canvasRef.current.height = Math.floor(rect.height * dpr);
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // 60FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isMounted = true;

    const render = () => {
      if (!isMounted) return;

      const now = performance.now();
      const time = audioEngine.getCurrentTime();
      setCurrentTime(time);
      setIsPlaying(audioEngine.getIsPlaying());

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const activeGlitch = glitchVisualRef.current && now < glitchVisualRef.current.until
        ? glitchVisualRef.current
        : null;

      // Apply subtle CRT horizontal shake on Black MIDI Glitch bursts
      const shakeX = activeGlitch ? (Math.random() - 0.5) * 10 * activeGlitch.intensity : 0;
      const shakeY = activeGlitch && activeGlitch.type === 'lag_freeze'
        ? (Math.random() - 0.5) * 6 * activeGlitch.intensity
        : 0;

      const keyboardHeight = Math.max(72, height * 0.165);
      const waterfallHeight = height - keyboardHeight;
      const keyWidth = width / totalKeys;

      // 1. Pure black gloss background (matches reference video)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 2. Crisp ultra-faint key lanes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let k = 0; k <= totalKeys; k++) {
        const x = k * keyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, waterfallHeight);
        ctx.stroke();
      }

      // 3. Falling Notes (Beveled Capsule Blocks matching Rush E reference video)
      const windowStart = time - 0.05;
      const windowEnd = time + waterfallSpeed;
      let activeVoiceCounter = 0;

      // Binary search start index
      let low = 0;
      let high = notes.length - 1;
      let startIdx = 0;
      const searchTarget = windowStart - 4.0;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (notes[mid].time < searchTarget) {
          low = mid + 1;
        } else {
          startIdx = mid;
          high = mid - 1;
        }
      }

      // Also track cumulative hit index for realistic live climbing note counter
      let passedNoteIdx = startIdx;

      const blockRadius = Math.min(4, Math.max(1.5, keyWidth * 0.28));

      for (let i = startIdx; i < notes.length; i++) {
        const n = notes[i];
        if (n.time <= time) passedNoteIdx = i + 1;
        if (n.time > windowEnd) break;
        if (n.time + n.duration < windowStart) continue;

        if (n.time <= time && n.time + n.duration >= time) {
          activeVoiceCounter++;
          const chColor = n.isOriginal
            ? '#ef4444'
            : paletteColors[(n.channel ?? 0) % paletteColors.length];
          activeKeysRef.current.set(n.midi, {
            velocity: n.velocity || 0.8,
            color: chColor,
            triggerTime: now,
          });
        }

        const keyIndex = n.midi - minMidi;
        if (keyIndex < 0 || keyIndex >= totalKeys) continue;

        const x = keyIndex * keyWidth;
        const noteW = Math.max(2, keyWidth - 0.8);

        const topProgress = (n.time + n.duration - time) / waterfallSpeed;
        const bottomProgress = (n.time - time) / waterfallSpeed;

        const yBottom = waterfallHeight - bottomProgress * waterfallHeight;
        const yTop = waterfallHeight - topProgress * waterfallHeight;
        const noteH = Math.max(4, yBottom - yTop);

        const ch = (n.channel ?? (n.isOriginal ? 0 : 1)) % paletteColors.length;
        const noteColor = n.isOriginal ? '#22c55e' : paletteColors[ch];

        // Rounded glowing Synthesia/Zenith note capsule
        ctx.fillStyle = noteColor;
        if (noteH >= 6 && noteW >= 4) {
          ctx.beginPath();
          ctx.roundRect(x + 0.4, yTop, noteW - 0.4, noteH, blockRadius);
          ctx.fill();

          // Glossy bevel border like the Rush E video blocks
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.fillRect(x + 1, yTop + 1, Math.max(1, noteW - 2), Math.min(2, noteH * 0.3));
        } else {
          ctx.fillRect(x + 0.3, yTop, noteW, noteH);
        }
      }

      setActiveVoiceCount(activeVoiceCounter);

      // 4. Glitch Scanline Overlay during audio glitch trigger
      if (activeGlitch) {
        const bars = 6;
        for (let b = 0; b < bars; b++) {
          const gy = Math.random() * waterfallHeight;
          const gh = 2 + Math.random() * 8;
          ctx.fillStyle = b % 2 === 0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.22)';
          ctx.fillRect(0, gy, width, gh);
        }
      }

      // 5. Crisp Hit Line (Red bar right above keyboard like video)
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(0, waterfallHeight - 3, width, 3);
      ctx.fillStyle = activeGlitch ? '#ef4444' : '#dc2626';
      ctx.fillRect(0, waterfallHeight - 1, width, 2);

      // 6. Real Piano Keyboard at bottom (Unbroken White Keybed + Clean Black Key Overlays)
      // Count white keys vs black keys in [minMidi, minMidi + totalKeys - 1]
      const whiteKeyIndices: number[] = [];
      for (let k = 0; k < totalKeys; k++) {
        const pc = (((minMidi + k) % 12) + 12) % 12;
        if (!IS_BLACK_KEY[pc]) {
          whiteKeyIndices.push(k);
        }
      }
      const whiteCount = Math.max(1, whiteKeyIndices.length);
      const whiteKeyW = width / whiteCount;

      // Map every chromatic index to its horizontal white-key slot for crisp visual keyboard
      const chromaticX = new Float32Array(totalKeys);
      let whiteSlot = 0;
      for (let k = 0; k < totalKeys; k++) {
        const pc = (((minMidi + k) % 12) + 12) % 12;
        if (!IS_BLACK_KEY[pc]) {
          chromaticX[k] = whiteSlot * whiteKeyW;
          whiteSlot++;
        } else {
          // Sit straddling the boundary between previous and next white key
          chromaticX[k] = Math.max(0, whiteSlot * whiteKeyW - whiteKeyW * 0.34);
        }
      }

      // A. Draw ALL white keys cleanly across 100% of width (zero dark gaps!)
      whiteSlot = 0;
      for (let k = 0; k < totalKeys; k++) {
        const midi = minMidi + k;
        const pc = ((midi % 12) + 12) % 12;
        if (!IS_BLACK_KEY[pc]) {
          const x = whiteSlot * whiteKeyW;
          const activeState = activeKeysRef.current.get(midi);
          const isLit = activeState && now - activeState.triggerTime < 160;

          ctx.fillStyle = isLit ? activeState.color : '#f8fafc';
          ctx.fillRect(x, waterfallHeight, whiteKeyW, keyboardHeight);

          // Top keybed shadow
          ctx.fillStyle = isLit ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.18)';
          ctx.fillRect(x, waterfallHeight, whiteKeyW, 5);

          // Subtle key divider border
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, waterfallHeight, whiteKeyW, keyboardHeight);

          whiteSlot++;
        }
      }

      // B. Draw ALL black keys cleanly on top
      const blackW = Math.max(3, whiteKeyW * 0.64);
      const blackH = keyboardHeight * 0.63;
      for (let k = 0; k < totalKeys; k++) {
        const midi = minMidi + k;
        const pc = ((midi % 12) + 12) % 12;
        if (IS_BLACK_KEY[pc]) {
          const x = chromaticX[k];
          const activeState = activeKeysRef.current.get(midi);
          const isLit = activeState && now - activeState.triggerTime < 160;

          ctx.fillStyle = isLit ? activeState.color : '#09090b';
          ctx.fillRect(x, waterfallHeight, blackW, blackH);

          // Crisp highlight bevel on bottom of black key
          ctx.fillStyle = isLit ? 'rgba(255,255,255,0.45)' : '#27272a';
          ctx.fillRect(x + 1, waterfallHeight + blackH - 4, Math.max(1, blackW - 2), 3);

          ctx.strokeStyle = '#18181b';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, waterfallHeight, blackW, blackH);
        }
      }

      // Clean expired key presses
      activeKeysRef.current.forEach((val, key) => {
        if (now - val.triggerTime > 175) {
          activeKeysRef.current.delete(key);
        }
      });

      // 7. Sparks on hit line
      for (let p = particlesRef.current.length - 1; p >= 0; p--) {
        const pt = particlesRef.current[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.16;
        pt.life -= 1 / pt.maxLife;
        if (pt.life <= 0) {
          particlesRef.current.splice(p, 1);
          continue;
        }
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();

      // 8. GIANT TOP-CENTER LIVE CLIMBING NOTE COUNTER (Matching Reference Video `340,887,919`!)
      if (showHudCounter) {
        const totalEffective = effectiveTotalNotesRef.current;
        const noteFraction = notes.length > 0 ? passedNoteIdx / notes.length : 0;
        const liveCount = Math.min(totalEffective, Math.floor(noteFraction * totalEffective));
        const counterText = liveCount.toLocaleString();

        const fontSize = Math.max(20, Math.min(40, Math.round(width * 0.028)));
        ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const counterX = width / 2 + (activeGlitch ? (Math.random() - 0.5) * 6 : 0);
        const counterY = 18;

        // Crisp dark outline so counter stays readable over dense notes just like frame 0:02!
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.strokeText(counterText, counterX, counterY);

        ctx.fillStyle = activeGlitch ? '#ef4444' : '#ffffff';
        ctx.fillText(counterText, counterX, counterY);
        ctx.textAlign = 'left';
      }

      // 9. Top-Right Zenith / Reference Video Stats
      const curM = Math.floor(time / 60);
      const curS = (time % 60).toFixed(1);
      const durM = Math.floor(duration / 60);
      const durS = (duration % 60).toFixed(1);
      const timeText = `Time:   ${curM}:${parseFloat(curS) < 10 ? '0' : ''}${curS} / ${durM}:${parseFloat(durS) < 10 ? '0' : ''}${durS}`;

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(timeText, width - 215, 22);
      ctx.fillStyle = activeGlitch ? '#f87171' : '#94a3b8';
      ctx.fillText(
        activeGlitch ? `⚡ GLITCH: ${activeGlitch.type.toUpperCase()}` : `Voices: ${activeVoiceCounter.toLocaleString()}`,
        width - 215,
        40
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [notes, waterfallSpeed, paletteColors, duration, minMidi, totalKeys, showHudCounter]);

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
    <div
      ref={containerRef}
      className={`relative w-full rounded-3xl bg-black border border-red-900/60 shadow-2xl overflow-hidden flex flex-col select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : isDocked ? 'h-[490px]' : 'h-[540px]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/90 via-black/45 to-transparent flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-700/60 text-red-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono font-black text-white">Live Waterfall</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900/90 text-amber-300 border border-zinc-700 font-bold">
              🎹 {totalKeys} Keys
            </span>
            {onCycleGlitchMode && (
              <button
                onClick={onCycleGlitchMode}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 transition cursor-pointer ${
                  glitchMode !== 'off'
                    ? 'bg-red-600/30 text-red-200 border-red-500/70'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                }`}
                title="Cycle Black MIDI Glitch Audio & Screen FX"
              >
                <Zap className="w-3 h-3" />
                <span>Glitch: {glitchMode.replace(/_/g, ' ').toUpperCase()}</span>
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHudCounter(!showHudCounter)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition cursor-pointer flex items-center gap-1 ${
              showHudCounter
                ? 'bg-zinc-800 text-white border-zinc-600'
                : 'bg-zinc-950 text-zinc-500 border-zinc-800'
            }`}
            title="Toggle Live Climbing Note Counter"
          >
            <Hash className="w-3 h-3" />
            <span className="hidden sm:inline">Counter</span>
          </button>

          {/* Waterfall Speed Selector */}
          <div className="hidden md:flex items-center gap-1 bg-black/70 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] font-mono text-zinc-300">
            <span>Speed:</span>
            {[1.4, 2.1, 3.2].map((spd) => (
              <button
                key={spd}
                onClick={() => setWaterfallSpeed(spd)}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  waterfallSpeed === spd
                    ? 'bg-red-600 text-white font-bold'
                    : 'hover:text-white text-zinc-400'
                }`}
              >
                {spd}s
              </button>
            ))}
          </div>

          <button
            onClick={handleRewind}
            className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs border border-zinc-700 transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" onClick={togglePlay} />

      {/* Interactive Timeline Scrubber at bottom edge */}
      <div className="bg-zinc-950 border-t border-zinc-800 px-3 py-1.5 flex items-center gap-3 text-[10px] font-mono text-zinc-400">
        <span>{currentTime.toFixed(1)}s</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={0.1}
          value={Math.min(duration, currentTime)}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            audioEngine.seek(t);
            setCurrentTime(t);
          }}
          className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
          title="Scrub Timeline"
        />
        <span>{duration.toFixed(1)}s</span>
        <span className="hidden sm:inline text-red-400 font-bold">
          {activeVoiceCount} Voices
        </span>
      </div>
    </div>
  );
};
