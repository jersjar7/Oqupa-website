import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useAvailableLeads, useClaimedLeads, useClaimLead, useClaimStatus, useAcceptAssignment, useDeclineAssignment } from '@/hooks/useRealtorLeads'
import { Modal, Spinner, Button } from '@/app/components/ui'
import StaggerList, { staggerItemVariants } from '@/app/components/ui/StaggerList'
import ClaimLimitBanner from '../components/ClaimLimitBanner'
import LeadCard from '../components/LeadCard'
import ClaimedLeadCard from '../components/ClaimedLeadCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import { PROPERTY_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'

type Tab = 'available' | 'claimed'

export default function LeadsPage() {
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<Tab>('available')
  const [confirmLead, setConfirmLead] = useState<{ listing: Listing; property: Property } | null>(null)

  const claimStatus = useClaimStatus()
  const availableLeads = useAvailableLeads(activeTab === 'available')
  const claimedLeads = useClaimedLeads(activeTab === 'claimed' ? user?.id : undefined)
  const claimLead = useClaimLead()
  const acceptAssignment = useAcceptAssignment()
  const declineAssignment = useDeclineAssignment()

  function handleClaimConfirm() {
    if (!confirmLead || !user) return

    claimLead.mutate(
      {
        listingId: confirmLead.listing.id,
        realtorId: user.id,
        listingOwnerId: confirmLead.listing.ownerId,
        realtorName: user.name ?? '',
        realtorPhone: user.contactInfo?.whatsappPhoneNumber ?? '',
        realtorBusinessName: user.realtorBusinessName ?? '',
      },
      {
        onSuccess: () => {
          setConfirmLead(null)
          setActiveTab('claimed')
        },
        onError: () => {
          setConfirmLead(null)
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title lives in the Topbar via DashboardShell */}

      {/* Claim limit banner */}
      <div className="mt-4">
        <ClaimLimitBanner used={claimStatus.limit - claimStatus.remaining} limit={claimStatus.limit} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        {(['available', 'claimed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {tab === 'available' ? 'Disponibles' : 'Reclamadas'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'available' && (
          <>
            {availableLeads.isLoading && (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            )}
            {availableLeads.isError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
                <p className="text-red-700">
                  Error al cargar las oportunidades.
                </p>
                <button
                  onClick={() => availableLeads.refetch()}
                  className="mt-2 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Reintentar
                </button>
              </div>
            )}
            {availableLeads.data && availableLeads.data.length === 0 && (
              <div className="rounded-2xl border border-border bg-white p-12 text-center">
                <p className="text-text-secondary">
                  No hay oportunidades disponibles en este momento.
                </p>
                <p className="mt-1 text-sm text-text-tertiary">
                  Vuelve pronto, nuevas oportunidades aparecen frecuentemente.
                </p>
              </div>
            )}
            {availableLeads.data && availableLeads.data.length > 0 && (
              <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableLeads.data.map(({ listing, property }) => (
                  <motion.div key={listing.id} variants={staggerItemVariants}>
                    <LeadCard
                      listing={listing}
                      property={property}
                      canClaim={claimStatus.canClaim}
                      onClaim={() => setConfirmLead({ listing, property })}
                      isClaiming={claimLead.isPending && confirmLead?.listing.id === listing.id}
                    />
                  </motion.div>
                ))}
              </StaggerList>
            )}
          </>
        )}

        {activeTab === 'claimed' && (
          <>
            {claimedLeads.isLoading && (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            )}
            {claimedLeads.isError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
                <p className="text-red-700">
                  Error al cargar las oportunidades reclamadas.
                </p>
                <button
                  onClick={() => claimedLeads.refetch()}
                  className="mt-2 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Reintentar
                </button>
              </div>
            )}
            {claimedLeads.data && claimedLeads.data.length === 0 && (
              <div className="rounded-2xl border border-border bg-white p-12 text-center">
                <p className="text-text-secondary">
                  Aun no has reclamado ninguna oportunidad.
                </p>
                <p className="mt-1 text-sm text-text-tertiary">
                  Ve a la pestana "Disponibles" para encontrar propiedades.
                </p>
              </div>
            )}
            {claimedLeads.data && claimedLeads.data.length > 0 && (
              <StaggerList className="flex flex-col gap-4">
                {claimedLeads.data.map(({ claim, listing, property }) => {
                  const isPending = listing.assignedRealtorId === claim.realtorId && listing.assignmentStatus === 'pending_acceptance'
                  return (
                    <motion.div key={claim.id} variants={staggerItemVariants}>
                      <ClaimedLeadCard
                        claim={claim}
                        listing={listing}
                        property={property}
                        onAccept={isPending ? () => acceptAssignment.mutate(listing.id) : undefined}
                        onDecline={isPending && user ? () => declineAssignment.mutate({
                          listingId: listing.id,
                          currentDeclinedIds: listing.declinedRealtorIds ?? [],
                          agentId: user.id,
                        }) : undefined}
                        isAccepting={acceptAssignment.isPending}
                        isDeclining={declineAssignment.isPending}
                      />
                    </motion.div>
                  )
                })}
              </StaggerList>
            )}
          </>
        )}
      </div>

      {/* Claim confirmation modal */}
      <Modal
        isOpen={!!confirmLead}
        onClose={() => !claimLead.isPending && setConfirmLead(null)}
        title="Reclamar oportunidad"
      >
        {confirmLead && (
          <div>
            {/* Property preview */}
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
              Usaras <span className="font-bold">1</span> de{' '}
              <span className="font-bold">{claimStatus.remaining}</span> reclamaciones restantes
              este mes.
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Al reclamar, podras ver la informacion de contacto del propietario.
            </p>

            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                onClick={handleClaimConfirm}
                isLoading={claimLead.isPending}
              >
                Confirmar
              </Button>
              <Button
                variant="text"
                className="flex-1"
                onClick={() => setConfirmLead(null)}
                disabled={claimLead.isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
