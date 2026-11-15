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
 * Range: C3 (48) to G4 (67)
 */
export function generateRandomRawChord(voiceCount: number = 4): number[] {
  const minMidi = 48; // C3
  const maxMidi = 71; // B4
  const notesSet = new Set<number>();

  // Ensure spread so voices don't collapse on same note
  let attempts = 0;
  while (notesSet.size < voiceCount && attempts < 100) {
    attempts++;
    const randomNote = Math.floor(Math.random() * (maxMidi - minMidi + 1)) + minMidi;
    notesSet.add(randomNote);
  }

  // Fallback if loop hit limit
  let fallbackNote = minMidi;
  while (notesSet.size < voiceCount) {
    if (!notesSet.has(fallbackNote)) notesSet.add(fallbackNote);
    fallbackNote++;
  }

  return Array.from(notesSet).sort((a, b) => a - b);
}

/**
 * Perform a single random morph on the current chord:
 * Each constituent voice gets an independent random shift in [-maxDelta .. +maxDelta] (e.g. -2, -1, 0, +1, +2).
 * Multiple voices can move simultaneously.
 * Ensures at least one voice moves, and avoids pitch collisions.
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

  while (attempts < 200) {
    attempts++;
    const shifts: number[] = [];
    for (let i = 0; i < n; i++) {
      if (lockedVoiceIndices.includes(i)) {
        shifts.push(0);
      } else {
        const randShift = deltas[Math.floor(Math.random() * deltas.length)];
        shifts.push(randShift);
      }
    }

    // Must have at least one moving voice
    const isAllZero = shifts.every(s => s === 0);
    if (isAllZero) continue;

    const newNotes = currentNotes.map((note, idx) => note + shifts[idx]);

    // Avoid unison collision
    if (new Set(newNotes).size !== newNotes.length) continue;

    const totalMovement = shifts.reduce((acc, s) => acc + Math.abs(s), 0);
    const voicesMoving = shifts.filter(s => s !== 0).length;
    const chordName = identifyChord(newNotes);
    const smoothness = evaluateHarmonicSmoothness(newNotes);

    let tag = `${voicesMoving}音移動 (±${maxDelta}半音)`;
    if (voicesMoving === 1) {
      tag = '1音微小シフト';
    } else if (voicesMoving === n) {
      tag = '全声部モーフィング';
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

  // Fallback: move 1 unlocked note by +1
  const shifts = currentNotes.map((_, i) => (lockedVoiceIndices.includes(i) ? 0 : (i === 0 ? 1 : 0)));
  const fallbackNotes = currentNotes.map((note, idx) => note + shifts[idx]);
  return {
    id: `rand-morph-fallback-${Date.now()}`,
    notes: fallbackNotes,
    shifts,
    totalVoiceMovement: 1,
    nameEstimate: identifyChord(fallbackNotes),
    tag: '1音シフト',
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
