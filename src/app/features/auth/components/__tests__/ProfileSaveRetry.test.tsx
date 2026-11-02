// @vitest-environment jsdom
// Second review 2026-11-02, item 2: leaving the "Reintentar" page lets go of
// the page hold and asks the store to repair the profile, so the person is
// never stuck with an account that has none.
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

const ensureProfile = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ ensureProfile }) } }))
vi.mock('../../lib/createEmailAccount', () => ({ retryNewProfile: vi.fn() }))

import ProfileSaveRetry from '../ProfileSaveRetry'
import { accountCreation } from '@/lib/accountCreation'

describe('ProfileSaveRetry', () => {
  it('on leaving: releases the page hold and runs the repair', () => {
    accountCreation.begin()
    const { unmount } = render(<ProfileSaveRetry onDone={() => {}} />)
    unmount()
    expect(accountCreation.isInFlight()).toBe(false)
    expect(ensureProfile).toHaveBeenCalled()
  })
})
