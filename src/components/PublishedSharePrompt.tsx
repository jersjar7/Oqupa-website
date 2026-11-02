import { useState } from 'react'
import Modal from '@/app/components/ui/Modal'
import ShareFormatModal from '@/components/ShareFormatModal'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import Button from '@/app/components/ui/Button'
import DialogActions from '@/app/components/ui/DialogActions'

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
        <DialogActions>
          <Button variant="text" onClick={onClose}>
            Ahora no
          </Button>
          <button
            onClick={() => setSharing(true)}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-primary-hover"
          >
            Compartir
          </button>
        </DialogActions>
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
