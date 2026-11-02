import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  newPublishId,
  propertyIdFor,
  listingIdFor,
  photoFingerprints,
} from '../publishIdentity'
import { withTimeout, TimeoutError } from '../withTimeout'

describe('publish identity', () => {
  it('keeps the website id shape: <ms>_<7 chars>', () => {
    expect(newPublishId(1730000000000)).toMatch(/^1730000000000_[a-z0-9]{7}$/)
  })

  it('two drafts get different identities', () => {
    expect(newPublishId(1)).not.toBe(newPublishId(1))
  })

  it('names the property and the listing from the one identity', () => {
    expect(propertyIdFor('123_abcdefg')).toBe('property_123_abcdefg')
    expect(listingIdFor('123_abcdefg')).toBe('listing_123_abcdefg')
  })
})

describe('photoFingerprints', () => {
  const f = (name: string, size: number, lastModified = 5) =>
    new File(['x'.repeat(size)], name, { lastModified })

  it('is stable for the same files', () => {
    const files = [f('a.jpg', 3), f('b.jpg', 4)]
    expect(photoFingerprints(files)).toEqual(photoFingerprints([...files]))
  })

  it('tells the same file chosen twice apart', () => {
    const [a, b] = photoFingerprints([f('a.jpg', 3), f('a.jpg', 3)])
    expect(a).not.toBe(b)
  })
})

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers())

  it('passes the result through when in time', async () => {
    await expect(withTimeout(Promise.resolve(7), 100)).resolves.toBe(7)
  })

  it('rejects with TimeoutError and calls onTimeout when too slow', async () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const p = withTimeout(new Promise(() => {}), 30000, 'photo', onTimeout)
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(30000)
    await assertion
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('passes a rejection through unchanged', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom')
  })
})
