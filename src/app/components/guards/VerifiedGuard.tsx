import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'

interface VerifiedGuardProps {
  children: React.ReactNode
}

export default function VerifiedGuard({ children }: VerifiedGuardProps) {
  const { user, firebaseUser, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Redirect to pipeline until email + name + phone are all verified.
  // Email verification is non-negotiable: an unverified email blocks the
  // dashboard the same way an unset name or unverified phone does.
  const needsPipeline =
    (firebaseUser && !firebaseUser.emailVerified) ||
    !user?.name ||
    !user?.isPhoneVerified
  if (needsPipeline) {
    return <Navigate to="/app/verify" replace />
  }

  return <>{children}</>
}
