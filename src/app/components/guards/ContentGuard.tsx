import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { isMarketingMemberEmail } from '@/app/features/team/teamRoster'

interface ContentGuardProps {
  children: React.ReactNode
}

/**
 * Gate for the marketing content calendar at /app/contenido.
 *
 * Checks the MARKETING team specifically, not "is on the roster at all" — a
 * developer must not see the marketing calendar and a marketing person must not
 * see the developer board. Real enforcement is in firestore.rules
 * (`match /contentLinks/{linkId}`); this only keeps the tab out of the UI.
 */
export default function ContentGuard({ children }: ContentGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isMarketingMemberEmail(user?.email)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
