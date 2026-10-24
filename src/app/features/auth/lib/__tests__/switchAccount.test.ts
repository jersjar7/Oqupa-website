// @vitest-environment jsdom
// "Usar otra cuenta" (approved by Jerson 2026-10-24). On a phone the website
// gave a half-finished account no way out: the header hides "Salir", and the
// sign-up steps had no exit. This is the exit, and it must keep the errand.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { switchAccount } from '../switchAccount'
import { peekReturnUrl, setReturnUrl } from '@/lib/utils'

describe('switchAccount', () => {
  beforeEach(() => localStorage.clear())

  it('signs out and opens the sign-in door', async () => {
    const logout = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn()
    await switchAccount({ logout, navigate })
    expect(logout).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/app/login', { replace: true })
  })

  it('keeps the pending errand, so the other account lands back on the listing', async () => {
    setReturnUrl('/property/abc#contactar')
    await switchAccount({ logout: vi.fn().mockResolvedValue(undefined), navigate: vi.fn() })
    expect(peekReturnUrl()?.url).toBe('/property/abc#contactar')
  })

  it('from the contact window, stores the listing as the errand first', async () => {
    await switchAccount({
      logout: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn(),
      returnTo: '/property/xyz#contactar',
    })
    expect(peekReturnUrl()?.url).toBe('/property/xyz#contactar')
  })

  it('signs out before navigating (the login page would bounce a signed-in person)', async () => {
    const order: string[] = []
    await switchAccount({
      logout: async () => { order.push('logout') },
      navigate: () => { order.push('navigate') },
    })
    expect(order).toEqual(['logout', 'navigate'])
  })

  it('a failed sign-out does not navigate, and reports it', async () => {
    const navigate = vi.fn()
    await expect(
      switchAccount({ logout: vi.fn().mockRejectedValue(new Error('offline')), navigate }),
    ).rejects.toThrow('offline')
    expect(navigate).not.toHaveBeenCalled()
  })
})
