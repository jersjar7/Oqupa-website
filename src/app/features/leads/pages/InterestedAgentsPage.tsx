import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useListingDetails } from '@/hooks/useListings'
import { useListingClaims, useAssignRealtor, useUnassignRealtor } from '@/hooks/useRealtorLeads'
import { thumbnail as thumbnailUrl } from '@/lib/imageUrl'
import { Modal, Spinner, Button, Badge } from '@/app/components/ui'
import StaggerList, { staggerItemVariants } from '@/app/components/ui/StaggerList'
import RealtorClaimCard from '../components/RealtorClaimCard'
import { PROPERTY_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import type { RealtorClaim } from '@/types/realtorClaim'
import DialogActions from '@/app/components/ui/DialogActions'

export default function InterestedAgentsPage() {
  const { id: listingId } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [confirmAssign, setConfirmAssign] = useState<RealtorClaim | null>(null)

  const listingDetails = useListingDetails(listingId)
  const listing = listingDetails.data?.listing
  const property = listingDetails.data?.property

  const claims = useListingClaims(
    listing?.ownerId === user?.id ? user?.id : undefined,
    listingId,
  )
  const assignRealtor = useAssignRealtor()
  const unassignRealtor = useUnassignRealtor()
  const [confirmUnassign, setConfirmUnassign] = useState(false)

  // Loading state
  if (listingDetails.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  // Not found or not owner: say so rather than bouncing silently (audit
  // 2026-11-02).
  if (!listing || !property || listing.ownerId !== user?.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-[28px] font-normal text-text-primary">Esta publicación ya no existe.</h1>
        <p className="mt-2 text-text-secondary">Puede que la hayas eliminado o que el enlace esté incompleto.</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate('/app/listings')}>Volver</Button>
        </div>
      </div>
    )
  }
  const isPendingInvite = listing.assignmentStatus === 'pending_acceptance'

  function handleAssignConfirm() {
    if (!confirmAssign || !listingId) return

    assignRealtor.mutate(
      {
        listingId,
        realtorId: confirmAssign.realtorId,
        realtorPhone: confirmAssign.realtorPhone,
        realtorName: confirmAssign.realtorName,
      },
      {
        onSuccess: () => setConfirmAssign(null),
        onError: () => {
          setConfirmAssign(null)
        },
      },
    )
  }

  function handleUnassignConfirm() {
    if (!listingId) return

    unassignRealtor.mutate(listingId, {
      onSuccess: () => setConfirmUnassign(false),
      onError: () => {
        setConfirmUnassign(false)
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis propiedades
      </Link>

      {/* Header */}
      <h1 className="mt-4 font-serif text-[28px] font-normal text-text-primary">
        Agentes interesados
      </h1>
      <Link
        to="/app/buenas-practicas"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-secondary hover:text-secondary-hover"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Buenas prácticas
      </Link>

      {/* Listing summary */}
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-light">
        {(() => {
          const photoRef = property.media.photoKeys?.[0] ?? property.media.propertyPhotoUrls[0]
          return photoRef ? (
            <img
              src={thumbnailUrl(photoRef)}
              alt={listing.description}
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs text-text-tertiary">
            Sin foto
          </div>
          )
        })()}
        <div>
          <p className="font-bold text-text-primary">
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
        <div className={`mt-4 rounded-xl border p-4 ${
          isPendingInvite
            ? 'border-accent bg-accent/20'
            : 'border-secondary/30 bg-secondary/5'
        }`}>
          <div className="flex items-center gap-2">
            <Badge variant={isPendingInvite ? 'warning' : 'info'}>
              {isPendingInvite
                ? 'Invitación enviada'
                : 'Agente asignado'}
            </Badge>
            <span className="text-sm text-text-secondary">
              {claims.data?.find((c) => c.realtorId === listing.assignedRealtorId)?.realtorName ?? 'Agente'}
            </span>
          </div>
          <button
            type="button"
            className="mt-2 min-h-11 font-sans text-sm font-bold uppercase tracking-[1px] text-error hover:text-error-strong"
            onClick={() => setConfirmUnassign(true)}
          >
            {isPendingInvite ? 'Cancelar invitación' : 'Quitar agente'}
          </button>
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

        {claims.isError && (
          <div className="rounded-2xl border border-error/20 bg-error/5 p-12 text-center">
            <p className="text-error-strong">
              No pudimos cargar los agentes interesados. Revisa tu internet.
            </p>
            <Button className="mt-4" onClick={() => claims.refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {claims.data && claims.data.length === 0 && (
          <div className="rounded-2xl border border-border bg-white p-12 text-center">
            <p className="text-text-secondary">
              Aún no hay agentes interesados.
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              Los agentes inmobiliarios verificados podrán reclamar esta oportunidad.
            </p>
          </div>
        )}

        {claims.data && claims.data.length > 0 && (() => {
          const declinedIds = listing.declinedRealtorIds ?? []
          const activeClaims = claims.data.filter((c) => !declinedIds.includes(c.realtorId))
          const declinedClaims = claims.data.filter((c) => declinedIds.includes(c.realtorId))

          return (
            <StaggerList className="flex flex-col gap-3">
              {activeClaims.map((claim) => (
                <motion.div key={claim.id} variants={staggerItemVariants}>
                  <RealtorClaimCard
                    claim={claim}
                    isAssigned={listing.assignedRealtorId === claim.realtorId}
                    hasAssignedRealtor={!!listing.assignedRealtorId}
                    onAssign={() => setConfirmAssign(claim)}
                    isAssigning={assignRealtor.isPending && confirmAssign?.id === claim.id}
                  />
                </motion.div>
              ))}
              {declinedClaims.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Rechazados
                  </p>
                  {declinedClaims.map((claim) => (
                    <motion.div key={claim.id} variants={staggerItemVariants} className="opacity-50">
                      <RealtorClaimCard
                        claim={claim}
                        isAssigned={false}
                        hasAssignedRealtor={!!listing.assignedRealtorId}
                        onAssign={undefined}
                        isAssigning={false}
                      />
                    </motion.div>
                  ))}
                </>
              )}
            </StaggerList>
          )
        })()}
      </div>

      {/* Assign confirmation modal */}
      <Modal
        isOpen={!!confirmAssign}
        onClose={() => !assignRealtor.isPending && setConfirmAssign(null)}
        title="¿Trabajar con este agente?"
      >
        {confirmAssign && (
          <div>
            <p className="text-sm text-text-secondary">
              ¿Quieres trabajar con <span className="font-bold">{confirmAssign.realtorName}</span>
              {confirmAssign.realtorBusinessName ? ` de ${confirmAssign.realtorBusinessName}` : ''}?
            </p>

            {/* The app's words: it is an invitation, not an assignment. */}
            <ul className="mt-3 space-y-2">
              {[
                'Le enviaremos una invitación. Debe aceptarla para representar tu propiedad.',
                'Mientras él/ella no acepte, tú sigues siendo el contacto del anuncio y ves todas las estadísticas.',
                'Cuando él/ella acepte, su WhatsApp reemplazará al tuyo como contacto del anuncio.',
                'Puedes cancelar la invitación o cambiar de agente cuando quieras.',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2 text-sm text-text-secondary">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-text-secondary">
              Oqupa solo los pone en contacto. El acuerdo con el agente es entre ustedes; Oqupa no es responsable del trato.
            </p>

            <DialogActions>
              <Button
                variant="text"
                onClick={() => setConfirmAssign(null)}
                disabled={assignRealtor.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleAssignConfirm} isLoading={assignRealtor.isPending}>
                Enviar invitación
              </Button>
            </DialogActions>
          </div>
        )}
      </Modal>

      {/* Unassign confirmation modal */}
      <Modal
        isOpen={confirmUnassign}
        onClose={() => !unassignRealtor.isPending && setConfirmUnassign(false)}
        title={isPendingInvite ? 'Cancelar invitación' : 'Quitar agente'}
      >
        <div>
          <p className="text-sm text-text-secondary">
            {isPendingInvite
              ? 'Se cancelará la invitación. El agente seguirá entre los interesados y podrás invitar a otra persona.'
              : 'El agente dejará de ser el contacto de tu propiedad y podrás elegir a otra persona.'}
          </p>
          <DialogActions>
            <Button
              variant="text"
              onClick={() => setConfirmUnassign(false)}
              disabled={unassignRealtor.isPending}
            >
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={handleUnassignConfirm}
              isLoading={unassignRealtor.isPending}
            >
              {isPendingInvite ? 'Cancelar invitación' : 'Quitar agente'}
            </Button>
          </DialogActions>
        </div>
      </Modal>

    </div>
  )
}
