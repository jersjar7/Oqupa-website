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
    b.store().setStep(4)
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana')).length).toBe(3))
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
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana')).length).toBe(1))
    b.stop()
    closeTab()
    b = await boot()
    b.signedIn('beto')
    expect(b.store().data.description).toBe('')
    await waitFor(async () => expect(await b.photos.loadDraftPhotos('ana')).toEqual([]))
    expect(b.store().data.photos).toEqual([])
    b.stop()
  })

  it('a deliberate sign-out (Salir) clears the draft and its photos', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', photos: [photo('a.jpg')] })
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana')).length).toBe(1))
    b.store().discardDraft()
    expect(localStorage.getItem(KEY)).toBeNull()
    await waitFor(async () => expect(await b.photos.loadDraftPhotos('ana')).toEqual([]))
    b.stop()
  })

  it('publishing clears the draft and its photos', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', photos: [photo('a.jpg')] })
    await waitFor(async () => expect((await b.photos.loadDraftPhotos('ana')).length).toBe(1))
    b.store().markPublished('listing_x')
    expect(localStorage.getItem(KEY)).toBeNull()
    await waitFor(async () => expect(await b.photos.loadDraftPhotos('ana')).toEqual([]))
    b.stop()
  })

  it('an edit never keeps photos as a draft', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().reset()
    b.store().setEditMode('L1', 'P1')
    b.store().updateData({ photos: [photo('a.jpg')] })
    await new Promise((r) => setTimeout(r, 30))
    expect(await b.photos.loadDraftPhotos('ana')).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
    b.stop()
  })
})
