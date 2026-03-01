import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'

interface VerifiedGuardProps {
  children: React.ReactNode
}

export default function VerifiedGuard({ children }: VerifiedGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Redirect to pipeline if not fully verified
  if (user && (!user.name || !user.isPhoneVerified)) {
    return <Navigate to="/app/verify" replace />
  }

  return <>{children}</>
}
