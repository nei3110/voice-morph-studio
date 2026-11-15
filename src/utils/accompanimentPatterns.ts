// 8 Distinct Arpeggio & Rhythm Accompaniment Patterns

export interface PatternStep {
  beatFraction: number; // 0 to 1 representing position in a bar
  voiceIndices: number[] | 'all' | 'upper' | 'bass';
  velocity: number; // 0.1 to 1.0
  durationFraction: number; // relative gate duration
}

export interface AccompanimentPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  beatsPerBar: number;
  steps: PatternStep[];
}

export const ACCOMPANIMENT_PATTERNS: AccompanimentPattern[] = [
  {
    id: 'sustain',
    name: '1. サステイン全音符 (Whole Pad)',
    category: 'Sustain',
    description: '1小節ずっと豊かに伸ばす基本の響き',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0, voiceIndices: 'all', velocity: 0.9, durationFraction: 0.95 }
    ]
  },
  {
    id: 'pop_ballad_arp',
    name: '2. ピアノアルペジオ (Ballad 8th)',
    category: 'Arpeggio',
    description: '低音から高音へ流れる定番8分音符アルペジオ',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0 / 8, voiceIndices: [0], velocity: 0.9, durationFraction: 0.22 },     // Bass
      { beatFraction: 1 / 8, voiceIndices: [1], velocity: 0.7, durationFraction: 0.20 },     // Root
      { beatFraction: 2 / 8, voiceIndices: [2], velocity: 0.75, durationFraction: 0.20 },    // Mid
      { beatFraction: 3 / 8, voiceIndices: [-1], velocity: 0.85, durationFraction: 0.25 },   // Top
      { beatFraction: 4 / 8, voiceIndices: [2], velocity: 0.7, durationFraction: 0.20 },     // Mid
      { beatFraction: 5 / 8, voiceIndices: [1], velocity: 0.7, durationFraction: 0.20 },     // Root
      { beatFraction: 6 / 8, voiceIndices: [2], velocity: 0.75, durationFraction: 0.20 },    // Mid
      { beatFraction: 7 / 8, voiceIndices: [-1], velocity: 0.8, durationFraction: 0.22 }     // Top
    ]
  },
  {
    id: 'lofi_chill_syncopation',
    name: '3. ローファイ・チル (Lo-Fi Bounce)',
    category: 'Rhythm',
    description: '裏拍で跳ねるエモーショナルなシンコペーション',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0 / 8, voiceIndices: 'all', velocity: 0.9, durationFraction: 0.35 },
      { beatFraction: 2.5 / 8, voiceIndices: 'upper', velocity: 0.75, durationFraction: 0.22 },
      { beatFraction: 4 / 8, voiceIndices: [0], velocity: 0.85, durationFraction: 0.25 },
      { beatFraction: 5 / 8, voiceIndices: 'upper', velocity: 0.8, durationFraction: 0.30 },
      { beatFraction: 6.5 / 8, voiceIndices: 'upper', velocity: 0.7, durationFraction: 0.18 }
    ]
  },
  {
    id: 'citypop_cutting',
    name: '4. シティポップ / ネオソウル (Groove 16th)',
    category: 'Rhythm',
    description: 'キレの良い16分カッティングとベースの掛け合い',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0 / 16, voiceIndices: [0], velocity: 0.95, durationFraction: 0.12 },
      { beatFraction: 2 / 16, voiceIndices: 'upper', velocity: 0.8, durationFraction: 0.10 },
      { beatFraction: 5 / 16, voiceIndices: 'upper', velocity: 0.75, durationFraction: 0.10 },
      { beatFraction: 8 / 16, voiceIndices: [0], velocity: 0.85, durationFraction: 0.12 },
      { beatFraction: 10 / 16, voiceIndices: 'upper', velocity: 0.8, durationFraction: 0.12 },
      { beatFraction: 13 / 16, voiceIndices: 'upper', velocity: 0.75, durationFraction: 0.10 },
      { beatFraction: 14 / 16, voiceIndices: 'upper', velocity: 0.7, durationFraction: 0.08 }
    ]
  },
  {
    id: 'bossa_nova',
    name: '5. ボサノバ・スウィング (Bossa Nova)',
    category: 'Rhythm',
    description: 'クラシックなボサノバのベースと和音リズム',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0 / 8, voiceIndices: [0], velocity: 0.9, durationFraction: 0.30 },     // Bass 1
      { beatFraction: 0 / 8, voiceIndices: 'upper', velocity: 0.75, durationFraction: 0.20 },
      { beatFraction: 2.5 / 8, voiceIndices: 'upper', velocity: 0.8, durationFraction: 0.25 },
      { beatFraction: 4 / 8, voiceIndices: [0], velocity: 0.85, durationFraction: 0.30 },     // Bass 2
      { beatFraction: 5 / 8, voiceIndices: 'upper', velocity: 0.75, durationFraction: 0.22 },
      { beatFraction: 6.5 / 8, voiceIndices: 'upper', velocity: 0.8, durationFraction: 0.25 }
    ]
  },
  {
    id: 'ambient_cascade_arp',
    name: '6. アンビエント・カスケード (Dream Arp)',
    category: 'Arpeggio',
    description: '星が降るような上行・下行アルペジオの煌めき',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0 / 8, voiceIndices: [0], velocity: 0.9, durationFraction: 0.8 },
      { beatFraction: 1 / 8, voiceIndices: [1], velocity: 0.7, durationFraction: 0.25 },
      { beatFraction: 2 / 8, voiceIndices: [2], velocity: 0.75, durationFraction: 0.25 },
      { beatFraction: 3 / 8, voiceIndices: [-1], velocity: 0.85, durationFraction: 0.30 },
      { beatFraction: 4 / 8, voiceIndices: [1], velocity: 0.65, durationFraction: 0.25 },
      { beatFraction: 5 / 8, voiceIndices: [2], velocity: 0.75, durationFraction: 0.25 },
      { beatFraction: 6 / 8, voiceIndices: [-1], velocity: 0.8, durationFraction: 0.30 },
      { beatFraction: 7 / 8, voiceIndices: [2], velocity: 0.7, durationFraction: 0.25 }
    ]
  },
  {
    id: 'waltz_triplet',
    name: '7. 3連アルペジオ (6/8 Triplet Flow)',
    category: 'Arpeggio',
    description: '波のように揺れる優雅な3連符アルペジオ',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0 / 12, voiceIndices: [0], velocity: 0.95, durationFraction: 0.3 },
      { beatFraction: 1 / 12, voiceIndices: [1], velocity: 0.7, durationFraction: 0.18 },
      { beatFraction: 2 / 12, voiceIndices: [2], velocity: 0.75, durationFraction: 0.18 },
      { beatFraction: 3 / 12, voiceIndices: [-1], velocity: 0.85, durationFraction: 0.20 },
      { beatFraction: 4 / 12, voiceIndices: [2], velocity: 0.7, durationFraction: 0.18 },
      { beatFraction: 5 / 12, voiceIndices: [1], velocity: 0.7, durationFraction: 0.18 },
      { beatFraction: 6 / 12, voiceIndices: [0], velocity: 0.85, durationFraction: 0.3 },
      { beatFraction: 7 / 12, voiceIndices: [1], velocity: 0.7, durationFraction: 0.18 },
      { beatFraction: 8 / 12, voiceIndices: [2], velocity: 0.75, durationFraction: 0.18 },
      { beatFraction: 9 / 12, voiceIndices: [-1], velocity: 0.85, durationFraction: 0.20 },
      { beatFraction: 10 / 12, voiceIndices: [2], velocity: 0.7, durationFraction: 0.18 },
      { beatFraction: 11 / 12, voiceIndices: [1], velocity: 0.7, durationFraction: 0.18 }
    ]
  },
  {
    id: 'edm_pulsing_chords',
    name: '8. 4つ打ちパンピング (House / Pop 4-Beat)',
    category: 'Rhythm',
    description: '力強いダンスビートに合わせた4つ打ちコードバンプ',
    beatsPerBar: 4,
    steps: [
      { beatFraction: 0.0, voiceIndices: 'all', velocity: 0.95, durationFraction: 0.22 },
      { beatFraction: 0.25, voiceIndices: 'all', velocity: 0.85, durationFraction: 0.20 },
      { beatFraction: 0.50, voiceIndices: 'all', velocity: 0.90, durationFraction: 0.22 },
      { beatFraction: 0.75, voiceIndices: 'all', velocity: 0.85, durationFraction: 0.20 }
    ]
  }
];

export function resolveVoiceIndices(chordNotes: number[], selector: number[] | 'all' | 'upper' | 'bass'): number[] {
  if (chordNotes.length === 0) return [];
  if (selector === 'all') return chordNotes;
  if (selector === 'bass') return [chordNotes[0]];
  if (selector === 'upper') return chordNotes.slice(1);

  // array of indices
  const resolved: number[] = [];
  selector.forEach(idx => {
    if (idx === -1) {
      resolved.push(chordNotes[chordNotes.length - 1]); // Top note
    } else if (idx >= 0 && idx < chordNotes.length) {
      resolved.push(chordNotes[idx]);
    } else {
      // fallback clamp
      resolved.push(chordNotes[chordNotes.length - 1]);
    }
  });
  return Array.from(new Set(resolved));
}
