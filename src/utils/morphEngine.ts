// Voice Leading & Morphing Engine
// Generates intelligent chord morphs by shifting constituent voices by -2 to +2 semitones
// Includes random raw chord generators and single random morph sampling

import { evaluateHarmonicSmoothness, identifyChord, type MorphCandidate } from './musicTheory';

export interface MorphFilterOptions {
  maxVoicesMoving?: number;
  maxDelta?: number; // e.g. 1 or 2 (defaults to 2)
}

/**
 * Generate a completely random chord without requiring harmonic concordance.
 * Creates interesting sonorities, dissonances, clusters, or open voicings.
/**
 * Generate a chord composed of:
 * 1. A Bass note around C3 (MIDI 48 to 59)
 * 2. An Upper Chord Voicing at C4 or above (MIDI 60 to 79)
 * The lowest note of the upper chord (voice 1) is strictly an octave above the bass note (e.g. Bass=C3 -> Upper Root=C4)
 * chordCount (e.g. 3 for 三和音, 4 for 四和音, 5 for 五和音) defines the number of tones EXCLUDING the bass note.
 * Thus a 三和音 (triad) consists of 1 bass note + 3 upper notes = 4 notes in total.
 */
export function generateRandomRawChord(upperChordCount: number = 3): number[] {
  // Bass pitch class: 0 to 11 (C3=48 to B3=59)
  const bassMidi = 48 + Math.floor(Math.random() * 12);
  const upperRootMidi = bassMidi + 12; // Strictly octave higher: C4 to B4 (60 to 71)

  const upperSet = new Set<number>();
  upperSet.add(upperRootMidi);

  const minUpperMidi = upperRootMidi; // Keep at or above octave root
  const maxUpperMidi = 79; // up to G5

  let attempts = 0;
  while (upperSet.size < upperChordCount && attempts < 150) {
    attempts++;
    const randomNote = Math.floor(Math.random() * (maxUpperMidi - minUpperMidi + 1)) + minUpperMidi;
    upperSet.add(randomNote);
  }

  // Fallback if needed
  let fallback = minUpperMidi + 3;
  while (upperSet.size < upperChordCount) {
    if (!upperSet.has(fallback)) upperSet.add(fallback);
    fallback++;
  }

  const upperSorted = Array.from(upperSet).sort((a, b) => a - b);
  return [bassMidi, ...upperSorted];
}

/**
 * Perform a single random morph on the current chord:
 * - Upper voices (voice 2+) shift by [-maxDelta .. +maxDelta] (default ±2 semitones).
 * - Bass note (voice 0) is not limited to 2 semitones and can move to ANY pitch class (C3-B3: 48-59, or any offset).
 * - Voice 1 (2nd lowest note) is ALWAYS strictly locked to voice 0 + 12 (exact octave above bass).
 * Ensures at least one voice moves and avoids collisions.
 */
export function sampleRandomMorph(
  currentNotes: number[],
  lockedVoiceIndices: number[] = [],
  maxDelta: number = 2
): MorphCandidate {
  const n = currentNotes.length;
  const deltas: number[] = [];
  for (let d = -maxDelta; d <= maxDelta; d++) {
    deltas.push(d);
  }

  let attempts = 0;
  let bestCandidate: MorphCandidate | null = null;

  while (attempts < 300) {
    attempts++;
    const shifts: number[] = new Array(n).fill(0);

    // 1. Bass note (voice 0): can shift freely (e.g. any note in C3-B3 range 48-59)
    if (!lockedVoiceIndices.includes(0)) {
      // Pick a random bass note from C3 (48) to B3 (59)
      const possibleBassNotes: number[] = [];
      for (let m = 48; m <= 59; m++) {
        possibleBassNotes.push(m);
      }
      const targetBass = possibleBassNotes[Math.floor(Math.random() * possibleBassNotes.length)];
      shifts[0] = targetBass - currentNotes[0];
    } else {
      shifts[0] = 0;
    }

    // 2. Voice 1 (2nd lowest note): ALWAYS the octave of the bass note
    // newNotes[1] must equal newNotes[0] + 12
    if (n > 1) {
      const targetVoice1 = (currentNotes[0] + shifts[0]) + 12;
      shifts[1] = targetVoice1 - currentNotes[1];
    }

    // 3. Remaining upper voices (index 2 to n-1): shift by [-maxDelta .. +maxDelta]
    for (let i = 2; i < n; i++) {
      if (lockedVoiceIndices.includes(i)) {
        shifts[i] = 0;
      } else {
        shifts[i] = deltas[Math.floor(Math.random() * deltas.length)];
      }
    }

    // Must have at least one moving voice
    const isAllZero = shifts.every(s => s === 0);
    if (isAllZero) continue;

    const newNotes = currentNotes.map((note, idx) => note + shifts[idx]);

    // Check collision among upper voices (voice 1..n-1)
    const upperNotes = newNotes.slice(1);
    if (new Set(upperNotes).size !== upperNotes.length) continue;

    // Ensure upper voices stay above bass
    if (newNotes[1] <= newNotes[0]) continue;

    const totalMovement = shifts.reduce((acc, s) => acc + Math.abs(s), 0);
    const voicesMoving = shifts.filter(s => s !== 0).length;
    const chordName = identifyChord(newNotes);
    const smoothness = evaluateHarmonicSmoothness(newNotes);

    let tag = `${voicesMoving}音移動 (ベース自由跳躍 + オクターブ同期)`;
    if (shifts[0] !== 0 && voicesMoving === 2) {
      tag = 'ベース & オクターブ根音移動';
    } else if (shifts[0] === 0) {
      tag = `上声音変形 (±${maxDelta}半音)`;
    }

    bestCandidate = {
      id: `rand-morph-${newNotes.join('-')}-${Date.now()}-${Math.random()}`,
      notes: newNotes,
      shifts,
      totalVoiceMovement: totalMovement,
      nameEstimate: chordName,
      tag,
      consonanceScore: smoothness,
    };
    break;
  }

  if (bestCandidate) return bestCandidate;

  // Fallback: shift bass + octave by a random semitone, keeping octave lock
  const bassDelta = 1;
  const shifts = currentNotes.map((_, i) => {
    if (i === 0) return bassDelta;
    if (i === 1) return (currentNotes[0] + bassDelta + 12) - currentNotes[1];
    return 0;
  });
  const fallbackNotes = currentNotes.map((note, idx) => note + shifts[idx]);
  return {
    id: `rand-morph-fallback-${Date.now()}`,
    notes: fallbackNotes,
    shifts,
    totalVoiceMovement: Math.abs(shifts[0]) + Math.abs(shifts[1]),
    nameEstimate: identifyChord(fallbackNotes),
    tag: 'ベース・オクターブ移動',
    consonanceScore: evaluateHarmonicSmoothness(fallbackNotes),
  };
}

/**
 * Generate candidate list by shifting each voice by [-maxDelta .. +maxDelta]
 */
export function generateVoiceLeadingMorphs(
  currentNotes: number[],
  lockedVoiceIndices: number[] = [],
  filterOptions: MorphFilterOptions = {}
): MorphCandidate[] {
  if (currentNotes.length === 0) return [];

  const notesSorted = [...currentNotes];
  const n = notesSorted.length;
  const candidates: MorphCandidate[] = [];

  const maxDelta = filterOptions.maxDelta || 2;
  const deltas: number[] = [];
  for (let d = -maxDelta; d <= maxDelta; d++) {
    deltas.push(d);
  }

  // Recursive generator
  function generate(voiceIdx: number, currentShifts: number[]) {
    if (voiceIdx === n) {
      const isIdentical = currentShifts.every(s => s === 0);
      if (isIdentical) return;

      const totalMovement = currentShifts.reduce((acc, s) => acc + Math.abs(s), 0);
      const voicesMoving = currentShifts.filter(s => s !== 0).length;

      if (filterOptions.maxVoicesMoving && voicesMoving > filterOptions.maxVoicesMoving) {
        return;
      }

      const newNotes = notesSorted.map((note, idx) => note + currentShifts[idx]);

      if (new Set(newNotes).size !== newNotes.length) return;

      const smoothness = evaluateHarmonicSmoothness(newNotes);
      const chordName = identifyChord(newNotes);

      let tag = `${voicesMoving}音変化 (計${totalMovement}半音)`;
      if (voicesMoving === 1) {
        const movedIdx = currentShifts.findIndex(s => s !== 0);
        const delta = currentShifts[movedIdx];
        const dir = delta > 0 ? `+${delta}半音` : `${delta}半音`;
        if (movedIdx === 0) tag = `ベース変化 (${dir})`;
        else if (movedIdx === n - 1) tag = `トップ音変化 (${dir})`;
        else tag = `内声変化 (${dir})`;
      } else if (voicesMoving === 2) {
        tag = '2音移動';
      }

      candidates.push({
        id: `morph-${newNotes.join('-')}-${currentShifts.join(',')}`,
        notes: newNotes,
        shifts: currentShifts,
        totalVoiceMovement: totalMovement,
        nameEstimate: chordName,
        tag,
        consonanceScore: smoothness,
      });
      return;
    }

    if (lockedVoiceIndices.includes(voiceIdx)) {
      generate(voiceIdx + 1, [...currentShifts, 0]);
      return;
    }

    // To prevent cartesian explosion with 5 voices & 5 deltas (5^5 = 3125),
    // prioritize smaller deltas first
    for (const d of deltas) {
      generate(voiceIdx + 1, [...currentShifts, d]);
    }
  }

  generate(0, []);

  // Sort candidates
  candidates.sort((a, b) => {
    if (a.totalVoiceMovement !== b.totalVoiceMovement) {
      return a.totalVoiceMovement - b.totalVoiceMovement;
    }
    return b.consonanceScore - a.consonanceScore;
  });

  return candidates;
}

// Generate MIDI file Blob for DAW export
export function generateMidiFile(progression: Array<{ notes: number[]; name: string }>, bpm: number = 72): Blob {
  const ticksPerBeat = 480;
  const beatsPerChord = 2;
  const chordTicks = ticksPerBeat * beatsPerChord;

  const trackEvents: number[] = [];

  const mpqn = Math.round(60000000 / bpm);
  trackEvents.push(0x00, 0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF);

  progression.forEach((chord) => {
    chord.notes.forEach((note, i) => {
      trackEvents.push(i === 0 ? 0x00 : 0x00);
      trackEvents.push(0x90, note, 0x58);
    });

    chord.notes.forEach((note, i) => {
      if (i === 0) {
        const vlq = toVlq(chordTicks);
        trackEvents.push(...vlq);
      } else {
        trackEvents.push(0x00);
      }
      trackEvents.push(0x80, note, 0x00);
    });
  });

  trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

  const trackLen = trackEvents.length;
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B,
    (trackLen >> 24) & 0xFF,
    (trackLen >> 16) & 0xFF,
    (trackLen >> 8) & 0xFF,
    trackLen & 0xFF,
  ];

  const headerChunk = [
    0x4D, 0x54, 0x68, 0x64,
    0x00, 0x00, 0x00, 0x06,
    0x00, 0x00,
    0x00, 0x01,
    (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
  ];

  const fileBytes = new Uint8Array([...headerChunk, ...trackHeader, ...trackEvents]);
  return new Blob([fileBytes], { type: 'audio/midi' });
}

function toVlq(value: number): number[] {
  let buffer = value & 0x7F;
  const bytes = [];
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= 0x80;
    buffer += (value & 0x7F);
  }
  while (true) {
    bytes.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}
