import { analytics } from './firebase'
import { logEvent } from 'firebase/analytics'
import { trackMeta, trackMetaCustom } from './metaPixel'

/**
 * The one place that knows when something meaningful happened on the site.
 *
 * It reports to two destinations: Google Analytics, which answers "what are
 * people doing", and the Meta pixel, which answers "did the money work". They
 * are deliberately fanned out from here rather than called separately at each
 * site — six call sites already exist across the app, and a second set beside
 * them would drift within a month. Add an event here and both destinations get
 * it; forget to, and neither does, which is at least honest.
 *
 * Meta only receives the four events that mean something commercially. It does
 * NOT receive logins, shares or errors: they would not help it find buyers, and
 * every event sent is data handed over for no return.
 *
 * Nothing here carries a name, an email, a phone number or a street address.
 */
export const AnalyticsLogger = {
  pageView: (pageName: string) =>
    logEvent(analytics, 'page_view', { page_title: pageName }),

  listingViewed: (listingId: string, district?: string) => {
    logEvent(analytics, 'listing_viewed', { listing_id: listingId })
    // Meta's standard event for "looked at one item". The district gives its
    // targeting something to work with; the listing id means nothing to Meta
    // but makes their reports readable against ours.
    trackMeta('ViewContent', {
      content_type: 'property',
      content_ids: [listingId],
      ...(district ? { content_category: district } : {}),
    })
  },

  listingCreated: (operationType: string) => {
    logEvent(analytics, 'listing_created', { operation_type: operationType })
    // The conversion that actually matters. Meta has no standard event for
    // "someone listed their house", so this is a custom one — custom events can
    // still be optimised towards, and an honest name beats forcing it into
    // "Purchase", which would put fictional revenue in the reports.
    trackMetaCustom('ListingPublished', { operation_type: operationType })
  },

  loginCompleted: (method: string) =>
    logEvent(analytics, 'login', { method }),

  registrationCompleted: () => {
    logEvent(analytics, 'sign_up')
    trackMeta('CompleteRegistration')
  },

  /**
   * Someone asked to see an owner's phone number or email.
   *
   * The strongest signal of genuine intent the site produces — it is the moment
   * a browser becomes a buyer. Worth more to ad targeting than a page view.
   */
  contactRevealed: (listingId: string) => {
    logEvent(analytics, 'contact_revealed', { listing_id: listingId })
    trackMeta('Contact', { content_type: 'property', content_ids: [listingId] })
  },

  shareListing: (listingId: string, method: string) =>
    logEvent(analytics, 'share_listing', {
      listing_id: listingId,
      share_method: method,
    }),

  errorOccurred: (errorMessage: string, componentName: string) =>
    logEvent(analytics, 'app_error', {
      error_message: errorMessage.slice(0, 100),
      component: componentName,
    }),
}
