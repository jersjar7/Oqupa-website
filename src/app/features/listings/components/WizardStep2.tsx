import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step2Schema, type Step2Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useRevealedFields } from '@/hooks/useRevealedFields'
import { Button, Input } from '@/app/components/ui'
import RevealField from './RevealField'
import { propertyTypeHasRooms, propertyTypeIsRoom, type PropertyType } from '@/types/enums'
import { parseCount, parseLocaleNumber } from '@/lib/localeNumber'

/** A finite number, or null — what the draft can keep of a half-typed box. */
const kept = (n: number | null | undefined): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? n : null

// The boxes are text so "120,5" can be typed; a default value arrives as a number.
const readArea = (v: unknown) => (typeof v === 'number' ? v : parseLocaleNumber(String(v ?? '')))
const readCount = (v: unknown) => (typeof v === 'number' ? v : parseCount(String(v ?? '')))

/** What the draft keeps of the page as it stands, checked or not. */
const asDraft = (v: Partial<Step2Data>) => ({
  description: v.description ?? '',
  totalAreaInSquareMeters: kept(v.totalAreaInSquareMeters),
  bedroomCount: kept(v.bedroomCount),
  bathroomCount: kept(v.bathroomCount),
  availableParkingSpaces: kept(v.availableParkingSpaces) ?? 0,
  hasPrivateBathroom: v.hasPrivateBathroom ?? false,
})

export default function WizardStep2() {
  const { data, updateData, nextStep, prevStep, isEditMode } = useListingFormStore()

  const hasRooms = data.propertyType ? propertyTypeHasRooms(data.propertyType as PropertyType) : false
  const isRoom = data.propertyType ? propertyTypeIsRoom(data.propertyType as PropertyType) : false

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      propertyType: data.propertyType,
      description: data.description,
      totalAreaInSquareMeters: data.totalAreaInSquareMeters ?? undefined,
      bedroomCount: data.bedroomCount,
      bathroomCount: data.bathroomCount,
      availableParkingSpaces: data.availableParkingSpaces,
      propertyAmenities: data.propertyAmenities,
      hasPrivateBathroom: data.hasPrivateBathroom ?? false,
    },
  })

  const description = watch('description')
  const area = watch('totalAreaInSquareMeters')
  const bedrooms = watch('bedroomCount')
  const bathrooms = watch('bathroomCount')
  const hasPrivateBathroom = watch('hasPrivateBathroom')

  // "Filled" means something was typed. Whether it is right is for the check
  // on CONTINUAR, which explains in Spanish — a box that silently keeps the
  // next field hidden explains nothing (0 dormitorios used to do exactly that).
  const typed = (v: unknown) => v !== null && v !== undefined
  const areaFilled = typed(area)
  const roomsFilled = !hasRooms || (typed(bedrooms) && typed(bathrooms))

  // Everything typed goes into the draft as it is typed, so ATRÁS (or the
  // browser's back button) and coming back find it all still there.
  useEffect(() => {
    const sub = watch((v) => updateData(asDraft(v as Partial<Step2Data>)))
    return () => sub.unsubscribe()
  }, [watch, updateData])

  const { isRevealed, wasInitial } = useRevealedFields(
    {
      description: true, // always visible
      totalArea: (description ?? '').length > 0,
      roomCounts: areaFilled && hasRooms,
      privateBathroom: areaFilled && isRoom,
      parkingAndSubmit: areaFilled && roomsFilled,
    },
    isEditMode
  )

  function goBack() {
    // What is on screen, checked or not, stays in the draft.
    updateData(asDraft(getValues()))
    prevStep()
  }

  function onSubmit(formData: Step2Data) {
    updateData({
      description: formData.description,
      totalAreaInSquareMeters: formData.totalAreaInSquareMeters,
      bedroomCount: hasRooms ? formData.bedroomCount : null,
      bathroomCount: hasRooms ? formData.bathroomCount : null,
      // An empty box means no parking.
      availableParkingSpaces: formData.availableParkingSpaces ?? 0,
      propertyAmenities: formData.propertyAmenities,
      hasPrivateBathroom: isRoom ? (formData.hasPrivateBathroom ?? false) : false,
    })
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Description — always visible */}
      <RevealField visible={isRevealed('description')} animate={!wasInitial('description')}>
        <div>
          <label
            htmlFor="description"
            className="mb-1.5 block font-sans font-medium uppercase text-xs text-secondary"
          >
            Descripción
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="Describe tu propiedad. Incluye detalles sobre amenidades y características especiales. (Mínimo 20 caracteres)"
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-base text-text-primary placeholder:text-text-tertiary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              errors.description ? 'border-error' : 'border-border'
            }`}
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1.5 text-sm text-error">{errors.description.message}</p>
          )}
        </div>
      </RevealField>

      {/* Area */}
      <RevealField
        visible={isRevealed('totalArea')}
        animate={!wasInitial('totalArea')}
        tooltip="Incluye toda la superficie construida o del lote."
      >
        <Input
          label="Área total (m²)"
          type="text"
          inputMode="decimal"
          placeholder="Ej: 120"
          hint="Área construida de la propiedad. Si es terreno sin construir, ingresa el área total del lote."
          error={errors.totalAreaInSquareMeters?.message}
          {...register('totalAreaInSquareMeters', { setValueAs: readArea })}
        />
      </RevealField>

      {/* Conditional: Bedrooms & Bathrooms */}
      {hasRooms && (
        <RevealField visible={isRevealed('roomCounts')} animate={!wasInitial('roomCounts')}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dormitorios"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 3"
              error={errors.bedroomCount?.message}
              {...register('bedroomCount', { setValueAs: readCount })}
            />
            <Input
              label="Baños"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 2"
              error={errors.bathroomCount?.message}
              {...register('bathroomCount', { setValueAs: readCount })}
            />
          </div>
        </RevealField>
      )}

      {/* Private Bathroom (only for habitacion) */}
      {isRoom && (
        <RevealField visible={isRevealed('privateBathroom')} animate={!wasInitial('privateBathroom')}>
          <div>
            <h3 className="text-sm font-medium uppercase text-text-primary">Baño privado</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setValue('hasPrivateBathroom', value)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    hasPrivateBathroom === value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-text-secondary hover:border-primary/30'
                  }`}
                >
                  {value ? 'Sí' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </RevealField>
      )}

      {/* Parking + Navigation */}
      <RevealField visible={isRevealed('parkingAndSubmit')} animate={!wasInitial('parkingAndSubmit')}>
        <div className="space-y-6">
          <Input
            label="Estacionamientos (opcional)"
            type="text"
            inputMode="numeric"
            placeholder="0"
            error={errors.availableParkingSpaces?.message}
            {...register('availableParkingSpaces', { setValueAs: readCount })}
          />

          <div className="flex gap-3">
            <Button type="button" variant="text" onClick={goBack} className="flex-1">
              Atrás
            </Button>
            <Button type="submit" className="flex-1">
              Continuar
            </Button>
          </div>
        </div>
      </RevealField>
    </form>
  )
}
