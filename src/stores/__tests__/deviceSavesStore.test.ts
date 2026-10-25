// @vitest-environment jsdom
// "Guardados sin cuenta" (Jerson, 2026-10-25): a visitor's heart saves in this
// browser. After the THIRD save, one card invites them to create an account —
// once per browser, ever.
import { describe, it, expect, beforeEach } from 'vitest'
import { useDeviceSavesStore, DEVICE_SAVES_KEY, NUDGE_SHOWN_KEY, readDeviceSaves } from '../deviceSavesStore'

const s = () => useDeviceSavesStore.getState()

beforeEach(() => {
  localStorage.clear()
  useDeviceSavesStore.setState({ ids: [], nudgeOpen: false })
})

describe('device saves', () => {
  it('a heart saves and un-saves, and is kept in this browser', () => {
    s().toggle('a')
    expect(s().ids).toEqual(['a'])
    expect(readDeviceSaves()).toEqual(['a'])
    s().toggle('a')
    expect(s().ids).toEqual([])
    expect(JSON.parse(localStorage.getItem(DEVICE_SAVES_KEY)!)).toEqual([])
  })
  it('the third save opens the card, once', () => {
    s().toggle('a'); s().toggle('b')
    expect(s().nudgeOpen).toBe(false)
    s().toggle('c')
    expect(s().nudgeOpen).toBe(true)
    expect(localStorage.getItem(NUDGE_SHOWN_KEY)).toBe('1')
    s().closeNudge()
    s().toggle('d')
    expect(s().nudgeOpen).toBe(false)
  })
  it('never again in this browser, even after removing and re-saving', () => {
    s().toggle('a'); s().toggle('b'); s().toggle('c'); s().closeNudge()
    s().toggle('c'); s().toggle('c')
    expect(s().nudgeOpen).toBe(false)
  })
  it('clear removes only the ids that moved to the account', () => {
    s().toggle('a'); s().toggle('b'); s().toggle('c'); s().closeNudge()
    s().clear(['a', 'c'])
    expect(s().ids).toEqual(['b'])
    expect(readDeviceSaves()).toEqual(['b'])
  })
  it('a browser that refuses storage still works for this visit', () => {
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('blocked') }
    try {
      s().toggle('a')
      expect(s().ids).toEqual(['a'])
    } finally {
      Storage.prototype.setItem = orig
    }
  })
  // Hostile review: saving in two tabs overwrote the other tab's saves.
  it('a save made in another tab is kept', () => {
    s().toggle('a')
    localStorage.setItem(DEVICE_SAVES_KEY, JSON.stringify(['a', 'x'])) // the other tab
    s().toggle('b')
    expect(readDeviceSaves()).toEqual(['a', 'x', 'b'])
  })
  it('the hearts follow saves made in another tab', () => {
    localStorage.setItem(DEVICE_SAVES_KEY, JSON.stringify(['z']))
    window.dispatchEvent(new StorageEvent('storage', { key: DEVICE_SAVES_KEY }))
    expect(s().ids).toEqual(['z'])
  })
})
