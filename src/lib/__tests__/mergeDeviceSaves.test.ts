// On sign-up or log-in, a visitor's device saves move into their Guardados
// list, then leave the device (Jerson, 2026-10-25). A failed move keeps them
// on the device for the next try.
import { describe, it, expect, vi } from 'vitest'
import { mergeDeviceSaves } from '../mergeDeviceSaves'
import type { UserList } from '@/types/userList'

const list = (id: string, isDefault: boolean, listingIds: string[] = []): UserList => ({ id, name: id, listingIds, isDefault, createdAt: new Date() })
const svc = () => ({ createList: vi.fn(async () => 'new'), addListings: vi.fn(async () => {}) })

describe('mergeDeviceSaves', () => {
  it('nothing on the device: nothing happens', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', lists: [], deviceIds: [], service: s, clear })
    expect(s.createList).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })
  it('into the default list, in one write, then off the device', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', lists: [list('x', false), list('g', true)], deviceIds: ['a', 'b'], service: s, clear })
    expect(s.addListings).toHaveBeenCalledWith('u', 'g', ['a', 'b'])
    expect(clear).toHaveBeenCalledWith(['a', 'b'])
  })
  it('no list yet: creates "Guardados" as the default', async () => {
    const s = svc(); const clear = vi.fn()
    await mergeDeviceSaves({ uid: 'u', lists: [], deviceIds: ['a'], service: s, clear })
    expect(s.createList).toHaveBeenCalledWith('u', 'Guardados', true)
    expect(s.addListings).toHaveBeenCalledWith('u', 'new', ['a'])
  })
  it('a failed write keeps them on the device', async () => {
    const s = { ...svc(), addListings: vi.fn(async () => { throw new Error('offline') }) }
    const clear = vi.fn()
    await expect(mergeDeviceSaves({ uid: 'u', lists: [list('g', true)], deviceIds: ['a'], service: s, clear })).resolves.toBe(false)
    expect(clear).not.toHaveBeenCalled()
  })
})
