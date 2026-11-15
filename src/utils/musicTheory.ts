// Music Theory & Utility Constants / Types

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTE_NAMES[number];

export interface NoteInfo {
  midi: number; // 60 = C4
  pitchClass: number; // 0-11
  name: string; // e.g. "C4", "Eb3"
  octave: number;
}

export function midiToNote(midi: number): NoteInfo {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = `${NOTE_NAMES[pitchClass]}${octave}`;
  return { midi, pitchClass, name, octave };
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Preset chord templates (relative semitone offsets from root)
export interface PresetTemplate {
  name: string;
  category: string;
  notes: number[]; // e.g. [0, 4, 7] for Major Triad
  description: string;
}

export const PRESET_CHORDS: PresetTemplate[] = [
  // 3-note triads
  { name: 'Major Triad', category: '3和音 (Triad)', notes: [0, 4, 7], description: '明るく安定した響き' },
  { name: 'Minor Triad', category: '3和音 (Triad)', notes: [0, 3, 7], description: '哀愁・切なさを感じる響き' },
  { name: 'Sus4', category: '3和音 (Triad)', notes: [0, 5, 7], description: '浮遊感があり解決を誘う響き' },
  { name: 'Sus2', category: '3和音 (Triad)', notes: [0, 2, 7], description: '透明感と開放感のある響き' },
  { name: 'Diminished', category: '3和音 (Triad)', notes: [0, 3, 6], description: '緊張感と不安感のある響き' },
  { name: 'Augmented', category: '3和音 (Triad)', notes: [0, 4, 8], description: '神秘的でどこか不思議な響き' },

  // 4-note 7th chords
  { name: 'Major 7th (Maj7)', category: '4和音 (7th)', notes: [0, 4, 7, 11], description: '都会的でお洒落、浮遊感のある響き' },
  { name: 'Dominant 7th (7)', category: '4和音 (7th)', notes: [0, 4, 7, 10], description: 'ブルージーで強い進行感を持つ響き' },
  { name: 'Minor 7th (m7)', category: '4和音 (7th)', notes: [0, 3, 7, 10], description: 'メロウで心地よい落ち着き' },
  { name: 'Minor Major 7th (mMaj7)', category: '4和音 (7th)', notes: [0, 3, 7, 11], description: 'スパイ・ノワール映画のようなミステリアスな響き' },
  { name: 'Half-Diminished (m7b5)', category: '4和音 (7th)', notes: [0, 3, 6, 10], description: 'エモーショナルなマイナー2-5の要' },
  { name: 'Diminished 7th (dim7)', category: '4和音 (7th)', notes: [0, 3, 6, 9], description: '対称性がありどこへでも繋がる緊迫感' },
  { name: 'Add9', category: '4和音 (7th / Tension)', notes: [0, 4, 7, 14], description: 'J-POPやアコギで輝く爽快な響き' },
  { name: 'Minor Add9 (mAdd9)', category: '4和音 (7th / Tension)', notes: [0, 3, 7, 14], description: '切なく澄んだ叙情的な響き' },
  { name: '6th (Maj6)', category: '4和音 (7th)', notes: [0, 4, 7, 9], description: 'クラシカルで温かみのある響き' },
  { name: 'Minor 6th (m6)', category: '4和音 (7th)', notes: [0, 3, 7, 9], description: 'ドリアン調のエキゾチックな哀愁' },

  // 5-note tension chords
  { name: 'Major 9th (Maj9)', category: '5和音 (9th / Tension)', notes: [0, 4, 7, 11, 14], description: '豊潤で広大なネオソウル・シティポップの響き' },
  { name: 'Dominant 9th (9)', category: '5和音 (9th / Tension)', notes: [0, 4, 7, 10, 14], description: 'ファンキーで洗練されたグルーヴ感' },
  { name: 'Minor 9th (m9)', category: '5和音 (9th / Tension)', notes: [0, 3, 7, 10, 14], description: '洗練された夜のムード、深い落ち着き' },
  { name: '7th(#9) Hendrix Chord', category: '5和音 (9th / Tension)', notes: [0, 4, 7, 10, 15], description: 'ジミヘン・サイケデリックで刺激的な緊張感' },
  { name: '7th(b9)', category: '5和音 (9th / Tension)', notes: [0, 4, 7, 10, 13], description: 'ドラマチックなマイナー解決への緊張' },
  { name: '6/9 (Major 6/9)', category: '5和音 (9th / Tension)', notes: [0, 4, 7, 9, 14], description: 'ボサノバやジャズの穏やかなエンディング' },
  { name: 'Maj7(#11) Lydian', category: '5和音 (9th / Tension)', notes: [0, 4, 7, 11, 18], description: '宇宙空間や幻想的な光を感じるリディアンの響き' }
];

export interface ChordState {
  id: string;
  name: string;
  notes: number[]; // MIDI note numbers sorted ascending
  lockedVoiceIndices?: number[]; // indices of voices to keep locked while shifting
  timestamp?: number;
}

export interface MorphCandidate {
  id: string;
  notes: number[];
  shifts: number[]; // delta for each voice [-1, 0, +1, etc]
  totalVoiceMovement: number; // sum of abs(shifts)
  nameEstimate: string;
  tag: string;
  consonanceScore: number; // simple harmonic richness/smoothness score
}

// Chord Recognition Helper (estimates common chord names)
export function identifyChord(midiNotes: number[]): string {
  if (midiNotes.length === 0) return 'Empty';
  const sorted = [...midiNotes].sort((a, b) => a - b);
  const rootMidi = sorted[0];
  const rootPc = ((rootMidi % 12) + 12) % 12;
  const rootName = NOTE_NAMES[rootPc];

  // pitch classes present
  const pcs = Array.from(new Set(sorted.map(m => ((m % 12) + 12) % 12)));
  const relativePcs = pcs.map(p => (p - rootPc + 12) % 12).sort((a, b) => a - b);
  const relStr = relativePcs.join(',');

  const chordMap: Record<string, string> = {
    '0,4,7': '',
    '0,3,7': 'm',
    '0,5,7': 'sus4',
    '0,2,7': 'sus2',
    '0,3,6': 'dim',
    '0,4,8': 'aug',
    '0,4,7,11': 'Maj7',
    '0,4,7,10': '7',
    '0,3,7,10': 'm7',
    '0,3,7,11': 'mMaj7',
    '0,3,6,10': 'm7b5',
    '0,3,6,9': 'dim7',
    '0,4,7,9': '6',
    '0,3,7,9': 'm6',
    '0,2,4,7': 'add9',
    '0,2,3,7': 'm(add9)',
    '0,4,7,10,14': '9',
    '0,2,4,7,10': '9',
    '0,4,7,11,14': 'Maj9',
    '0,2,4,7,11': 'Maj9',
    '0,3,7,10,14': 'm9',
    '0,2,3,7,10': 'm9',
    '0,4,7,9,14': '6/9',
    '0,2,4,7,9': '6/9',
  };

  if (chordMap[relStr] !== undefined) {
    return `${rootName}${chordMap[relStr]}`;
  }

  // Check inversions or alternative bass
  for (let i = 1; i < pcs.length; i++) {
    const bassPc = pcs[i];
    const invRel = pcs.map(p => (p - bassPc + 12) % 12).sort((a, b) => a - b);
    const invStr = invRel.join(',');
    if (chordMap[invStr] !== undefined) {
      return `${NOTE_NAMES[bassPc]}${chordMap[invStr]}/${rootName}`;
    }
  }

  // Fallback: description of tones
  return `${rootName} (mod)`;
}

// Consonance heuristic (rough psychoacoustic smoothness estimate)
// Penalizes minor 2nds unless intentional tension, rewards 3rds, 5ths, 4ths, 6ths
export function evaluateHarmonicSmoothness(notes: number[]): number {
  let score = 100;
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const interval = Math.abs(notes[i] - notes[j]) % 12;
      if (interval === 1) score -= 25; // sharp dissonance (minor 2nd)
      else if (interval === 2) score -= 5; // major 2nd (gentle cluster / 9th)
      else if (interval === 3 || interval === 4) score += 15; // 3rds
      else if (interval === 5 || interval === 7) score += 20; // 4th / 5th
      else if (interval === 6) score -= 10; // tritone (tense)
      else if (interval === 8 || interval === 9) score += 12; // 6ths
      else if (interval === 10 || interval === 11) score += 5; // 7ths
    }
  }
  return score;
}
