import { useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/schemas/listingSchema'
import { PIURA_CENTER } from '@/lib/constants'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button, Input } from '@/app/components/ui'
import { Upload, X, ImagePlus } from 'lucide-react'
import LocationPicker from './LocationPicker'

export default function WizardStep3() {
  const { data, updateData, nextStep, prevStep, isEditMode } =
    useListingFormStore()

  const [showExactLocation, setShowExactLocation] = useState(data.showExactLocation)
  const [photos, setPhotos] = useState<File[]>(data.photos)
  const [existingUrls] = useState<string[]>(data.existingPhotoUrls)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      latitude: data.latitude ?? PIURA_CENTER.lat,
      longitude: data.longitude ?? PIURA_CENTER.lng,
      calle: data.calle,
      urbanizacion: data.urbanizacion,
      distrito: data.distrito,
      provincia: data.provincia,
      departamento: data.departamento,
    },
  })

  const watchedLat = watch('latitude')
  const watchedLng = watch('longitude')

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
      showExactLocation,
      photos,
    })
    nextStep()
  }

  const handleLocationChange = useCallback(
    (lat: number, lng: number) => {
      setValue('latitude', lat, { shouldValidate: true })
      setValue('longitude', lng, { shouldValidate: true })
    },
    [setValue]
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Location */}
      <div>
        <h3 className="text-sm font-medium uppercase text-text-primary">Ubicación</h3>

        <div className="mt-3">
          <LocationPicker
            latitude={watchedLat ?? null}
            longitude={watchedLng ?? null}
            onChange={handleLocationChange}
          />
        </div>
        {(errors.latitude || errors.longitude) && (
          <p className="mt-1.5 text-sm text-error">
            Selecciona una ubicación en el mapa
          </p>
        )}
      </div>

      {/* Address fields */}
      <Input
        label="Dirección"
        placeholder="Ej: Av. Grau 123-A"
        error={errors.calle?.message}
        {...register('calle')}
      />

      <Input
        label="Urbanización o barrio (opcional)"
        placeholder="Ej: Urb. San Eduardo"
        error={errors.urbanizacion?.message}
        {...register('urbanizacion')}
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

      {/* Location privacy toggle */}
      <div className="rounded-xl border border-border p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={showExactLocation}
            onChange={(e) => setShowExactLocation(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <span className="text-sm font-medium text-text-primary">
              Mostrar ubicacion exacta
            </span>
            <p className="text-xs text-text-secondary">
              {showExactLocation
                ? 'Se mostrara tu direccion completa y ubicacion exacta en el mapa'
                : 'Se mostrara solo el distrito y una ubicacion aproximada en el mapa'}
            </p>
          </div>
        </label>
      </div>

      {/* Photos */}
      <div>
        <h3 className="text-sm font-medium uppercase text-text-primary">
          Fotos ({totalPhotos}/25)
        </h3>
        {photoError && (
          <p className="mt-1 text-sm text-error">{photoError}</p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
          variant="text"
          onClick={prevStep}
          className="flex-1"
        >
          Atras
        </Button>
        <Button type="submit" className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}
