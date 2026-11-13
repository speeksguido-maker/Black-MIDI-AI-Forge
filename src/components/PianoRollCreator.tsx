import React, { useState } from 'react';
import { MidiNote, MidiSequence } from '../types/midi';
import { Music, Plus, Trash2, Wand2, Play, Volume2 } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';

interface PianoRollCreatorProps {
  onApplyMelody: (sequence: MidiSequence) => void;
}

const SCALE_NOTES = [
  { midi: 84, name: 'C6' },
  { midi: 83, name: 'B5' },
  { midi: 81, name: 'A5' },
  { midi: 79, name: 'G5' },
  { midi: 77, name: 'F5' },
  { midi: 76, name: 'E5' },
  { midi: 74, name: 'D5' },
  { midi: 72, name: 'C5' },
  { midi: 71, name: 'B4' },
  { midi: 69, name: 'A4' },
  { midi: 67, name: 'G4' },
  { midi: 65, name: 'F4' },
  { midi: 64, name: 'E4' },
  { midi: 62, name: 'D4' },
  { midi: 60, name: 'C4' },
  { midi: 57, name: 'A3' },
  { midi: 55, name: 'G3' },
  { midi: 53, name: 'F3' },
  { midi: 48, name: 'C3' },
];

const NUM_STEPS = 16;

export const PianoRollCreator: React.FC<PianoRollCreatorProps> = ({ onApplyMelody }) => {
  // Grid state: set of `${midi}-${step}`
  const [activeCells, setActiveCells] = useState<Set<string>>(() => {
    // Initial cool cyberpunk motif
    const init = new Set<string>();
    // C minor arp: C4, Eb4, G4, Bb4, C5
    [
      '60-0', '64-2', '67-4', '72-6',
      '69-8', '67-10', '64-12', '62-14',
      '48-0', '48-8', '55-4', '57-12'
    ].forEach((k) => init.add(k));
    return init;
  });

  const [bpm, setBpm] = useState(135);
  const [sequenceTitle, setSequenceTitle] = useState('My Custom Melody');

  const toggleCell = (midi: number, step: number) => {
    const key = `${midi}-${step}`;
    const next = new Set(activeCells);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      // Play note preview
      playPreviewNote(midi);
    }
    setActiveCells(next);
  };

  const playPreviewNote = (midi: number) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  };

  const clearGrid = () => {
    setActiveCells(new Set());
  };

  const loadProgression = (preset: 'epic' | 'cyberpunk' | 'baroque' | 'driving_bass') => {
    const next = new Set<string>();
    if (preset === 'cyberpunk') {
      [
        '60-0', '60-2', '67-4', '69-6', '72-8', '71-10', '67-12', '64-14',
        '48-0', '48-4', '48-8', '53-12'
      ].forEach((k) => next.add(k));
      setSequenceTitle('Cyberpunk Synth Theme');
    } else if (preset === 'epic') {
      [
        '60-0', '64-0', '67-0', '72-2', '74-4', '76-6',
        '65-8', '69-8', '72-8', '71-10', '69-12', '67-14',
        '48-0', '53-8'
      ].forEach((k) => next.add(k));
      setSequenceTitle('Epic Orchestral Theme');
    } else if (preset === 'baroque') {
      [
        '72-0', '71-1', '72-2', '74-3', '76-4', '74-5', '72-6', '71-7',
        '69-8', '67-9', '69-10', '71-11', '72-12', '71-13', '69-14', '67-15',
        '48-0', '55-4', '57-8', '53-12'
      ].forEach((k) => next.add(k));
      setSequenceTitle('Baroque Speed Arpeggio');
    } else {
      // driving_bass
      for (let s = 0; s < NUM_STEPS; s++) {
        if (s % 2 === 0) next.add(`48-${s}`);
        if (s % 4 === 0) next.add(`60-${s}`);
        if (s === 6 || s === 14) next.add(`72-${s}`);
      }
      setSequenceTitle('Driving Bassline Core');
    }
    setActiveCells(next);
  };

  const buildSequence = (): MidiSequence => {
    const stepDuration = (60 / bpm) / 4; // 16th note in seconds
    const notes: MidiNote[] = [];
    let counter = 0;

    activeCells.forEach((cellKey) => {
      const [midiStr, stepStr] = cellKey.split('-');
      const midi = parseInt(midiStr, 10);
      const step = parseInt(stepStr, 10);
      const time = step * stepDuration;

      notes.push({
        id: `created-${counter++}`,
        midi,
        time,
        duration: stepDuration * 0.9,
        velocity: 0.9,
        isOriginal: true,
      });
    });

    const totalDuration = NUM_STEPS * stepDuration;

    return {
      name: sequenceTitle || 'Custom Composition',
      bpm,
      duration: totalDuration,
      notes: notes.sort((a, b) => a.time - b.time),
    };
  };

  const handleApply = () => {
    const seq = buildSequence();
    if (seq.notes.length === 0) return;
    onApplyMelody(seq);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col gap-4 text-slate-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Compose Your Own Melody
            </h3>
            <p className="text-xs text-slate-400">
              Click on the grid to sketch a melody, then forge it into Black MIDI
            </p>
          </div>
        </div>

        {/* Quick Progression Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Quick Themes:</span>
          <button
            onClick={() => loadProgression('cyberpunk')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 border border-slate-700 transition"
          >
            Cyberpunk
          </button>
          <button
            onClick={() => loadProgression('epic')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 border border-slate-700 transition"
          >
            Epic Chord
          </button>
          <button
            onClick={() => loadProgression('baroque')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-purple-300 border border-slate-700 transition"
          >
            Baroque Run
          </button>
          <button
            onClick={() => loadProgression('driving_bass')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-emerald-300 border border-slate-700 transition"
          >
            Bass Groove
          </button>
          <button
            onClick={clearGrid}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Canvas / Step Sequencer */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px] flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
          {/* Step numbers header */}
          <div className="flex border-b border-slate-800 bg-slate-900/70">
            <div className="w-16 flex-shrink-0 px-2 py-1 text-[10px] font-mono text-slate-400 uppercase border-r border-slate-800">
              Pitch
            </div>
            <div className="flex-1 grid grid-cols-16 divide-x divide-slate-800/80">
              {Array.from({ length: NUM_STEPS }).map((_, s) => (
                <div
                  key={s}
                  className={`text-center py-1 text-[10px] font-mono ${
                    s % 4 === 0 ? 'text-cyan-400 font-bold bg-cyan-950/20' : 'text-slate-500'
                  }`}
                >
                  {s + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {SCALE_NOTES.map((pitchObj) => {
            const isBlack = [1, 3, 6, 8, 10].includes(pitchObj.midi % 12);
            return (
              <div
                key={pitchObj.midi}
                className={`flex border-b border-slate-800/60 last:border-b-0 ${
                  isBlack ? 'bg-slate-950/80' : 'bg-slate-900/40'
                }`}
              >
                {/* Key label */}
                <button
                  onClick={() => playPreviewNote(pitchObj.midi)}
                  className="w-16 flex-shrink-0 px-2 py-1.5 text-left text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 border-r border-slate-800/80 flex items-center justify-between transition group"
                  title="Click to preview pitch"
                >
                  <span>{pitchObj.name}</span>
                  <Volume2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-cyan-400" />
                </button>

                {/* 16 Step cells */}
                <div className="flex-1 grid grid-cols-16 divide-x divide-slate-800/50">
                  {Array.from({ length: NUM_STEPS }).map((_, step) => {
                    const cellKey = `${pitchObj.midi}-${step}`;
                    const isActive = activeCells.has(cellKey);
                    const isBeat = step % 4 === 0;

                    return (
                      <button
                        key={step}
                        onClick={() => toggleCell(pitchObj.midi, step)}
                        className={`h-7 transition-all flex items-center justify-center ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm shadow-cyan-500/40'
                            : isBeat
                            ? 'hover:bg-slate-800/80 bg-slate-900/20'
                            : 'hover:bg-slate-800/50'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Controls: BPM, Name, and Apply Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          {/* BPM input */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Tempo:</span>
            <input
              type="number"
              min={60}
              max={280}
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10) || 120)}
              className="w-16 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-cyan-300 text-center font-bold"
            />
            <span className="text-slate-500">BPM</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Notes:</span>
            <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
              {activeCells.size}
            </span>
          </div>
        </div>

        {/* Apply & Forge Button */}
        <button
          onClick={handleApply}
          disabled={activeCells.size === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-4 h-4" />
          <span>Load into Black MIDI Forge</span>
        </button>
      </div>
    </div>
  );
};
