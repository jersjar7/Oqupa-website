// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { attributionForListing, captureAttribution, __testing } from '../attribution'

/**
 * Attribution decides whether a published listing can be traced to an ad. Every
 * failure mode here is silent: the listing still publishes, the site still
 * works, and the answer to "did the money work" is quietly wrong.
 *
 * So these tests pin the behaviour that has no visible symptom — first touch
 * surviving later visits, an empty revisit not erasing a paid click, and the
 * click identifier never reaching our database.
 */

function visit(url: string, referrer = ''): void {
  const parsed = new URL(url)
  Object.defineProperty(window, 'location', {
    value: { search: parsed.search, pathname: parsed.pathname, hostname: parsed.hostname },
    writable: true,
  })
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true })
  captureAttribution()
}

describe('attribution', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('records a campaign arriving from an ad', () => {
    visit('https://oqupa.com/?utm_source=facebook&utm_medium=paid&utm_campaign=castilla-agosto&fbclid=abc123')

    const record = attributionForListing()
    expect(record).toMatchObject({
      firstSource: 'facebook',
      firstMedium: 'paid',
      firstCampaign: 'castilla-agosto',
      firstWasPaidClick: 'true',
    })
  })

  it('never stores the click identifier itself', () => {
    visit('https://oqupa.com/?fbclid=THIS_IDENTIFIES_A_PERSON')

    // fbclid is Meta's handle for an individual. Recording that it existed is
    // the useful part; keeping the value would put an advertising identifier in
    // our own database for no benefit.
    expect(JSON.stringify(attributionForListing())).not.toContain('THIS_IDENTIFIES_A_PERSON')
    expect(attributionForListing()).toMatchObject({ firstWasPaidClick: 'true' })
  })

  it('keeps the FIRST touch when the person comes back later', () => {
    visit('https://oqupa.com/?utm_source=facebook&utm_campaign=castilla-agosto&fbclid=abc')
    visit('https://oqupa.com/explorar?utm_source=google&utm_campaign=brand')

    const record = attributionForListing()
    // The ad earned the discovery; the later search earned only the return trip.
    // Crediting the last touch would show the ad producing nothing.
    expect(record).toMatchObject({
      firstSource: 'facebook',
      firstCampaign: 'castilla-agosto',
      lastSource: 'google',
      lastCampaign: 'brand',
    })
  })

  it('a plain revisit with no campaign does not erase how they arrived', () => {
    visit('https://oqupa.com/?utm_source=facebook&utm_campaign=castilla-agosto')
    visit('https://oqupa.com/explorar') // typed the address, no tags, no referrer

    // This is the common case: click the ad on Monday, return on Thursday by
    // typing the name. If the empty visit overwrote the record, every listing
    // would look organic and paid advertising would appear to do nothing.
    expect(attributionForListing()).toMatchObject({
      firstSource: 'facebook',
      lastSource: 'facebook',
    })
  })

  it('infers the channel when a link carries no campaign tags', () => {
    visit('https://oqupa.com/', 'https://l.facebook.com/')

    // Most real traffic is untagged — shared links, bios, reposts. "Came from
    // Facebook" beats "unknown" when the question is recruited vs organic.
    expect(attributionForListing()).toMatchObject({ firstSource: 'facebook' })
  })

  it('ignores internal navigation as a source', () => {
    visit('https://oqupa.com/explorar', 'https://oqupa.com/')

    // Moving between our own pages is not an arrival.
    expect(attributionForListing()).toBeNull()
  })

  it('gives nothing rather than something wrong when there is no signal', () => {
    visit('https://oqupa.com/')
    expect(attributionForListing()).toBeNull()
  })

  it('forgets a first touch older than the window', () => {
    visit('https://oqupa.com/?utm_source=facebook&utm_campaign=old')

    const stored = JSON.parse(window.localStorage.getItem(__testing.STORAGE_KEY)!)
    const tooOld = new Date(Date.now() - (__testing.FIRST_TOUCH_TTL_DAYS + 1) * 86_400_000)
    stored.first.at = tooOld.toISOString()
    window.localStorage.setItem(__testing.STORAGE_KEY, JSON.stringify(stored))

    // Crediting a listing to an ad seen four months ago is a fiction.
    expect(attributionForListing()).toBeNull()
  })

  it('survives storage being unavailable', () => {
    const original = window.localStorage.setItem
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceeded / private browsing')
    }

    // Safari private mode and locked-down browsers throw here. Measurement must
    // never be the reason someone cannot publish a property.
    expect(() => visit('https://oqupa.com/?utm_source=facebook')).not.toThrow()

    window.localStorage.setItem = original
  })
})
