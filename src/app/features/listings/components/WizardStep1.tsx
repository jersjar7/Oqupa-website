import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step1Schema, type Step1Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Button } from '@/app/components/ui'
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  LISTING_ROLE_LABELS,
  PropertyType,
  OperationType,
  ListingRole,
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
      role: (data.role || undefined) as Step1Data['role'],
    },
  })

  const selected = watch()

  function onSubmit(formData: Step1Data) {
    updateData(formData)
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Property Type */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">Tipo de propiedad</h3>
        {errors.propertyType && (
          <p className="mt-1 text-sm text-error">{errors.propertyType.message}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.values(PropertyType).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('propertyType', type, { shouldValidate: true })}
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

      {/* Operation Type */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">Tipo de operacion</h3>
        {errors.operationType && (
          <p className="mt-1 text-sm text-error">{errors.operationType.message}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {Object.values(OperationType).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('operationType', type, { shouldValidate: true })}
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

      {/* Role */}
      <div>
        <h3 className="text-sm font-medium text-text-primary">Tu relacion con la propiedad</h3>
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

      <Button type="submit" className="w-full" size="lg">
        Continuar
      </Button>
    </form>
  )
}
