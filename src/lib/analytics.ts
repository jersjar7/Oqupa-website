import { analytics } from './firebase'
import { logEvent } from 'firebase/analytics'
import { trackMeta, trackMetaCustom } from './metaPixel'
import { trackTikTok } from './tiktokPixel'

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
    trackTikTok('ViewContent', {
      content_type: 'product',
      content_id: listingId,
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
    trackTikTok('ListingPublished', { operation_type: operationType })
  },

  loginCompleted: (method: string) =>
    logEvent(analytics, 'login', { method }),

  registrationCompleted: () => {
    logEvent(analytics, 'sign_up')
    trackMeta('CompleteRegistration')
    trackTikTok('CompleteRegistration')
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
    trackTikTok('Contact', { content_type: 'product', content_id: listingId })
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
