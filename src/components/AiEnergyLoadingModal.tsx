import React, { useState, useEffect, useRef } from 'react';
import { SongEnergyProfile, AnalyzedMovement } from '../utils/songEnergyAnalyzer';
import {
  Brain,
  Zap,
  Activity,
  Flame,
  Music2,
  CheckCircle2,
  X,
  Gauge,
  Sliders,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Volume2,
} from 'lucide-react';

interface AiEnergyLoadingModalProps {
  isOpen: boolean;
  isAnalyzing: boolean;
  profile: SongEnergyProfile | null;
  songTitle: string;
  originalNotesCount: number;
  bpm: number;
  onClose: () => void;
}

export const AiEnergyLoadingModal: React.FC<AiEnergyLoadingModalProps> = ({
  isOpen,
  isAnalyzing,
  profile,
  songTitle,
  originalNotesCount,
  bpm,
  onClose,
}) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const SCAN_STEPS = [
    'Scanning note polyphony & voice intervals...',
    'Computing Krumhansl-Schmuckler chromagram & tonal key...',
    'Evaluating harmonic dissonance & modal tension index...',
    'Extracting sub-bass harmonic roots (MIDI 21 to 38)...',
    'Synthesizing continuous dynamic density curve & macro movements...',
    'Musical Energy Intelligence model calibrated successfully!',
  ];

  // Animated scanner step runner when isAnalyzing is triggered
  useEffect(() => {
    if (!isOpen) return;

    if (isAnalyzing) {
      setScanProgress(5);
      setScanStepIndex(0);

      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          const next = prev + Math.floor(Math.random() * 18) + 12;
          const capped = Math.min(100, next);
          const step = Math.min(
            SCAN_STEPS.length - 1,
            Math.floor((capped / 100) * (SCAN_STEPS.length - 1))
          );
          setScanStepIndex(step);
          return capped;
        });
      }, 160);

      return () => clearInterval(interval);
    } else {
      setScanProgress(100);
      setScanStepIndex(SCAN_STEPS.length - 1);
    }
  }, [isOpen, isAnalyzing]);

  // Draw the high-resolution AI Energy Waveform Canvas
  useEffect(() => {
    if (!profile || !canvasRef.current || scanProgress < 85) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const points = profile.waveformPoints;
    if (points.length < 2) return;

    const totalDur = profile.totalDuration || 1;

    // Background grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.lineWidth = 1;
    for (let y = 0.25; y <= 0.75; y += 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, height * y);
      ctx.lineTo(width, height * y);
      ctx.stroke();
    }

    // Crazy threshold line (0.60)
    const crazyY = height * (1 - 0.60);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, crazyY);
    ctx.lineTo(width, crazyY);
    ctx.stroke();

    // Relaxed threshold line (0.35)
    const relaxedY = height * (1 - 0.35);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, relaxedY);
    ctx.lineTo(width, relaxedY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Energy Area Gradient Fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.65)'); // Climax red
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)'); // Mid amber
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.1)'); // Relaxed green

    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const x = (pt.time / totalDur) * width;
      const y = height * (1 - Math.max(0.04, pt.energy * 0.92));
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Energy Stroke Line
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const x = (pt.time / totalDur) * width;
      const y = height * (1 - Math.max(0.04, pt.energy * 0.92));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Harmonic Tension Curve (Glowing Magenta Dotted)
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const x = (pt.time / totalDur) * width;
      const y = height * (1 - Math.max(0.04, pt.tension * 0.85));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw hover cursor line
    if (hoveredTime !== null) {
      const hx = (hoveredTime / totalDur) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();
    }
  }, [profile, scanProgress, hoveredTime]);

  if (!isOpen) return null;

  const isScanning = isAnalyzing || scanProgress < 100;
  const activeHoverState = hoveredTime !== null && profile ? profile.getStateAtTime(hoveredTime) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl shadow-cyan-500/20 max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Brain className={`w-7 h-7 ${isScanning ? 'animate-pulse text-cyan-300' : 'text-cyan-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">AI Musical Energy Intelligence</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  Adaptive v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full-spectrum harmonic tension, register spread & sub-bass anchor profiling
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Scanner Banner (When scanning) */}
        {isScanning && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/30 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin text-cyan-400" />
                {SCAN_STEPS[scanStepIndex]}
              </span>
              <span className="text-cyan-400 font-bold">{scanProgress}%</span>
            </div>

            {/* Glowing Scan Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-150"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Intelligence Metrics Ribbon */}
        {profile && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Detected Key</span>
              <span className="text-base font-bold text-white font-mono flex items-center gap-1.5">
                <Music2 className="w-4 h-4 text-cyan-400" />
                {profile.detectedKey}
              </span>
              <span className="text-[10px] text-slate-500">Krumhansl-Schmuckler</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Dynamic Contrast</span>
              <span className="text-base font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-400" />
                {profile.dynamicRangeDb} dB Range
              </span>
              <span className="text-[10px] text-slate-500">Peak-to-Quiet Ratio</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Peak Note Rate</span>
              <span className="text-base font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                {profile.maxNoteRate.toFixed(1)} notes/s
              </span>
              <span className="text-[10px] text-slate-500">Cadenza / Drop Burst</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Sub-Bass Anchors</span>
              <span className="text-base font-bold text-rose-400 font-mono flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-rose-400" />
                MIDI 21 - 38
              </span>
              <span className="text-[10px] text-slate-500">Harmonically Anchored</span>
            </div>
          </div>
        )}

        {/* Interactive Dynamic Energy Waveform Display */}
        <div className="flex flex-col gap-2 p-5 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Dynamic Musical Energy Curve Across Timeline
            </span>

            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                Energy (0.25x - 3.2x)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                Harmonic Tension
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Crazy Zone (&gt;0.60)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Relaxed Zone (&lt;0.35)
              </span>
            </div>
          </div>

          {/* Canvas Waveform */}
          <div className="relative w-full h-36 bg-slate-900/90 rounded-xl overflow-hidden border border-slate-800">
            <canvas
              ref={canvasRef}
              width={820}
              height={144}
              onMouseMove={(e) => {
                if (!profile) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const xFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setHoveredTime(xFrac * profile.totalDuration);
              }}
              onMouseLeave={() => setHoveredTime(null)}
              className="w-full h-full cursor-crosshair"
            />
          </div>

          {/* Hover Inspector Tooltip */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 pt-1">
            {activeHoverState && hoveredTime !== null ? (
              <span className="text-cyan-300">
                At <strong>{hoveredTime.toFixed(1)}s</strong>: Energy{' '}
                <strong className={activeHoverState.isCrazy ? 'text-red-400' : activeHoverState.isRelaxed ? 'text-emerald-400' : 'text-amber-300'}>
                  {(activeHoverState.energy * 100).toFixed(0)}% ({activeHoverState.densityMultiplier.toFixed(2)}x)
                </strong>{' '}
                • State: <strong>{activeHoverState.isCrazy ? 'CRAZY (Wall of Notes)' : activeHoverState.isRelaxed ? 'RELAXED (Gentle)' : 'MODERATE (Dynamic)'}</strong> • Root:{' '}
                <strong>{activeHoverState.subBassRootPitch} ({activeHoverState.subBassOctaves.join(', ')})</strong>
              </span>
            ) : (
              <span>Hover across the waveform to inspect real-time harmonic energy & sub-bass anchors</span>
            )}
            <span>Duration: <strong>{(profile?.totalDuration || 0).toFixed(1)}s</strong></span>
          </div>
        </div>

        {/* Macro Movements Breakdown */}
        {profile && profile.movements.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Detected Movement Architecture ({profile.movements.length} Parts)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Density pacing automatically adapts to each movement's musical character
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {profile.movements.map((mov) => {
                const isCrazy = mov.character === 'apocalyptic';
                const isRelaxed = mov.character === 'relaxed';

                const badgeBg = isCrazy
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : isRelaxed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                return (
                  <div
                    key={mov.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">{mov.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${badgeBg}`}>
                        {mov.character}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">{mov.description}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-500">
                      <span>{mov.startTime.toFixed(1)}s - {mov.endTime.toFixed(1)}s</span>
                      <span className="text-cyan-400 font-bold">{(mov.avgEnergy * 100).toFixed(0)}% Energy</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-xs font-mono text-slate-400">
            <span>Original Track: <strong className="text-white">{songTitle}</strong></span>
            <span className="mx-2">•</span>
            <span>Notes: <strong className="text-cyan-300">{originalNotesCount.toLocaleString()}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 transition active:scale-95"
          >
            Apply & Densify
          </button>
        </div>
      </div>
    </div>
  );
};
