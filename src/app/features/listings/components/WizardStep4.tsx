import { useListingFormStore } from '@/stores/listingFormStore'
import PhotoStep from './photos/PhotoStep'

/**
 * The Fotos page. Photos kept from an earlier visit load after the page has
 * opened (ADR-043 D11); when they arrive the page starts again with them.
 */
export default function WizardStep4() {
  const restoredAt = useListingFormStore((s) => s.photosRestoredAt)
  return <PhotoStep key={restoredAt} />
}
