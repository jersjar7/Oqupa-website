// @vitest-environment jsdom
// ADR-043 D11: the draft's photos survive a closed tab, per account and per
// draft. Hostile review 2026-11-02: each photo is stored once (a change writes
// only what changed), and a draft older than 30 days is dropped.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraftPhotos, loadDraftPhotos, clearDraftPhotos, DRAFT_MAX_AGE_MS } from '../draftPhotos'

const photo = (name: string, body = 'xyz', lastModified = 1700000000000) =>
  new File([body], name, { type: 'image/jpeg', lastModified })

/** Counts byte reads: a photo already kept must never be read again. */
function counted(f: File) {
  let reads = 0
  const orig = f.arrayBuffer.bind(f)
  f.arrayBuffer = () => { reads++; return orig() }
  return { file: f, reads: () => reads }
}

describe('draftPhotos', () => {
  beforeEach(async () => {
    await clearDraftPhotos()
  })

  it('gives back the same photos — name, type, size and date — in order', async () => {
    await saveDraftPhotos('ana', 'd1', [photo('a.jpg', 'aaaa', 1), photo('b.jpg', 'bb', 2)])
    const back = await loadDraftPhotos('ana', 'd1')
    expect(back.map((f) => [f.name, f.type, f.size, f.lastModified])).toEqual([
      ['a.jpg', 'image/jpeg', 4, 1],
      ['b.jpg', 'image/jpeg', 2, 2],
    ])
  })

  it('belongs to one account and one draft', async () => {
    await saveDraftPhotos('ana', 'd1', [photo('a.jpg')])
    expect(await loadDraftPhotos('beto', 'd1')).toEqual([])
    expect(await loadDraftPhotos('ana', 'd2')).toEqual([])
  })

  it('a change writes only the photos added (each photo is stored once)', async () => {
    const a = counted(photo('a.jpg', 'aaa', 1))
    const b = counted(photo('b.jpg', 'bb', 2))
    await saveDraftPhotos('ana', 'd1', [a.file])
    await saveDraftPhotos('ana', 'd1', [a.file, b.file])
    await saveDraftPhotos('ana', 'd1', [b.file, a.file]) // new cover: order only
    expect(a.reads()).toBe(1)
    expect(b.reads()).toBe(1)
    expect((await loadDraftPhotos('ana', 'd1')).map((f) => f.name)).toEqual(['b.jpg', 'a.jpg'])
  })

  it('a removed photo is deleted; an empty list removes them all', async () => {
    await saveDraftPhotos('ana', 'd1', [photo('a.jpg', 'a', 1), photo('b.jpg', 'b', 2)])
    await saveDraftPhotos('ana', 'd1', [photo('b.jpg', 'b', 2)])
    expect((await loadDraftPhotos('ana', 'd1')).map((f) => f.name)).toEqual(['b.jpg'])
    await saveDraftPhotos('ana', 'd1', [])
    expect(await loadDraftPhotos('ana', 'd1')).toEqual([])
  })

  it('photos of a draft untouched for more than 30 days are dropped', async () => {
    const t = 1_800_000_000_000
    await saveDraftPhotos('ana', 'd1', [photo('a.jpg')], t)
    expect(await loadDraftPhotos('ana', 'd1', t + DRAFT_MAX_AGE_MS - 1)).toHaveLength(1)
    expect(await loadDraftPhotos('ana', 'd1', t + DRAFT_MAX_AGE_MS + 1)).toEqual([])
  })

  it('clear removes everyone\'s', async () => {
    await saveDraftPhotos('ana', 'd1', [photo('a.jpg')])
    await saveDraftPhotos('beto', 'd9', [photo('b.jpg')])
    await clearDraftPhotos()
    expect(await loadDraftPhotos('ana', 'd1')).toEqual([])
    expect(await loadDraftPhotos('beto', 'd9')).toEqual([])
  })
})
