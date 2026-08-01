import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { isTeamMemberEmail } from '@/app/features/team/teamRoster'

interface TeamGuardProps {
  children: React.ReactNode
}

/**
 * Gate for the internal team board at /app/equipo. Access is the roster in
 * `teamRoster.ts` — anyone on it can read AND write the whole board, by design.
 * The real enforcement lives in firestore.rules (`match /teamTasks/{taskId}`);
 * this only keeps the tab out of the UI.
 */
export default function TeamGuard({ children }: TeamGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isTeamMemberEmail(user?.email)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
