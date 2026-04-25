import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/schemas/listingSchema'
import { PIURA_CENTER } from '@/lib/constants'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useRevealedFields } from '@/hooks/useRevealedFields'
import { Button, Input, InfoTip } from '@/app/components/ui'
import RevealField from './RevealField'
import LocationPicker from './LocationPicker'

export default function WizardStep3() {
  const { data, updateData, nextStep, prevStep, isEditMode } =
    useListingFormStore()

  const [showExactLocation, setShowExactLocation] = useState(data.showExactLocation)
  const [hasPinPlaced, setHasPinPlaced] = useState(() => data.latitude != null)

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
      map: true,
      address: hasPinPlaced,
      exactLocation: (distrito ?? '').length > 0,
      submit: (distrito ?? '').length > 0,
    },
    isEditMode
  )

  function onSubmit(formData: Step3Data) {
    updateData({
      ...formData,
      showExactLocation,
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
