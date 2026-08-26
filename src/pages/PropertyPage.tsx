import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Sparkles } from 'lucide-react'
import { useProperty } from '@/hooks/useProperty'
import { useGallery } from '@/hooks/useGallery'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useRecordListingView } from '@/hooks/useRecordListingView'
import { useAuthStore } from '@/stores/authStore'
import { formatPrice, setReturnUrl } from '@/lib/utils'
import { getPriceSuffix } from '@/lib/formatters'
import { fullSize } from '@/lib/imageUrl'
import { OwnerCard } from '@/app/features/listings/components/OwnerCard'
import { PROPERTY_TYPE_LABELS } from '@/types/enums'
import { BOOST_TIER_LABELS } from '@/types/boost'
import { AnalyticsLogger } from '@/lib/analytics'
import { AnimatedImage } from '@/app/components/ui'
import ShareFormatModal from '@/components/ShareFormatModal'
import GalleryModal from '@/app/components/GalleryModal'
import BoostPurchaseFlow from '@/app/features/boost/components/BoostPurchaseFlow'
import AppStoreBadges from '@/components/AppStoreBadges'
import SaveButton from '@/components/lists/SaveButton'
import { toast } from 'sonner'
import { contactService, ContactDenied } from '@/services/contactService'

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
            <button
              key={i}
              type="button"
              aria-label={`Ver foto ${i + 1} en pantalla completa`}
              className="block h-[300px] w-full shrink-0 cursor-pointer border-0 p-0"
              onClick={() => openModal(i)}
            >
              <AnimatedImage
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </button>
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
                  className={`block h-3 w-3 rounded-full transition-all duration-300 ${
                    i === mobileCarousel.currentSlide ? 'scale-100 bg-white' : 'scale-75 bg-white/50'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop grid */}
      <div className="mx-auto hidden max-w-6xl px-4 pt-6 md:block">
        {images.length === 1 ? (
          <button
            type="button"
            aria-label="Ver foto 1 en pantalla completa"
            className="group block h-[420px] w-full cursor-pointer overflow-hidden rounded-xl border-0 p-0"
            onClick={() => openModal(0)}
          >
            <AnimatedImage src={images[0]} alt="Foto 1" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" decoding="async" />
          </button>
        ) : (
          <div className="grid h-[420px] grid-cols-4 grid-rows-2 gap-1 overflow-hidden rounded-xl">
            <button
              type="button"
              aria-label="Ver foto 1 en pantalla completa"
              className="group col-span-2 row-span-2 block cursor-pointer overflow-hidden border-0 p-0"
              onClick={() => openModal(0)}
            >
              <AnimatedImage src={images[0]} alt="Foto 1" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" decoding="async" />
            </button>
            {visibleImages.slice(1).map((url, i) => {
              const imageIndex = i + 1
              const totalRight = visibleImages.length - 1
              const isLast = i === totalRight - 1
              const gridClass = getRightImageClass(i, totalRight)

              return (
                <button
                  key={imageIndex}
                  type="button"
                  aria-label={
                    isLast && hasMore
                      ? `Ver todas las ${images.length} fotos`
                      : `Ver foto ${imageIndex + 1} en pantalla completa`
                  }
                  className={`group relative block cursor-pointer overflow-hidden border-0 p-0 ${gridClass}`}
                  onClick={() => openModal(imageIndex)}
                >
                  <AnimatedImage
                    src={url}
                    alt={`Foto ${imageIndex + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                </button>
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
  const { pathname } = useLocation()
  const { listing, property, isLoading, error } = useProperty(id)
  const { firebaseUser, user } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  // MUST stay up here with the other hooks. This lived further down, next to
  // the WhatsApp handler it belongs to, where it replaced a plain `const` in
  // ADR-015 Phase 3.4 — but that spot is BELOW the `isLoading` and `not found`
  // early returns. A const there is fine; a hook there is not. The first render
  // returned early and never ran it, the second ran it, and React threw #310
  // ("rendered more hooks than during the previous render"), which the error
  // boundary turned into "Algo salió mal" on EVERY property page.
  const [contactLoading, setContactLoading] = useState(false)
  // SEO meta tags
  const metaTitle = useMemo(() => {
    if (!listing || !property) return 'Propiedad - Oqupa'
    const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
    const distrito = property.location?.distrito
    return distrito ? `${typeLabel} en ${distrito} - Oqupa` : `${typeLabel} - Oqupa`
  }, [listing, property])

  const metaDescription = useMemo(() => {
    if (!listing?.description) return undefined
    return listing.description.length > 150
      ? listing.description.slice(0, 147) + '...'
      : listing.description
  }, [listing?.description])

  const metaImage = useMemo(() => {
    if (!property) return undefined
    const firstRef = property.media?.photoKeys?.[0] ?? property.media?.propertyPhotoUrls?.[0]
    return firstRef ? fullSize(firstRef) : undefined
  }, [property])

  useDocumentMeta({
    title: metaTitle,
    description: metaDescription,
    image: metaImage,
    url: `${window.location.origin}${pathname}`,
  })

  useEffect(() => {
    if (id && listing) {
      // District only — never the street. It gives ad targeting something
      // useful without publishing where the property actually is.
      AnalyticsLogger.listingViewed(id, property?.location?.distrito)
    }
  }, [id, listing, property?.location?.distrito])

  useRecordListingView(id, listing?.ownerId)

  const photoRefs = property?.media?.photoKeys ?? property?.media?.propertyPhotoUrls ?? []
  const images = photoRefs.map(fullSize)

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

  const isOwner = user?.id === listing.ownerId
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
  // Kept only to decide whether this listing advertises a contact at all.
  // The NUMBER itself is no longer read here — see handleWhatsAppClick.
  const listingIdForContact = listing.id

  // The number is no longer held by the client — it is requested from the
  // server, which decides whether this person may have it and records that it
  // was given out (ADR-015 Phase 3.4). The button stays visible because the
  // listing still advertises that a contact exists; only the number is gated.
  // `contactLoading` is declared with the other hooks at the top of the
  // component — it cannot live here, below the early returns.
  async function handleWhatsAppClick() {
    if (contactLoading) return
    setContactLoading(true)
    try {
      const contact = await contactService.getListingContact(listingIdForContact)
      // Someone asked for an owner's number: the strongest intent signal the
      // site produces. Reported after the call succeeds, so a denial is not
      // counted as interest.
      AnalyticsLogger.contactRevealed(listingIdForContact)
      window.open(
        `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`,
        '_blank',
        'noopener,noreferrer',
      )
    } catch (error) {
      const reason = error instanceof ContactDenied ? error.reason : 'unavailable'
      if (reason === 'needs-login' || reason === 'needs-phone-verification') {
        setShowAuthModal(true)
      } else if (reason === 'rate-limited') {
        toast.error('Has visto muchos contactos hoy. Intenta de nuevo mañana.')
      } else {
        toast.error('No se pudo obtener el contacto. Intenta de nuevo.')
      }
    } finally {
      setContactLoading(false)
    }
  }
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

      {/* Content — animated entrance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="mx-auto max-w-6xl px-4 pt-6 sm:px-6"
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column — listing details */}
          <div className="lg:col-span-2">
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
              <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <Eye className="h-4 w-4 shrink-0" />
                {listing.viewCount} {listing.viewCount === 1 ? 'vista' : 'vistas'}
              </span>
              <SaveButton listingId={listing.id} variant="page" />
              <button
                onClick={handleShare}
                className="rounded-full border border-border px-4 py-1.5 font-sans text-sm font-medium uppercase tracking-wide text-text-secondary transition-colors hover:bg-black/5"
                aria-label="Compartir"
              >
                Compartir
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
                    Ubicación aproximada
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
          </div>

          {/* Right column — sticky widgets */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-1 lg:h-fit lg:self-start lg:border-l lg:border-border lg:pl-8">
            {/* WhatsApp button + helper notes */}
            {(
              <div>
              <button
                onClick={handleWhatsAppClick}
                disabled={contactLoading}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#25D366] px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-[#1DA851] hover:shadow-medium active:scale-[0.98]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Escríbele por WhatsApp
              </button>
              <div className="mt-3 space-y-2 px-1 text-xs leading-relaxed text-text-secondary">
                <p>
                  Tu mensaje llega directamente a quien publica el aviso. En Oqupa no hay intermediarios.
                </p>
                <p>
                  <span className="font-medium text-text-primary">Tip:</span> tu mensaje ya incluye la dirección. Cuéntale cuándo te gustaría visitarla.
                </p>
              </div>
              </div>
            )}

            {/* Who published it — from the listing's own copy of the owner's identity */}
            <OwnerCard listing={listing} />

            {/* Owner boost section */}
            {isOwner && listing.status === 'active' && (
              listing.isBoosted ? (
                // Boost status for owner
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-700">
                      Tu publicación está destacada
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-amber-600">
                    {listing.boostTier && (
                      <span>Plan: {BOOST_TIER_LABELS[listing.boostTier]}</span>
                    )}
                    {listing.boostedUntil && (
                      <span>
                        Vence: {listing.boostedUntil.toLocaleDateString('es-PE', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {listing.boostedUntil && (
                      <span>
                        ({Math.max(0, Math.ceil((listing.boostedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} días restantes)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                // Boost CTA for owner
                <BoostPurchaseFlow
                  listingId={listing.id}
                  onSuccess={() => {}}
                >
                  {(openFlow) => (
                    <button
                      onClick={openFlow}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-600"
                    >
                      <Sparkles className="h-5 w-5" />
                      Destacar mi propiedad
                    </button>
                  )}
                </BoostPurchaseFlow>
              )
            )}

            {/* App download banner */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-secondary to-[#2E5544] p-6 text-white">
              <h3 className="text-lg font-bold">
                Descarga la app de Oqupa
              </h3>
              <p className="mt-1 text-sm text-white/80">
                Busca propiedades y publica las tuyas desde tu celular.
              </p>
              <AppStoreBadges className="mt-4 justify-center" />
            </div>
          </aside>
        </div>
      </motion.div>

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
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthModal(false)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-sm rounded-2xl bg-white p-4 sm:p-6 shadow-xl"
            >
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
                  className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold uppercase tracking-wider text-white transition-all duration-200 hover:bg-primary-hover active:scale-[0.97]"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
