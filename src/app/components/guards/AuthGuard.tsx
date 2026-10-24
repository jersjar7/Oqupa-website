import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { loginUrlAfterEmailChange, pendingEmailChange } from '@/lib/emailChange'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { firebaseUser, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!firebaseUser) {
    // Someone waiting on the email step who just confirmed a corrected address
    // ("Cámbialo"): that confirmation ended the session. Say so, with the new
    // email filled in, instead of a bare sign-in screen.
    const changedTo = location.pathname === '/app/verify' ? pendingEmailChange() : null
    if (changedTo) return <Navigate to={loginUrlAfterEmailChange(changedTo)} replace />
    return <Navigate to="/app/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
