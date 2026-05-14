import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'

// Internal team allowlist for the /app/numbers metrics dashboard.
// Mirror this list in firestore.rules under match /publicMetrics/{date}.
const METRICS_ALLOWED_EMAILS = [
  'admin@oqupa.com',
  'becjanmor@gmail.com',
  'ed.rafaelbarbosa@gmail.com',
  'hrn.mv11@gmail.com',
  'kadenthecanadian@gmail.com',
  'landerjabar@gmail.com',
  'libardo.pico26@gmail.com',
]

export function isMetricsAllowedEmail(email: string | undefined | null): boolean {
  return !!email && METRICS_ALLOWED_EMAILS.includes(email.toLowerCase())
}

interface MetricsGuardProps {
  children: React.ReactNode
}

export default function MetricsGuard({ children }: MetricsGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isMetricsAllowedEmail(user?.email)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
