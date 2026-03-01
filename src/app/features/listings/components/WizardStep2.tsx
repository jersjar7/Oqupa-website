import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step2Schema, type Step2Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button, Input } from '@/app/components/ui'
import { PropertyType } from '@/types/enums'

export default function WizardStep2() {
  const { data, updateData, nextStep, prevStep } = useListingFormStore()

  const hasRooms =
    data.propertyType === PropertyType.casa ||
    data.propertyType === PropertyType.departamento

  const {
    register,
    handleSubmit,
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
    },
  })

  function onSubmit(formData: Step2Data) {
    updateData({
      description: formData.description,
      totalAreaInSquareMeters: formData.totalAreaInSquareMeters,
      bedroomCount: hasRooms ? formData.bedroomCount : null,
      bathroomCount: hasRooms ? formData.bathroomCount : null,
      availableParkingSpaces: formData.availableParkingSpaces,
      propertyAmenities: formData.propertyAmenities,
    })
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Descripcion
        </label>
        <textarea
          id="description"
          rows={5}
          placeholder="Describe tu propiedad. Incluye detalles sobre amenidades y caracteristicas especiales. (Minimo 20 caracteres)"
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.description ? 'border-error' : 'border-border'
          }`}
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1.5 text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      {/* Area */}
      <Input
        label="Area total (m²)"
        type="number"
        placeholder="Ej: 120"
        error={errors.totalAreaInSquareMeters?.message}
        {...register('totalAreaInSquareMeters', { valueAsNumber: true })}
      />

      {/* Conditional: Bedrooms & Bathrooms */}
      {hasRooms && (
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
      )}

      {/* Parking */}
      <Input
        label="Estacionamientos (opcional)"
        type="number"
        placeholder="0"
        error={errors.availableParkingSpaces?.message}
        {...register('availableParkingSpaces', { valueAsNumber: true })}
      />

      {/* Navigation */}
      <div className="flex gap-3">
        <Button type="button" variant="ghost" size="lg" onClick={prevStep} className="flex-1">
          Atras
        </Button>
        <Button type="submit" size="lg" className="flex-1">
          Continuar
        </Button>
      </div>
    </form>
  )
}
