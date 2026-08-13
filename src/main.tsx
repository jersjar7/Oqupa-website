import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import { AnalyticsLogger } from '@/lib/analytics'
import { initErrorBuffer } from '@/lib/errorBuffer'
import { initMetaPixel } from '@/lib/metaPixel'
import { captureAttribution } from '@/lib/attribution'

// Buffer recent client errors so the /reportar form can auto-attach them.
initErrorBuffer()

// Record how this visit arrived BEFORE anything can navigate and rewrite the
// URL — the campaign tags live in the address bar and are gone once React
// Router replaces it.
captureAttribution()

// Production only; see metaPixel.ts.
initMetaPixel()

// Catch unhandled errors outside React
window.addEventListener('error', (event) => {
  AnalyticsLogger.errorOccurred(event.message, 'window.onerror')
})

window.addEventListener('unhandledrejection', (event) => {
  AnalyticsLogger.errorOccurred(String(event.reason), 'unhandledrejection')
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
