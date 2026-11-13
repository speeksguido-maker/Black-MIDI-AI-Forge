import React, { useEffect, useRef } from 'react';
import { ExportProgressInfo } from '../utils/chunkedMidiBuilder';
import {
  Loader2,
  Flame,
  Terminal,
  CheckCircle2,
  XCircle,
  FileMusic,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ExportLoadingModalProps {
  isOpen: boolean;
  progressInfo: ExportProgressInfo | null;
  logs: string[];
  onCancel: () => void;
  targetNotes: number;
  filename: string;
}

export const ExportLoadingModal: React.FC<ExportLoadingModalProps> = ({
  isOpen,
  progressInfo,
  logs,
  onCancel,
  targetNotes,
  filename,
}) => {
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const percent = progressInfo ? progressInfo.percent : 5;
  const stageName = progressInfo?.stageName || 'Preparing Black MIDI Architecture...';
  const currentNotes = progressInfo?.currentNotes || 0;
  const isComplete = percent >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl shadow-cyan-500/20">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              {isComplete ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {isComplete ? 'MIDI Export Complete!' : 'Exporting Multi-Million Black MIDI'}
              </h3>
              <p className="text-xs text-slate-400">
                Step-by-step chunked binary stream • Multi-channel color encoding
              </p>
            </div>
          </div>

          {/* Target Note Badge */}
          <div className="flex flex-col items-end px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/40 font-mono">
            <span className="text-[10px] text-slate-400 uppercase">Target Density</span>
            <span className="text-xs font-bold text-cyan-300">
              {targetNotes >= 1000000000
                ? '1,000,000,000 (1B)'
                : targetNotes >= 1000000
                ? `${(targetNotes / 1000000).toFixed(0)}M Notes`
                : `${targetNotes.toLocaleString()} Notes`}
            </span>
          </div>
        </div>

        {/* Step & Progress Status */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {stageName}
            </span>
            <span className="text-emerald-400 font-bold">{percent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-150 shadow-lg shadow-cyan-500/30"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Notes Counter Sub-bar */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span>
              Encoded: <strong className="text-white">{currentNotes.toLocaleString()}</strong> /{' '}
              {targetNotes.toLocaleString()} notes
            </span>
            <span>
              Target File: <strong className="text-amber-300">{filename}</strong>
            </span>
          </div>
        </div>

        {/* Live Terminal Logs Feed */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Step-by-Step Execution Feed
            </span>
            <span className="text-[10px] text-slate-500">Non-blocking background pipeline</span>
          </div>

          <div className="w-full h-44 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-y-auto font-mono text-xs flex flex-col gap-1.5 shadow-inner">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-2 leading-relaxed text-slate-300 text-[11px]"
              >
                <span className="text-cyan-500 flex-shrink-0">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
            <div ref={terminalBottomRef} />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500 font-mono">
            {isComplete ? 'Download initiated automatically' : 'Processing chunks safely without memory limits...'}
          </span>

          {!isComplete && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 text-xs font-medium transition"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Cancel Export</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
