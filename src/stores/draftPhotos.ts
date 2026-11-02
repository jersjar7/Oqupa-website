// The publishing draft's photos, kept across a closed tab (ADR-043 D11).
//
// The rest of the draft is small text in localStorage; photos are files, so
// they go to IndexedDB. Each photo is stored ONCE, by its fingerprint (name,
// size, date), and a small list per account says which photos the draft has,
// in order, and which draft (publish identity) they belong to. A change
// writes only the photos added and deletes only the ones removed (hostile
// review 2026-11-02: every change used to rewrite every byte). A draft's
// photos older than DRAFT_MAX_AGE_MS are dropped.
//
// Storage can be missing or refuse (private mode, a full disk, site data
// off): every call swallows that and the wizard simply works without it.

import { photoFingerprints } from '@/lib/publishIdentity'

const DB_NAME = 'oqupa-draft'
const DB_VERSION = 2
const PHOTOS = 'photoFiles' // `${uid}|${fingerprint}` → StoredPhoto
const LISTS = 'photoLists' // uid → PhotoList

/** A draft (text and photos) not touched for this long is dropped. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface StoredPhoto {
  name: string
  type: string
  lastModified: number
  // Bytes, not the File itself: every browser can store bytes.
  data: ArrayBuffer
}

interface PhotoList {
  publishId: string
  fingerprints: string[]
  savedAt: number
}

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
      const req = factory.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        // Version 1 kept every photo's bytes in one record per account.
        if (db.objectStoreNames.contains('photos')) db.deleteObjectStore('photos')
        if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS)
        if (!db.objectStoreNames.contains(LISTS)) db.createObjectStore(LISTS)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** One transaction over both stores; resolves with what `work` returns, or null on failure. */
async function run<T>(
  mode: IDBTransactionMode,
  work: (photos: IDBObjectStore, lists: IDBObjectStore, done: (v: T) => void) => void,
): Promise<T | null> {
  const db = await open()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([PHOTOS, LISTS], mode)
      let result: T | null = null
      work(tx.objectStore(PHOTOS), tx.objectStore(LISTS), (v) => { result = v })
      tx.oncomplete = () => { db.close(); resolve(result) }
      tx.onerror = () => { db.close(); resolve(null) }
      tx.onabort = () => { db.close(); resolve(null) }
    } catch {
      db.close()
      resolve(null)
    }
  })
}

const read = <T>(store: IDBObjectStore, key: IDBValidKey, then: (v: T | undefined) => void) => {
  const req = store.get(key)
  req.onsuccess = () => then(req.result as T | undefined)
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

const photoKey = (uid: string, fp: string) => `${uid}|${fp}`

/** The photo list kept for `uid`, if any. */
async function listOf(uid: string): Promise<PhotoList | null> {
  return (await run<PhotoList | undefined>('readonly', (_p, lists, done) => read<PhotoList>(lists, uid, done))) ?? null
}

/**
 * Keeps `files` as the photos of `uid`'s draft `publishId`. Only photos not
 * kept yet are written; photos no longer in the draft are deleted. A
 * different draft's photos are replaced. An empty list removes them.
 */
export function saveDraftPhotos(uid: string, publishId: string, files: readonly File[], now = Date.now()): Promise<void> {
  return inOrder(async () => {
    const fps = photoFingerprints(files)
    const before = await listOf(uid)
    const kept = new Set(before && before.publishId === publishId ? before.fingerprints : [])
    const old = before?.fingerprints ?? []
    const added: Array<[string, StoredPhoto]> = []
    try {
      for (let i = 0; i < files.length; i++) {
        const fp = fps[i]!
        if (kept.has(fp)) continue
        const f = files[i]!
        added.push([fp, { name: f.name, type: f.type, lastModified: f.lastModified, data: await bytesOf(f) }])
      }
    } catch {
      return
    }
    const keep = new Set(fps)
    await run('readwrite', (photos, lists) => {
      for (const [fp, photo] of added) photos.put(photo, photoKey(uid, fp))
      for (const fp of old) if (!keep.has(fp)) photos.delete(photoKey(uid, fp))
      if (fps.length === 0) lists.delete(uid)
      else lists.put({ publishId, fingerprints: fps, savedAt: now } satisfies PhotoList, uid)
    })
  })
}

/**
 * The photos of `uid`'s draft `publishId`, as files with their original name,
 * type and date — so photos already uploaded are recognised and not sent
 * again. Nothing for another draft, or for one older than 30 days.
 */
export function loadDraftPhotos(uid: string, publishId: string, now = Date.now()): Promise<File[]> {
  return inOrder(async () => {
    const list = await listOf(uid)
    if (!list || list.publishId !== publishId || now - list.savedAt > DRAFT_MAX_AGE_MS) return []
    const stored = await run<Array<StoredPhoto | undefined>>('readonly', (photos, _l, done) => {
      const out: Array<StoredPhoto | undefined> = new Array(list.fingerprints.length)
      let left = list.fingerprints.length
      if (left === 0) done(out)
      list.fingerprints.forEach((fp, i) => read<StoredPhoto>(photos, photoKey(uid, fp), (v) => {
        out[i] = v
        if (--left === 0) done(out)
      }))
    })
    if (!stored || stored.some((p) => !p)) return []
    return (stored as StoredPhoto[]).map((p) => new File([p.data], p.name, { type: p.type, lastModified: p.lastModified }))
  })
}

/** Removes every draft photo kept in this browser. */
export function clearDraftPhotos(): Promise<void> {
  return inOrder(async () => {
    await run('readwrite', (photos, lists) => {
      photos.clear()
      lists.clear()
    })
  })
}
