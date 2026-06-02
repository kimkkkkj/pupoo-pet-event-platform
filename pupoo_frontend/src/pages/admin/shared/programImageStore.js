/* ═══════════════════════════════════════════
   프로그램 이미지 공유 저장소
   - IndexedDB (새로고침 후에도 유지, 용량 제한 없음)
   - 메모리 캐시 (빠른 접근)
   ═══════════════════════════════════════════ */

const DB_NAME = "programImagesDB";
const STORE_NAME = "images";
const DB_VERSION = 1;

/* ── 메모리 캐시 (즉시 접근용) ── */
const _cache = {};

/* ── IndexedDB 열기 ── */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ── IndexedDB에 저장 ── */
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
    console.warn("[programImageStore] DB put failed:", e);
  }
}

/* ── IndexedDB에서 읽기 ── */
async function dbGet(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    return new Promise((res) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

/* ── IndexedDB에서 삭제 ── */
async function dbDelete(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
  } catch (e) {
    console.warn("[programImageStore] DB delete failed:", e);
  }
}

/* ── IndexedDB에서 전체 읽기 ── */
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
        const keys = allKeys.result || [];
        const vals = allVals.result || [];
        keys.forEach((k, i) => {
          map[k] = vals[i];
        });
        res(map);
      };
      tx.onerror = () => res({});
    });
  } catch {
    return {};
  }
}

/* ═══ 외부 API ═══ */

/** 프로그램 이미지 저장 (메모리 + IndexedDB) */
export function setProgramImage(programId, dataUrl) {
  if (!programId) return;
  const key = String(programId);
  if (dataUrl) {
    _cache[key] = dataUrl;
    dbPut(key, dataUrl);
    console.log(
      "[programImageStore] 저장됨 key:",
      key,
      "길이:",
      dataUrl.length,
    );
  } else {
    delete _cache[key];
    dbDelete(key);
  }
}

/** 프로그램 이미지 삭제 */
export function removeProgramImage(programId) {
  setProgramImage(programId, null);
}

/** 메모리 캐시에서 이미지 가져오기 (동기) */
export function getProgramImage(programId) {
  if (!programId) return null;
  return _cache[String(programId)] || null;
}

/** 전체 이미지 맵 가져오기 (동기, 캐시 기반) */
export function getProgramImageMap() {
  return { ..._cache };
}

/** 앱 시작 시 IndexedDB → 메모리 캐시 로드 */
export async function loadImageCache() {
  try {
    const all = await dbGetAll();
    Object.assign(_cache, all);
    console.log(
      "[programImageStore] 캐시 로드 완료. 키 목록:",
      Object.keys(_cache),
    );
  } catch (e) {
    console.warn("[programImageStore] cache load failed:", e);
  }
}

/** 프로그램 목록에 imageUrl 주입 (동기, 캐시 기반) */
export function injectProgramImages(programs) {
  console.log(
    "[programImageStore] injectProgramImages 호출. 캐시 키:",
    Object.keys(_cache),
  );
  return programs.map((p) => {
    // programId, id 둘 다 시도 (숫자/문자열 모두 커버)
    const key1 = String(p.programId ?? "");
    const key2 = String(p.id ?? "");
    const found = _cache[key1] || _cache[key2] || p.imageUrl || null;
    console.log(
      "[programImageStore] 프로그램",
      key1 || key2,
      "→ 이미지:",
      found ? "있음" : "없음",
    );
    return {
      ...p,
      imageUrl: found,
    };
  });
}

/* ── 모듈 로드 시 자동으로 캐시 복원 ── */
loadImageCache();
