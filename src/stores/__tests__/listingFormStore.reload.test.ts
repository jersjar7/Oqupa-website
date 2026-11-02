// @vitest-environment jsdom
// Third hostile review: the store rebuilt from this tab's storage, as after a
// real page reload, and the account changing underneath an edit.
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, functions: {}, storage: {} }))

async function boot() {
  vi.resetModules()
  const form = await import('@/stores/listingFormStore')
  const auth = await import('@/stores/authStore')
  const watch = await import('@/stores/draftOwnerWatch')
  const stop = watch.watchDraftOwner()
  const signedIn = (uid: string | null) =>
    auth.useAuthStore.setState({ firebaseUser: uid ? ({ uid } as never) : null })
  return { store: () => form.useListingFormStore.getState(), signedIn, stop }
}

describe('a real reload', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('A types, reload, A signs in: the draft is kept, on the same page', async () => {
    let b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A', calle: 'Grau 1' })
    b.store().setStep(2)
    b.stop()
    b = await boot()
    b.signedIn('ana')
    expect(b.store().data.description).toBe('Casa A')
    expect(b.store().step).toBe(2)
    b.stop()
  })

  it('A types, reload, B signs in: dropped', async () => {
    let b = await boot()
    b.signedIn('ana')
    b.store().updateData({ description: 'Casa A' })
    b.stop()
    b = await boot()
    b.signedIn('beto')
    expect(b.store().data.description).toBe('')
    expect(b.store().draftOwnerId).toBe('beto')
    b.stop()
  })

  it('a draft saved by the previous site version (no owner) is dropped at deploy — accepted', async () => {
    sessionStorage.setItem('oqupa-listing-form', JSON.stringify({ step: 3, description: 'Casa prod', calle: 'Grau 2', propertyType: 'casa' }))
    const b = await boot()
    b.signedIn('ana')
    expect(b.store().data.description).toBe('')
    b.stop()
  })

  it('an edit is not restored by a reload (the edit page loads the listing again)', async () => {
    let b = await boot()
    b.signedIn('ana')
    b.store().reset()
    b.store().setEditMode('L1', 'P1')
    b.store().updateData({ calle: 'Calle Secreta', description: 'Mi casa' })
    b.stop()
    b = await boot()
    b.signedIn('ana')
    expect(b.store().isEditMode).toBe(false)
    expect(b.store().data.calle).toBe('')
    b.stop()
  })
})

describe('an edit when the account changes (third review #1)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('another account signing in drops the edit — true hidden address included', async () => {
    const b = await boot()
    b.signedIn('ana')
    const s = b.store()
    s.reset()
    s.setEditMode('L1', 'P1')
    s.updateData({
      calle: 'Calle Secreta',
      hiddenAddress: { publicLatitude: 1, publicLongitude: 1, trueLatitude: 2, trueLongitude: 2, trueCalle: 'Calle Secreta' },
    })
    b.signedIn(null)
    b.signedIn('beto')
    expect(b.store().isEditMode).toBe(false)
    expect(b.store().data.hiddenAddress).toBeNull()
    expect(b.store().data.calle).toBe('')
    b.stop()
  })

  it('the same account coming back keeps its edit', async () => {
    const b = await boot()
    b.signedIn('ana')
    b.store().reset()
    b.store().setEditMode('L1', 'P1')
    b.store().updateData({ calle: 'Av. Grau 9' })
    b.signedIn(null)
    b.signedIn('ana')
    expect(b.store().isEditMode).toBe(true)
    expect(b.store().data.calle).toBe('Av. Grau 9')
    b.stop()
  })
})
