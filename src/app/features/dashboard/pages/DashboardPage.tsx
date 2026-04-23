/**
 * Role-aware dashboard home at /app.
 *
 * Renders different KPI strips + quick actions depending on the user's
 * effective capabilities:
 *   - Owner (default): active listings, boosts, total views
 *   - Realtor: available opportunities, claims-this-month, agent status
 *   - Admin: prominent "review applications" CTA with live pending count
 *   - Dual-role (admin+realtor): both sections stacked
 *
 * Per UX critique 2026-04-22:
 *   - Primary action moved to the right of each section header (eye terminus)
 *   - "Actualizar mi registro" hidden for verified realtors (dead-end page)
 *   - Sub-lines enriched with deltas/urgency signals (expiring listings,
 *     monthly boost spend, leads published in last 24h, claim reset date)
 *   - Subtitle adapts to actual state instead of static copy
 *   - "Vistas totales" gets an empty-state hint when 0
 *   - Notification bell removed (no payload yet)
 *   - "Última actividad" feed appended at the bottom
 */
import { Link } from 'react-router-dom'
import {
  Briefcase, Compass, FileBadge, Eye, Zap, CheckCircle, ClipboardList,
  ArrowUpRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUserListingsWithProperties } from '@/hooks/useListings'
import { useAvailableLeads, useClaimStatus, useAgentAssignments } from '@/hooks/useRealtorLeads'
import { usePendingRealtorApplicationsCount } from '@/hooks/useAdmin'
import { useUserBoostPayments } from '@/hooks/useBoost'
import { filterInvitaciones } from '@/app/features/leads/pages/leadsHelpers'
import { Card } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import { capabilitiesFor, effectiveCapabilities } from '@/app/components/shell/capabilities'
import { useViewAs } from '@/app/components/shell/viewAsContext'
import StatCard from '../components/StatCard'
import RecentActivity from '../components/RecentActivity'
import {
  nextClaimResetText, countExpiringSoon, countPublishedSince,
  spendThisMonthSoles, buildSubtitle,
} from './dashboardHelpers'

// ---------------------------------------------------------------------------
// Action button styles — Gotham Bold, uppercase, brand letter-spacing.
// ---------------------------------------------------------------------------
const primaryBtn =
  'inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-sans text-sm font-bold uppercase tracking-[1px] text-white ' +
  'transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
const sectionLink =
  'inline-flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-[1px] text-secondary ' +
  'hover:text-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 rounded-sm'

// ---------------------------------------------------------------------------
// Section header with right-aligned action — guides the eye left → right.
// ---------------------------------------------------------------------------
function SectionHeader({
  label, action,
}: {
  label: string
  action?: { label: string; to: string }
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-sans text-xs font-bold uppercase tracking-[1.2px] text-text-secondary">
        {label}
      </h2>
      <span className="h-px flex-1 bg-border" />
      {action && (
        <Link to={action.to} className={sectionLink}>
          {action.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Owner KPIs — listings, boosts, views
// ---------------------------------------------------------------------------
function OwnerKpis({ userId }: { userId: string | undefined }) {
  const { data: items, isLoading } = useUserListingsWithProperties(userId)
  const { data: payments } = useUserBoostPayments(userId)
  const listings = items ?? []
  const active = listings.filter(({ listing }) => listing.status === 'active').length
  const boosted = listings.filter(({ listing }) => listing.isBoosted).length
  const totalViews = listings.reduce((sum, { listing }) => sum + (listing.viewCount ?? 0), 0)
  const expiringSoon = countExpiringSoon(listings)
  const monthlySpend = spendThisMonthSoles(payments)

  const activeSub = expiringSoon > 0
    ? `${expiringSoon} ${expiringSoon === 1 ? 'caduca' : 'caducan'} en menos de 7 días`
    : listings.length > active
      ? `${listings.length - active} en borrador o expirados`
      : listings.length === 0
        ? 'Crea tu primer anuncio para empezar'
        : undefined

  const boostedSub = (() => {
    const ratio = listings.length > 0 ? `${boosted} de ${listings.length} anuncios` : 'Activa uno para destacar'
    const spend = monthlySpend > 0 ? ` · S/ ${monthlySpend.toFixed(2)} este mes` : ''
    return boosted > 0 || monthlySpend > 0 ? ratio + spend : 'Activa uno para destacar'
  })()

  const viewsSub = totalViews > 0
    ? 'Acumuladas en todos tus anuncios'
    : active > 0
      ? 'Comparte tus anuncios para empezar a recibir vistas'
      : 'Crea tu primer anuncio para empezar'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Anuncios activos"
        value={isLoading ? '—' : active}
        sub={activeSub}
        tone={expiringSoon > 0 ? 'warning' : 'default'}
        icon={<Briefcase className="h-6 w-6 text-secondary" />}
      />
      <StatCard
        label="Boosts activos"
        value={isLoading ? '—' : boosted}
        sub={boostedSub}
        icon={<Zap className="h-6 w-6 text-primary" />}
      />
      <StatCard
        label="Vistas totales"
        value={isLoading ? '—' : totalViews.toLocaleString('es-PE')}
        sub={viewsSub}
        icon={<Eye className="h-6 w-6 text-secondary" />}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Realtor KPIs — leads, claims, status
// ---------------------------------------------------------------------------
function RealtorKpis({ userId, isVerified }: { userId: string | undefined; isVerified: boolean }) {
  const leads = useAvailableLeads(!!userId && isVerified)
  const claimStatus = useClaimStatus()
  const availableCount = leads.data?.length ?? 0
  const claimsUsed = claimStatus.limit - claimStatus.remaining
  const claimsPct = claimStatus.limit > 0 ? (claimsUsed / claimStatus.limit) * 100 : 0
  const newIn24h = leads.data ? countPublishedSince(leads.data, 24) : 0

  const oportunidadesSub = availableCount === 0
    ? 'Revisa más tarde'
    : newIn24h > 0
      ? `${newIn24h} ${newIn24h === 1 ? 'nueva' : 'nuevas'} en las últimas 24h`
      : 'Propiedades que buscan agente'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        label="Oportunidades nuevas"
        value={leads.isLoading ? '—' : availableCount}
        sub={oportunidadesSub}
        icon={<Compass className="h-6 w-6 text-secondary" />}
      />
      <StatCard
        label="Claims este mes"
        value={`${claimsUsed}/${claimStatus.limit}`}
        sub={
          <div className="mt-1">
            <div className="h-1.5 w-full rounded-full bg-background-secondary overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, claimsPct))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              {claimStatus.remaining} reclamos disponibles · {nextClaimResetText().toLowerCase()}
            </p>
          </div>
        }
        icon={<FileBadge className="h-6 w-6 text-secondary" />}
        cta={claimsUsed > 0 ? { label: 'Ver en espera', to: '/app/leads?tab=en-espera' } : undefined}
      />
      <StatCard
        label="Estado de agente"
        value={isVerified ? 'Verificado' : 'Pendiente'}
        sub={isVerified ? 'Acceso completo a oportunidades' : 'Revisa tu registro'}
        icon={<CheckCircle className="h-6 w-6 text-secondary" />}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin CTA — pending applications headline + count
// ---------------------------------------------------------------------------
function AdminCta({ enabled }: { enabled: boolean }) {
  const { data: pendingCount, isLoading } = usePendingRealtorApplicationsCount(enabled)

  const headingText =
    isLoading ? 'Aplicaciones de agentes' :
    pendingCount === 0 ? 'No hay aplicaciones pendientes' :
    pendingCount === 1 ? '1 aplicación de agente pendiente' :
    `${pendingCount} aplicaciones de agentes pendientes`

  const hasPending = !isLoading && (pendingCount ?? 0) > 0

  return (
    <Card className={hasPending ? 'border-2 border-primary/30 bg-primary/5' : undefined}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <ClipboardList className={`h-8 w-8 shrink-0 ${hasPending ? 'text-primary' : 'text-text-secondary'}`} />
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg font-normal text-text-primary">
            {headingText}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {hasPending
              ? 'Revisa y aprueba las solicitudes de nuevos agentes inmobiliarios.'
              : 'Revisa el historial o vuelve cuando haya nuevas solicitudes.'}
          </p>
        </div>
        <Link to="/app/admin/applications" className={`${primaryBtn} shrink-0`}>
          {hasPending ? 'Revisar' : 'Ver todas'}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Invitaciones CTA — pending agent invitations that need accept/decline.
// Rendered above the realtor KPI row only when count > 0; time-sensitive.
// ---------------------------------------------------------------------------
function InvitacionesCta({ userId, enabled }: { userId: string | undefined; enabled: boolean }) {
  const { data } = useAgentAssignments(enabled ? userId : undefined)
  const count = data ? filterInvitaciones(data).length : 0
  if (count === 0) return null

  const headingText = count === 1
    ? 'Tienes 1 invitación pendiente'
    : `Tienes ${count} invitaciones pendientes`

  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Briefcase className="h-8 w-8 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg font-normal text-text-primary">
            {headingText}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Un propietario te eligió como agente. Acepta para empezar a gestionar la propiedad o rechaza si ya no te interesa.
          </p>
        </div>
        <Link to="/app/leads?tab=invitaciones" className={`${primaryBtn} shrink-0`}>
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

  // Data needed for the subtitle (peek without re-fetching from child components)
  const pendingApps = usePendingRealtorApplicationsCount(rawCaps.isAdmin)
  const leads = useAvailableLeads(!!user?.id && !!user?.isVerifiedRealtor && effective.isRealtor)

  const greeting = user?.name ? `¡Hola, ${user.name}!` : '¡Bienvenido!'
  const subtitle = buildSubtitle({
    isAdmin: effective.isAdmin,
    isRealtor: effective.isRealtor,
    pendingApps: pendingApps.data,
    pendingAppsLoading: pendingApps.isLoading && rawCaps.isAdmin,
    availableLeads: leads.data?.length,
    leadsLoading: leads.isLoading,
  })

  useSetPageMeta({ title: greeting, subtitle })

  // Realtor section's right-side action: "Actualizar mi registro" only if NOT verified;
  // verified realtors have nothing to update on that page (dead-end), so we hide it.
  const realtorSectionAction = !user?.isVerifiedRealtor
    ? { label: 'Actualizar mi registro', to: '/app/realtor-registration' }
    : { label: 'Ver oportunidades', to: '/app/leads' }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Admin gets its CTA at the top — most urgent. Query only fires when
          the viewer is actually an admin (never during view-as). Empty-state
          card stays visible — knowing "nothing to review" is still useful. */}
      {effective.isAdmin && <AdminCta enabled={rawCaps.isAdmin} />}

      {/* Pending realtor invitations — only rendered when count > 0 so the
          dashboard isn't noisy for agents with nothing waiting. */}
      {effective.isRealtor && (
        <InvitacionesCta
          userId={user?.id}
          enabled={!!user?.isVerifiedRealtor && effective.isRealtor}
        />
      )}

      {/* Realtor section */}
      {effective.isRealtor && (
        <section className="space-y-4">
          <SectionHeader label="Agente" action={realtorSectionAction} />
          <RealtorKpis userId={user?.id} isVerified={!!user?.isVerifiedRealtor} />
        </section>
      )}

      {/* Owner section — always visible (property owners are the default user type) */}
      <section className="space-y-4">
        <SectionHeader
          label="Mis propiedades"
          action={{ label: '+ Crear anuncio', to: '/app/listings/new' }}
        />
        <OwnerKpis userId={user?.id} />
      </section>

      {/* Recent activity — derived from existing data sources (listings, payments,
          assignments). Lightweight first pass — see RecentActivity component. */}
      <section className="space-y-4">
        <SectionHeader label="Última actividad" />
        <RecentActivity
          userId={user?.id}
          isRealtor={effective.isRealtor && !!user?.isVerifiedRealtor}
        />
      </section>

      {/* Hidden hooks reference — keeps the imported hooks "used" when the
          dashboard is in pure-owner mode. The agentAssignments cache is
          warmed for the verified-realtor case via RecentActivity below. */}
      <PrefetchAssignments
        userId={user?.id}
        enabled={effective.isRealtor && !!user?.isVerifiedRealtor}
      />
    </div>
  )
}

// Tiny helper to keep useAgentAssignments cache warm without rendering
// duplicate UI here. Used both by the activity feed and any later widgets.
function PrefetchAssignments({ userId, enabled }: { userId: string | undefined; enabled: boolean }) {
  useAgentAssignments(enabled ? userId : undefined)
  return null
}
