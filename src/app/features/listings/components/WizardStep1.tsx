import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step1Schema, type Step1Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button } from '@/app/components/ui'
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  LISTING_ROLE_LABELS,
  RENTAL_DURATION_TYPE_LABELS,
  VENTA_PROPERTY_TYPES,
  ALQUILER_LONG_TERM_PROPERTY_TYPES,
  ALQUILER_SHORT_TERM_PROPERTY_TYPES,
  PropertyType,
  OperationType,
  RentalDurationType,
  ListingRole,
  isAlquilerOnlyType,
} from '@/types/enums'

export default function WizardStep1() {
  const { data, updateData, nextStep } = useListingFormStore()

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      propertyType: (data.propertyType || undefined) as Step1Data['propertyType'],
      operationType: (data.operationType || undefined) as Step1Data['operationType'],
      rentalDurationType: (data.rentalDurationType || undefined) as Step1Data['rentalDurationType'],
      role: (data.role || undefined) as Step1Data['role'],
    },
  })

  const selected = watch()
  const isAlquiler = selected.operationType === 'alquiler'
  const isShortTerm = selected.rentalDurationType === 'shortTerm'

  // Determine available property types based on operation + rental duration
  const availablePropertyTypes = !isAlquiler
    ? VENTA_PROPERTY_TYPES
    : isShortTerm
      ? ALQUILER_SHORT_TERM_PROPERTY_TYPES
      : ALQUILER_LONG_TERM_PROPERTY_TYPES

  function handleOperationTypeChange(type: OperationType) {
    setValue('operationType', type, { shouldValidate: true })

    if (type === 'venta') {
      // Clear rental duration and reset alquiler-only property types
      setValue('rentalDurationType', '', { shouldValidate: true })
      if (selected.propertyType && isAlquilerOnlyType(selected.propertyType as PropertyType)) {
        setValue('propertyType', undefined as unknown as Step1Data['propertyType'])
      }
    } else {
      // Default to longTerm when switching to alquiler
      if (!selected.rentalDurationType) {
        setValue('rentalDurationType', 'longTerm', { shouldValidate: true })
      }
    }
  }

  function handleRentalDurationChange(type: RentalDurationType) {
    setValue('rentalDurationType', type, { shouldValidate: true })

    // Auto-set hospedaje to shortTerm
    if (selected.propertyType === 'hospedaje' && type !== 'shortTerm') {
      setValue('propertyType', undefined as unknown as Step1Data['propertyType'])
    }

    // Reset property type if not available for this rental duration
    const newAvailableTypes = type === 'shortTerm'
      ? ALQUILER_SHORT_TERM_PROPERTY_TYPES
      : ALQUILER_LONG_TERM_PROPERTY_TYPES

    if (selected.propertyType && !newAvailableTypes.includes(selected.propertyType as PropertyType)) {
      setValue('propertyType', undefined as unknown as Step1Data['propertyType'])
    }
  }

  function handlePropertyTypeChange(type: PropertyType) {
    setValue('propertyType', type as Step1Data['propertyType'], { shouldValidate: true })

    // Auto-set rental duration for hospedaje
    if (type === 'hospedaje') {
      setValue('rentalDurationType', 'shortTerm', { shouldValidate: true })
    }
  }

  function onSubmit(formData: Step1Data) {
    updateData({
      ...formData,
      rentalDurationType: formData.rentalDurationType || '',
    })
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Operation Type */}
      <div>
        <h3 className="text-sm font-medium uppercase text-text-primary">Tipo de operacion</h3>
        {errors.operationType && (
          <p className="mt-1 text-sm text-error">{errors.operationType.message}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {Object.values(OperationType).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleOperationTypeChange(type)}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                selected.operationType === type
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-text-secondary hover:border-primary/30'
              }`}
            >
              {OPERATION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Rental Duration Type (only when Alquiler is selected) */}
      {isAlquiler && (
        <div>
          <h3 className="text-sm font-medium uppercase text-text-primary">Duracion del alquiler</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Object.values(RentalDurationType).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleRentalDurationChange(type)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  selected.rentalDurationType === type
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-text-secondary hover:border-primary/30'
                }`}
              >
                {RENTAL_DURATION_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Property Type */}
      <div>
        <h3 className="text-sm font-medium uppercase text-text-primary">Tipo de propiedad</h3>
        {errors.propertyType && (
          <p className="mt-1 text-sm text-error">{errors.propertyType.message}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {availablePropertyTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handlePropertyTypeChange(type)}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                selected.propertyType === type
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-text-secondary hover:border-primary/30'
              }`}
            >
              {PROPERTY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Role */}
      <div>
        <h3 className="text-sm font-medium uppercase text-text-primary">Tu relacion con la propiedad</h3>
        {errors.role && (
          <p className="mt-1 text-sm text-error">{errors.role.message}</p>
        )}
        <div className="mt-3 grid gap-3">
          {Object.values(ListingRole).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setValue('role', role, { shouldValidate: true })}
              className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                selected.role === role
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-text-secondary hover:border-primary/30'
              }`}
            >
              {LISTING_ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full">
        Continuar
      </Button>
    </form>
  )
}
