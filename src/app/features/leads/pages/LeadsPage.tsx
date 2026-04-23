/**
 * Oportunidades — the agent's pipeline from discovery to commitment.
 *
 * Three flat tabs:
 *   - Disponibles  — listings open for claim. Click to claim.
 *   - En Espera    — my claims where the owner is still deciding.
 *   - Invitaciones — owner picked me; I accept or decline here.
 *
 * Once the agent clicks "Aceptar" on an invitation, the claim resolves and
 * the listing moves to Mis Propiedades → Asignadas. The accept hook shows
 * a toast with a direct link to the new location.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import {
  useAvailableLeads, useClaimedLeads, useClaimLead, useClaimStatus,
  useAcceptAssignment, useDeclineAssignment, useAgentAssignments,
} from '@/hooks/useRealtorLeads'
import { Modal, Spinner, Button } from '@/app/components/ui'
import StaggerList, { staggerItemVariants } from '@/app/components/ui/StaggerList'
import ClaimLimitBanner from '../components/ClaimLimitBanner'
import LeadCard from '../components/LeadCard'
import ClaimedLeadCard from '../components/ClaimedLeadCard'
import AgentAssignmentCard from '@/app/features/dashboard/components/AgentAssignmentCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import { PROPERTY_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import {
  isValidLeadsTab, filterEnEspera, filterInvitaciones, type LeadsTab,
} from './leadsHelpers'

const TAB_SUBTITLES: Record<LeadsTab, string> = {
  'disponibles':  'Propiedades que buscan un agente. Revisa los detalles y reclama las que quieres trabajar.',
  'en-espera':    'Propiedades que reclamaste. El propietario está revisando a los agentes interesados y pronto elegirá uno.',
  'invitaciones': 'Propiedades donde el propietario te eligió. Acepta para gestionarlas, o rechaza si ya no te interesa.',
}

export default function LeadsPage() {
  const user = useAuthStore((s) => s.user)
  const isVerifiedRealtor = !!user?.isVerifiedRealtor
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: LeadsTab = (() => {
    const fromUrl = searchParams.get('tab')
    return isValidLeadsTab(fromUrl) ? fromUrl : 'disponibles'
  })()
  const setTab = (next: LeadsTab) => {
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'disponibles') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setSearchParams(nextParams, { replace: true })
  }

  const claimStatus = useClaimStatus()
  const availableLeads = useAvailableLeads(tab === 'disponibles')
  // Fetch claims + assignments unconditionally for verified realtors so tab
  // badges reflect the real count no matter which tab is active (prevents
  // the (0) → (N) flicker when switching to another tab and back).
  // React Query's cache key dedupes these with the tab-scoped reads.
  const claimedLeads = useClaimedLeads(isVerifiedRealtor ? user?.id : undefined)
  const agentAssignments = useAgentAssignments(isVerifiedRealtor ? user?.id : undefined)

  const invitationsCount = useMemo(
    () => filterInvitaciones(agentAssignments.data ?? []).length,
    [agentAssignments.data],
  )
  const enEsperaCount = useMemo(
    () => claimedLeads.data ? filterEnEspera(claimedLeads.data, user?.id ?? '').length : 0,
    [claimedLeads.data, user?.id],
  )

  useSetPageMeta({
    title: 'Oportunidades',
    subtitle: invitationsCount > 0
      ? `Tienes ${invitationsCount} ${invitationsCount === 1 ? 'invitación pendiente' : 'invitaciones pendientes'} que requieren tu atención.`
      : 'Descubre propiedades, reclama las que te interesan y acepta las invitaciones de los propietarios.',
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Claim-limit banner (only when the Disponibles tab is active — that's
          the only place where claim count is directly actionable) */}
      {tab === 'disponibles' && (
        <div className="mb-4">
          <ClaimLimitBanner
            used={claimStatus.limit - claimStatus.remaining}
            limit={claimStatus.limit}
          />
        </div>
      )}

      {/* Tab bar */}
      <TabBar
        tab={tab}
        onChange={setTab}
        counts={{
          'disponibles':  availableLeads.data?.length ?? 0,
          'en-espera':    enEsperaCount,
          'invitaciones': invitationsCount,
        }}
      />

      {/* Educational subtitle */}
      <p className="mt-3 text-sm text-text-secondary">
        {TAB_SUBTITLES[tab]}
      </p>

      {/* Panes */}
      <div className="mt-6">
        {tab === 'disponibles' && (
          <DisponiblesPane canClaim={claimStatus.canClaim} query={availableLeads} />
        )}
        {tab === 'en-espera' && (
          <EnEsperaPane userId={user?.id} query={claimedLeads} />
        )}
        {tab === 'invitaciones' && (
          <InvitacionesPane userId={user?.id} query={agentAssignments} />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
function TabBar({
  tab, onChange, counts,
}: {
  tab: LeadsTab
  onChange: (t: LeadsTab) => void
  counts: Record<LeadsTab, number>
}) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar oportunidades"
      className="flex items-center gap-1 border-b border-border overflow-x-auto"
    >
      <TabButton active={tab === 'disponibles'} onClick={() => onChange('disponibles')}>
        Disponibles <CountChip n={counts.disponibles} active={tab === 'disponibles'} />
      </TabButton>
      <TabButton active={tab === 'en-espera'} onClick={() => onChange('en-espera')}>
        En Espera <CountChip n={counts['en-espera']} active={tab === 'en-espera'} />
      </TabButton>
      <TabButton
        active={tab === 'invitaciones'}
        onClick={() => onChange('invitaciones')}
        urgent={counts.invitaciones > 0}
      >
        Invitaciones <CountChip n={counts.invitaciones} active={tab === 'invitaciones'} urgent={counts.invitaciones > 0} />
      </TabButton>
    </div>
  )
}

function TabButton({
  active, urgent, onClick, children,
}: {
  active: boolean
  urgent?: boolean
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
        active
          ? 'text-secondary'
          : urgent
            ? 'text-primary hover:text-primary-hover'
            : 'text-text-secondary hover:text-text-primary',
      ].join(' ')}
    >
      <span className="inline-flex items-center gap-2">{children}</span>
      {active && (
        <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-secondary rounded-full" />
      )}
    </button>
  )
}

function CountChip({ n, active, urgent }: { n: number; active: boolean; urgent?: boolean }) {
  const color = active
    ? 'bg-secondary/10 text-secondary'
    : urgent
      ? 'bg-primary text-white'
      : 'bg-background-secondary text-text-tertiary'
  return (
    <span
      className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tracking-normal ${color}`}
    >
      {n}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Disponibles pane — includes the claim-confirmation modal
// ---------------------------------------------------------------------------
function DisponiblesPane({
  canClaim, query,
}: {
  canClaim: boolean
  query: ReturnType<typeof useAvailableLeads>
}) {
  const user = useAuthStore((s) => s.user)
  const claimStatus = useClaimStatus()
  const claimLead = useClaimLead()
  const [confirmLead, setConfirmLead] = useState<{ listing: Listing; property: Property } | null>(null)

  function handleClaimConfirm() {
    if (!confirmLead || !user) return
    claimLead.mutate({
      listingId: confirmLead.listing.id,
      realtorId: user.id,
      listingOwnerId: confirmLead.listing.ownerId,
      realtorName: user.name ?? '',
      realtorPhone: user.contactInfo?.whatsappPhoneNumber ?? '',
      realtorBusinessName: user.realtorBusinessName ?? '',
    }, {
      onSuccess: () => setConfirmLead(null),
      onError:   () => setConfirmLead(null),
    })
  }

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-12"><Spinner size="lg" /></div>
    )
  }
  if (query.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
        <p className="text-red-700">Error al cargar las oportunidades.</p>
        <button onClick={() => query.refetch()} className="mt-2 text-sm font-medium text-primary hover:text-primary-hover">
          Reintentar
        </button>
      </div>
    )
  }
  if (!query.data || query.data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-12 text-center">
        <p className="font-serif text-[22px] text-text-primary">No hay oportunidades disponibles</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
          Cuando un propietario publica una propiedad y solicita ayuda de un agente,
          aparece aquí. Vuelve pronto — nuevas oportunidades aparecen frecuentemente.
        </p>
      </div>
    )
  }
  return (
    <>
      <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {query.data.map(({ listing, property }) => (
          <motion.div key={listing.id} variants={staggerItemVariants} className="h-full">
            <LeadCard
              listing={listing}
              property={property}
              canClaim={canClaim}
              onClaim={() => setConfirmLead({ listing, property })}
              isClaiming={claimLead.isPending && confirmLead?.listing.id === listing.id}
            />
          </motion.div>
        ))}
      </StaggerList>

      <Modal
        isOpen={!!confirmLead}
        onClose={() => !claimLead.isPending && setConfirmLead(null)}
        title="Reclamar oportunidad"
      >
        {confirmLead && (
          <div>
            <div className="rounded-xl border border-border bg-gray-50 p-3">
              <p className="font-bold text-primary">
                {CURRENCY_SYMBOLS[confirmLead.listing.price.currency as keyof typeof CURRENCY_SYMBOLS]}{' '}
                {confirmLead.listing.price.amount.toLocaleString('es-PE')}
                {(() => {
                  const suffix = getPriceSuffix(confirmLead.property.operationType, confirmLead.property.rentalDurationType)
                  return suffix ? <span className="text-sm font-normal text-text-secondary"> {suffix}</span> : null
                })()}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {PROPERTY_TYPE_LABELS[confirmLead.property.propertyType]} en {confirmLead.property.location.distrito}
              </p>
            </div>
            <p className="mt-4 text-sm text-text-secondary">
              Usarás <span className="font-bold">1</span> de{' '}
              <span className="font-bold">{claimStatus.remaining}</span> reclamaciones restantes este mes.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Tu reclamo aparecerá en <span className="font-medium">En Espera</span> hasta
              que el propietario decida. Si te elige, verás la invitación en{' '}
              <span className="font-medium">Invitaciones</span>.
            </p>
            <div className="mt-6 flex gap-3">
              <Button className="flex-1" onClick={handleClaimConfirm} isLoading={claimLead.isPending}>
                Confirmar
              </Button>
              <Button variant="text" className="flex-1" onClick={() => setConfirmLead(null)} disabled={claimLead.isPending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------------
// En Espera pane — claims waiting for owner decision
// ---------------------------------------------------------------------------
function EnEsperaPane({
  userId, query,
}: {
  userId: string | undefined
  query: ReturnType<typeof useClaimedLeads>
}) {
  const items = useMemo(
    () => (userId && query.data) ? filterEnEspera(query.data, userId) : [],
    [query.data, userId],
  )

  if (query.isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }
  if (query.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
        <p className="text-red-700">Error al cargar tus reclamos.</p>
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-12 text-center">
        <p className="font-serif text-[22px] text-text-primary">No tienes reclamos en espera</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
          Cuando reclamas una propiedad desde <span className="font-medium">Disponibles</span>,
          aparece aquí mientras el propietario revisa a los agentes interesados.
          Pueden pasar unas horas o varios días antes de que decida.
          Si te elige, la propiedad se moverá a <span className="font-medium">Invitaciones</span>.
        </p>
      </div>
    )
  }

  return (
    <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ claim, listing, property }) => (
        <motion.div key={claim.id} variants={staggerItemVariants} className="h-full">
          <ClaimedLeadCard claim={claim} listing={listing} property={property} />
        </motion.div>
      ))}
    </StaggerList>
  )
}

// ---------------------------------------------------------------------------
// Invitaciones pane — owner picked me, pending my accept/decline
// ---------------------------------------------------------------------------
function InvitacionesPane({
  userId, query,
}: {
  userId: string | undefined
  query: ReturnType<typeof useAgentAssignments>
}) {
  const items = useMemo(
    () => query.data ? filterInvitaciones(query.data) : [],
    [query.data],
  )
  const acceptAssignment = useAcceptAssignment()
  const declineAssignment = useDeclineAssignment()
  const [mutatingListingId, setMutatingListingId] = useState<string | null>(null)

  if (query.isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-12 text-center">
        <p className="font-serif text-[22px] text-text-primary">No tienes invitaciones pendientes</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
          Cuando un propietario te elige de entre los agentes que reclamaron su
          propiedad, aparece aquí una invitación. Al aceptarla, la propiedad se
          mueve a <Link to="/app/listings?tab=asignadas" className="font-medium text-secondary underline-offset-2 hover:underline">Mis Propiedades → Asignadas</Link>
          {' '}para que la gestiones.
        </p>
      </div>
    )
  }

  return (
    <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ listing, property }) => (
        <motion.div key={listing.id} variants={staggerItemVariants} className="h-full">
          <AgentAssignmentCard
            listing={listing}
            property={property}
            onAccept={() => {
              setMutatingListingId(listing.id)
              acceptAssignment.mutate(listing.id, {
                onSettled: () => setMutatingListingId(null),
              })
            }}
            onDecline={userId ? () => {
              setMutatingListingId(listing.id)
              declineAssignment.mutate({
                listingId: listing.id,
                currentDeclinedIds: listing.declinedRealtorIds ?? [],
                agentId: userId,
              }, { onSettled: () => setMutatingListingId(null) })
            } : undefined}
            isAccepting={acceptAssignment.isPending && mutatingListingId === listing.id}
            isDeclining={declineAssignment.isPending && mutatingListingId === listing.id}
          />
        </motion.div>
      ))}
    </StaggerList>
  )
}
