import React, { useState } from 'react';
import {
  BlackMidiConfig,
  MidiSequence,
  AiTransformRecipe,
} from '../types/midi';
import { getNotesPitchRange } from '../utils/safeMath';
import {
  Bot,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Loader2,
  BrainCircuit,
  Flame,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AiAlchemistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSequence: MidiSequence;
  currentConfig: BlackMidiConfig;
  onApplyRecipe: (recipe: AiTransformRecipe) => void;
}

const INSPIRATION_PROMPTS = [
  'Rush E Hypersonic Speed Battle with alternating staircase tremolos and 100x density',
  'Apocalyptic Gothic Cathedral Organ with cascading 64th-note angel wings',
  'Cyberpunk Neon Valkyrie with torrential diamond bursts and exponential velocity',
  'Baroque Bach Toccata on hyper-drive with fractal polyrhythmic waterfalls',
  'Ethereal Celestial Starfall with shimmering major 9th harmonic clusters',
  'Dark Industrial Techno Core with machine-gun staccato ratchets and heartbeat swells',
];

export const AiAlchemistModal: React.FC<AiAlchemistModalProps> = ({
  isOpen,
  onClose,
  currentSequence,
  currentConfig,
  onApplyRecipe,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<AiTransformRecipe | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (selectedPrompt?: string) => {
    const textPrompt = selectedPrompt || prompt;
    if (!textPrompt.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setGeneratedRecipe(null);

    try {
      // Calculate MIDI stats safely
      const noteCount = currentSequence.notes.length;
      const { min: minPitch, max: maxPitch } = getNotesPitchRange(currentSequence.notes);
      const uniquePitches = new Set(currentSequence.notes.map((n) => n.midi)).size;

      const res = await fetch('/api/ai/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textPrompt,
          midiStats: {
            title: currentSequence.name,
            noteCount,
            uniquePitches,
            pitchRange: `MIDI ${minPitch} to ${maxPitch}`,
            durationSeconds: currentSequence.duration,
          },
          currentStyle: currentConfig.patternMode,
        }),
      });

      const data = await res.json();
      if (data.recipe) {
        setGeneratedRecipe(data.recipe);
      } else {
        throw new Error(data.error || 'Failed to generate transformation recipe');
      }
    } catch (err: any) {
      console.error('AI Alchemist Error:', err);
      setErrorMsg(err?.message || 'Could not connect to Gemini AI. Applying intelligent offline preset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedRecipe) return;

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff007f', '#a855f7', '#fbbf24'],
      });
    } catch {
      // ignore
    }

    onApplyRecipe(generatedRecipe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Gemini AI Black MIDI Architect
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  gemini-3.8-flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ask AI to orchestrate extreme polyphonic transformations & visual note art
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Prompt input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Describe your desired Black MIDI Vision
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Hypersonic Rush E battle with cascading 64th-note tremolos and angel wings..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Inspiration Prompt Pills */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono text-slate-400">Or pick an iconic archetype:</span>
            <div className="flex flex-wrap gap-2">
              {INSPIRATION_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p);
                    handleGenerate(p);
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-cyan-300 transition text-left"
                >
                  ⚡ {p}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice if any */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
              {errorMsg}
            </div>
          )}

          {/* Generated Recipe Preview Card */}
          {generatedRecipe && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Recipe Synthesized: {generatedRecipe.styleTitle}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {generatedRecipe.densityFactor}x Density
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-cyan-400/60 pl-3">
                "{generatedRecipe.commentary}"
              </p>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">Pattern Mode</span>
                  <span className="text-white font-medium capitalize">
                    {generatedRecipe.patternMode.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">Octaves</span>
                  <span className="text-purple-300 font-medium">
                    ±{generatedRecipe.octaveSpread} Octaves
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">Note Art</span>
                  <span className="text-rose-300 font-medium capitalize">
                    {generatedRecipe.visualNoteArt}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">Tremolo Slice</span>
                  <span className="text-amber-300 font-medium">
                    1/{generatedRecipe.tremoloSubdivision || 32}th notes
                  </span>
                </div>
              </div>

              <button
                onClick={handleApply}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
              >
                <span>Apply This Black MIDI Transformation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
