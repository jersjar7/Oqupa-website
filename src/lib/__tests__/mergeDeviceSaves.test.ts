// On sign-up or log-in, a visitor's device saves move into their Guardados
// list, then leave the device (Jerson, 2026-10-25). A failed move keeps them
// on the device for the next try.
import { describe, it, expect, vi } from 'vitest'
import { mergeDeviceSaves } from '../mergeDeviceSaves'
import type { UserList } from '@/types/userList'

const list = (id: string, isDefault: boolean, listingIds: string[] = []): UserList => ({ id, name: id, listingIds, isDefault, createdAt: new Date() })
const svc = () => ({ ensureDefaultList: vi.fn(async () => 'guardados'), addListings: vi.fn(async () => {}) })

describe('mergeDeviceSaves', () => {
  it('nothing on the device: nothing happens', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', lists: [], deviceIds: [], service: s, clear })
    expect(s.ensureDefaultList).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })
  it('into the default list, in one write, then off the device', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', lists: [list('x', false), list('g', true)], deviceIds: ['a', 'b'], service: s, clear })
    expect(s.addListings).toHaveBeenCalledWith('u', 'g', ['a', 'b'])
    expect(clear).toHaveBeenCalledWith(['a', 'b'])
  })
  // Two open tabs sign in at once; each would create its own "Guardados"
  // (hostile review). The default list has a fixed id, made only if missing.
  it('no list yet: the one default "Guardados", made only if missing', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', lists: [], deviceIds: ['a'], service: s, clear })
    expect(s.ensureDefaultList).toHaveBeenCalledWith('u')
    expect(s.addListings).toHaveBeenCalledWith('u', 'guardados', ['a'])
  })
  it('a failed write keeps them on the device', async () => {
    const s = { ...svc(), addListings: vi.fn(async () => { throw new Error('offline') }) }
    const clear = vi.fn()
    await expect(mergeDeviceSaves({ uid: 'u', lists: [list('g', true)], deviceIds: ['a'], service: s, clear })).resolves.toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })
})
