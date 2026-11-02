// ADR-014: listings never expire. A listing still carrying the old `expired`
// status reads as "Desactivado" with the neutral dot (audit 2026-11-02, E).
import { describe, it, expect } from 'vitest'
import { LISTING_STATUS_LABELS } from '@/types/enums'
import { LISTING_STATUS_TONE } from '../listingStatusTone'

describe('expired status', () => {
  it('reads Desactivado, neutral', () => {
    expect(LISTING_STATUS_LABELS.expired).toBe('Desactivado')
    expect(LISTING_STATUS_TONE.expired).toBe('neutral')
  })
})
