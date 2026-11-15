import React from 'react';
import { Play, Square, Download, Trash2, ArrowRight } from 'lucide-react';
import { identifyChord } from '../utils/musicTheory';
import { generateMidiFile } from '../utils/morphEngine';

export interface SavedChord {
  id: string;
  notes: number[];
  name: string;
  comment?: string;
  timestamp: number;
}

interface ProgressionStripProps {
  progression: SavedChord[];
  activeStep: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRemoveChord: (index: number) => void;
  onSelectChord: (chord: SavedChord) => void;
  onClear: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

export const ProgressionStrip: React.FC<ProgressionStripProps> = ({
  progression,
  activeStep,
  isPlaying,
  onPlay,
  onStop,
  onRemoveChord,
  onSelectChord,
  onClear,
  bpm,
  onBpmChange,
}) => {
  const handleExportMidi = () => {
    if (progression.length === 0) return;
    const blob = generateMidiFile(progression, bpm);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chord-progression-${Date.now()}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel p-5 mt-6 border border-white/10 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]"></div>
          <h2 className="text-base font-semibold tracking-wide text-white">
            作成したコード進行・スケッチ
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {progression.length} コード
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* BPM */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-slate-400 font-mono">BPM</span>
            <input
              type="number"
              min="40"
              max="220"
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value) || 72)}
              className="w-14 bg-transparent text-right font-mono font-bold text-sky-400 focus:outline-none"
            />
          </div>

          {/* Playback Controls */}
          {isPlaying ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md transition-all"
            >
              <Square size={14} fill="currentColor" />
              <span>停止</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={progression.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-medium shadow-md transition-all"
            >
              <Play size={14} fill="currentColor" />
              <span>進行を試聴</span>
            </button>
          )}

          {/* Export MIDI */}
          <button
            onClick={handleExportMidi}
            disabled={progression.length === 0}
            title="DAW (Logic, Ableton, FL, Studio One等) にそのままドラッグできるMIDIファイルとして書き出し"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/10 transition-all"
          >
            <Download size={14} />
            <span>MIDI書き出し</span>
          </button>

          {/* Clear */}
          {progression.length > 0 && (
            <button
              onClick={onClear}
              title="進行をクリア"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Cards Progression View */}
      {progression.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          モーフィング候補の「＋このコードを採用」ボタンを押すと、ここに進行が記録されます。
          <br />
          <span className="text-xs text-slate-600 mt-1 inline-block">
            何小節か並べてみて、連続再生して心地よさを確認しましょう。
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto py-4 px-1">
          {progression.map((chord, idx) => {
            const isCurrentPlaying = activeStep === idx;
            return (
              <React.Fragment key={chord.id || idx}>
                <div
                  onClick={() => onSelectChord(chord)}
                  className={`group relative flex-shrink-0 w-36 p-3 rounded-xl border transition-all cursor-pointer ${
                    isCurrentPlaying
                      ? 'bg-gradient-to-b from-sky-900/60 to-teal-900/60 border-teal-400 ring-2 ring-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.3)] scale-[1.03]'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-white/10 hover:border-sky-500/50'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                    <span>Bar {idx + 1}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveChord(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-lg font-bold text-white tracking-tight truncate">
                    {chord.name || identifyChord(chord.notes)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-1 flex flex-wrap gap-1">
                    {chord.notes.map((n) => (
                      <span key={n} className="px-1 py-0.2 rounded bg-black/40 text-sky-300">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {idx < progression.length - 1 && (
                  <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
