import type { SavedChord } from '../components/ProgressionStrip';

export interface SavedProgressionItem {
  id: string;
  name: string;
  chords: SavedChord[];
  bpm: number;
  patternId: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'voice_morph_saved_progressions_v1';

export function getSavedProgressions(): SavedProgressionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load saved progressions from localStorage:', e);
    return [];
  }
}

export function saveProgressionToStorage(
  name: string,
  chords: SavedChord[],
  bpm: number,
  patternId: string,
  existingId?: string
): SavedProgressionItem {
  const currentList = getSavedProgressions();
  const now = Date.now();

  let targetItem: SavedProgressionItem;

  if (existingId) {
    const index = currentList.findIndex(item => item.id === existingId);
    if (index >= 0) {
      targetItem = {
        ...currentList[index],
        name: name.trim() || currentList[index].name,
        chords: [...chords],
        bpm,
        patternId,
        updatedAt: now,
      };
      currentList[index] = targetItem;
    } else {
      targetItem = {
        id: existingId,
        name: name.trim() || `進行 ${new Date(now).toLocaleDateString()}`,
        chords: [...chords],
        bpm,
        patternId,
        createdAt: now,
        updatedAt: now,
      };
      currentList.unshift(targetItem);
    }
  } else {
    targetItem = {
      id: `prog-${now}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || `進行 ${new Date(now).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      chords: [...chords],
      bpm,
      patternId,
      createdAt: now,
      updatedAt: now,
    };
    currentList.unshift(targetItem);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
  return targetItem;
}

export function deleteSavedProgression(id: string): SavedProgressionItem[] {
  const currentList = getSavedProgressions().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
  return currentList;
}

export function exportProgressionToJson(item: SavedProgressionItem | { name: string; chords: SavedChord[]; bpm: number; patternId: string }) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(item, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const safeName = (item.name || 'progression').replace(/[/\\?%*:|"<>]/g, '-');
  downloadAnchor.setAttribute('download', `${safeName}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseProgressionFromJson(jsonText: string): Partial<SavedProgressionItem> | null {
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && Array.isArray(parsed.chords)) {
      return parsed;
    }
    // Also support raw SavedChord[] array
    if (Array.isArray(parsed)) {
      return {
        name: 'インポートした進行',
        chords: parsed,
      };
    }
    return null;
  } catch (e) {
    console.error('Failed to parse JSON file:', e);
    return null;
  }
}
