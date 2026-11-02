import { useEffect, useState } from 'react'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button } from '@/app/components/ui'
import { usePhotoQueue } from './usePhotoQueue'
import PhotoGrid from './PhotoGrid'
import { minPhotosFor } from './minPhotos'

export default function PhotoStep() {
  const { data, updateData, nextStep, prevStep, isEditMode } = useListingFormStore()
  const MIN_PHOTOS = minPhotosFor({ isEditMode, originalCount: data.originalExistingPhotoUrls.length })
  const queue = usePhotoQueue({
    existingPhotoUrls: data.existingPhotoUrls,
    existingPhotoBlurHashes: data.existingPhotoBlurHashes,
    photos: data.photos,
  })
  const [photoError, setPhotoError] = useState<string | null>(null)

  // The photos and their order go into the draft as they change, so ATRÁS
  // (or the browser's back button) and coming back find every photo still
  // there. Before, leaving this page threw them all away.
  const { items, toSubmitData } = queue
  useEffect(() => {
    updateData(toSubmitData())
  }, [items, toSubmitData, updateData])

  const canContinue = queue.items.length >= MIN_PHOTOS

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (queue.items.length < MIN_PHOTOS) {
      setPhotoError(`Sube al menos ${MIN_PHOTOS} fotos`)
      return
    }
    updateData(queue.toSubmitData())
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="font-serif text-[28px] font-normal text-text-primary">
          Fotos de tu propiedad
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Sube las fotos que mejor representen tu propiedad
        </p>
      </div>

      <PhotoGrid
        items={queue.items}
        previewUrls={queue.previewUrls}
        onAddFiles={(files) => {
          queue.addFiles(files)
          setPhotoError(null)
        }}
        onRemove={queue.remove}
        onReorder={queue.reorder}
        photoError={photoError}
        canContinue={canContinue}
        minPhotos={MIN_PHOTOS}
      />

      <div className="flex gap-3">
        <Button type="button" variant="text" onClick={prevStep} className="flex-1">
          Atrás
        </Button>
        <Button type="submit" disabled={!canContinue} className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}
