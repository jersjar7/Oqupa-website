import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
import { getAnalytics } from 'firebase/analytics'
import { getPerformance } from 'firebase/performance'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// App Check must be initialized before any Firestore/Functions call so that
// attestation tokens are attached to outgoing requests. Gated on the site key
// being present so local dev without a key does not crash — in that case App
// Check-enforced callables (e.g. recordListingView) will fail closed, which is
// the intended behaviour.
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_APPCHECK_KEY
if (appCheckSiteKey) {
  // Enable debug tokens in dev so `firebase emulators` / local builds can still
  // exercise App-Check-enforced callables. Add the printed token to the Firebase
  // console → App Check → "Manage debug tokens" for the web app.
  if (import.meta.env.DEV) {
    ;(self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  } catch (err) {
    console.warn('[firebase] App Check init failed', err)
  }
}

export const db = getFirestore(app)
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
})

// Skip reCAPTCHA verification in development — phone auth uses test phone numbers
// configured in Firebase Console (Authentication → Phone numbers)
if (import.meta.env.DEV) {
  auth.settings.appVerificationDisabledForTesting = true
}
export const storage = getStorage(app)
export const functions = getFunctions(app, 'southamerica-east1')
export const analytics = getAnalytics(app)
export const performance = getPerformance(app)
