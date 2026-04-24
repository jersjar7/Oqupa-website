import { useState } from 'react'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button } from '@/app/components/ui'
import { usePhotoQueue } from './usePhotoQueue'
import PhotoGrid from './PhotoGrid'

const MIN_PHOTOS = 3

export default function PhotoStep() {
  const { data, updateData, nextStep, prevStep } = useListingFormStore()
  const queue = usePhotoQueue({
    existingPhotoUrls: data.existingPhotoUrls,
    photos: data.photos,
  })
  const [photoError, setPhotoError] = useState<string | null>(null)

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
        onMove={queue.move}
        photoError={photoError}
        canContinue={canContinue}
        minPhotos={MIN_PHOTOS}
      />

      <div className="flex gap-3">
        <Button type="button" variant="text" onClick={prevStep} className="flex-1">
          Atras
        </Button>
        <Button type="submit" disabled={!canContinue} className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}
