import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Spinner } from '@/app/components/ui'
import logo from '@/assets/images/Oqupa_FullLogo_multicolor.webp'

export default function AppLayout() {
  const location = useLocation()
  const { user, firebaseUser, isInitialized, initialize } = useAuthStore()

  // Initialize auth listener on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  const isAuthPage =
    location.pathname === '/app/login' ||
    location.pathname === '/app/register' ||
    location.pathname === '/app/forgot-password'

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to={firebaseUser ? '/app' : '/'} className="flex items-center">
            <img src={logo} alt="Oqupa" className="h-8" />
          </Link>

          {/* Auth-aware nav */}
          {!isAuthPage && (
            <nav className="flex items-center gap-3">
              {firebaseUser && user ? (
                <UserMenu userName={user.name ?? user.email} />
              ) : firebaseUser ? (
                // Logged in but no Firestore doc yet (mid-registration)
                <UserMenu userName="..." />
              ) : (
                <>
                  <Link
                    to="/app/login"
                    className="text-base text-secondary transition-colors hover:text-secondary-hover"
                  >
                    Iniciar Sesion
                  </Link>
                  <Link
                    to="/app/register"
                    className="inline-flex h-12 items-center rounded-full border-[1.5px] border-secondary px-6 text-base font-bold uppercase text-secondary transition-colors hover:border-secondary-hover hover:text-secondary-hover"
                  >
                    Crear Cuenta
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}

function UserMenu({ userName }: { userName: string }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await authService.logout()
    navigate('/app/login')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-black/5"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </div>
        <span className="hidden sm:inline">{userName}</span>
        <ChevronDown className="h-4 w-4 text-text-tertiary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-white py-1 shadow-medium">
          <Link
            to="/app/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-black/5"
          >
            <User className="h-4 w-4" />
            Mi Perfil
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error transition-colors hover:bg-error/5"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesion
          </button>
        </div>
      )}
    </div>
  )
}
