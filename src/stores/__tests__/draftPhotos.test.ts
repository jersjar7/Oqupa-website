// @vitest-environment jsdom
// ADR-043 D11: the draft's photos survive a closed tab, per account.
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraftPhotos, loadDraftPhotos, clearDraftPhotos } from '../draftPhotos'

const photo = (name: string, body = 'xyz', lastModified = 1700000000000) =>
  new File([body], name, { type: 'image/jpeg', lastModified })

describe('draftPhotos', () => {
  beforeEach(async () => {
    await clearDraftPhotos()
  })

  it('gives back the same photos — name, type, size and date — in order', async () => {
    await saveDraftPhotos('ana', [photo('a.jpg', 'aaaa', 1), photo('b.jpg', 'bb', 2)])
    const back = await loadDraftPhotos('ana')
    expect(back.map((f) => [f.name, f.type, f.size, f.lastModified])).toEqual([
      ['a.jpg', 'image/jpeg', 4, 1],
      ['b.jpg', 'image/jpeg', 2, 2],
    ])
  })

  it('belongs to one account: another account gets nothing', async () => {
    await saveDraftPhotos('ana', [photo('a.jpg')])
    expect(await loadDraftPhotos('beto')).toEqual([])
  })

  it('the latest save wins, and an empty list removes them', async () => {
    await saveDraftPhotos('ana', [photo('a.jpg')])
    void saveDraftPhotos('ana', [photo('a.jpg'), photo('b.jpg')])
    expect((await loadDraftPhotos('ana')).map((f) => f.name)).toEqual(['a.jpg', 'b.jpg'])
    await saveDraftPhotos('ana', [])
    expect(await loadDraftPhotos('ana')).toEqual([])
  })

  it('clear removes everyone\'s', async () => {
    await saveDraftPhotos('ana', [photo('a.jpg')])
    await saveDraftPhotos('beto', [photo('b.jpg')])
    await clearDraftPhotos()
    expect(await loadDraftPhotos('ana')).toEqual([])
    expect(await loadDraftPhotos('beto')).toEqual([])
  })
})
