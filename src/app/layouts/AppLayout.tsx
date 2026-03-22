import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Spinner } from '@/app/components/ui'
import UserMenu from '@/components/layout/UserMenu'
import logo from '@/assets/images/Oqupa_FullLogo_multicolor.webp'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, firebaseUser, isInitialized } = useAuthStore()

  const isAuthPage =
    location.pathname === '/app/login' ||
    location.pathname === '/app/login/password' ||
    location.pathname === '/app/auth/complete' ||
    location.pathname === '/app/forgot-password'

  async function handleLogout() {
    await authService.logout()
    navigate('/app/login')
  }

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
      <header className="border-b border-border bg-[#FFFAF5]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Oqupa" className="h-12" />
          </Link>

          {/* Auth-aware nav */}
          {!isAuthPage && (
            <nav className="flex items-center gap-3">
              {firebaseUser ? (
                <UserMenu
                  userName={user?.name ?? user?.email ?? '...'}
                  items={[
                    ...(location.pathname !== '/app/profile'
                      ? [
                          {
                            label: 'Mi Perfil',
                            icon: <User className="h-4 w-4" />,
                            to: '/app/profile',
                          },
                        ]
                      : []),
                    ...(location.pathname === '/app/profile' || location.pathname !== '/app'
                      ? [
                          {
                            label: 'Mis Publicaciones',
                            icon: <Home className="h-4 w-4" />,
                            to: '/app',
                          },
                        ]
                      : []),
                    {
                      label: 'Cerrar Sesion',
                      icon: <LogOut className="h-4 w-4" />,
                      onClick: handleLogout,
                      className: 'text-error',
                    },
                  ]}
                />
              ) : (
                <Link
                  to="/app/login"
                  className="inline-flex h-12 items-center rounded-full border-[1.5px] border-secondary px-6 text-base font-bold uppercase text-secondary transition-colors hover:border-secondary-hover hover:text-secondary-hover"
                >
                  Iniciar Sesion
                </Link>
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
