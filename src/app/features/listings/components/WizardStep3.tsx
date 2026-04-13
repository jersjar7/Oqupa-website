import { useState, useCallback, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/schemas/listingSchema'
import { PIURA_CENTER } from '@/lib/constants'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useRevealedFields } from '@/hooks/useRevealedFields'
import { card as cardUrl } from '@/lib/imageUrl'
import { Button, Input, InfoTip } from '@/app/components/ui'
import { Upload, X, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react'
import RevealField from './RevealField'
import LocationPicker from './LocationPicker'

type PhotoItem =
  | { type: 'existing'; url: string }
  | { type: 'new'; file: File }

export default function WizardStep3() {
  const { data, updateData, nextStep, prevStep, isEditMode } =
    useListingFormStore()

  const [showExactLocation, setShowExactLocation] = useState(data.showExactLocation)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track whether the user has placed a pin (distinct from default Piura center)
  const [hasPinPlaced, setHasPinPlaced] = useState(() => data.latitude != null)

  // Unified ordered list of all photos
  const [items, setItems] = useState<PhotoItem[]>(() => {
    const existing: PhotoItem[] = data.existingPhotoUrls.map((url) => ({
      type: 'existing',
      url,
    }))
    const newPhotos: PhotoItem[] = data.photos.map((file) => ({
      type: 'new',
      file,
    }))
    return [...existing, ...newPhotos]
  })

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
  const distrito = watch('distrito')

  const { isRevealed, wasInitial } = useRevealedFields(
    {
      map: true, // always visible
      address: hasPinPlaced,
      exactLocation: (distrito ?? '').length > 0,
      photos: (distrito ?? '').length > 0,
      submit: (distrito ?? '').length > 0,
    },
    isEditMode
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      const remaining = 25 - items.length
      const newItems: PhotoItem[] = files
        .slice(0, remaining)
        .map((file) => ({ type: 'new', file }))
      setItems((prev) => [...prev, ...newItems])
      setPhotoError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [items.length]
  )

  const removePhoto = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const movePhoto = useCallback((index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
  }, [])

  // Generate preview URLs for new photos, memoized to avoid re-creating
  const previewUrls = useMemo(() => {
    const map = new Map<File, string>()
    for (const item of items) {
      if (item.type === 'new' && !map.has(item.file)) {
        map.set(item.file, URL.createObjectURL(item.file))
      }
    }
    return map
  }, [items])

  function onSubmit(formData: Step3Data) {
    if (!isEditMode && items.length === 0) {
      setPhotoError('Selecciona al menos una foto')
      return
    }

    // Split ordered items back into two arrays for the store
    const existingPhotoUrls: string[] = []
    const photos: File[] = []
    const photoOrder: Array<{ type: 'existing' | 'new'; index: number }> = []

    for (const item of items) {
      if (item.type === 'existing') {
        photoOrder.push({ type: 'existing', index: existingPhotoUrls.length })
        existingPhotoUrls.push(item.url)
      } else {
        photoOrder.push({ type: 'new', index: photos.length })
        photos.push(item.file)
      }
    }

    updateData({
      ...formData,
      showExactLocation,
      photos,
      existingPhotoUrls,
      photoOrder,
    })
    nextStep()
  }

  const handleLocationChange = useCallback(
    (lat: number, lng: number) => {
      setValue('latitude', lat, { shouldValidate: true })
      setValue('longitude', lng, { shouldValidate: true })
      setHasPinPlaced(true)
    },
    [setValue]
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Location — always visible */}
      <RevealField visible={isRevealed('map')} animate={!wasInitial('map')}>
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
      </RevealField>

      {/* Address fields */}
      <RevealField visible={isRevealed('address')} animate={!wasInitial('address')}>
        <div className="space-y-6">
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
        </div>
      </RevealField>

      {/* Location privacy toggle */}
      <RevealField
        visible={isRevealed('exactLocation')}
        animate={!wasInitial('exactLocation')}
        tooltip="Desactiva para mostrar solo la zona aproximada."
      >
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
                <InfoTip text="Si desactivas esta opción, los compradores solo verán un área aproximada en el mapa. Recomendado para mayor privacidad." />
              </span>
              <p className="text-xs text-text-secondary">
                {showExactLocation
                  ? 'Se mostrara tu direccion completa y ubicacion exacta en el mapa'
                  : 'Se mostrara solo el distrito y una ubicacion aproximada en el mapa'}
              </p>
            </div>
          </label>
        </div>
      </RevealField>

      {/* Photos */}
      <RevealField visible={isRevealed('photos')} animate={!wasInitial('photos')} delay={0.15}>
        <div>
          <h3 className="text-sm font-medium uppercase text-text-primary">
            Fotos ({items.length}/25)
          </h3>
          <p className="mt-1 text-xs text-text-tertiary">
            La primera foto sera la portada de tu publicacion
            <InfoTip text="La portada es la primera imagen que ven los compradores en los resultados de búsqueda. Pon tu mejor foto primero." />
          </p>
          {photoError && (
            <p className="mt-1 text-sm text-error">{photoError}</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item, i) => {
              const src =
                item.type === 'existing'
                  ? cardUrl(item.url)
                  : previewUrls.get(item.file) ?? ''

              return (
                <div
                  key={`photo-${i}`}
                  className="group relative h-24 overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={src}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />

                  {/* Cover badge */}
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      Portada
                    </span>
                  )}

                  {/* Controls overlay */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-1 pt-3 pb-1 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    style={{ opacity: undefined }}
                  >
                    <div className="flex gap-0.5">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(i, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary transition-colors hover:bg-white"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {i < items.length - 1 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(i, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary transition-colors hover:bg-white"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Mobile: always show controls on tap */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-1 pt-3 pb-1 sm:hidden">
                    <div className="flex gap-0.5">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(i, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {i < items.length - 1 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(i, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-text-primary"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Add photo button */}
            {items.length < 25 && (
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

          {items.length === 0 && (
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
      </RevealField>

      {/* Navigation */}
      <RevealField visible={isRevealed('submit')} animate={!wasInitial('submit')} delay={0.3}>
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
      </RevealField>
    </form>
  )
}
