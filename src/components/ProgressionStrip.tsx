import React from 'react';
import { Play, Square, Download, Trash2, ArrowRight, Repeat, Sparkles, Music } from 'lucide-react';
import { identifyChord } from '../utils/musicTheory';
import { generateMidiFile } from '../utils/morphEngine';
import { ACCOMPANIMENT_PATTERNS } from '../utils/accompanimentPatterns';

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
  isLooping: boolean;
  onToggleLoop: () => void;
  onPlay: () => void;
  onStop: () => void;
  onRemoveChord: (index: number) => void;
  onSelectChord: (chord: SavedChord) => void;
  onClear: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  selectedPatternId: string;
  onPatternChange: (patternId: string) => void;
}

export const ProgressionStrip: React.FC<ProgressionStripProps> = ({
  progression,
  activeStep,
  isPlaying,
  isLooping,
  onToggleLoop,
  onPlay,
  onStop,
  onRemoveChord,
  onSelectChord,
  onClear,
  bpm,
  onBpmChange,
  selectedPatternId,
  onPatternChange,
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

  const currentPattern = ACCOMPANIMENT_PATTERNS.find(p => p.id === selectedPatternId) || ACCOMPANIMENT_PATTERNS[0];

  return (
    <div className="glass-panel p-5 mt-6 border border-white/10 shadow-xl space-y-4">
      {/* Top Header & Playback Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]"></div>
          <div>
            <h2 className="text-base font-semibold tracking-wide text-white flex items-center gap-2">
              進行スケッチ & 伴奏ループ再生
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                {progression.length} コード
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              保存したコードから次へ次へと繋げて進行を拡張できます
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Accompaniment Pattern Selector (8 Types) */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10">
            <Music size={14} className="text-teal-400" />
            <select
              value={selectedPatternId}
              onChange={(e) => onPatternChange(e.target.value)}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              {ACCOMPANIMENT_PATTERNS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Loop Toggle */}
          <button
            onClick={onToggleLoop}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              isLooping
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-[0_0_12px_rgba(45,212,191,0.2)]'
                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
            }`}
            title={isLooping ? 'ループ再生ON (連続伴奏)' : 'ループ再生OFF (1回のみ)'}
          >
            <Repeat size={13} className={isLooping ? 'text-teal-400' : ''} />
            <span>ループ{isLooping ? 'ON' : 'OFF'}</span>
          </button>

          {/* BPM */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-slate-400 font-mono">BPM</span>
            <input
              type="number"
              min="40"
              max="220"
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value) || 85)}
              className="w-12 bg-transparent text-right font-mono font-bold text-sky-400 focus:outline-none"
            />
          </div>

          {/* Playback Controls */}
          {isPlaying ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all"
            >
              <Square size={13} fill="currentColor" />
              <span>停止</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={progression.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 disabled:opacity-40 text-slate-950 font-bold shadow-md transition-all"
            >
              <Play size={13} fill="currentColor" />
              <span>伴奏を再生</span>
            </button>
          )}

          {/* Export MIDI */}
          <button
            onClick={handleExportMidi}
            disabled={progression.length === 0}
            title="DAWにドラッグできるMIDIファイルとして書き出し"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-white/10 transition-all"
          >
            <Download size={13} />
            <span>MIDI書き出し</span>
          </button>

          {/* Clear */}
          {progression.length > 0 && (
            <button
              onClick={onClear}
              title="進行をクリア"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Pattern description banner */}
      <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-black/25 text-slate-400 border border-white/5">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-teal-300">伴奏スタイル:</span>
          <span>{currentPattern.description}</span>
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          全8種類のアルペジオ・リズム伴奏
        </span>
      </div>

      {/* Cards Progression View */}
      {progression.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          変形コードの「進行に保存」または「＋」ボタンを押すと、ここに進行が記録されます。
          <br />
          <span className="text-xs text-slate-600 mt-1 inline-block">
            2つ、3つと並べて「次の起点にする」でさらにコードを繋げ、伴奏ループ再生で曲のグルーヴを確かめましょう。
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto py-3 px-1">
          {progression.map((chord, idx) => {
            const isCurrentPlaying = activeStep === idx;
            return (
              <React.Fragment key={chord.id || idx}>
                <div
                  className={`group relative flex-shrink-0 w-40 p-3 rounded-xl border transition-all ${
                    isCurrentPlaying
                      ? 'bg-gradient-to-b from-sky-900/60 to-teal-900/60 border-teal-400 ring-2 ring-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.3)] scale-[1.03]'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-white/10 hover:border-sky-500/50'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                    <span className="font-bold text-sky-400">Chord {idx + 1}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveChord(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>

                  <div className="text-lg font-bold text-white tracking-tight truncate">
                    {chord.name || identifyChord(chord.notes)}
                  </div>

                  {/* Individual Note tags */}
                  <div className="text-[10px] text-slate-400 font-mono mt-1.5 flex flex-wrap gap-1">
                    {chord.notes.map((n, i) => (
                      <span key={i} className={`px-1 py-0.5 rounded ${i === 0 ? 'bg-amber-950/70 text-amber-300 font-bold' : 'bg-black/40 text-sky-300'}`}>
                        {n}
                      </span>
                    ))}
                  </div>

                  {/* Make this Chord the Next Base for morphing */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => onSelectChord(chord)}
                      className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[11px] font-semibold border border-sky-500/20 transition-all"
                      title="このコードを起点にして、次のコード（3つ目、4つ目...）を探す"
                    >
                      <Sparkles size={11} className="text-amber-400" />
                      <span>ここから次を探す</span>
                    </button>
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
