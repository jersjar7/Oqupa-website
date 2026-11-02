// On sign-up or log-in, a visitor's device saves move into their Guardados,
// then leave the device (Jerson, 2026-10-25). Since ADR-046 #1 Guardados is
// the app's store (users/{uid}/favorites). A failed move keeps them on the
// device for the next try. A listing already saved is kept once.
import { describe, it, expect, vi } from 'vitest'
import { mergeDeviceSaves } from '../mergeDeviceSaves'

const svc = () => ({ addMany: vi.fn(async () => {}) })

describe('mergeDeviceSaves', () => {
  it('nothing on the device: nothing happens', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', savedIds: [], deviceIds: [], service: s, clear })
    expect(s.addMany).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })
  it('into Guardados, in one write, then off the device', async () => {
    const s = svc(); const clear = vi.fn()
    await expect(mergeDeviceSaves({ uid: 'u', savedIds: [], deviceIds: ['a', 'b'], service: s, clear })).resolves.toBe(true)
    expect(s.addMany).toHaveBeenCalledWith('u', ['a', 'b'])
    expect(clear).toHaveBeenCalledWith(['a', 'b'])
  })
  it('a listing already saved is kept once (its date is not rewritten)', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', savedIds: ['a'], deviceIds: ['a', 'b'], service: s, clear })
    expect(s.addMany).toHaveBeenCalledWith('u', ['b'])
    expect(clear).toHaveBeenCalledWith(['a', 'b'])
  })
  it('a failed write keeps them on the device', async () => {
    const s = { addMany: vi.fn(async () => { throw new Error('offline') }) }
    const clear = vi.fn()
    await expect(mergeDeviceSaves({ uid: 'u', savedIds: [], deviceIds: ['a'], service: s, clear })).resolves.toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })
})
