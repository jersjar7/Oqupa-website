// @vitest-environment jsdom
// A browser that blocks storage must not break the buttons that stash a
// return address (hostile review, 2026-10-25: CREAR CUENTA did nothing).
import { describe, it, expect } from 'vitest'
import { setReturnUrl } from '../utils'

describe('setReturnUrl', () => {
  it('does not throw when storage is blocked', () => {
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('blocked') }
    try {
      expect(() => setReturnUrl('/explorar')).not.toThrow()
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})
