import React from 'react';
import {
  Cpu,
  Zap,
  Flame,
  ShieldAlert,
  HardDrive,
  Volume2,
  CheckCircle2,
  X,
  Gauge,
  Sparkles,
} from 'lucide-react';

interface PolyphonyBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalNotes: number;
  durationSeconds: number;
  bpm: number;
}

export const PolyphonyBenchmarkModal: React.FC<PolyphonyBenchmarkModalProps> = ({
  isOpen,
  onClose,
  totalNotes,
  durationSeconds,
  bpm,
}) => {
  if (!isOpen) return null;

  const dur = Math.max(1, durationSeconds);
  const avgNps = Math.round(totalNotes / dur);
  const peakNps = Math.round(avgNps * 3.4);
  const estVoicesNeeded = Math.round(peakNps * 0.45);
  const estRamMb = Math.round((totalNotes * 28) / (1024 * 1024) + 120);

  let hardwareTier = 'Standard Home PC';
  let hardwareBadgeColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
  let riskLevel = 'Low CPU Impact';

  if (totalNotes >= 1000000000) {
    hardwareTier = 'NASA Quantum Supercomputer';
    hardwareBadgeColor = 'text-rose-400 border-rose-500/60 bg-rose-500/20 animate-pulse';
    riskLevel = 'EXTREME: Soundfont Driver Buffer Overflow Guaranteed';
  } else if (totalNotes >= 100000000) {
    hardwareTier = 'Dual 64-Core AMD Threadripper + 128GB RAM';
    hardwareBadgeColor = 'text-red-400 border-red-500/60 bg-red-500/20';
    riskLevel = 'VERY HIGH: Requires OmniMIDI / KDMAPI 64-bit engine';
  } else if (totalNotes >= 1000000) {
    hardwareTier = 'High-End Gaming Rig (i9 / Ryzen 9 + 32GB RAM)';
    hardwareBadgeColor = 'text-amber-400 border-amber-500/50 bg-amber-500/15';
    riskLevel = 'Moderate: Standard Windows MIDI synth will stutter';
  } else if (totalNotes >= 100000) {
    hardwareTier = 'Modern Laptop / Quad-Core Desktop';
    hardwareBadgeColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-500/15';
    riskLevel = 'Smooth: Handled easily by Keppy\'s MIDI Driver';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-red-900/60 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl shadow-red-950/60 text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-700/60 text-red-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Soundfont Polyphony Benchmark Simulator
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-700/60">
                  Hardware Stress Test
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Predicts hardware voice exhaustion & MIDI driver buffer stability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Tier Display */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-950 via-red-950/30 to-black border border-red-800/50 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
            REQUIRED HARDWARE SPECIFICATION
          </span>
          <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-400">
            {hardwareTier}
          </span>
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${hardwareBadgeColor}`}>
            {riskLevel}
          </span>
        </div>

        {/* Benchmark Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Total Notes</span>
            <span className="text-lg font-mono font-bold text-white">
              {totalNotes.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Peak NPS (Notes/Sec)</span>
            <span className="text-lg font-mono font-bold text-amber-400">
              {peakNps.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Max Concurrent Voices</span>
            <span className="text-lg font-mono font-bold text-red-400">
              {estVoicesNeeded.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Est. RAM Buffer</span>
            <span className="text-lg font-mono font-bold text-cyan-400">
              {estRamMb > 1024 ? `${(estRamMb / 1024).toFixed(1)} GB` : `${estRamMb} MB`}
            </span>
          </div>
        </div>

        {/* Soundfont Engine Recommendations */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-2.5 text-xs">
          <span className="font-mono font-bold text-white flex items-center gap-1.5 uppercase text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Recommended Playback Software
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <strong className="text-white block">OmniMIDI (Keppy&apos;s)</strong>
              <span className="text-[10px] text-zinc-400">Best for 10M - 1B notes without voice clipping.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <strong className="text-white block">Piano From Above</strong>
              <span className="text-[10px] text-zinc-400">High-speed OpenGL renderer for falling visual art.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <strong className="text-white block">Zenith MIDI Engine</strong>
              <span className="text-[10px] text-zinc-400">100% compliant with chunked Type-1 SMF files.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
