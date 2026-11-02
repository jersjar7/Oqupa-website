// @vitest-environment jsdom
// ADR-043 D11: the draft is kept across a closed tab — photos included — for
// the same account only; publishing and a deliberate sign-out clear it.
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, functions: {}, storage: {} }))

const KEY = 'oqupa-listing-form'
const photo = (name: string, body = 'xyz') => new File([body], name, { type: 'image/jpeg', lastModified: 1700000000000 })

async function boot() {
  vi.resetModules()
  const form = await import('@/stores/listingFormStore')
  const auth = await import('@/stores/authStore')
  const watch = await import('@/stores/draftOwnerWatch')
  const photos = await import('@/stores/draftPhotos')
  const stop = watch.watchDraftOwner()
  const signedIn = (uid: string | null) =>
    auth.useAuthStore.setState({ firebaseUser: uid ? ({ uid } as never) : null })
  return { store: () => form.useListingFormStore.getState(), signedIn, stop, photos }
}

/** Closing the tab: this tab's storage goes, the browser's stays. */
const closeTab = () => sessionStorage.clear()

describe('drafts kept across a closed tab (D11)', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    localStorage.clear()
    const { clearDraftPhotos } = await import('@/stores/draftPhotos')
    await clearDraftPhotos()
  })

  it('the draft is written to the browser, not only this tab', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A' })
    expect(JSON.parse(localStorage.getItem(KEY)!).description).toBe('Casa A')
    b.stop()
  })

  it('A types, closes the tab, comes back: the draft is there, on the same page', async () => {
    let b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', calle: 'Grau 1' })
    b.store().setStep(3)
    b.stop()
    closeTab()
    b = await boot()
    b.signedIn('ana')
    expect(b.store().data.description).toBe('Casa A')
    expect(b.store().step).toBe(3)
    b.stop()
  })

  it('the photos come back too, the same files (so uploaded ones are not sent again)', async () => {
    let b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', photos: [photo('a.jpg', 'aaa'), photo('b.jpg'), photo('c.jpg')] })
    const id = b.store().publishId
    b.store().setStep(4)
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana', id)).length).toBe(3))
    b.stop()
    closeTab()
    b = await boot()
    const before = b.store().photosRestoredAt
    b.signedIn('ana')
    await waitFor(() => expect(b.store().data.photos.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']))
    expect(b.store().data.photos[0]!.size).toBe(3)
    expect(b.store().data.photos[0]!.lastModified).toBe(1700000000000)
    expect(b.store().data.photoOrder).toHaveLength(3)
    expect(b.store().photosRestoredAt).not.toBe(before)
    b.stop()
  })

  it('another account never gets them: draft and photos are dropped', async () => {
    let b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', photos: [photo('a.jpg')] })
    const id = b.store().publishId
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana', id)).length).toBe(1))
    b.stop()
    closeTab()
    b = await boot()
    b.signedIn('beto')
    expect(b.store().data.description).toBe('')
    await waitFor(async () => expect(await b.photos.loadDraftPhotos('ana', id)).toEqual([]))
    expect(b.store().data.photos).toEqual([])
    b.stop()
  })

  it('a deliberate sign-out (Salir) clears the draft and its photos', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', photos: [photo('a.jpg')] })
    const id = b.store().publishId
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana', id)).length).toBe(1))
    b.store().discardDraft()
    expect(localStorage.getItem(KEY)).toBeNull()
    await waitFor(async () => expect(await b.photos.loadDraftPhotos('ana', id)).toEqual([]))
    b.stop()
  })

  it('publishing clears the draft and its photos', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', photos: [photo('a.jpg')] })
    const id = b.store().publishId
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana', id)).length).toBe(1))
    b.store().markPublished('listing_x')
    expect(localStorage.getItem(KEY)).toBeNull()
    await waitFor(async () => expect(await b.photos.loadDraftPhotos('ana', id)).toEqual([]))
    b.stop()
  })

  it('an edit never keeps photos as a draft', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().reset()
    b.store().setEditMode('L1', 'P1')
    b.store().updateData({ photos: [photo('a.jpg')] })
    const id = b.store().publishId
    await new Promise((r) => setTimeout(r, 30))
    expect(await b.photos.loadDraftPhotos('ana', id)).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
    b.stop()
  })

  it('a draft untouched for more than 30 days is dropped', async () => {
    localStorage.setItem(KEY, JSON.stringify({ step: 3, description: 'Casa vieja', draftOwnerId: 'ana', savedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 }))
    const b = await boot()
    b.signedIn('ana')
    expect(b.store().data.description).toBe('')
    expect(b.store().step).toBe(1)
    b.stop()
  })
})

// Hostile review 2026-11-02 #2: the draft is shared by every tab now. A
// second tab must never bring back a published draft or mix two drafts.
describe('two tabs (review #2)', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    localStorage.clear()
    const { clearDraftPhotos } = await import('@/stores/draftPhotos')
    await clearDraftPhotos()
  })

  /** What another tab publishing this draft leaves in the browser. */
  function otherTabPublished(publishId: string) {
    localStorage.removeItem(KEY)
    localStorage.setItem('oqupa-listing-published', JSON.stringify([publishId]))
    window.dispatchEvent(new StorageEvent('storage', { key: 'oqupa-listing-published' }))
  }

  it('published in another tab: this tab starts a fresh draft, and never writes the old one back', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A' })
    b.store().setStep(5)
    const old = b.store().publishId
    otherTabPublished(old)
    expect(b.store().publishId).not.toBe(old)
    expect(b.store().data.description).toBe('')
    b.store().updateData({ description: 'Otra casa' })
    expect(JSON.parse(localStorage.getItem(KEY)!).publishId).not.toBe(old)
    b.stop()
  })

  it('even if the news is missed, a published draft is never saved again', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A' })
    const old = b.store().publishId
    localStorage.removeItem(KEY)
    localStorage.setItem('oqupa-listing-published', JSON.stringify([old])) // no event
    b.store().updateData({ description: 'Casa A, tecleo tardío' })
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(b.store().publishedListingId).toBe(`listing_${old}`)
    b.stop()
  })

  it('a reload never brings back a draft published in another tab', async () => {
    localStorage.setItem(KEY, JSON.stringify({ step: 5, description: 'Casa A', publishId: 'p1', draftOwnerId: 'ana' }))
    localStorage.setItem('oqupa-listing-published', JSON.stringify(['p1']))
    const b = await boot()
    b.signedIn('ana')
    expect(b.store().publishId).not.toBe('p1')
    expect(b.store().data.description).toBe('')
    b.stop()
  })

  it('typed in another tab: this tab follows that draft whole, and the page restarts with it', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A' })
    const version = b.store().draftVersion
    const other = { step: 3, description: 'Casa B escrita en otra pestaña', publishId: 'p2', draftOwnerId: 'ana' }
    localStorage.setItem(KEY, JSON.stringify(other))
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    expect(b.store().publishId).toBe('p2')
    expect(b.store().data.description).toBe('Casa B escrita en otra pestaña')
    expect(b.store().step).toBe(3)
    expect(b.store().draftVersion).toBe(version + 1)
    b.stop()
  })
})

// Hostile review 2026-11-02 #3: opening Editar used to wipe the unfinished
// new-listing draft and its photos.
describe('editing leaves the new-listing draft alone (review #3)', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    localStorage.clear()
    const { clearDraftPhotos } = await import('@/stores/draftPhotos')
    await clearDraftPhotos()
  })

  it('Editar and back: the draft, its page and its photos are all still there', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa nueva a medias', photos: [photo('a.jpg', 'aaa'), photo('b.jpg')] })
    b.store().setStep(4)
    const id = b.store().publishId
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana', id)).length).toBe(2))
    const stored = localStorage.getItem(KEY)

    b.store().startEdit('L1', 'P1')
    b.store().updateData({ description: 'Texto del anuncio que se edita', calle: 'Dirección real' })
    b.store().setStep(3)
    expect(localStorage.getItem(KEY)).toBe(stored)
    expect((await b.photos.loadDraftPhotos('ana', id)).length).toBe(2)

    b.store().leaveEdit()
    expect(b.store().isEditMode).toBe(false)
    expect(b.store().data.description).toBe('Casa nueva a medias')
    expect(b.store().data.calle).toBe('')
    expect(b.store().step).toBe(4)
    expect(b.store().publishId).toBe(id)
    await waitFor(() => expect(b.store().data.photos.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg']))
    b.stop()
  })
})
