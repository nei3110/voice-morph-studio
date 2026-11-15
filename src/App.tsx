import React, { useState, useMemo } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Lock, 
  Unlock, 
  Sliders, 
  PlusCircle,
  Dices,
  FastForward,
  RotateCcw,
  LogOut,
  Play,
  Square,
  Repeat,
  Music
} from 'lucide-react';
import { 
  PRESET_CHORDS, 
  identifyChord, 
  midiToNote, 
  type MorphCandidate 
} from './utils/musicTheory';
import { 
  generateVoiceLeadingMorphs, 
  generateRandomRawChord, 
  sampleRandomMorph 
} from './utils/morphEngine';
import { audioEngine } from './utils/audioEngine';
import { isUserAuthenticated, logout } from './utils/auth';
import { AuthGate } from './components/AuthGate';
import { InteractivePiano } from './components/InteractivePiano';
import { MorphCandidateCard } from './components/MorphCandidateCard';
import { ProgressionStrip, type SavedChord } from './components/ProgressionStrip';
import { ACCOMPANIMENT_PATTERNS } from './utils/accompanimentPatterns';

export function App() {
  // Authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isUserAuthenticated());

  // Current Base Chord Configuration: Bass at C3 (48), Chord at C4+ (60, 64, 67, 71)
  const [voiceCount, setVoiceCount] = useState<number>(4); // 3, 4, 5
  const [customNotes, setCustomNotes] = useState<number[]>([48, 60, 64, 67]); // Bass C3, Upper: C4, E4, G4
  const [lockedVoices, setLockedVoices] = useState<number[]>([]); // indices of locked voices
  const [maxDelta, setMaxDelta] = useState<number>(2); // ±1 or ±2 semitones

  // Morph Sampling State
  const [currentMorphCandidate, setCurrentMorphCandidate] = useState<MorphCandidate | null>(null);
  const [isTransitionPlaying, setIsTransitionPlaying] = useState<boolean>(false);
  const [activeAuditionIndex, setActiveAuditionIndex] = useState<'base' | 'morph' | null>(null);

  // Progression Strip State
  const [progression, setProgression] = useState<SavedChord[]>([]);
  const [activePlayStep, setActivePlayStep] = useState<number>(-1);
  const [isPlayingProgression, setIsPlayingProgression] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('pop_ballad_arp');
  const [bpm, setBpm] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Stop playback reference
  const stopPlaybackRef = React.useRef<(() => void) | null>(null);

  // 1. Generate Completely Random Base Chord (Does not need to be consonant!)
  const handleGenerateRandomBase = (voices: number = voiceCount) => {
    const randomNotes = generateRandomRawChord(voices);
    setCustomNotes(randomNotes);
    setLockedVoices([]);
    setCurrentMorphCandidate(null);
    audioEngine.playChord(randomNotes);
  };

  // 2. Sample Random Morph & Play Sequence (Base -> Morph)
  const handleRandomMorphAndPlay = async () => {
    if (isTransitionPlaying) return;
    setIsTransitionPlaying(true);

    // Sample a new random candidate where each voice rolls [-maxDelta .. +maxDelta]
    const candidate = sampleRandomMorph(customNotes, lockedVoices, maxDelta);
    setCurrentMorphCandidate(candidate);

    // Play Base Chord for exactly 2 seconds
    setActiveAuditionIndex('base');
    audioEngine.playChord(customNotes, 2.0);

    // Wait exactly 2.0s (2000ms) then play Morph Candidate
    await new Promise(resolve => setTimeout(resolve, 2000));
    setActiveAuditionIndex('morph');
    audioEngine.playChord(candidate.notes, 2.0);

    // Let the second chord ring for 2.0s
    await new Promise(resolve => setTimeout(resolve, 2000));
    setActiveAuditionIndex(null);
    setIsTransitionPlaying(false);
  };

  // Play just the transition between Current Base and Current Morph (2s each)
  const handleReplayTransition = async () => {
    if (!currentMorphCandidate || isTransitionPlaying) return;
    setIsTransitionPlaying(true);

    setActiveAuditionIndex('base');
    audioEngine.playChord(customNotes, 2.0);

    await new Promise(resolve => setTimeout(resolve, 2000));
    setActiveAuditionIndex('morph');
    audioEngine.playChord(currentMorphCandidate.notes, 2.0);

    await new Promise(resolve => setTimeout(resolve, 2000));
    setActiveAuditionIndex(null);
    setIsTransitionPlaying(false);
  };

  // Accept Morph: Make it the new base so user can explore 2nd -> 3rd chord
  const handleAdoptMorphAsBase = () => {
    if (!currentMorphCandidate) return;
    setCustomNotes([...currentMorphCandidate.notes]);
    setLockedVoices([]);
    setCurrentMorphCandidate(null);
    audioEngine.playChord(currentMorphCandidate.notes, 2.0);
  };

  // Add Morph to progression and seamlessly set it as the new Base to explore the 3rd, 4th... chords
  const handleAddMorphToProgression = () => {
    if (!currentMorphCandidate) return;
    const itemsToAdd: SavedChord[] = [];

    // If progression is empty, register the starting base chord as Chord 1
    if (progression.length === 0) {
      itemsToAdd.push({
        id: `saved-${Date.now()}-base`,
        notes: [...customNotes],
        name: identifyChord(customNotes),
        timestamp: Date.now(),
      });
    }

    // Append the newly formed morph chord (e.g. Chord 2, Chord 3...)
    itemsToAdd.push({
      id: `saved-${Date.now()}-morph`,
      notes: [...currentMorphCandidate.notes],
      name: currentMorphCandidate.nameEstimate,
      timestamp: Date.now(),
    });

    setProgression(prev => [...prev, ...itemsToAdd]);

    // Automatically transition base to this morph chord so the user is immediately ready
    // to generate the 3rd, 4th chord from this new point!
    setCustomNotes([...currentMorphCandidate.notes]);
    setCurrentMorphCandidate(null);
    audioEngine.playChord(itemsToAdd[itemsToAdd.length - 1].notes, 2.0);
  };

  const currentChordName = useMemo(() => {
    return identifyChord(customNotes);
  }, [customNotes]);

  // Candidate grid for manual browsing (top 16 curated transitions)
  const candidateList = useMemo(() => {
    return generateVoiceLeadingMorphs(customNotes, lockedVoices, {
      maxDelta: maxDelta,
      maxVoicesMoving: 3
    }).slice(0, 16);
  }, [customNotes, lockedVoices, maxDelta]);

  // Adjust single voice
  const adjustVoice = (voiceIndex: number, delta: number) => {
    const updated = [...customNotes];
    updated[voiceIndex] += delta;
    setCustomNotes(updated);
    audioEngine.playChord(updated);
  };

  const toggleVoiceLock = (voiceIndex: number) => {
    setLockedVoices(prev =>
      prev.includes(voiceIndex) ? prev.filter(i => i !== voiceIndex) : [...prev, voiceIndex]
    );
  };

  const handlePlayProgression = async () => {
    // If user has saved chords, play those; otherwise play the current 2-chord transition (Base -> Morph, or Base)
    const chordsToPlay: number[][] = 
      progression.length > 0 
        ? progression.map(c => c.notes) 
        : currentMorphCandidate 
        ? [customNotes, currentMorphCandidate.notes] 
        : [customNotes];

    if (chordsToPlay.length === 0) return;
    setIsPlayingProgression(true);

    const pattern = ACCOMPANIMENT_PATTERNS.find(p => p.id === selectedPatternId) || ACCOMPANIMENT_PATTERNS[1];

    const stopFn = await audioEngine.playProgression(chordsToPlay, bpm, pattern, isLooping, (stepIndex) => {
      setActivePlayStep(stepIndex);
      // Map to hero card highlight when playing uncommitted 2 chords
      if (progression.length === 0) {
        if (stepIndex === 0) setActiveAuditionIndex('base');
        else if (stepIndex === 1) setActiveAuditionIndex('morph');
        else setActiveAuditionIndex(null);
      }
      if (stepIndex === -1) {
        setIsPlayingProgression(false);
        setActiveAuditionIndex(null);
      }
    });

    stopPlaybackRef.current = stopFn;
  };

  const handleStopProgression = () => {
    if (stopPlaybackRef.current) {
      stopPlaybackRef.current();
      stopPlaybackRef.current = null;
    }
    setIsPlayingProgression(false);
    setActivePlayStep(-1);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-sky-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Voice Morph Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono font-normal">
                  ±2半音ランダム探索対応
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                協和音に限らない偶発的和音から、構成音の微細移動（±1〜±2半音）で生まれる滑らかな連続響きを探索
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} />}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 text-xs transition-colors"
              title="ログアウトして画面をロック"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">ロック</span>
            </button>
          </div>
        </header>

        {/* HERO FEATURE: Instant 2-Chord Random Transition Player */}
        <section className="glass-panel p-4 sm:p-6 border-2 border-sky-500/30 shadow-[0_0_35px_rgba(56,189,248,0.15)] bg-gradient-to-b from-slate-900/90 to-slate-950/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-xs font-mono font-semibold tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                <FastForward size={14} />
                Instant Voice Transition (起点コード → ランダム変形コードを連続再生)
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                各構成音ごとに <strong>-2〜+2半音</strong> をランダム抽選して2つのコードを続けて鳴らします。
              </p>
            </div>

            {/* Scope / Delta Range Selector */}
            <div className="flex items-center gap-2 text-xs bg-black/40 px-3 py-2 rounded-xl border border-white/10 self-start sm:self-auto">
              <span className="text-slate-400 font-medium">移動範囲:</span>
              <div className="flex gap-1.5">
                {[1, 2].map((delta) => (
                  <button
                    key={delta}
                    onClick={() => setMaxDelta(delta)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg font-mono font-bold text-xs transition-all ${
                      maxDelta === delta
                        ? 'bg-sky-500 text-slate-950 shadow-md'
                        : 'text-slate-300 hover:text-white bg-slate-800/80'
                    }`}
                  >
                    ±{delta}半音
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dual Chord Stages (Base Chord -> Morph Result) */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-4 items-center">
            
            {/* 1. Base Chord Card (Clickable on tap to play independently) */}
            <div 
              onClick={() => audioEngine.playChord(customNotes, 2.0)}
              className={`md:col-span-5 p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none group min-h-[110px] ${
                activeAuditionIndex === 'base'
                  ? 'bg-sky-950/70 border-sky-400 ring-2 ring-sky-400/50 shadow-lg shadow-sky-950'
                  : 'bg-slate-900/80 hover:bg-slate-850 border-white/10 hover:border-sky-500/50 hover:shadow-md'
              }`}
              title="タップするとこのコード単体で2秒鳴ります"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span className="font-mono flex items-center gap-1.5 font-bold">
                  {activeAuditionIndex === 'base' && <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></span>}
                  ① 起点コード (Base)
                </span>
                <span className="text-xs font-mono text-sky-400 group-hover:text-sky-300 flex items-center gap-1 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800/40 font-semibold">
                  <Volume2 size={13} /> タップで再生
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-2 mt-1">
                {currentChordName}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {customNotes.map((m, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-black/60 text-sky-300 font-mono text-xs border border-white/10 font-bold">
                    {midiToNote(m).name}
                  </span>
                ))}
              </div>
            </div>

            {/* Transition Arrow / Indicator */}
            <div className="md:col-span-1 flex flex-col items-center justify-center text-slate-500 py-1 md:py-0">
              <FastForward size={24} className={isTransitionPlaying ? 'text-teal-400 animate-pulse' : 'text-slate-600'} />
            </div>

            {/* 2. Morph Chord Card (Clickable on tap to play independently) */}
            <div 
              onClick={() => {
                if (currentMorphCandidate) {
                  audioEngine.playChord(currentMorphCandidate.notes, 2.0);
                }
              }}
              className={`md:col-span-5 p-4 sm:p-5 rounded-2xl border transition-all duration-300 select-none group min-h-[110px] ${
                currentMorphCandidate ? 'cursor-pointer' : ''
              } ${
                activeAuditionIndex === 'morph'
                  ? 'bg-teal-950/70 border-teal-400 ring-2 ring-teal-400/50 shadow-lg shadow-teal-950'
                  : currentMorphCandidate
                  ? 'bg-slate-900/80 hover:bg-slate-850 border-teal-500/30 hover:border-teal-400/60 hover:shadow-md'
                  : 'bg-slate-900/40 border-dashed border-white/10'
              }`}
              title={currentMorphCandidate ? "タップするとこのコード単体で2秒鳴ります" : ""}
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span className="font-mono flex items-center gap-1.5 font-bold">
                  {activeAuditionIndex === 'morph' && <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>}
                  ② 遷移先 (Random Morph)
                </span>
                {currentMorphCandidate ? (
                  <span className="text-xs font-mono text-teal-400 group-hover:text-teal-300 flex items-center gap-1 bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-800/40 font-semibold">
                    <Volume2 size={13} /> タップで再生
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">未生成</span>
                )}
              </div>
              
              {currentMorphCandidate ? (
                <>
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                    {currentMorphCandidate.nameEstimate}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {currentMorphCandidate.notes.map((m, i) => {
                      const shift = currentMorphCandidate.shifts[i];
                      const shiftText = shift > 0 ? `+${shift}` : `${shift}`;
                      return (
                        <span key={i} className={`px-2.5 py-1 rounded-md font-mono text-xs border flex items-center gap-1 font-bold ${
                          shift !== 0
                            ? shift > 0
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                              : 'bg-rose-950 text-rose-300 border-rose-600'
                            : 'bg-black/60 text-slate-300 border-white/10'
                        }`}>
                          <span>{midiToNote(m).name}</span>
                          <span className="text-[11px] opacity-80">({shiftText})</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  下のボタンを押すと、この位置にランダム変形コードが生成されて続けて鳴ります
                </div>
              )}
            </div>
          </div>

          {/* Trigger Buttons (Big Touch Targets) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* PRIMARY ACTION: Morph & Play */}
              <button
                onClick={handleRandomMorphAndPlay}
                disabled={isTransitionPlaying}
                className="min-h-[50px] w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 hover:opacity-95 disabled:opacity-50 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-sky-500/25 transition-all transform active:scale-[0.98]"
              >
                <Dices size={20} />
                <span>ランダム変形して連続再生！ (±{maxDelta}半音)</span>
              </button>

              {currentMorphCandidate && (
                <button
                  onClick={handleReplayTransition}
                  disabled={isTransitionPlaying}
                  className="min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-white/10 transition-colors active:scale-[0.98]"
                  title="もう一度この2つのコードの繋がりを聴く"
                >
                  <RotateCcw size={16} />
                  <span>もう一度聴く</span>
                </button>
              )}
            </div>

            {/* Save / Adopt buttons when a candidate is generated */}
            {currentMorphCandidate && (
              <div className="flex items-center gap-2.5 mt-1 sm:mt-0">
                <button
                  onClick={handleAddMorphToProgression}
                  className="min-h-[46px] flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500/25 hover:bg-teal-500/40 text-teal-200 border border-teal-500/50 text-sm font-bold transition-all active:scale-[0.98]"
                >
                  <PlusCircle size={16} />
                  <span>進行に保存</span>
                </button>

                <button
                  onClick={handleAdoptMorphAsBase}
                  className="min-h-[46px] flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/25 hover:bg-sky-500/40 text-sky-200 border border-sky-500/50 text-sm font-bold transition-all active:scale-[0.98]"
                  title="この響きを次の起点にしてさらに旅を続ける"
                >
                  <Sparkles size={16} className="text-amber-400" />
                  <span>次の起点にする</span>
                </button>
              </div>
            )}
          </div>

          {/* Top Integrated Accompaniment & Loop Control Bar (Responsive & Finger-friendly) */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-black/40 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                <Music size={14} className="text-teal-400" />
                伴奏・アルペジオ再生:
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {progression.length > 0 
                  ? `(保存済み ${progression.length} コード)` 
                  : currentMorphCandidate 
                  ? '(探索中 2コード)' 
                  : '(起点コード)'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Pattern Selector */}
              <div className="flex-1 sm:flex-initial flex items-center min-h-[42px] bg-slate-900 px-3 py-2 rounded-xl border border-white/10">
                <select
                  value={selectedPatternId}
                  onChange={(e) => setSelectedPatternId(e.target.value)}
                  className="w-full bg-transparent text-white font-medium text-xs sm:text-sm focus:outline-none cursor-pointer"
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
                onClick={() => setIsLooping(prev => !prev)}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                  isLooping
                    ? 'bg-teal-500/25 text-teal-300 border-teal-500/60 shadow-[0_0_12px_rgba(45,212,191,0.25)]'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
                title={isLooping ? 'ループ再生ON' : 'ループ再生OFF'}
              >
                <Repeat size={14} className={isLooping ? 'text-teal-400' : ''} />
                <span>ループ{isLooping ? 'ON' : 'OFF'}</span>
              </button>

              {/* BPM */}
              <div className="flex items-center min-h-[42px] bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-slate-400 font-mono text-xs mr-1">BPM</span>
                <input
                  type="number"
                  min="40"
                  max="220"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value) || 85)}
                  className="w-12 bg-transparent text-right font-mono font-bold text-sky-400 text-sm focus:outline-none"
                />
              </div>

              {/* Play / Stop Accompaniment */}
              {isPlayingProgression ? (
                <button
                  onClick={handleStopProgression}
                  className="min-h-[42px] flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  <Square size={14} fill="currentColor" />
                  <span>伴奏停止</span>
                </button>
              ) : (
                <button
                  onClick={handlePlayProgression}
                  className="min-h-[42px] flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  <Play size={14} fill="currentColor" />
                  <span>伴奏ループ再生</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Base Chord Generator & Randomizer */}
          <section className="lg:col-span-5 space-y-5">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-sky-400 uppercase font-mono">
                  起点コードの設定 (Base Chord)
                </span>
                
                {/* Voice count switch */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs font-mono">
                  <span className="text-slate-500 text-[10px] px-1">声部数:</span>
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => {
                        setVoiceCount(cnt);
                        handleGenerateRandomBase(cnt);
                      }}
                      className={`px-2 py-0.5 rounded transition-all ${
                        voiceCount === cnt
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cnt}和音
                    </button>
                  ))}
                </div>
              </div>

              {/* Random Base Chord Generator Button */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-sky-500/10 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-amber-300 block">
                    起点コードを完全ランダム生成
                  </span>
                  <span className="text-[11px] text-slate-400">
                    協和音・既存コードに限定せず、偶発的な響きを抽出
                  </span>
                </div>
                <button
                  onClick={() => handleGenerateRandomBase(voiceCount)}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 text-xs sm:text-sm font-black shadow-md transition-all self-stretch sm:self-auto"
                >
                  <Dices size={16} />
                  <span>ランダム生成</span>
                </button>
              </div>

              {/* Or Select from Traditional Presets */}
              <div className="pt-1">
                <label className="text-xs text-slate-400 mb-1.5 block font-medium">
                  または定番プリセット和音から選ぶ (ベースC3 + 和音C4以上)
                </label>
                <select
                  onChange={(e) => {
                    const preset = PRESET_CHORDS[Number(e.target.value)];
                    const bassMidi = 48; // C3
                    const chordNotes = preset.notes.map(semitone => 60 + semitone); // C4+
                    const notes = [bassMidi, ...chordNotes];
                    setCustomNotes(notes);
                    setVoiceCount(notes.length);
                    setLockedVoices([]);
                    setCurrentMorphCandidate(null);
                    audioEngine.playChord(notes, 2.0);
                  }}
                  className="w-full min-h-[44px] bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:border-sky-500 transition-colors cursor-pointer"
                >
                  {PRESET_CHORDS.map((p, idx) => (
                    <option key={idx} value={idx}>
                      [{p.category}] {p.name} - {p.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Individual Voice Controls (Fine -2 / -1 / 0 / +1 / +2 Tweak & Lock) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Sliders size={13} className="text-sky-400" />
                    各声部の微調整 & 固定 (Lock)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    鍵マークで声を固定
                  </span>
                </div>

                <div className="space-y-2">
                  {customNotes.map((midi, voiceIdx) => {
                    const isLocked = lockedVoices.includes(voiceIdx);
                    const noteInfo = midiToNote(midi);
                    const voiceRole =
                      voiceIdx === 0
                        ? 'Bass (最低音)'
                        : voiceIdx === customNotes.length - 1
                        ? 'Lead (最高音)'
                        : `Voice ${voiceIdx + 1} (内声)`;

                    return (
                      <div
                        key={voiceIdx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isLocked
                            ? 'bg-slate-950/60 border-amber-500/40'
                            : 'bg-slate-900/60 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => toggleVoiceLock(voiceIdx)}
                            title={isLocked ? 'ロック解除' : 'この声を固定してモーフィング'}
                            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border transition-colors ${
                              isLocked
                                ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                                : 'text-slate-400 hover:text-slate-200 border-white/10 bg-slate-800/60'
                            }`}
                          >
                            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">
                              {voiceRole}
                            </span>
                            <span className="text-base font-bold font-mono text-white">
                              {noteInfo.name}{' '}
                              <span className="text-xs text-slate-500 font-normal">
                                ({midi})
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Fine Tweak Buttons (Touch-friendly 38x38px) */}
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <button
                            onClick={() => adjustVoice(voiceIdx, -2)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 active:scale-95 text-slate-200 border border-white/10 text-xs font-mono font-bold"
                            title="2半音下げる (-2)"
                          >
                            -2
                          </button>
                          <button
                            onClick={() => adjustVoice(voiceIdx, -1)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 active:scale-95 text-slate-200 border border-white/10 text-xs font-mono font-bold"
                            title="1半音下げる (-1)"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => adjustVoice(voiceIdx, 1)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 active:scale-95 text-slate-200 border border-white/10 text-xs font-mono font-bold"
                            title="1半音上げる (+1)"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => adjustVoice(voiceIdx, 2)}
                            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 active:scale-95 text-slate-200 border border-white/10 text-xs font-mono font-bold"
                            title="2半音上げる (+2)"
                          >
                            +2
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Interactive Keyboard Visualizer */}
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between pb-2 text-xs text-slate-400 font-mono">
                <span>ボイシング可視化 (Keyboard)</span>
                <span>C3 - E5</span>
              </div>
              <InteractivePiano
                activeNotes={currentMorphCandidate ? currentMorphCandidate.notes : customNotes}
                onNoteClick={(midi) => audioEngine.playChord([midi])}
              />
            </div>
          </section>

          {/* Right Column: Morph Candidates Gallery & Explorer */}
          <section className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    手動で選べる変形コード一覧 (Gallery)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ランダム再生だけでなく、一覧から個別にじっくり響きを吟味することもできます
                  </p>
                </div>
              </div>

              {/* Candidates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                {candidateList.map((c) => (
                  <MorphCandidateCard
                    key={c.id}
                    candidate={c}
                    baseNotes={customNotes}
                    onPlay={(notes) => audioEngine.playChord(notes)}
                    onSelectAsBase={(candidate) => {
                      setCustomNotes([...candidate.notes]);
                      setLockedVoices([]);
                      setCurrentMorphCandidate(null);
                      audioEngine.playChord(candidate.notes);
                    }}
                    onAddToProgression={(candidate) => {
                      const newChord: SavedChord = {
                        id: `saved-${Date.now()}-${Math.random()}`,
                        notes: [...candidate.notes],
                        name: candidate.nameEstimate,
                        timestamp: Date.now(),
                      };
                      setProgression(prev => [...prev, newChord]);
                      audioEngine.playChord(candidate.notes);
                    }}
                    isCurrentlyAuditioning={
                      currentMorphCandidate?.notes.join(',') === c.notes.join(',')
                    }
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Progression Strip (Timeline / DAW MIDI Export) */}
        <ProgressionStrip
          progression={progression}
          activeStep={activePlayStep}
          isPlaying={isPlayingProgression}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping(prev => !prev)}
          onPlay={handlePlayProgression}
          onStop={handleStopProgression}
          onRemoveChord={(idx) => {
            setProgression(prev => prev.filter((_, i) => i !== idx));
          }}
          onSelectChord={(chord) => {
            setCustomNotes([...chord.notes]);
            setCurrentMorphCandidate(null);
            audioEngine.playChord(chord.notes, 2.0);
          }}
          onClear={() => setProgression([])}
          bpm={bpm}
          onBpmChange={setBpm}
          selectedPatternId={selectedPatternId}
          onPatternChange={setSelectedPatternId}
        />

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-4 space-y-1">
          <p>Voice Morph Studio - Chromatic Voice Leading & Accidental Harmonies Exploration</p>
          <p className="text-[11px] text-slate-600">
            起点コードをランダム生成 → 「ランダム変形して連続再生」で意外な美しさを持つコード進行を見つけ出しましょう！
          </p>
        </footer>

      </div>
    </div>
  );
}

export default App;
