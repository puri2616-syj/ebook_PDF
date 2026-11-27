import { AlbumPage, AlbumSettings } from '../types/album';

const DB_NAME = 'monograph_album_db';
const DB_VERSION = 1;
const STORE_NAME = 'album_state';
const RECORD_KEY = 'current';

interface StoredAlbumPage {
  id: string;
  fileName: string;
  title: string;
  description: string;
  width?: number;
  height?: number;
  isSample?: boolean;
  imageUrl?: string;
  imageBlob?: Blob;
}

export interface StoredAlbumState {
  pages: AlbumPage[];
  settings: AlbumSettings;
  currentIndex: number;
}

interface RawStoredAlbumRecord {
  pages: StoredAlbumPage[];
  settings: AlbumSettings;
  currentIndex: number;
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function saveAlbumToStorage(
  pages: AlbumPage[],
  settings: AlbumSettings,
  currentIndex: number
): Promise<void> {
  try {
    const db = await openDatabase();

    const serializedPages: StoredAlbumPage[] = await Promise.all(
      pages.map(async (page) => {
        if (page.isSample) {
          return {
            id: page.id,
            fileName: page.fileName,
            title: page.title,
            description: page.description,
            width: page.width,
            height: page.height,
            isSample: true,
            imageUrl: page.imageUrl,
          };
        }

        let blob = page.imageBlob;
        if (!blob && page.imageUrl.startsWith('blob:')) {
          try {
            const res = await fetch(page.imageUrl);
            blob = await res.blob();
          } catch {
            blob = undefined;
          }
        }

        return {
          id: page.id,
          fileName: page.fileName,
          title: page.title,
          description: page.description,
          width: page.width,
          height: page.height,
          isSample: false,
          imageUrl: blob ? undefined : page.imageUrl,
          imageBlob: blob,
        };
      })
    );

    const record: RawStoredAlbumRecord = {
      pages: serializedPages,
      settings,
      currentIndex,
      updatedAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to save album'));
    });

    db.close();
  } catch {
    // Ignore storage quota or private-mode errors silently
  }
}

export async function loadAlbumFromStorage(): Promise<StoredAlbumState | null> {
  try {
    const db = await openDatabase();

    const record = await new Promise<RawStoredAlbumRecord | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RECORD_KEY);
        req.onsuccess = () => resolve(req.result as RawStoredAlbumRecord | undefined);
        req.onerror = () => reject(req.error || new Error('Failed to read album'));
      }
    );

    db.close();

    if (!record || !Array.isArray(record.pages)) {
      return null;
    }

    const restoredPages: AlbumPage[] = [];
    for (const item of record.pages) {
      const url = item.imageBlob
        ? URL.createObjectURL(item.imageBlob)
        : item.imageUrl || '';

      if (!url) continue;

      restoredPages.push({
        id: item.id,
        imageUrl: url,
        imageBlob: item.imageBlob,
        fileName: item.fileName,
        title: item.title,
        description: item.description,
        width: item.width,
        height: item.height,
        isSample: item.isSample,
      });
    }

    return {
      pages: restoredPages,
      settings: record.settings,
      currentIndex:
        typeof record.currentIndex === 'number' ? record.currentIndex : 0,
    };
  } catch {
    return null;
  }
}
