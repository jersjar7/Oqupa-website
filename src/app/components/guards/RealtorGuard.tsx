import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'

interface RealtorGuardProps {
  children: React.ReactNode
}

export default function RealtorGuard({ children }: RealtorGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user?.isVerifiedRealtor) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
