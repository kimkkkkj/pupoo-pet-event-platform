/* 체험존(부스) 이미지 공유 저장소 - IndexedDB + 메모리 캐시 */

const DB_NAME = "boothImagesDB";
const STORE_NAME = "images";
const DB_VERSION = 1;
const _cache = {};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME))
        db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(key, value) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  } catch (e) {
    console.warn("[boothImageStore] put failed:", e);
  }
}

async function dbDelete(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
  } catch (e) {
    console.warn("[boothImageStore] delete failed:", e);
  }
}

async function dbGetAll() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const allKeys = store.getAllKeys();
    const allVals = store.getAll();
    return new Promise((res) => {
      tx.oncomplete = () => {
        const map = {};
        (allKeys.result || []).forEach((k, i) => {
          map[k] = (allVals.result || [])[i];
        });
        res(map);
      };
      tx.onerror = () => res({});
    });
  } catch {
    return {};
  }
}

export function setBoothImage(boothId, dataUrl) {
  if (!boothId) return;
  const key = String(boothId);
  if (dataUrl) {
    _cache[key] = dataUrl;
    dbPut(key, dataUrl);
  } else {
    delete _cache[key];
    dbDelete(key);
  }
}

export function getBoothImage(boothId) {
  if (!boothId) return null;
  return _cache[String(boothId)] || null;
}

export function getBoothImageMap() {
  return { ..._cache };
}

export async function loadBoothImageCache() {
  try {
    const all = await dbGetAll();
    Object.assign(_cache, all);
  } catch (e) {
    console.warn("[boothImageStore] cache load failed:", e);
  }
}

loadBoothImageCache();
