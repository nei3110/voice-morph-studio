import React from 'react';
import { midiToNote } from '../utils/musicTheory';

interface InteractivePianoProps {
  activeNotes: number[]; // currently sounded or selected MIDI numbers
  onNoteClick?: (midi: number) => void;
  startMidi?: number; // e.g. 48 (C3)
  endMidi?: number; // e.g. 76 (E5)
  highlightDifferences?: { [midi: number]: number }; // shift delta e.g. +1, -1
}

export const InteractivePiano: React.FC<InteractivePianoProps> = ({
  activeNotes,
  onNoteClick,
  startMidi = 48, // C3
  endMidi = 79,   // G5 (32 keys total)
  highlightDifferences = {}
}) => {
  const activeSet = new Set(activeNotes);

  const keys = [];
  for (let m = startMidi; m <= endMidi; m++) {
    const pc = ((m % 12) + 12) % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);
    const noteInfo = midiToNote(m);
    keys.push({ ...noteInfo, isBlack });
  }

  return (
    <div className="relative select-none overflow-x-auto py-2 px-1 flex justify-center">
      <div className="relative flex h-32 bg-slate-950/80 rounded-xl p-2 border border-white/10 shadow-inner">
        {keys.map((k) => {
          const isActive = activeSet.has(k.midi);
          const shiftDelta = highlightDifferences[k.midi];

          if (k.isBlack) {
            return (
              <button
                key={k.midi}
                onClick={() => onNoteClick && onNoteClick(k.midi)}
                title={`${k.name} (MIDI ${k.midi})`}
                style={{
                  zIndex: 20,
                  marginLeft: '-0.85rem',
                  marginRight: '-0.85rem',
                }}
                className={`w-7 h-20 rounded-b-md transition-all duration-150 flex flex-col justify-end items-center pb-1 text-[10px] font-mono shadow-md ${
                  isActive
                    ? 'bg-gradient-to-b from-sky-400 to-teal-500 text-slate-950 font-bold ring-2 ring-sky-300 scale-[0.98]'
                    : shiftDelta !== undefined
                    ? shiftDelta > 0
                      ? 'bg-emerald-600 text-white ring-1 ring-emerald-300'
                      : 'bg-rose-600 text-white ring-1 ring-rose-300'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-500 border border-slate-700/50'
                }`}
              >
                {isActive && <span className="scale-90">{k.name}</span>}
              </button>
            );
          }

          return (
            <button
              key={k.midi}
              onClick={() => onNoteClick && onNoteClick(k.midi)}
              title={`${k.name} (MIDI ${k.midi})`}
              className={`w-9 h-28 rounded-b-lg border-r border-slate-700/60 last:border-r-0 transition-all duration-150 flex flex-col justify-end items-center pb-2 text-[10px] font-mono ${
                isActive
                  ? 'bg-gradient-to-b from-sky-200 via-sky-300 to-teal-400 text-slate-950 font-bold ring-2 ring-sky-400 scale-[0.99] z-10'
                  : shiftDelta !== undefined
                  ? shiftDelta > 0
                    ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-500 z-10'
                    : 'bg-rose-100 text-rose-950 ring-1 ring-rose-500 z-10'
                  : 'bg-slate-200 hover:bg-white text-slate-600 active:bg-slate-300'
              }`}
            >
              <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                {k.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
