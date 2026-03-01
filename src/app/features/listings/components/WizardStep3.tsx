import { useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button, Input } from '@/app/components/ui'
import { Upload, X, ImagePlus } from 'lucide-react'

export default function WizardStep3() {
  const { data, updateData, nextStep, prevStep, isEditMode } =
    useListingFormStore()

  const [photos, setPhotos] = useState<File[]>(data.photos)
  const [existingUrls] = useState<string[]>(data.existingPhotoUrls)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
      calle: data.calle,
      distrito: data.distrito,
      provincia: data.provincia,
      departamento: data.departamento,
    },
  })

  const totalPhotos = existingUrls.length + photos.length

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      const remaining = 25 - totalPhotos
      const newPhotos = files.slice(0, remaining)
      setPhotos((prev) => [...prev, ...newPhotos])
      setPhotoError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [totalPhotos]
  )

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  function onSubmit(formData: Step3Data) {
    if (!isEditMode && totalPhotos === 0) {
      setPhotoError('Selecciona al menos una foto')
      return
    }

    updateData({
      ...formData,
      photos,
    })
    nextStep()
  }

  // Default Piura coordinates
  const handleMapClick = useCallback(() => {
    // For now, set default Piura coordinates
    // Full Google Maps integration will come in Phase 3.5
    setValue('latitude', -5.194, { shouldValidate: true })
    setValue('longitude', -80.633, { shouldValidate: true })
  }, [setValue])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Location */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">Ubicacion</h3>

        {/* Map placeholder */}
        <div
          onClick={handleMapClick}
          className="mt-3 flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-gray-50 transition-colors hover:border-primary/30"
        >
          <div className="text-center">
            <p className="text-sm font-medium text-text-secondary">
              Haz clic para seleccionar ubicacion
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Piura, Peru (-5.194, -80.633)
            </p>
          </div>
        </div>
        {(errors.latitude || errors.longitude) && (
          <p className="mt-1.5 text-sm text-error">
            Selecciona una ubicacion en el mapa
          </p>
        )}
      </div>

      {/* Address fields */}
      <Input
        label="Calle y numero"
        placeholder="Ej: Av. Grau 123"
        error={errors.calle?.message}
        {...register('calle')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Distrito"
          placeholder="Ej: Piura"
          error={errors.distrito?.message}
          {...register('distrito')}
        />
        <Input
          label="Provincia"
          placeholder="Ej: Piura"
          error={errors.provincia?.message}
          {...register('provincia')}
        />
      </div>

      <Input
        label="Departamento"
        placeholder="Ej: Piura"
        error={errors.departamento?.message}
        {...register('departamento')}
      />

      {/* Photos */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">
          Fotos ({totalPhotos}/25)
        </h3>
        {photoError && (
          <p className="mt-1 text-sm text-error">{photoError}</p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {/* Existing photo URLs (edit mode) */}
          {existingUrls.map((url, i) => (
            <div
              key={`existing-${i}`}
              className="relative h-24 overflow-hidden rounded-xl border border-border"
            >
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}

          {/* New photo previews */}
          {photos.map((file, i) => (
            <div
              key={`new-${i}`}
              className="group relative h-24 overflow-hidden rounded-xl border border-border"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`Nueva foto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add photo button */}
          {totalPhotos < 25 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-border text-text-tertiary transition-colors hover:border-primary/30 hover:text-primary"
            >
              <ImagePlus className="h-6 w-6" />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {totalPhotos === 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-text-secondary transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Upload className="h-5 w-5" />
            Subir fotos
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={prevStep}
          className="flex-1"
        >
          Atras
        </Button>
        <Button type="submit" size="lg" className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}
