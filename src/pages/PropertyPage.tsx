import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProperty } from '@/hooks/useProperty'
import { useGallery } from '@/hooks/useGallery'
import { useAuthStore } from '@/stores/authStore'
import { formatPrice, setReturnUrl } from '@/lib/utils'
import { getPriceSuffix } from '@/lib/formatters'
import { PROPERTY_TYPE_LABELS } from '@/types/enums'
import { PLAY_STORE_URL } from '@/lib/constants'
import { AnalyticsLogger } from '@/lib/analytics'
import ShareFormatModal from '@/components/ShareFormatModal'

function GalleryModal({
  images,
  startIndex,
  onClose,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
}) {
  const { currentSlide, next, prev, trackRef, onTouchStart, onTouchEnd } =
    useGallery(images.length, startIndex)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Counter badge */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white">
        {currentSlide + 1} / {images.length}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
        aria-label="Cerrar galería"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Gallery track */}
      <div
        ref={trackRef}
        className="flex h-full w-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.map((url, i) => (
          <div key={i} className="flex h-full w-full shrink-0 items-center justify-center p-4">
            <img
              src={url}
              alt={`Foto ${i + 1}`}
              className="max-h-full max-w-full object-contain"
              loading={Math.abs(i - startIndex) <= 1 ? 'eager' : 'lazy'}
                decoding="async"
            />
          </div>
        ))}
      </div>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          aria-label="Imagen anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          aria-label="Siguiente imagen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

function PropertyGallery({ images }: { images: string[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStartIndex, setModalStartIndex] = useState(0)
  const mobileCarousel = useGallery(images.length)

  const openModal = (index: number) => {
    setModalStartIndex(index)
    setModalOpen(true)
  }

  if (images.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center bg-gray-100 md:h-[400px]">
        <span className="text-text-secondary">Sin imágenes</span>
      </div>
    )
  }

  const visibleImages = images.slice(0, 5)
  const hasMore = images.length > 5

  const getRightImageClass = (index: number, totalRight: number): string => {
    if (totalRight === 1) return 'col-span-2 row-span-2'
    if (totalRight === 2) return 'row-span-2'
    if (totalRight === 3 && index === 2) return 'col-span-2'
    return ''
  }

  return (
    <>
      {/* Mobile carousel */}
      <div className="relative w-full overflow-hidden bg-black md:hidden">
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
          <button
            onClick={mobileCarousel.prev}
            className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Imagen anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {images.length > 1 && (
          <button
            onClick={mobileCarousel.next}
            className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            aria-label="Siguiente imagen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => mobileCarousel.goTo(i)}
                className="flex items-center justify-center p-2"
                aria-label={`Ir a imagen ${i + 1}`}
              >
                <span
                  className={`block h-3 w-3 rounded-full transition-colors ${
                    i === mobileCarousel.currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop grid */}
      <div className="mx-auto hidden max-w-5xl px-4 pt-6 md:block">
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
            {visibleImages.slice(1).map((url, i) => {
              const imageIndex = i + 1
              const totalRight = visibleImages.length - 1
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
                  {isLast && hasMore && (
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

      {/* Full-screen modal */}
      {modalOpen && (
        <GalleryModal
          images={images}
          startIndex={modalStartIndex}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}

export default function PropertyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { listing, property, isLoading, error } = useProperty(id)
  const { firebaseUser, user } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    if (listing?.description) {
      document.title = listing.description
    } else {
      document.title = 'Propiedad - Oqupa'
    }
  }, [listing?.description])

  useEffect(() => {
    if (id && listing) {
      AnalyticsLogger.listingViewed(id)
    }
  }, [id, listing])

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  const images = property?.media?.propertyPhotoUrls ?? []

  // Prefetch all gallery images when property data loads
  useEffect(() => {
    for (const url of images) {
      const img = new window.Image()
      img.src = url
    }
  }, [images])

  const handleShare = () => {
    if (!listing || !property) return
    setShowShareModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-text-secondary">Cargando propiedad...</p>
      </div>
    )
  }

  if (error || !listing || !property) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-serif text-2xl font-bold text-text-primary">
          Propiedad no encontrada
        </h1>
        <p className="text-text-secondary">
          La propiedad que buscas no existe o ha sido eliminada.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
        >
          Volver al inicio
        </Link>
      </div>
    )
  }

  const showExact = listing.showExactLocation !== false
  const location = showExact
    ? [
        property.location?.urbanizacion,
        property.location?.distrito,
        property.location?.departamento,
      ]
        .filter(Boolean)
        .join(', ')
    : [property.location?.distrito, property.location?.provincia]
        .filter(Boolean)
        .join(', ')
  const propertyTypeLabel =
    PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const whatsappNumber = listing.contactInfo?.whatsappPhoneNumber
  const whatsappAddress = showExact
    ? [
        property.location?.calle,
        property.location?.urbanizacion,
        property.location?.distrito,
        property.location?.departamento,
      ]
        .filter(Boolean)
        .join(', ')
    : property.location?.distrito ?? ''
  const whatsappMessage = encodeURIComponent(
    `Hola, me interesa la propiedad en: ${whatsappAddress || 'su sitio web'}`
  )

  return (
    <div className="min-h-screen bg-background pb-8 pt-20">
      {/* Gallery */}
      <PropertyGallery images={images} />

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        {/* Price + Destacado badge + Share */}
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold text-primary">
            {formatPrice(listing.price?.amount)}
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
          <button
            onClick={handleShare}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:bg-black/5"
            aria-label="Compartir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Location */}
        {location && (
          <div className="mt-2 flex items-center gap-1.5 text-text-secondary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-sm">{location}</span>
            {!showExact && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                Ubicacion aproximada
              </span>
            )}
          </div>
        )}

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
          {property.specs?.totalAreaInSquareMeters != null && (
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
            <h2 className="font-serif text-lg font-semibold text-text-primary">
              Descripción
            </h2>
            <p className="mt-2 whitespace-pre-line text-gray-600 leading-relaxed">
              {listing.description}
            </p>
          </div>
        )}

        {/* WhatsApp button */}
        {whatsappNumber && (
          <button
            onClick={() => {
              if (firebaseUser && user?.isPhoneVerified) {
                window.open(
                  `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`,
                  '_blank',
                  'noopener,noreferrer'
                )
              } else {
                setShowAuthModal(true)
              }
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-4 text-lg font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1DA851]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contactar por WhatsApp
          </button>
        )}

        {/* App download banner */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-secondary to-[#2E5544] p-6 text-white">
          <h3 className="text-lg font-bold">
            Descarga la app de Oqupa
          </h3>
          <p className="mt-1 text-sm text-white/80">
            Encuentra más propiedades y publica las tuyas desde tu celular.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
            >
              Abrir en la App
            </Link>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.651 1.535a1 1 0 010 1.73l-2.651 1.534-2.534-2.534 2.534-2.265zM5.864 3.458L16.8 9.79l-2.302 2.302-8.635-8.635z" />
              </svg>
              Google Play
            </a>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Share format modal */}
      {listing && property && (
        <ShareFormatModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          listing={listing}
          property={property}
        />
      )}

      {/* Auth required modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAuthModal(false)
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-text-primary">
              Verificación requerida
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {firebaseUser
                ? 'Para contactar al propietario, necesitas verificar tu número de teléfono.'
                : 'Para contactar al propietario, necesitas iniciar sesión y verificar tu número de teléfono.'}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowAuthModal(false)
                  setReturnUrl(window.location.pathname)
                  navigate(firebaseUser ? '/app/verify' : '/app/login')
                }}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
              >
                {firebaseUser ? 'Verificar teléfono' : 'Iniciar sesión'}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="flex w-full items-center justify-center rounded-xl border border-border px-6 py-3 font-medium text-text-secondary transition-colors hover:bg-black/5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
