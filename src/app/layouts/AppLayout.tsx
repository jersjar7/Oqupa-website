import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, LogOut, User, Briefcase, Clock, CreditCard, ShieldCheck, Star } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { isAdminEmail } from '@/app/components/guards/AdminGuard'
import { Spinner } from '@/app/components/ui'
import PageTransition from '@/app/components/ui/PageTransition'
import UserMenu from '@/components/layout/UserMenu'
import VerificationBanner from '@/app/components/VerificationBanner'
import logo from '@/assets/images/Oqupa_FullLogo_multicolor.webp'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, firebaseUser, isInitialized } = useAuthStore()

  // Pages wrapped in AppLayout: login/forgot/set-password/auth-complete and
  // the verification pipeline (/app/verify). All of them should hide the
  // auth-aware nav — either because the user isn't logged in yet or because
  // they're in a self-contained onboarding flow. The dashboard/authenticated
  // area uses DashboardShell instead.
  const isAuthPage =
    location.pathname === '/app/login' ||
    location.pathname === '/app/auth/complete' ||
    location.pathname === '/app/auth/set-password' ||
    location.pathname === '/app/forgot-password' ||
    location.pathname === '/app/verify'

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
      <header className="relative z-50 border-b border-border bg-[#FFFAF5]/95 backdrop-blur-xl">
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
                    // Payment history menu item
                    {
                      label: 'Mis Pagos',
                      icon: <CreditCard className="h-4 w-4" />,
                      to: '/app/payments',
                    },
                    // Admin menu item
                    ...(isAdminEmail(user?.email)
                      ? [
                          {
                            label: 'Solicitudes de Agentes',
                            icon: <ShieldCheck className="h-4 w-4" />,
                            to: '/app/admin/applications',
                          },
                        ]
                      : []),
                    // Verified realtor menu item
                    ...(user?.isVerifiedRealtor
                      ? [
                          {
                            label: 'Oportunidades',
                            icon: <Star className="h-4 w-4" />,
                            to: '/app/leads',
                          },
                        ]
                      : []),
                    // Realtor registration menu item
                    ...(!user?.isVerifiedRealtor && user?.realtorApplicationStatus !== 'pending'
                      ? [
                          {
                            label: 'Registrate como Agente',
                            icon: <Briefcase className="h-4 w-4" />,
                            to: '/app/realtor-registration',
                          },
                        ]
                      : []),
                    ...(user?.realtorApplicationStatus === 'pending'
                      ? [
                          {
                            label: 'Solicitud en Revision',
                            icon: <Clock className="h-4 w-4" />,
                            to: '/app/realtor-registration',
                            className: 'text-text-tertiary',
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

      <VerificationBanner />

      {/* Page content */}
      <main className="flex flex-1 flex-col">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
