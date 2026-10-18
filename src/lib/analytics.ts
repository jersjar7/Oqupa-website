import { analytics } from './firebase'
import { logEvent, setUserProperties } from 'firebase/analytics'
import { trackMeta, trackMetaCustom } from './metaPixel'
import { trackTikTok } from './tiktokPixel'
import { PropertyType, type Currency } from '@/types/enums'

// ── Shared contract with the Flutter app ────────────────────────────────────
// Every name and fixed value below matches oqupa/lib/utils/analytics_logger.dart.
// Both surfaces report into the same GA property, so a value spelled
// differently here splits one moment into two numbers that never add up.

/** How a listing claim attempt ended. Sent as `claim_attempted.result`. */
export type ClaimAttemptResult = 'ok' | 'limit_reached' | 'full' | 'duplicate' | 'error'

/** Where a boost offer was shown. Sent as `boost_offer_viewed.placement`. */
export type BoostOfferPlacement = 'create' | 'edit' | 'reminder'

/** Who tapped "contact". Sent as `contact_tapped.auth_state`. */
export type ContactTapAuthState = 'guest' | 'unverified' | 'verified'

/** Card shape on `share_listing_branded.card_format`, as in the app. */
export type ShareCardFormat = 'story' | 'square'

/**
 * How a share left the page, sent as `share_method`. Website-only: the app
 * has one way to share, so its events carry no method.
 */
export type LinkShareMethod = 'native' | 'clipboard'
export type CardShareMethod = 'native' | 'download'

/** Firebase-only extras on `listing_viewed` and `contact_revealed`. */
export interface ListingSegmentParams {
  district?: string | null
  propertyType?: PropertyType | null
  /** Must come from {@link priceBandFor}; anything else is dropped. */
  priceBand?: string | null
  priceCurrency?: Currency | null
}

/** The filter set shared by `filter_applied` and `search_no_results`. */
export interface FilterSetParams {
  filterType: string
  operationType?: string | null
  propertyTypes?: readonly PropertyType[] | null
  rentalDuration?: string | null
  minPricePen?: number | null
  maxPricePen?: number | null
  minPriceUsd?: number | null
  maxPriceUsd?: number | null
}

// Firebase limits. Longer values are truncated by Firebase or the event is
// rejected outright, so they are cut here where it is visible.
const MAX_PARAM_VALUE_LENGTH = 100
const MAX_USER_PROPERTY_VALUE_LENGTH = 36

type ParamValue = string | number | null | undefined

/** Drops null/undefined and cuts strings, so no call site has to. */
function cleanParams(params: Record<string, ParamValue>): Record<string, string | number> {
  const cleaned: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue
    cleaned[key] = typeof value === 'string' ? value.slice(0, MAX_PARAM_VALUE_LENGTH) : value
  }
  return cleaned
}

/**
 * One console line per event or user property, dev builds only.
 *
 * `oqupa-staging` has no Google Analytics property, so in dev this line is the
 * only way to see that an event left at the right moment with the right
 * params. Same format as the app's `_printInDebug`. Production builds print
 * nothing.
 */
function printInDev(line: string) {
  if (import.meta.env.DEV) console.debug(`Analytics: ${line}`)
}

/** Every Firebase event goes through here, so every one gets its dev line. */
function sendFirebaseEvent(name: string, params?: Record<string, string | number>) {
  printInDev(`${name} ${JSON.stringify(params ?? {})}`)
  if (params) logEvent(analytics, name, params)
  else logEvent(analytics, name)
}

/**
 * Firebase-only send. Nothing that goes through here reaches Meta or TikTok;
 * the ad platforms get only the four events below that call them by hand.
 */
function logFirebaseEvent(name: string, params: Record<string, ParamValue> = {}) {
  const cleaned = cleanParams(params)
  sendFirebaseEvent(name, Object.keys(cleaned).length === 0 ? undefined : cleaned)
}

/**
 * Lower edges of the price bands, in the listing's own currency.
 *
 * Shared with the app: both must cut prices at the same edges or the bands do
 * not add up across platforms. Wide on purpose — an exact price identifies a
 * listing nearly as well as its address does.
 */
const PRICE_BAND_LOWER_EDGES = [
  0, 500, 1000, 1500, 2000, 3000, 5000, 10000, 20000, 50000, 100000, 200000, 500000,
] as const

/** The band label for `price`, e.g. `1000-1500`, or `500000+` at the top. */
export function priceBandFor(price: number): string | undefined {
  if (!Number.isFinite(price) || price < 0) return undefined
  for (let i = PRICE_BAND_LOWER_EDGES.length - 1; i >= 0; i--) {
    const lower = PRICE_BAND_LOWER_EDGES[i]!
    if (price >= lower) {
      return i === PRICE_BAND_LOWER_EDGES.length - 1
        ? `${lower}+`
        : `${lower}-${PRICE_BAND_LOWER_EDGES[i + 1]}`
    }
  }
  return undefined
}

const VALID_PRICE_BANDS = new Set(PRICE_BAND_LOWER_EDGES.map((edge) => priceBandFor(edge)!))
const VALID_CURRENCIES = new Set<string>(['PEN', 'USD'])
const VALID_PROPERTY_TYPES = new Set<string>(Object.values(PropertyType))

/**
 * `price_band` and `price_currency`, sent as a pair or not at all.
 *
 * A band means nothing without its currency (S/ 1,000 rent and $1,000 are
 * different markets), so half a pair is dropped rather than misread.
 */
function priceBandParams(priceBand?: string | null, priceCurrency?: Currency | null) {
  if (!priceBand || !priceCurrency) return {}
  if (!VALID_PRICE_BANDS.has(priceBand) || !VALID_CURRENCIES.has(priceCurrency)) return {}
  return { price_band: priceBand, price_currency: priceCurrency }
}

/** The stored value (`casa`, `departamento`), or undefined for anything else. */
function storedPropertyType(value?: string | null): PropertyType | undefined {
  return value && VALID_PROPERTY_TYPES.has(value) ? (value as PropertyType) : undefined
}

/**
 * Same rule as `normalizeCategoryKey` in functions/lib/metrics-helpers.js and
 * `normalizeDistrict` in the app: trim, collapse whitespace, lower-case, then
 * capitalise each run of letters. Owners type districts by hand, and without
 * this "Sullana" and "sullana" become two districts. Keep all three in step.
 */
export function normalizeDistrict(raw?: string | null): string | undefined {
  const collapsed = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!collapsed) return undefined
  return collapsed
    .toLowerCase()
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1))
}

function listingSegmentParams(extras: ListingSegmentParams = {}) {
  return {
    district: normalizeDistrict(extras.district),
    property_type: storedPropertyType(extras.propertyType),
    ...priceBandParams(extras.priceBand, extras.priceCurrency),
  }
}

/**
 * `property_types` is sorted and comma-joined so the same selection always
 * produces the same string. Price bounds are what the user typed into the
 * filter, not any listing's price.
 */
function filterSetParams(filters: FilterSetParams): Record<string, ParamValue> {
  const propertyTypes = (filters.propertyTypes ?? [])
    .filter((type) => VALID_PROPERTY_TYPES.has(type))
    .sort()
  const hasPenRange = filters.minPricePen != null || filters.maxPricePen != null
  const hasUsdRange = filters.minPriceUsd != null || filters.maxPriceUsd != null
  // Follows the ranges actually set. The filter allows both at once (OR
  // logic), and then neither single currency would be true.
  const currencies = [hasPenRange && 'PEN', hasUsdRange && 'USD'].filter(Boolean)
  return {
    filter_type: filters.filterType,
    operation_type: filters.operationType,
    property_types: propertyTypes.length ? propertyTypes.join(',') : undefined,
    rental_duration: filters.rentalDuration,
    min_price_pen: filters.minPricePen,
    max_price_pen: filters.maxPricePen,
    min_price_usd: filters.minPriceUsd,
    max_price_usd: filters.maxPriceUsd,
    price_currency: currencies.length ? currencies.join(',') : undefined,
  }
}

/**
 * The one place that knows when something meaningful happened on the site.
 *
 * It reports to three destinations: Google Analytics, which answers "what are
 * people doing", and the Meta and TikTok pixels, which answer "did the money
 * work". They are deliberately fanned out from here rather than called
 * separately at each site — six call sites already exist across the app, and a
 * second set beside them would drift within a month. Add an event here and
 * every destination gets it; forget to, and none does, which is at least
 * honest.
 *
 * The ad platforms receive only the four events that mean something
 * commercially, and both receive the SAME four, so their numbers can be
 * compared without reconciling two definitions. Neither gets logins, shares or
 * errors: those would not help either platform find buyers, and every event
 * sent is data handed over for no return.
 *
 * Nothing here carries a name, an email, a phone number or a street address.
 */
export const AnalyticsLogger = {
  pageView: (pageName: string) =>
    sendFirebaseEvent('page_view', { page_title: pageName }),

  /**
   * `district` (second argument) is Meta/TikTok's `content_category`, raw as
   * before. The `extras` are Firebase-only and carry their own normalised
   * district, so adding them never changes what the ad platforms receive.
   */
  listingViewed: (
    listingId: string,
    district?: string,
    extras: ListingSegmentParams & { operationType?: string | null } = {},
  ) => {
    logFirebaseEvent('listing_viewed', {
      listing_id: listingId,
      operation_type: extras.operationType,
      ...listingSegmentParams(extras),
    })
    // Meta's standard event for "looked at one item". The district gives its
    // targeting something to work with; the listing id means nothing to Meta
    // but makes their reports readable against ours.
    trackMeta('ViewContent', {
      content_type: 'property',
      content_ids: [listingId],
      ...(district ? { content_category: district } : {}),
    })
    trackTikTok('ViewContent', {
      content_type: 'product',
      content_id: listingId,
      ...(district ? { content_category: district } : {}),
    })
  },

  listingCreated: (operationType: string) => {
    sendFirebaseEvent('listing_created', { operation_type: operationType })
    // The conversion that actually matters. Meta has no standard event for
    // "someone listed their house", so this is a custom one — custom events can
    // still be optimised towards, and an honest name beats forcing it into
    // "Purchase", which would put fictional revenue in the reports.
    trackMetaCustom('ListingPublished', { operation_type: operationType })
    trackTikTok('ListingPublished', { operation_type: operationType })
  },

  loginCompleted: (method: string) =>
    sendFirebaseEvent('login', { method }),

  /**
   * `campaign` and `refListingId` say where a new account came from (the
   * campaign tag, and the listing that was open at sign-up). Firebase-only:
   * the ad platforms still receive a bare CompleteRegistration. The app puts
   * these on `auth_step_completed`; the website keeps its `sign_up` event.
   */
  registrationCompleted: (
    extras: { campaign?: string | null; refListingId?: string | null } = {},
  ) => {
    logFirebaseEvent('sign_up', {
      campaign: extras.campaign,
      ref_listing_id: extras.refListingId,
    })
    trackMeta('CompleteRegistration')
    trackTikTok('CompleteRegistration')
  },

  /**
   * Someone asked to see an owner's phone number or email.
   *
   * The strongest signal of genuine intent the site produces — it is the moment
   * a browser becomes a buyer. Worth more to ad targeting than a page view.
   *
   * The `extras` are Firebase-only, as in `listingViewed`.
   */
  contactRevealed: (listingId: string, extras: ListingSegmentParams = {}) => {
    logFirebaseEvent('contact_revealed', {
      listing_id: listingId,
      ...listingSegmentParams(extras),
    })
    trackMeta('Contact', { content_type: 'property', content_ids: [listingId] })
    trackTikTok('Contact', { content_type: 'product', content_id: listingId })
  },

  /** A link share. Firebase-only, like `share_listing` in the app. */
  shareListing: (listingId: string, operationType: string, method: LinkShareMethod) =>
    logFirebaseEvent('share_listing', {
      listing_id: listingId,
      operation_type: operationType,
      share_method: method,
    }),

  /** A branded image card share. Firebase-only, like the app's event of the same name. */
  shareListingBranded: (
    listingId: string,
    operationType: string,
    cardFormat: ShareCardFormat,
    method: CardShareMethod,
  ) =>
    logFirebaseEvent('share_listing_branded', {
      listing_id: listingId,
      operation_type: operationType,
      card_format: cardFormat,
      share_method: method,
    }),

  errorOccurred: (errorMessage: string, componentName: string) =>
    sendFirebaseEvent('app_error', {
      error_message: errorMessage.slice(0, 100),
      component: componentName,
    }),

  // ── Firebase-only events (metrics plan A0) ────────────────────────────────
  // None of these reach Meta or TikTok. They answer product questions, and
  // the privacy policy lists only the four events above as shared.

  realtorApplicationStarted: () => logFirebaseEvent('realtor_application_started'),

  realtorApplicationSubmitted: () => logFirebaseEvent('realtor_application_submitted'),

  claimAttempted: (listingId: string, result: ClaimAttemptResult) =>
    logFirebaseEvent('claim_attempted', { listing_id: listingId, result }),

  boostOfferViewed: (placement: BoostOfferPlacement) =>
    logFirebaseEvent('boost_offer_viewed', { placement }),

  boostTierSelected: (tier: string) => logFirebaseEvent('boost_tier_selected', { tier }),

  boostCheckoutAbandoned: (tier: string, step: string) =>
    logFirebaseEvent('boost_checkout_abandoned', { tier, step }),

  /**
   * The tap on "contact", before any gate. Compare with `contact_revealed` to
   * see how many are lost on the way.
   */
  contactTapped: (listingId: string, authState: ContactTapAuthState) =>
    logFirebaseEvent('contact_tapped', { listing_id: listingId, auth_state: authState }),

  contactGateStep: (step: string) => logFirebaseEvent('contact_gate_step', { step }),

  /**
   * `code` is the error code (e.g. `permission-denied`), never the message,
   * which can quote the user's own input back.
   */
  contactRevealFailed: (listingId: string, code: string) =>
    logFirebaseEvent('contact_reveal_failed', { listing_id: listingId, code }),

  filterApplied: (filters: FilterSetParams & { resultCount?: number | null }) =>
    logFirebaseEvent('filter_applied', {
      ...filterSetParams(filters),
      result_count: filters.resultCount,
    }),

  /** A filter combination that matched nothing — demand the supply misses. */
  searchNoResults: (filters: FilterSetParams) =>
    logFirebaseEvent('search_no_results', filterSetParams(filters)),

  /**
   * User properties for segmenting audiences in GA.
   *
   * A property left out is not touched: only the ones given are sent, and
   * Firebase merges them into what it already has. `isRealtor` goes as the
   * string "true" or "false", because user properties are strings.
   */
  setUserProperties: (props: {
    userSegment?: string | null
    homeDistrict?: string | null
    isRealtor?: boolean | null
  }) => {
    const values: Record<string, string> = {}
    if (props.userSegment != null) values.user_segment = props.userSegment
    // Normalised like the event `district`, so audiences and events segment
    // on the same spelling. Blank is omitted rather than sent empty.
    const homeDistrict = normalizeDistrict(props.homeDistrict)
    if (homeDistrict) values.home_district = homeDistrict
    if (props.isRealtor != null) values.is_realtor = String(props.isRealtor)
    if (Object.keys(values).length === 0) return
    for (const key of Object.keys(values)) {
      values[key] = values[key]!.slice(0, MAX_USER_PROPERTY_VALUE_LENGTH)
      printInDev(`${key} ${values[key]}`)
    }
    setUserProperties(analytics, values)
  },
}
