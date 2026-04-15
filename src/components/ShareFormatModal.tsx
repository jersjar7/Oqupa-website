import { useState } from 'react'
import { Link, Download, Loader2, Check } from 'lucide-react'
import Modal from '@/app/components/ui/Modal'
import { buildBrandedCardConfig } from '@/lib/brandedCardConfig'
import { paintBrandedCard } from '@/lib/brandedCardPainter'
import { shareListing, type ShareListingParams } from '@/lib/shareUtils'
import { shareCard } from '@/lib/imageUrl'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { CardFormat } from '@/lib/cardLayout'

type CompletedAction = 'link' | CardFormat

interface ShareFormatModalProps {
  isOpen: boolean
  onClose: () => void
  listing: Listing
  property: Property
}

export default function ShareFormatModal({
  isOpen,
  onClose,
  listing,
  property,
}: ShareFormatModalProps) {
  const [generatingFormat, setGeneratingFormat] = useState<CardFormat | null>(null)
  const [completed, setCompleted] = useState<Set<CompletedAction>>(new Set())

  const markDone = (action: CompletedAction) =>
    setCompleted((prev) => new Set(prev).add(action))

  const handleShareLink = async () => {
    const params: ShareListingParams = {
      listingId: listing.id,
      propertyType: property.propertyType,
      operationType: property.operationType,
      rentalDurationType: property.rentalDurationType,
      priceAmount: listing.price.amount,
      priceCurrency: listing.price.currency,
      distrito: property.location.distrito,
      urbanizacion: property.location.urbanizacion || undefined,
      bedroomCount: property.specs.bedroomCount,
      bathroomCount: property.specs.bathroomCount,
      totalAreaInSquareMeters: property.specs.totalAreaInSquareMeters,
    }
    await shareListing(params)
    markDone('link')
  }

  const handleShareImage = async (format: CardFormat) => {
    setGeneratingFormat(format)
    try {
      const config = buildBrandedCardConfig(listing, property, format)
      const photoRefs = listing.media.photoKeys ?? listing.media.propertyPhotoUrls ?? []
      const photoUrls = photoRefs.map(shareCard)
      const blob = await paintBrandedCard(config, photoUrls)
      const file = new File(
        [blob],
        `oqupa_${listing.id}_${format}.png`,
        { type: 'image/png' },
      )

      // Try Web Share API with file support (mobile browsers)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${config.operationLabel} — ${config.locationText}`,
          })
          markDone(format)
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            setGeneratingFormat(null)
            return
          }
        }
      }

      // Fallback: download the image
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `oqupa_${listing.id}_${format}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      markDone(format)
    } catch {
      // Silent fail — user can retry
    } finally {
      setGeneratingFormat(null)
    }
  }

  const linkDone = completed.has('link')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compartir">
      {/* Link option */}
      <button
        onClick={handleShareLink}
        disabled={generatingFormat !== null}
        className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-black/5 disabled:opacity-50"
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
          linkDone ? 'bg-green-600' : 'bg-[var(--color-secondary)]'
        }`}>
          {linkDone ? <Check className="h-5 w-5" /> : <Link className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-medium text-text-primary">
            {linkDone ? 'Enlace copiado' : 'Compartir enlace'}
          </p>
          <p className="text-sm text-text-secondary">
            {linkDone ? '¡Listo para pegar!' : 'Envía el link de tu anuncio'}
          </p>
        </div>
      </button>

      {/* Image format options */}
      <p className="mt-4 mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
        Imagen
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FormatButton
          label="Historia"
          sublabel="9:16"
          format="story"
          isGenerating={generatingFormat === 'story'}
          isDisabled={generatingFormat !== null}
          isDone={completed.has('story')}
          onClick={() => handleShareImage('story')}
        />
        <FormatButton
          label="Cuadrada"
          sublabel="1:1"
          format="square"
          isGenerating={generatingFormat === 'square'}
          isDisabled={generatingFormat !== null}
          isDone={completed.has('square')}
          onClick={() => handleShareImage('square')}
        />
      </div>

      {/* Done button */}
      <button
        onClick={onClose}
        className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover"
      >
        Listo — Ver mi publicacion
      </button>
    </Modal>
  )
}

function FormatButton({
  label,
  sublabel,
  format,
  isGenerating,
  isDisabled,
  isDone,
  onClick,
}: {
  label: string
  sublabel: string
  format: CardFormat
  isGenerating: boolean
  isDisabled: boolean
  isDone: boolean
  onClick: () => void
}) {
  const aspectClass = format === 'story' ? 'aspect-[9/16]' : 'aspect-square'

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors disabled:opacity-50 ${
        isDone
          ? 'border-green-300 bg-green-50'
          : 'border-[var(--color-border)] hover:border-[var(--color-secondary)] hover:bg-black/5'
      }`}
    >
      {isGenerating ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-secondary)]" />
        </div>
      ) : (
        <div className="relative">
          <div
            className={`${aspectClass} w-10 rounded border-2 ${
              isDone ? 'border-green-600 bg-green-100' : 'border-[var(--color-secondary)] bg-[var(--color-cream)]'
            }`}
          />
          {isDone && (
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-white">
              <Check className="h-2.5 w-2.5" />
            </div>
          )}
        </div>
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary">{sublabel}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs ${
        isDone ? 'text-green-600' : 'text-[var(--color-secondary)]'
      }`}>
        {isDone ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
        <span>{isDone ? 'Descargado' : 'Descargar'}</span>
      </div>
    </button>
  )
}
