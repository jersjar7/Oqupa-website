/**
 * Role-aware dashboard home at /app.
 *
 * Renders different KPI strips + quick actions depending on the user's
 * effective capabilities:
 *   - Owner (default): active listings, boosts, total views
 *   - Realtor: available opportunities, claims-this-month, agent status
 *   - Admin: prominent "review applications" CTA (no fake KPIs since
 *     pending-apps count would require a new Firestore query we haven't
 *     built yet — punted to a follow-up)
 *   - Dual-role (admin+realtor): both sections stacked
 *
 * The listings grid used to live here. It now has its own /app/listings
 * route (ListingsPage). From here you can navigate there via sidebar or
 * the Mis Anuncios quick-action below.
 */
import { Link } from 'react-router-dom'
import {
  Briefcase, Compass, FileBadge, Eye, Zap, Plus, CheckCircle, ClipboardList,
  ArrowUpRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUserListingsWithProperties } from '@/hooks/useListings'
import { useAvailableLeads, useClaimStatus } from '@/hooks/useRealtorLeads'
import { Card } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { capabilitiesFor, effectiveCapabilities } from '@/app/components/shell/capabilities'
import { useViewAs } from '@/app/components/shell/viewAsContext'
import StatCard from '../components/StatCard'

// ---------------------------------------------------------------------------
// Shared action-button styles matching the brand system (Gotham Bold,
// uppercase, letter-spacing). Kept local — the existing Button component
// uses the older rounded-full pill style.
// ---------------------------------------------------------------------------
const primaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold uppercase tracking-[1px] text-white ' +
  'transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
const secondaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-lg border-2 border-secondary px-5 text-sm font-bold uppercase tracking-[1px] text-secondary ' +
  'transition-colors hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40'

// ---------------------------------------------------------------------------
// Role-specific sections
// ---------------------------------------------------------------------------

function OwnerKpis({ userId }: { userId: string | undefined }) {
  const { data: items, isLoading } = useUserListingsWithProperties(userId)
  const listings = items ?? []
  const active = listings.filter(({ listing }) => listing.status === 'active').length
  const boosted = listings.filter(({ listing }) => listing.isBoosted).length
  const totalViews = listings.reduce((sum, { listing }) => sum + (listing.viewCount ?? 0), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Anuncios activos"
        value={isLoading ? '—' : active}
        sub={listings.length > active ? `${listings.length - active} en borrador o expirados` : undefined}
        icon={<Briefcase className="h-5 w-5 text-secondary" />}
        cta={{ label: 'Ver mis anuncios', to: '/app/listings' }}
      />
      <StatCard
        label="Boosts activos"
        value={isLoading ? '—' : boosted}
        sub={boosted > 0 ? 'Con mayor visibilidad en el mapa' : 'Activa uno para destacar'}
        icon={<Zap className="h-5 w-5 text-primary" />}
      />
      <StatCard
        label="Vistas totales"
        value={isLoading ? '—' : totalViews.toLocaleString('es-PE')}
        sub="Acumuladas en todos tus anuncios"
        icon={<Eye className="h-5 w-5 text-secondary" />}
      />
    </div>
  )
}

function OwnerActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link to="/app/listings/new" className={primaryBtn}>
        <Plus className="h-4 w-4" />
        Crear anuncio
      </Link>
      <Link to="/app/listings" className={secondaryBtn}>
        Ver mis anuncios
      </Link>
    </div>
  )
}

function RealtorKpis({ userId, isVerified }: { userId: string | undefined; isVerified: boolean }) {
  const leads = useAvailableLeads(!!userId && isVerified)
  const claimStatus = useClaimStatus()
  const availableCount = leads.data?.length ?? 0
  const claimsUsed = claimStatus.limit - claimStatus.remaining
  const claimsPct = claimStatus.limit > 0 ? (claimsUsed / claimStatus.limit) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Oportunidades nuevas"
        value={leads.isLoading ? '—' : availableCount}
        sub={availableCount > 0 ? 'Propiedades que buscan agente' : 'Revisa más tarde'}
        icon={<Compass className="h-5 w-5 text-secondary" />}
        cta={{ label: 'Ver oportunidades', to: '/app/leads' }}
      />
      <StatCard
        label="Claims este mes"
        value={`${claimsUsed}/${claimStatus.limit}`}
        sub={
          <div className="mt-2">
            {/* Simple inline progress bar */}
            <div className="h-1.5 w-full rounded-full bg-background-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, claimsPct))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              {claimStatus.remaining} reclamos disponibles
            </p>
          </div>
        }
        icon={<FileBadge className="h-5 w-5 text-secondary" />}
      />
      <StatCard
        label="Estado de agente"
        value={
          <span className="inline-flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-secondary" />
            {isVerified ? 'Verificado' : 'Pendiente'}
          </span>
        }
        sub={isVerified ? 'Acceso completo a oportunidades' : 'Revisa tu registro'}
        icon={<CheckCircle className="h-5 w-5 text-secondary" />}
      />
    </div>
  )
}

function RealtorActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link to="/app/leads" className={primaryBtn}>
        Ver oportunidades
      </Link>
      <Link to="/app/realtor-registration" className={secondaryBtn}>
        Actualizar mi registro
      </Link>
    </div>
  )
}

function AdminCta() {
  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-primary/15 grid place-items-center">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-sans text-lg font-medium text-text-primary">
            Aplicaciones de agentes pendientes
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Revisa y aprueba las solicitudes de nuevos agentes inmobiliarios.
          </p>
        </div>
        <Link to="/app/admin/applications" className={`${primaryBtn} shrink-0`}>
          Revisar
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Dashboard home
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuthStore()
  const rawCaps = capabilitiesFor(user)
  const { viewAs } = useViewAs()
  const effective = effectiveCapabilities(rawCaps, viewAs)

  const greeting = user?.name ? `¡Hola, ${user.name}!` : '¡Bienvenido!'
  const subtitle =
    effective.isAdmin && effective.isRealtor
      ? 'Resumen de tus aplicaciones pendientes y oportunidades del día.'
      : effective.isAdmin
        ? 'Revisa las aplicaciones pendientes y el estado general.'
        : effective.isRealtor
          ? 'Aquí están las oportunidades disponibles y tu actividad.'
          : 'Aquí está el resumen de tus anuncios.'

  useSetPageMeta({ title: greeting, subtitle })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Admin gets its CTA at the top — most urgent */}
      {effective.isAdmin && <AdminCta />}

      {/* Realtor section */}
      {effective.isRealtor && (
        <section className="space-y-4">
          {effective.isAdmin && (
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-[1.2px] text-text-secondary">
                Agente
              </h2>
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <RealtorKpis userId={user?.id} isVerified={!!user?.isVerifiedRealtor} />
          <RealtorActions />
        </section>
      )}

      {/* Owner section — always visible (property owners are the default user type) */}
      <section className="space-y-4">
        {(effective.isAdmin || effective.isRealtor) && (
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[1.2px] text-text-secondary">
              Mis propiedades
            </h2>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}
        <OwnerKpis userId={user?.id} />
        <OwnerActions />
      </section>
    </div>
  )
}
