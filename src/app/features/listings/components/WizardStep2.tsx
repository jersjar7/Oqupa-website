import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step2Schema, type Step2Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useRevealedFields } from '@/hooks/useRevealedFields'
import { Button, Input } from '@/app/components/ui'
import RevealField from './RevealField'
import { propertyTypeHasRooms, propertyTypeIsRoom, type PropertyType } from '@/types/enums'

export default function WizardStep2() {
  const { data, updateData, nextStep, prevStep, isEditMode } = useListingFormStore()

  const hasRooms = data.propertyType ? propertyTypeHasRooms(data.propertyType as PropertyType) : false
  const isRoom = data.propertyType ? propertyTypeIsRoom(data.propertyType as PropertyType) : false

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  const areaFilled = typeof area === 'number' && area > 0
  const roomsFilled = !hasRooms || (
    typeof bedrooms === 'number' && bedrooms > 0 &&
    typeof bathrooms === 'number' && bathrooms > 0
  )

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

  function onSubmit(formData: Step2Data) {
    updateData({
      description: formData.description,
      totalAreaInSquareMeters: formData.totalAreaInSquareMeters,
      bedroomCount: hasRooms ? formData.bedroomCount : null,
      bathroomCount: hasRooms ? formData.bathroomCount : null,
      availableParkingSpaces: formData.availableParkingSpaces,
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
            className="mb-1.5 block text-sm font-medium uppercase text-text-primary"
          >
            Descripcion
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="Describe tu propiedad. Incluye detalles sobre amenidades y caracteristicas especiales. (Minimo 20 caracteres)"
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
          label="Area total (m²)"
          type="number"
          placeholder="Ej: 120"
          hint="Área construida de la propiedad. Si es terreno sin construir, ingresa el área total del lote."
          error={errors.totalAreaInSquareMeters?.message}
          {...register('totalAreaInSquareMeters', { valueAsNumber: true })}
        />
      </RevealField>

      {/* Conditional: Bedrooms & Bathrooms */}
      {hasRooms && (
        <RevealField visible={isRevealed('roomCounts')} animate={!wasInitial('roomCounts')}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dormitorios"
              type="number"
              placeholder="Ej: 3"
              error={errors.bedroomCount?.message}
              {...register('bedroomCount', { valueAsNumber: true })}
            />
            <Input
              label="Banos"
              type="number"
              placeholder="Ej: 2"
              error={errors.bathroomCount?.message}
              {...register('bathroomCount', { valueAsNumber: true })}
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
            type="number"
            placeholder="0"
            error={errors.availableParkingSpaces?.message}
            {...register('availableParkingSpaces', { valueAsNumber: true })}
          />

          <div className="flex gap-3">
            <Button type="button" variant="text" onClick={prevStep} className="flex-1">
              Atras
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
