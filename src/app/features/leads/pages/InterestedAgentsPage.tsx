import { useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useListingDetails } from '@/hooks/useListings'
import { useListingClaims, useAssignRealtor } from '@/hooks/useRealtorLeads'
import { Modal, Spinner, Button, Badge } from '@/app/components/ui'
import RealtorClaimCard from '../components/RealtorClaimCard'
import { PROPERTY_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import type { RealtorClaim } from '@/types/realtorClaim'

export default function InterestedAgentsPage() {
  const { id: listingId } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const [confirmAssign, setConfirmAssign] = useState<RealtorClaim | null>(null)

  const listingDetails = useListingDetails(listingId)
  const listing = listingDetails.data?.listing
  const property = listingDetails.data?.property

  const claims = useListingClaims(
    listing?.ownerId === user?.id ? user?.id : undefined,
    listingId,
  )
  const assignRealtor = useAssignRealtor()

  // Loading state
  if (listingDetails.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  // Not found or not owner
  if (!listing || !property || listing.ownerId !== user?.id) {
    return <Navigate to="/app" replace />
  }

  function handleAssignConfirm() {
    if (!confirmAssign || !listingId) return

    assignRealtor.mutate(
      {
        listingId,
        realtorId: confirmAssign.realtorId,
        realtorPhone: confirmAssign.realtorPhone,
      },
      {
        onSuccess: () => setConfirmAssign(null),
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis Publicaciones
      </Link>

      {/* Header */}
      <h1 className="mt-4 font-sans text-[28px] font-medium text-text-primary">
        Agentes Interesados
      </h1>

      {/* Listing summary */}
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-light">
        {property.media.thumbnailPhotoUrls?.[0] || property.media.propertyPhotoUrls[0] ? (
          <img
            src={property.media.thumbnailPhotoUrls?.[0] ?? property.media.propertyPhotoUrls[0]}
            alt={listing.description}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-text-tertiary">
            Sin foto
          </div>
        )}
        <div>
          <p className="font-bold text-primary">
            {CURRENCY_SYMBOLS[listing.price.currency as keyof typeof CURRENCY_SYMBOLS]}{' '}
            {listing.price.amount.toLocaleString('es-PE')}
            {(() => {
              const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
              return suffix ? <span className="text-sm font-normal text-text-secondary"> {suffix}</span> : null
            })()}
          </p>
          <p className="text-sm text-text-secondary">
            {PROPERTY_TYPE_LABELS[property.propertyType]} en {property.location.distrito}
          </p>
        </div>
      </div>

      {/* Listing stats */}
      <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {listing.viewCount} vistas
        </span>
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {listing.contactClickCount ?? 0} contactos
        </span>
      </div>

      {/* Assigned realtor banner */}
      {listing.assignedRealtorId && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="info">Agente asignado</Badge>
            <span className="text-sm text-text-secondary">
              {claims.data?.find((c) => c.realtorId === listing.assignedRealtorId)?.realtorName ?? 'Agente'}
            </span>
          </div>
        </div>
      )}

      {/* Claims count */}
      <p className="mt-6 text-sm text-text-secondary">
        {claims.data?.length ?? 0} de {listing.maxRealtors} agentes han reclamado esta oportunidad
      </p>

      {/* Claims list */}
      <div className="mt-4">
        {claims.isLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}

        {claims.data && claims.data.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-text-secondary">
              Aun no hay agentes interesados.
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              Los agentes inmobiliarios verificados podran reclamar esta oportunidad.
            </p>
          </div>
        )}

        {claims.data && claims.data.length > 0 && (
          <div className="flex flex-col gap-3">
            {claims.data.map((claim) => (
              <RealtorClaimCard
                key={claim.id}
                claim={claim}
                isAssigned={listing.assignedRealtorId === claim.realtorId}
                hasAssignedRealtor={!!listing.assignedRealtorId}
                onAssign={() => setConfirmAssign(claim)}
                isAssigning={assignRealtor.isPending && confirmAssign?.id === claim.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Assign confirmation modal */}
      <Modal
        isOpen={!!confirmAssign}
        onClose={() => !assignRealtor.isPending && setConfirmAssign(null)}
        title="Asignar agente"
      >
        {confirmAssign && (
          <div>
            <p className="text-sm text-text-secondary">
              ¿Quieres trabajar con <span className="font-bold">{confirmAssign.realtorName}</span>
              {confirmAssign.realtorBusinessName ? ` de ${confirmAssign.realtorBusinessName}` : ''}?
            </p>

            <p className="mt-3 text-sm font-medium text-text-primary">Al asignar un agente:</p>
            <ul className="mt-2 space-y-2">
              {[
                'Su número de WhatsApp reemplazará al tuyo como contacto principal del anuncio',
                'Los interesados en tu propiedad contactarán directamente al agente',
                'Tú seguirás viendo todas las estadísticas y el estado de tu anuncio',
                'Puedes cambiar de agente en cualquier momento',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2 text-sm text-text-secondary">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1"
                onClick={handleAssignConfirm}
                isLoading={assignRealtor.isPending}
              >
                Confirmar
              </Button>
              <Button
                variant="text"
                className="flex-1"
                onClick={() => setConfirmAssign(null)}
                disabled={assignRealtor.isPending}
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
