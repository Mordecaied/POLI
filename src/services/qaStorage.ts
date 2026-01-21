// POLI QA System - localStorage Persistence Layer
// Zero dependencies, works in any React app

import { QAState } from '../types';

const DEFAULT_STORAGE_KEY = 'poli_qa_state';

/**
 * Load QA state from localStorage
 */
export function loadQAState(storageKey: string = DEFAULT_STORAGE_KEY): QAState | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate structure
    if (
      typeof parsed === 'object' &&
      typeof parsed.isOpen === 'boolean' &&
      Array.isArray(parsed.testSessions) &&
      Array.isArray(parsed.checklists) &&
      Array.isArray(parsed.bugs)
    ) {
      return parsed as QAState;
    }

    console.warn('[POLI] Invalid state structure, returning null');
    return null;
  } catch (err) {
    console.error('[POLI] Failed to load state:', err);
    return null;
  }
}

/**
 * Save QA state to localStorage
 */
export function saveQAState(state: QAState, storageKey: string = DEFAULT_STORAGE_KEY): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(storageKey, serialized);
  } catch (err) {
    console.error('[POLI] Failed to save state:', err);

    // Handle quota exceeded error
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('[POLI] localStorage quota exceeded, clearing old sessions');
      clearOldSessions(state, storageKey);
    }
  }
}

/**
 * Clear QA state from localStorage
 */
export function clearQAState(storageKey: string = DEFAULT_STORAGE_KEY): void {
  try {
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error('[POLI] Failed to clear state:', err);
  }
}

/**
 * Clear old test sessions to free up space (keep last 10 sessions)
 */
function clearOldSessions(state: QAState, storageKey: string): void {
  try {
    const sortedSessions = [...state.testSessions].sort(
      (a, b) => b.startedAt - a.startedAt
    );

    const recentSessions = sortedSessions.slice(0, 10);

    const cleanedState: QAState = {
      ...state,
      testSessions: recentSessions,
    };

    const serialized = JSON.stringify(cleanedState);
    localStorage.setItem(storageKey, serialized);

    console.log('[POLI] Cleared old sessions, kept 10 most recent');
  } catch (err) {
    console.error('[POLI] Failed to clear old sessions:', err);
  }
}

/**
 * Export QA state as downloadable JSON file
 */
export function exportQAState(state: QAState, filename?: string): void {
  try {
    const serialized = JSON.stringify(state, null, 2);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `poli_qa_report_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[POLI] Failed to export state:', err);
  }
}

/**
 * Import QA state from JSON file
 */
export function importQAState(file: File): Promise<QAState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate structure
        if (
          typeof parsed === 'object' &&
          typeof parsed.isOpen === 'boolean' &&
          Array.isArray(parsed.testSessions) &&
          Array.isArray(parsed.checklists) &&
          Array.isArray(parsed.bugs)
        ) {
          resolve(parsed as QAState);
        } else {
          reject(new Error('Invalid QA state structure'));
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
