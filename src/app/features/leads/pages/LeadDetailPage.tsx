import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProperty } from '@/hooks/useProperty'
import { useGallery } from '@/hooks/useGallery'
import { useClaimStatus, useClaimLead } from '@/hooks/useRealtorLeads'
import { useAuthStore } from '@/stores/authStore'
import { getPriceSuffix } from '@/lib/formatters'
import { PROPERTY_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/enums'
import { Button, Modal, Spinner } from '@/app/components/ui'
import GalleryModal from '@/app/components/GalleryModal'

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency
  return `${symbol} ${amount.toLocaleString('es-PE')}`
}

export default function LeadDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { listing, property, isLoading, error } = useProperty(id)
  const user = useAuthStore((s) => s.user)
  const claimStatus = useClaimStatus()
  const claimLead = useClaimLead()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const images = property?.media?.propertyPhotoUrls ?? []
  const mobileCarousel = useGallery(images.length)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStartIndex, setModalStartIndex] = useState(0)

  useEffect(() => {
    if (listing?.description) {
      document.title = `Oportunidad - ${listing.description.substring(0, 60)}`
    } else {
      document.title = 'Oportunidad - Oqupa'
    }
  }, [listing?.description])

  const openModal = (index: number) => {
    setModalStartIndex(index)
    setModalOpen(true)
  }

  const slotsFull = listing ? listing.currentClaimsCount >= listing.maxRealtors : false
  const canClaim = claimStatus.canClaim && !slotsFull

  function handleClaimConfirm() {
    if (!listing || !user) return

    claimLead.mutate(
      {
        listingId: listing.id,
        realtorId: user.id,
        listingOwnerId: listing.ownerId,
        realtorName: user.name ?? '',
        realtorPhone: user.contactInfo?.whatsappPhoneNumber ?? '',
        realtorBusinessName: user.realtorBusinessName ?? '',
      },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          navigate('/app/leads')
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !listing || !property) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-sans text-2xl font-medium text-text-primary">
          Oportunidad no encontrada
        </h1>
        <p className="mt-2 text-text-secondary">
          La oportunidad que buscas no existe o ha sido eliminada.
        </p>
        <Link
          to="/app/leads"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
        >
          Volver a oportunidades
        </Link>
      </div>
    )
  }

  const location = [property.location?.distrito, property.location?.provincia]
    .filter(Boolean)
    .join(', ')
  const propertyTypeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType

  const visibleDesktopImages = images.slice(0, 5)
  const hasMoreImages = images.length > 5

  const getRightImageClass = (index: number, totalRight: number): string => {
    if (totalRight === 1) return 'col-span-2 row-span-2'
    if (totalRight === 2) return 'row-span-2'
    if (totalRight === 3 && index === 2) return 'col-span-2'
    return ''
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Back link */}
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <Link
          to="/app/leads"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Oportunidades
        </Link>
      </div>

      {/* Gallery — mobile carousel */}
      {images.length > 0 && (
        <div className="relative mt-4 w-full overflow-hidden bg-black md:hidden">
          <div
            ref={mobileCarousel.trackRef}
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${mobileCarousel.currentSlide * 100}%)` }}
            onTouchStart={mobileCarousel.onTouchStart}
            onTouchEnd={mobileCarousel.onTouchEnd}
          >
            {images.map((url, i) => (
              <div
                key={i}
                className="h-[300px] w-full shrink-0 cursor-pointer"
                onClick={() => openModal(i)}
              >
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <div className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white">
              {mobileCarousel.currentSlide + 1} / {images.length}
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                onClick={mobileCarousel.prev}
                className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                aria-label="Imagen anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={mobileCarousel.next}
                className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                aria-label="Siguiente imagen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* Gallery — desktop grid */}
      {images.length > 0 && (
        <div className="mx-auto mt-4 hidden max-w-4xl px-4 sm:px-6 md:block">
          {images.length === 1 ? (
            <div
              className="h-[420px] cursor-pointer overflow-hidden rounded-xl"
              onClick={() => openModal(0)}
            >
              <img src={images[0]} alt="Foto 1" className="h-full w-full object-cover" decoding="async" />
            </div>
          ) : (
            <div className="grid h-[420px] grid-cols-4 grid-rows-2 gap-1 overflow-hidden rounded-xl">
              <div
                className="col-span-2 row-span-2 cursor-pointer"
                onClick={() => openModal(0)}
              >
                <img src={images[0]} alt="Foto 1" className="h-full w-full object-cover" decoding="async" />
              </div>
              {visibleDesktopImages.slice(1).map((url, i) => {
                const imageIndex = i + 1
                const totalRight = visibleDesktopImages.length - 1
                const isLast = i === totalRight - 1
                const gridClass = getRightImageClass(i, totalRight)

                return (
                  <div
                    key={imageIndex}
                    className={`relative cursor-pointer ${gridClass}`}
                    onClick={() => openModal(imageIndex)}
                  >
                    <img
                      src={url}
                      alt={`Foto ${imageIndex + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    {isLast && hasMoreImages && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900">
                          Ver todas las {images.length} fotos
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* No images placeholder */}
      {images.length === 0 && (
        <div className="mx-auto mt-4 flex h-[200px] max-w-4xl items-center justify-center rounded-xl bg-gray-100 px-4">
          <span className="text-text-secondary">Sin imágenes</span>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        {/* Price + Boost badge */}
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-primary">
            {formatPrice(listing.price.amount, listing.price.currency)}
            {(() => {
              const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
              return suffix ? <span className="text-lg font-normal text-text-secondary"> {suffix}</span> : null
            })()}
          </p>
          {listing.isBoosted && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-500/30">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Destacado
            </span>
          )}
        </div>

        {/* Property type + location */}
        <div className="mt-2 flex items-center gap-2">
          <span className="font-medium text-text-secondary">
            {propertyTypeLabel}
          </span>
          {location && (
            <>
              <span className="text-text-tertiary">·</span>
              <div className="flex items-center gap-1.5 text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{location}</span>
              </div>
            </>
          )}
        </div>
        <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
          Ubicacion aproximada
        </span>

        {/* Feature badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {property.specs?.bedroomCount != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
              <span aria-hidden="true">&#x1F6CF;&#xFE0F;</span>
              {property.specs.bedroomCount} hab.
            </span>
          )}
          {property.specs?.bathroomCount != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
              <span aria-hidden="true">&#x1F6BF;</span>
              {property.specs.bathroomCount} baño{property.specs.bathroomCount !== 1 ? 's' : ''}
            </span>
          )}
          {property.specs?.totalAreaInSquareMeters != null && property.specs.totalAreaInSquareMeters > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
              <span aria-hidden="true">&#x1F4CF;</span>
              {property.specs.totalAreaInSquareMeters} m²
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
            <span aria-hidden="true">&#x1F3E0;</span>
            {propertyTypeLabel}
          </span>
          {property.propertyType === 'habitacion' && property.specs?.hasPrivateBathroom != null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
              <span aria-hidden="true">&#x1F6BF;</span>
              {property.specs.hasPrivateBathroom ? 'Baño privado' : 'Baño compartido'}
            </span>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="mt-6">
            <h2 className="font-sans text-sm font-medium uppercase text-primary">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-line text-gray-600 leading-relaxed">
              {listing.description}
            </p>
          </div>
        )}

        {/* Amenities */}
        {property.specs?.propertyAmenities && property.specs.propertyAmenities.length > 0 && (
          <div className="mt-6">
            <h2 className="font-sans text-sm font-medium uppercase text-primary">
              Características
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {property.specs.propertyAmenities.map((amenity: string) => (
                <span
                  key={amenity}
                  className="inline-flex items-center rounded-full bg-secondary/8 px-3 py-1.5 text-sm text-text-secondary ring-1 ring-secondary/20"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Claims info */}
        <div className="mt-6 rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Agentes interesados</span>
            <span className="text-sm text-text-tertiary">
              {listing.currentClaimsCount}/{listing.maxRealtors} agentes
            </span>
          </div>
          {slotsFull && (
            <p className="mt-2 text-xs text-red-600">
              Todos los espacios están ocupados.
            </p>
          )}
        </div>

        {/* NO contact info, NO WhatsApp button */}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <div className="text-xs text-text-tertiary">
            {claimStatus.remaining} reclamaciones restantes
          </div>
          <Button
            className="flex-1"
            disabled={!canClaim}
            onClick={() => setConfirmOpen(true)}
          >
            {slotsFull ? 'Completo' : !claimStatus.canClaim ? 'Límite alcanzado' : 'Reclamar'}
          </Button>
        </div>
      </div>

      {/* Gallery modal */}
      {modalOpen && (
        <GalleryModal
          images={images}
          startIndex={modalStartIndex}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Claim confirmation modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => !claimLead.isPending && setConfirmOpen(false)}
        title="Reclamar oportunidad"
      >
        <div>
          <div className="rounded-xl border border-border bg-gray-50 p-3">
            <p className="font-bold text-primary">
              {formatPrice(listing.price.amount, listing.price.currency)}
              {(() => {
                const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
                return suffix ? <span className="text-sm font-normal text-text-secondary"> {suffix}</span> : null
              })()}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {propertyTypeLabel} en {property.location?.distrito}
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
              onClick={() => setConfirmOpen(false)}
              disabled={claimLead.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
