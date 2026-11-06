import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import { AnalyticsLogger } from '@/lib/analytics'
import { initErrorBuffer } from '@/lib/errorBuffer'
import { initMetaPixel } from '@/lib/metaPixel'
import { initTikTokPixel } from '@/lib/tiktokPixel'
import { applyAnalyticsAccount } from '@/lib/analyticsSuppression'
import { auth } from '@/lib/firebase'
import { captureAttribution } from '@/lib/attribution'
import { watchDraftOwner } from '@/stores/draftOwnerWatch'

// Buffer recent client errors so the /reportar form can auto-attach them.
initErrorBuffer()

// Record how this visit arrived BEFORE anything can navigate and rewrite the
// URL — the campaign tags live in the address bar and are gone once React
// Router replaces it.
captureAttribution()
// A different account signing in on this tab never inherits the publishing
// draft (hostile review of the wizard fixes, #1).
watchDraftOwner()

// Production only; see metaPixel.ts / tiktokPixel.ts. Both wait until
// Firebase says who is signed in, and never load for a team account (ADR-050).
initMetaPixel()
initTikTokPixel()

// Settle "is a team account signed in?" as soon as the saved session is read,
// independent of when the auth store starts listening. Events held until then
// are sent, or dropped for a team account. authStore keeps it current after.
auth
  .authStateReady()
  .then(() => applyAnalyticsAccount(auth.currentUser?.email ?? null))
  .catch(() => applyAnalyticsAccount(null))

// Catch unhandled errors outside React
window.addEventListener('error', (event) => {
  AnalyticsLogger.errorOccurred(event.message, 'window.onerror')
})

window.addEventListener('unhandledrejection', (event) => {
  AnalyticsLogger.errorOccurred(String(event.reason), 'unhandledrejection')
})

// After a deploy, a tab still running the previous release can ask for a code
// file that no longer exists. Reload once to pick up the new release instead
// of leaving a blank screen. The timestamp stops a reload loop if the file is
// genuinely missing in the new release too.
const RELOAD_KEY = 'oqupa:preload-reload-at'
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            fontFamily: "'Gotham', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            borderRadius: '12px',
          },
          className: 'shadow-medium',
        }}
        richColors
        closeButton
      />
    </QueryClientProvider>
  </StrictMode>
)
