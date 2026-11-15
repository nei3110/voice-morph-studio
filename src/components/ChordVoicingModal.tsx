import React, { useState } from 'react';
import { 
  X, 
  Volume2, 
  Sliders, 
  Check 
} from 'lucide-react';
import { midiToNote, identifyChord } from '../utils/musicTheory';
import { audioEngine } from '../utils/audioEngine';
import type { SavedChord } from './ProgressionStrip';

interface ChordVoicingModalProps {
  isOpen: boolean;
  onClose: () => void;
  progression: SavedChord[];
  initialChordIndex?: number;
  onUpdateChord: (index: number, updatedNotes: number[]) => void;
  isPlayingProgression: boolean;
  activePlayStep: number;
}

export const ChordVoicingModal: React.FC<ChordVoicingModalProps> = ({
  isOpen,
  onClose,
  progression,
  initialChordIndex = 0,
  onUpdateChord,
  isPlayingProgression,
  activePlayStep,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(initialChordIndex);

  // Sync selected index when opened or initialChordIndex changes
  React.useEffect(() => {
    if (initialChordIndex >= 0 && initialChordIndex < progression.length) {
      setSelectedIndex(initialChordIndex);
    } else if (progression.length > 0 && selectedIndex >= progression.length) {
      setSelectedIndex(0);
    }
  }, [initialChordIndex, progression.length]);

  if (!isOpen || progression.length === 0) return null;

  const currentChord = progression[selectedIndex] || progression[0];
  const chordName = identifyChord(currentChord.notes);

  const handleAdjustVoice = (voiceIdx: number, delta: number) => {
    const updatedNotes = [...currentChord.notes];
    updatedNotes[voiceIdx] = updatedNotes[voiceIdx] + delta;
    onUpdateChord(selectedIndex, updatedNotes);
    audioEngine.playChord(updatedNotes, 1.5);
  };

  const handleShiftOctave = (voiceIdx: number, octaves: number) => {
    handleAdjustVoice(voiceIdx, octaves * 12);
  };

  const handleShiftEntireChord = (semitones: number) => {
    const updatedNotes = currentChord.notes.map(n => n + semitones);
    onUpdateChord(selectedIndex, updatedNotes);
    audioEngine.playChord(updatedNotes, 1.5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                進行コードの構成音調整 (Voicing Tuner)
              </h3>
              <p className="text-xs text-slate-400">
                各コードの音を半音・全音・オクターブ単位で上下に微調整できます（再生中の伴奏にも即反映）
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chord Step Selector Tabs */}
        <div className="px-4 py-3 bg-black/30 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-400 shrink-0">調整するコード:</span>
          {progression.map((chord, idx) => {
            const isSelected = selectedIndex === idx;
            const isPlayingThis = isPlayingProgression && activePlayStep === idx;
            return (
              <button
                key={chord.id || idx}
                onClick={() => {
                  setSelectedIndex(idx);
                  audioEngine.playChord(chord.notes, 1.5);
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 active:scale-95 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                    : isPlayingThis
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/60 ring-2 ring-teal-400/50'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-white/10'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">#{idx + 1}</span>
                <span>{chord.name || identifyChord(chord.notes)}</span>
                {isPlayingThis && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Active Chord Summary Card */}
          <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-sm">
                #{selectedIndex + 1}
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {chordName}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  MIDI: [{currentChord.notes.join(', ')}]
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => audioEngine.playChord(currentChord.notes, 2.0)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Volume2 size={16} />
                <span>この和音を鳴らす</span>
              </button>
            </div>
          </div>

          {/* Entire Chord Transpose */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>和音全体の移調:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleShiftEntireChord(-1)}
                className="min-h-[36px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-mono font-bold active:scale-95"
              >
                全体 -1半音
              </button>
              <button
                onClick={() => handleShiftEntireChord(1)}
                className="min-h-[36px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-mono font-bold active:scale-95"
              >
                全体 +1半音
              </button>
            </div>
          </div>

          {/* Voices Breakdown & Fine Tuning */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>声部ごとの微調整 (低音 ➔ 高音)</span>
              <span>-12 / -2 / -1 / +1 / +2 / +12</span>
            </div>

            <div className="space-y-2.5">
              {currentChord.notes.map((midiNote, voiceIdx) => {
                const isBass = voiceIdx === 0;
                const noteInfo = midiToNote(midiNote);
                return (
                  <div
                    key={voiceIdx}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                      isBass
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-800/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        isBass ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        V{voiceIdx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">
                            {noteInfo.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({midiNote})
                          </span>
                          {isBass && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                              Bass
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Adjust Controls */}
                    <div className="flex items-center gap-1 sm:gap-1.5 self-end sm:self-auto flex-wrap">
                      <button
                        onClick={() => handleShiftOctave(voiceIdx, -1)}
                        className="min-h-[38px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 font-mono text-xs font-bold active:scale-95"
                        title="オクターブ下げる (-12)"
                      >
                        -12
                      </button>
                      <button
                        onClick={() => handleAdjustVoice(voiceIdx, -2)}
                        className="min-h-[38px] w-9 sm:w-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-200 border border-white/10 font-mono text-xs font-bold active:scale-95"
                        title="2半音下げる (-2)"
                      >
                        -2
                      </button>
                      <button
                        onClick={() => handleAdjustVoice(voiceIdx, -1)}
                        className="min-h-[38px] w-9 sm:w-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-200 border border-white/10 font-mono text-xs font-bold active:scale-95"
                        title="1半音下げる (-1)"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleAdjustVoice(voiceIdx, 1)}
                        className="min-h-[38px] w-9 sm:w-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-200 border border-white/10 font-mono text-xs font-bold active:scale-95"
                        title="1半音上げる (+1)"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleAdjustVoice(voiceIdx, 2)}
                        className="min-h-[38px] w-9 sm:w-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-200 border border-white/10 font-mono text-xs font-bold active:scale-95"
                        title="2半音上げる (+2)"
                      >
                        +2
                      </button>
                      <button
                        onClick={() => handleShiftOctave(voiceIdx, 1)}
                        className="min-h-[38px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 font-mono text-xs font-bold active:scale-95"
                        title="オクターブ上げる (+12)"
                      >
                        +12
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            変更は即座に反映され、伴奏ループの次周期でもそのまま鳴ります。
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Check size={16} />
            <span>完了</span>
          </button>
        </div>
      </div>
    </div>
  );
};
