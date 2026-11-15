import React from 'react';
import { Volume2, Plus, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MorphCandidate } from '../utils/musicTheory';
import { midiToNote } from '../utils/musicTheory';

interface MorphCandidateCardProps {
  candidate: MorphCandidate;
  baseNotes: number[];
  onPlay: (notes: number[]) => void;
  onSelectAsBase: (candidate: MorphCandidate) => void;
  onAddToProgression: (candidate: MorphCandidate) => void;
  isCurrentlyAuditioning?: boolean;
}

export const MorphCandidateCard: React.FC<MorphCandidateCardProps> = ({
  candidate,
  baseNotes,
  onPlay,
  onSelectAsBase,
  onAddToProgression,
  isCurrentlyAuditioning,
}) => {
  return (
    <div
      className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
        isCurrentlyAuditioning
          ? 'bg-slate-800/95 border-sky-400 ring-2 ring-sky-400/40 shadow-lg shadow-sky-950'
          : 'bg-slate-900/60 hover:bg-slate-850 border-white/10 hover:border-white/20'
      }`}
    >
      {/* Header: Chord Name & Tag */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              {candidate.nameEstimate}
              {candidate.totalVoiceMovement === 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-normal">
                  最少変形 (1音)
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {candidate.tag}
            </span>
          </div>

          <button
            onClick={() => onPlay(candidate.notes)}
            title="音を聴く"
            className="p-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/20 transition-colors"
          >
            <Volume2 size={16} />
          </button>
        </div>

        {/* Voice Movement Breakdown */}
        <div className="mt-3.5 space-y-1.5 bg-black/30 p-2.5 rounded-lg border border-white/5">
          <div className="text-[11px] font-mono text-slate-400 flex justify-between">
            <span>各構成音の変形量 (-1〜+1)</span>
            <span className="text-slate-500">計 {candidate.totalVoiceMovement} 半音</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {candidate.notes.map((note, idx) => {
              const shift = candidate.shifts[idx];
              const fromNote = midiToNote(baseNotes[idx]);
              const toNote = midiToNote(note);

              let badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700/50';
              let icon = <Minus size={10} />;
              let text = '0';

              if (shift > 0) {
                badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-semibold';
                icon = <TrendingUp size={11} />;
                text = `+${shift}`;
              } else if (shift < 0) {
                badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-700/60 font-semibold';
                icon = <TrendingDown size={11} />;
                text = `${shift}`;
              }

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${badgeColor}`}
                >
                  <span className="opacity-70 text-[10px]">{fromNote.name}</span>
                  <span className="text-[10px]">→</span>
                  <span className="font-bold">{toNote.name}</span>
                  <span className="flex items-center ml-1 text-[10px]">
                    {icon} {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2 pt-2 border-t border-white/5">
        <button
          onClick={() => onAddToProgression(candidate)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 hover:text-teal-200 border border-teal-500/30 text-xs font-semibold transition-all"
        >
          <Plus size={13} />
          <span>進行に追加</span>
        </button>

        <button
          onClick={() => onSelectAsBase(candidate)}
          title="このコードを次の起点にしてさらにモーフィングを探す"
          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
        >
          <Sparkles size={12} className="text-amber-400" />
          <span>次の起点にする</span>
        </button>
      </div>
    </div>
  );
};
