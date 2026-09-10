import { describe, it, expect } from 'vitest'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../appStoreLinks'

describe('app store links', () => {
  it('APP_STORE_URL is a valid Apple App Store URL', () => {
    expect(APP_STORE_URL).toMatch(/^https:\/\/apps\.apple\.com\//)
    // Contains the app id
    expect(APP_STORE_URL).toContain('6758535934')
  })

  it('GOOGLE_PLAY_URL is a valid Google Play URL', () => {
    expect(GOOGLE_PLAY_URL).toMatch(/^https:\/\/play\.google\.com\//)
    expect(GOOGLE_PLAY_URL).toContain('com.oqupa.app')
  })

  it('both URLs use HTTPS', () => {
    expect(APP_STORE_URL.startsWith('https://')).toBe(true)
    expect(GOOGLE_PLAY_URL.startsWith('https://')).toBe(true)
  })
})
