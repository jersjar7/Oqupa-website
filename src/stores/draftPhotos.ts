// The publishing draft's photos, kept across a closed tab (ADR-043 D11).
//
// The rest of the draft is small text in localStorage; photos are files, so
// they go to IndexedDB, one record per account. They are cleared when the
// listing is published, when the draft is dropped, and on a deliberate
// sign-out. Storage can be missing or refuse (private mode, a full disk, site
// data off): every call swallows that and the wizard simply works without it.

const DB_NAME = 'oqupa-draft'
const STORE = 'photos'

function idb(): IDBFactory | null {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB
  } catch {
    return null
  }
}

function open(): Promise<IDBDatabase | null> {
  const factory = idb()
  if (!factory) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = factory.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | null): Promise<T | null> {
  const db = await open()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode)
      const req = work(tx.objectStore(STORE))
      let result: T | null = null
      if (req) req.onsuccess = () => { result = req.result }
      tx.oncomplete = () => { db.close(); resolve(result) }
      tx.onerror = () => { db.close(); resolve(null) }
      tx.onabort = () => { db.close(); resolve(null) }
    } catch {
      db.close()
      resolve(null)
    }
  })
}

interface Saved {
  // Bytes, not the File itself: every browser can store bytes.
  files: Array<{ name: string; type: string; lastModified: number; data: ArrayBuffer }>
}

function bytesOf(f: File): Promise<ArrayBuffer> {
  if (typeof f.arrayBuffer === 'function') return f.arrayBuffer()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as ArrayBuffer)
    r.onerror = () => reject(r.error)
    r.readAsArrayBuffer(f)
  })
}

// Writes happen in order: a later save never lands under an earlier one.
let queue: Promise<unknown> = Promise.resolve()
const inOrder = <T>(job: () => Promise<T>): Promise<T> => {
  const next = queue.then(job, job)
  queue = next.catch(() => undefined)
  return next
}

/** Keeps `files` as `uid`'s draft photos (an empty list removes them). */
export function saveDraftPhotos(uid: string, files: readonly File[]): Promise<void> {
  return inOrder(async () => {
    if (files.length === 0) {
      await run('readwrite', (s) => s.delete(uid))
      return
    }
    let record: Saved
    try {
      record = {
        files: await Promise.all(
          files.map(async (f) => ({ name: f.name, type: f.type, lastModified: f.lastModified, data: await bytesOf(f) })),
        ),
      }
    } catch {
      return
    }
    await run('readwrite', (s) => s.put(record, uid))
  })
}

/**
 * `uid`'s draft photos, as files with their original name, type and date —
 * so photos already uploaded are recognised and not sent again.
 */
export function loadDraftPhotos(uid: string): Promise<File[]> {
  return inOrder(async () => {
    const saved = (await run<Saved | undefined>('readonly', (s) => s.get(uid) as IDBRequest<Saved | undefined>)) ?? null
    if (!saved || !Array.isArray(saved.files)) return []
    return saved.files.map((f) => new File([f.data], f.name, { type: f.type, lastModified: f.lastModified }))
  })
}

/** Removes every draft photo kept in this browser. */
export function clearDraftPhotos(): Promise<void> {
  return inOrder(async () => {
    await run('readwrite', (s) => s.clear())
  })
}
