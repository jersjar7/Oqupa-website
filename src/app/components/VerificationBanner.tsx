import { Link, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const HIDDEN_PATHS = ['/app/verify', '/app/login', '/app/auth/complete', '/app/auth/set-password', '/app/forgot-password']

export default function VerificationBanner() {
  const location = useLocation()
  const { firebaseUser, user } = useAuthStore()

  if (!firebaseUser || !user) return null
  if (HIDDEN_PATHS.includes(location.pathname)) return null

  const missingName = !user.name
  const missingPhone = !user.isPhoneVerified

  if (!missingName && !missingPhone) return null

  let message: string
  if (missingName && missingPhone) {
    message = 'Completa tu nombre y verifica tu telefono para acceder a todas las funciones.'
  } else if (missingName) {
    message = 'Completa tu nombre para acceder a todas las funciones.'
  } else {
    message = 'Verifica tu telefono para acceder a todas las funciones.'
  }

  return (
    <div className="border-b border-warning/40 bg-warning/15 px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        <p className="flex-1 text-sm text-text-secondary">{message}</p>
        <Link
          to="/app/verify"
          className="shrink-0 text-sm font-medium text-secondary hover:text-secondary-hover"
        >
          Completar verificacion
        </Link>
      </div>
    </div>
  )
}
