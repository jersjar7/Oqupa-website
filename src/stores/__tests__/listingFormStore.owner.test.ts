// @vitest-environment jsdom
// Hostile review of fix/wizard-bugs-web, #1 (privacy): a draft belongs to the
// account that started it. Another account on the same computer must never
// inherit its photos, address, description or publish identity. A session
// that ends by itself keeps the draft for the SAME account; a deliberate
// sign-out (Salir) clears it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, functions: {}, storage: {} }))
import { useListingFormStore, setDraftAccount } from '../listingFormStore'
import { useAuthStore } from '../authStore'
import { watchDraftOwner } from '../draftOwnerWatch'

const store = () => useListingFormStore.getState()
const saved = () => JSON.parse(sessionStorage.getItem('oqupa-listing-form') ?? '{}')
const signedIn = (uid: string | null) =>
  useAuthStore.setState({ firebaseUser: uid ? ({ uid } as never) : null })

// The real path: the account signs in (the watcher tells the store who is
// signed in), opens the wizard and types.
function draftFor(uid: string) {
  setDraftAccount(uid)
  store().adoptDraftFor(uid)
  store().updateData({ description: 'Casa de Ana en Castilla', calle: 'Av. Grau 123' })
  store().setStep(3)
}

describe('the draft belongs to one account', () => {
  beforeEach(() => {
    sessionStorage.clear()
    signedIn(null)
    setDraftAccount(null)
    store().reset()
  })

  it('records the account that started it', () => {
    draftFor('ana')
    expect(store().draftOwnerId).toBe('ana')
    expect(saved().draftOwnerId).toBe('ana')
  })

  it('opened by the same account: kept', () => {
    draftFor('ana')
    const id = store().publishId
    store().adoptDraftFor('ana')
    expect(store().data.description).toBe('Casa de Ana en Castilla')
    expect(store().publishId).toBe(id)
  })

  it('opened by another account: dropped, with a fresh identity', () => {
    draftFor('ana')
    const id = store().publishId
    store().adoptDraftFor('beto')
    expect(store().data.description).toBe('')
    expect(store().data.calle).toBe('')
    expect(store().step).toBe(1)
    expect(store().publishId).not.toBe(id)
    expect(store().draftOwnerId).toBe('beto')
    expect(saved().description ?? '').toBe('')
  })

  it('a draft from before owners were recorded goes by its publish owner', () => {
    store().updateData({ description: 'Borrador viejo' })
    useListingFormStore.setState({ publishOwnerId: 'ana', draftOwnerId: null })
    store().adoptDraftFor('beto')
    expect(store().data.description).toBe('')
  })

  it('discardDraft clears memory and storage', () => {
    draftFor('ana')
    store().discardDraft()
    expect(store().data.description).toBe('')
    expect(store().draftOwnerId).toBeNull()
    expect(sessionStorage.getItem('oqupa-listing-form')).toBeNull()
  })
})

describe('watchDraftOwner: the signed-in account changes', () => {
  let stop: () => void = () => {}
  beforeEach(() => {
    sessionStorage.clear()
    signedIn(null)
    setDraftAccount(null)
    store().reset()
    stop = watchDraftOwner()
  })
  afterEach(() => stop())

  it('the session ends by itself and the SAME account signs back in: kept', () => {
    signedIn('ana')
    draftFor('ana')
    signedIn(null)
    expect(store().data.description).toBe('Casa de Ana en Castilla')
    signedIn('ana')
    expect(store().data.description).toBe('Casa de Ana en Castilla')
    expect(store().step).toBe(3)
  })

  it('ANOTHER account signs in: the draft is gone', () => {
    signedIn('ana')
    draftFor('ana')
    signedIn(null)
    signedIn('beto')
    expect(store().data.description).toBe('')
    expect(sessionStorage.getItem('oqupa-listing-form')).toBeNull()
    expect(store().draftOwnerId).toBe('beto')
  })
})

describe('watchDraftOwner: opening the site over a stored draft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    signedIn(null)
    setDraftAccount(null)
    store().reset()
  })

  it('another account already signed in when the watch starts: dropped, fresh ids', () => {
    draftFor('ana')
    const id = store().publishId
    signedIn('beto')
    const stop = watchDraftOwner()
    expect(store().data.description).toBe('')
    expect(store().publishId).not.toBe(id)
    expect(store().draftOwnerId).toBe('beto')
    stop()
  })

  it('the owner signs in after a reload: kept', () => {
    draftFor('ana')
    const stop = watchDraftOwner()
    signedIn('ana')
    expect(store().data.description).toBe('Casa de Ana en Castilla')
    stop()
  })

  // Changed (second hostile review #1): this used to expect the ownerless
  // draft to be handed to whoever signed in — the bug. Nobody can tell whose
  // it is, so it is dropped.
  it('a non-empty draft with no owner is treated as someone else\'s and dropped', () => {
    store().updateData({ description: 'Sin dueño' })
    expect(store().draftOwnerId).toBeNull()
    const stop = watchDraftOwner()
    signedIn('ana')
    expect(store().draftOwnerId).toBe('ana')
    expect(store().data.description).toBe('')
    stop()
  })

  it('an empty draft with no owner is simply claimed', () => {
    const id = store().publishId
    const stop = watchDraftOwner()
    signedIn('ana')
    expect(store().draftOwnerId).toBe('ana')
    expect(store().publishId).toBe(id)
    stop()
  })
})

describe('second hostile review #1: a draft is never left without an owner', () => {
  beforeEach(() => {
    sessionStorage.clear()
    signedIn(null)
    setDraftAccount(null)
    store().reset()
  })

  it('reset() while signed in stamps the account', () => {
    setDraftAccount('ana')
    store().reset()
    expect(store().draftOwnerId).toBe('ana')
  })

  it('the first typing stamps the account on an ownerless draft', () => {
    setDraftAccount('ana')
    useListingFormStore.setState({ draftOwnerId: null })
    store().updateData({ description: 'Casa' })
    expect(store().draftOwnerId).toBe('ana')
    expect(saved().draftOwnerId).toBe('ana')
  })

  it('after a publish or "start again" (reset), the next account still cannot take the draft', () => {
    setDraftAccount('ana')
    store().reset()
    store().updateData({ description: 'Casa nueva de Ana' })
    store().adoptDraftFor('beto')
    expect(store().data.description).toBe('')
    expect(store().draftOwnerId).toBe('beto')
  })
})

describe('second hostile review #2: editing is never stored as a draft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setDraftAccount('ana')
    store().reset()
  })

  it('an edit (true hidden address included) never reaches this tab\'s storage', () => {
    store().setEditMode('L1', 'P1')
    store().updateData({ calle: 'Calle Secreta 742', latitude: -5.1, longitude: -80.6, description: 'Mi casa' })
    store().setStep(3)
    store().markEditBaseline()
    const raw = sessionStorage.getItem('oqupa-listing-form') ?? ''
    expect(raw).not.toContain('Calle Secreta')
    expect(raw).not.toContain('Mi casa')
  })
})
