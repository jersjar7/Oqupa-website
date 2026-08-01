import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Spinner } from '@/app/components/ui'

// Access lives in ONE place: src/app/features/access/people.ts
import { canAccess } from '@/app/features/access/people'

export function isAdminEmail(email: string | undefined | null): boolean {
  return canAccess(email, 'admin')
}

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAdminEmail(user?.email)) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
