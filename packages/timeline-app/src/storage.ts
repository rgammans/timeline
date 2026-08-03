import type { TimelineData } from '@timeline/core';

const STORAGE_KEY = 'timeline-data';

/**
 * Save timeline data to localStorage
 */
export function saveToStorage(data: TimelineData): void {
  try {
    const serialized = data.serialize();
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * Load timeline data from localStorage
 */
export function loadFromStorage(data: TimelineData): boolean {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized) {
      data.unserialize(serialized);
      return true;
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return false;
}

/**
 * Clear timeline data from localStorage
 */
export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export timeline data to a JSON file download
 */
export function exportToFile(data: TimelineData, filename: string = 'timeline.json'): void {
  const serialized = data.serialize();
  const blob = new Blob([serialized], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Import timeline data from a JSON file
 */
export function importFromFile(data: TimelineData, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        data.unserialize(content);
        saveToStorage(data);
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
