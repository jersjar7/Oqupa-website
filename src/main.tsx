import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { AnalyticsLogger } from '@/lib/analytics'

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
    </QueryClientProvider>
  </StrictMode>
)
