// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

// VITE_RECAPTCHA_SITE_KEY is not set in the test environment, which means
// the module-level constant resolves to an empty string. Both exported
// functions check for this and return early — the tests below verify that
// early-return behaviour.

import { loadRecaptchaScript, getRecaptchaToken } from '../recaptcha'

describe('loadRecaptchaScript — no site key in test environment', () => {
  it('resolves immediately when VITE_RECAPTCHA_SITE_KEY is absent', async () => {
    await expect(loadRecaptchaScript()).resolves.toBeUndefined()
  })

  it('does not inject a <script> tag into the DOM', async () => {
    const before = document.querySelectorAll('script[src*="recaptcha"]').length
    await loadRecaptchaScript()
    const after = document.querySelectorAll('script[src*="recaptcha"]').length
    expect(after).toBe(before)
  })

  it('is safe to call multiple times without throwing', async () => {
    await expect(Promise.all([loadRecaptchaScript(), loadRecaptchaScript()])).resolves.toBeDefined()
  })
})

describe('getRecaptchaToken — no site key in test environment', () => {
  it('returns an empty string when VITE_RECAPTCHA_SITE_KEY is absent', async () => {
    const token = await getRecaptchaToken('login')
    expect(token).toBe('')
  })

  it('does not throw for any action name', async () => {
    await expect(getRecaptchaToken('submit_listing')).resolves.toBe('')
    await expect(getRecaptchaToken('')).resolves.toBe('')
  })
})
