import { analytics } from './firebase'
import { logEvent } from 'firebase/analytics'

export const AnalyticsLogger = {
  pageView: (pageName: string) =>
    logEvent(analytics, 'page_view', { page_title: pageName }),

  listingViewed: (listingId: string) =>
    logEvent(analytics, 'listing_viewed', { listing_id: listingId }),

  listingCreated: (operationType: string) =>
    logEvent(analytics, 'listing_created', { operation_type: operationType }),

  loginCompleted: (method: string) =>
    logEvent(analytics, 'login', { method }),

  registrationCompleted: () =>
    logEvent(analytics, 'sign_up'),

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
