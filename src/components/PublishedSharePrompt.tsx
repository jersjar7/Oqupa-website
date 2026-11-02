import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'
import ShareFormatModal from '@/components/ShareFormatModal'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

/**
 * The share prompt shown once on a listing that was just published. It used
 * to live inside the wizard's success dialog; it moved here when publishing
 * started landing on the new listing (ADR-043). Same words, same choices.
 */
export default function PublishedSharePrompt({
  listing,
  property,
  onClose,
}: {
  listing: Listing
  property: Property
  onClose: () => void
}) {
  const [sharing, setSharing] = useState(false)
  return (
    <>
      <Modal isOpen={!sharing} onClose={onClose} title="¡Publicado!">
        <p className="text-text-secondary">
          ¡Comparte tu anuncio en todas tus redes sociales!
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-3 font-medium text-text-secondary transition-colors hover:bg-black/5"
          >
            Ahora no
          </button>
          <button
            onClick={() => setSharing(true)}
            className="flex-1 rounded-xl bg-primary px-4 py-3 font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-primary-hover"
          >
            Compartir
          </button>
        </div>
      </Modal>
      <ShareFormatModal
        isOpen={sharing}
        onClose={() => {
          setSharing(false)
          onClose()
        }}
        listing={listing}
        property={property}
        justPublished
      />
    </>
  )
}
