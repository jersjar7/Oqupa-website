import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
// Access for /app/numbers lives in ONE place — edit that file, not this one.
import { canAccess } from '@/app/features/access/people'

export function isMetricsAllowedEmail(email: string | undefined | null): boolean {
  return canAccess(email, 'metrics')
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
