import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import VerificationBanner from '@/app/components/VerificationBanner'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomTabs from './BottomTabs'
import { capabilitiesFor, effectiveCapabilities } from './capabilities'
import { useViewAs, ViewAsProvider } from './viewAsContext'
import { PageMetaProvider, usePageMeta } from './pageMetaContext'

// Default title/subtitle per route — pages can override via useSetPageMeta().
function defaultMetaForPath(pathname: string): { title: string; subtitle?: string } {
  if (pathname === '/app')                              return { title: 'Dashboard' }
  if (pathname.startsWith('/app/listings'))             return { title: 'Mis anuncios',  subtitle: 'Gestiona tus propiedades publicadas.' }
  if (pathname === '/app/payments')                     return { title: 'Pagos',         subtitle: 'Historial de compras y reembolsos.' }
  if (pathname === '/app/profile')                      return { title: 'Mi perfil',     subtitle: 'Información personal y configuración de cuenta.' }
  if (pathname === '/app/leads')                        return { title: 'Oportunidades', subtitle: 'Propiedades que buscan un agente.' }
  if (pathname.startsWith('/app/leads/'))               return { title: 'Detalle de oportunidad' }
  if (pathname === '/app/realtor-registration')         return { title: 'Mi registro de agente' }
  if (pathname === '/app/admin/applications')           return { title: 'Aplicaciones de agentes', subtitle: 'Revisa y aprueba solicitudes pendientes.' }
  if (pathname === '/app/verify')                       return { title: 'Verificación',  subtitle: 'Completa la verificación de tu cuenta.' }
  return { title: 'Oqupa' }
}

/**
 * Chrome for the authenticated /app area: persistent sidebar (desktop) /
 * bottom tabs (mobile) + sticky topbar. Content renders via <Outlet />.
 *
 * Children pages call `useSetPageMeta` to override the topbar title.
 */
function DashboardShellInner() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const rawCaps = capabilitiesFor(user)
  const { viewAs } = useViewAs()
  const effective = effectiveCapabilities(rawCaps, viewAs)

  const meta = usePageMeta()

  async function handleLogout() {
    await authService.logout()
    navigate('/app/login')
  }

  const userName = user?.name ?? user?.email ?? 'Invitado'
  const roleLabel =
    rawCaps.isAdmin && rawCaps.isRealtor ? 'Admin · Agente' :
    rawCaps.isAdmin                      ? 'Admin' :
    rawCaps.isRealtor                    ? 'Agente' :
                                            'Usuario'

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex bg-background">
        <Sidebar
          caps={effective}
          userName={userName}
          roleLabel={roleLabel}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar title={meta.title} subtitle={meta.subtitle} caps={rawCaps} />
          <VerificationBanner />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomTabs caps={effective} />
    </div>
  )
}

export default function DashboardShell() {
  const location = useLocation()
  const initial = defaultMetaForPath(location.pathname)
  return (
    <ViewAsProvider>
      <PageMetaProvider initial={initial}>
        <DashboardShellInner />
      </PageMetaProvider>
    </ViewAsProvider>
  )
}
