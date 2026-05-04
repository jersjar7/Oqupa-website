import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'
import { consumeReturnUrl } from '@/lib/utils'

interface GuestGuardProps {
  children: React.ReactNode
}

export default function GuestGuard({ children }: GuestGuardProps) {
  const { firebaseUser, user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (firebaseUser) {
    const fullyVerified =
      firebaseUser.emailVerified && user?.name && user?.isPhoneVerified
    const destination = fullyVerified ? (consumeReturnUrl() ?? '/app') : '/app/verify'
    return <Navigate to={destination} state={{ from: location }} replace />
  }

  return <>{children}</>
}
