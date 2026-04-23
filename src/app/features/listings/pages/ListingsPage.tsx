/**
 * Mis Propiedades — where the agent/owner actually works.
 *
 * IA (2026-04-22): this page holds only properties the user is RESPONSIBLE
 * for today.
 *
 *   - Propias:     listings I posted as the owner.
 *   - Asignadas:   listings where the owner picked me AND I accepted. I am
 *                  the working agent here.
 *
 * Pre-commitment pipeline states — claims waiting for a decision, pending
 * invitations — live on Oportunidades (`/app/leads`). They belong to the
 * funnel, not the work surface. A card moves here the moment the agent
 * clicks "Aceptar" on an invitation.
 *
 * Legacy `?tab=reclamadas` links (older dashboards or bookmarks) redirect
 * to the Oportunidades → En Espera tab.
 */
import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useUserListingsWithProperties } from '@/hooks/useListings'
import { useAgentAssignments } from '@/hooks/useRealtorLeads'
import { Button, Spinner, StaggerList, staggerItemVariants } from '@/app/components/ui'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import ListingCard from '@/app/features/dashboard/components/ListingCard'
import ListingCardSkeleton from '@/app/features/dashboard/components/ListingCardSkeleton'
import EmptyState from '@/app/features/dashboard/components/EmptyState'
import AgentAssignmentCard from '@/app/features/dashboard/components/AgentAssignmentCard'
import { isValidTab, filterAsignadasAccepted, type Tab } from './listingsHelpers'

export type { Tab }

const TAB_SUBTITLES: Record<Tab, string> = {
  propias:   'Listings que publicaste. Gestiónalos, destácalos y compártelos.',
  asignadas: 'Propiedades donde aceptaste ser el agente. Trabaja con el propietario para cerrar la venta o alquiler.',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ListingsPage() {
  const { user } = useAuthStore()
  const isVerifiedRealtor = !!user?.isVerifiedRealtor
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Legacy `?tab=reclamadas` → Oportunidades → En Espera. Run once on mount.
  useEffect(() => {
    if (searchParams.get('tab') === 'reclamadas') {
      navigate('/app/leads?tab=en-espera', { replace: true })
    }
  }, [searchParams, navigate])

  useSetPageMeta({
    title: 'Mis Propiedades',
    subtitle: isVerifiedRealtor
      ? 'Gestiona tus propias propiedades y las que administras como agente.'
      : 'Gestiona tus propiedades publicadas.',
  })

  const { data: items, isLoading, error } = useUserListingsWithProperties(user?.id)
  const agentAssignments = useAgentAssignments(isVerifiedRealtor ? user?.id : undefined)

  const tab: Tab = (() => {
    if (!isVerifiedRealtor) return 'propias'
    const fromUrl = searchParams.get('tab')
    return isValidTab(fromUrl) ? fromUrl : 'propias'
  })()
  const setTab = (next: Tab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'propias') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setSearchParams(nextParams, { replace: true })
  }

  // Asignadas shows only ACCEPTED assignments. Pending invitations moved to
  // Oportunidades → Invitaciones so they don't get lost among active work.
  const asignadas = useMemo(
    () => filterAsignadasAccepted(agentAssignments.data ?? []),
    [agentAssignments.data],
  )

  const propiasCount = items?.length ?? 0
  const asignadasCount = asignadas.length

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tab bar + page action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {isVerifiedRealtor ? (
          <TabBar
            tab={tab}
            onChange={setTab}
            counts={{ propias: propiasCount, asignadas: asignadasCount }}
          />
        ) : <div />}
        <Link to="/app/listings/new" className="sm:ml-auto self-end sm:self-auto">
          <Button>
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Crear Publicacion</span>
            <span className="sm:hidden">Crear</span>
          </Button>
        </Link>
      </div>

      {/* Educational subtitle — 1 line, changes with active tab */}
      {isVerifiedRealtor && (
        <p className="mt-3 text-sm text-text-secondary">
          {TAB_SUBTITLES[tab]}
        </p>
      )}

      {/* Panes */}
      {(!isVerifiedRealtor || tab === 'propias') && (
        <PropiasPane items={items} isLoading={isLoading} error={!!error} />
      )}

      {isVerifiedRealtor && tab === 'asignadas' && (
        <AsignadasPane
          isLoading={agentAssignments.isLoading}
          data={asignadas}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
function TabBar({
  tab, onChange, counts,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  counts: { propias: number; asignadas: number }
}) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar propiedades"
      className="flex items-center gap-1 border-b border-border overflow-x-auto"
    >
      <TabButton active={tab === 'propias'} onClick={() => onChange('propias')}>
        Propias <CountChip n={counts.propias} active={tab === 'propias'} />
      </TabButton>
      <TabButton active={tab === 'asignadas'} onClick={() => onChange('asignadas')}>
        Asignadas <CountChip n={counts.asignadas} active={tab === 'asignadas'} />
      </TabButton>
    </div>
  )
}

function TabButton({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      type="button"
      onClick={onClick}
      className={[
        'relative shrink-0 px-4 py-3 font-sans text-sm font-bold uppercase tracking-[1px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 rounded-sm',
        active ? 'text-secondary' : 'text-text-secondary hover:text-text-primary',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-2">{children}</span>
      {active && (
        <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-secondary rounded-full" />
      )}
    </button>
  )
}

function CountChip({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={[
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5',
        'text-[11px] font-bold tracking-normal',
        active ? 'bg-secondary/10 text-secondary' : 'bg-background-secondary text-text-tertiary',
      ].join(' ')}
    >
      {n}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Panes
// ---------------------------------------------------------------------------
function PropiasPane({
  items, isLoading, error,
}: {
  items: ReturnType<typeof useUserListingsWithProperties>['data']
  isLoading: boolean
  error: boolean
}) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </motion.div>
      ) : error ? (
        <motion.div
          key="error"
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-error">Error al cargar tus publicaciones</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-base text-secondary hover:text-secondary-hover"
          >
            Reintentar
          </button>
        </motion.div>
      ) : !items || items.length === 0 ? (
        <motion.div
          key="empty"
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <EmptyState />
        </motion.div>
      ) : (
        <StaggerList className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" key="content">
          {items.map(({ listing, property }) => (
            <motion.div key={listing.id} variants={staggerItemVariants} className="h-full">
              <ListingCard listing={listing} property={property} />
            </motion.div>
          ))}
        </StaggerList>
      )}
    </AnimatePresence>
  )
}

type AssignmentsData = NonNullable<ReturnType<typeof useAgentAssignments>['data']>

function AsignadasPane({
  isLoading, data,
}: {
  isLoading: boolean
  data: AssignmentsData
}) {
  if (isLoading) {
    return (
      <div className="mt-12 flex justify-center py-4">
        <Spinner size="md" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-border bg-background-secondary/40 p-8 text-center">
        <p className="font-serif text-[22px] text-text-primary">Aún no gestionas propiedades como agente</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">
          Las propiedades aparecen aquí cuando aceptas una invitación del propietario.
          Para recibir invitaciones, primero reclama una oportunidad en{' '}
          <Link to="/app/leads" className="font-medium text-secondary underline-offset-2 hover:underline">
            Oportunidades
          </Link>
          . Si el propietario te elige, verás la invitación en{' '}
          <Link to="/app/leads?tab=invitaciones" className="font-medium text-secondary underline-offset-2 hover:underline">
            Invitaciones
          </Link>
          {' '}y al aceptarla la propiedad se moverá aquí.
        </p>
        <Link
          to="/app/leads"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 font-sans text-sm font-bold uppercase tracking-[1px] text-white hover:bg-primary-hover"
        >
          Ver oportunidades
        </Link>
      </div>
    )
  }

  // AsignadasPane only renders ACCEPTED assignments — no accept/decline
  // actions here (those live on Oportunidades → Invitaciones).
  return (
    <StaggerList className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map(({ listing, property }) => (
        <motion.div key={listing.id} variants={staggerItemVariants} className="h-full">
          <AgentAssignmentCard listing={listing} property={property} />
        </motion.div>
      ))}
    </StaggerList>
  )
}
