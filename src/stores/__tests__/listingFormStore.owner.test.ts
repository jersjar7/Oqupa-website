// @vitest-environment jsdom
// Hostile review of fix/wizard-bugs-web, #1 (privacy): a draft belongs to the
// account that started it. Another account on the same computer must never
// inherit its photos, address, description or publish identity. A session
// that ends by itself keeps the draft for the SAME account; a deliberate
// sign-out (Salir) clears it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, functions: {}, storage: {} }))
import { useListingFormStore } from '../listingFormStore'
import { useAuthStore } from '../authStore'
import { watchDraftOwner } from '../draftOwnerWatch'

const store = () => useListingFormStore.getState()
const saved = () => JSON.parse(sessionStorage.getItem('oqupa-listing-form') ?? '{}')
const signedIn = (uid: string | null) =>
  useAuthStore.setState({ firebaseUser: uid ? ({ uid } as never) : null })

function draftFor(uid: string) {
  store().reset()
  store().adoptDraftFor(uid)
  store().updateData({ description: 'Casa de Ana en Castilla', calle: 'Av. Grau 123' })
  store().setStep(3)
}

describe('the draft belongs to one account', () => {
  beforeEach(() => {
    sessionStorage.clear()
    signedIn(null)
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
    // What is stored now is Beto's own, empty draft.
    expect(saved().description ?? '').toBe('')
    expect(saved().draftOwnerId).toBe('beto')
  })
})

describe('watchDraftOwner: opening the site over a stored draft', () => {
  beforeEach(() => {
    sessionStorage.clear()
    signedIn(null)
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

  it('a draft with no owner yet is claimed by whoever signs in', () => {
    store().updateData({ description: 'Sin dueño' })
    const stop = watchDraftOwner()
    signedIn('ana')
    expect(store().draftOwnerId).toBe('ana')
    expect(store().data.description).toBe('Sin dueño')
    stop()
  })
})
