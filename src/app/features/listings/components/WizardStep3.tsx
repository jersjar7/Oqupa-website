import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/schemas/listingSchema'
import { PIURA_CENTER } from '@/lib/constants'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useRevealedFields } from '@/hooks/useRevealedFields'
import { Button, Input, InfoTip } from '@/app/components/ui'
import RevealField from './RevealField'
// Mapbox is large: loaded only when this step is shown.
const LocationPicker = lazy(() => import('./LocationPicker'))
import OfficialDistrictPicker from './OfficialDistrictPicker'
import { DistrictResolver } from '@/lib/map/districtResolver'
import { findDistrict, type PeruDistrict } from '@/lib/map/peruGeography'

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
  const provincia = watch('provincia')
  const departamento = watch('departamento')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Map plan step 1 (ADR-031): district, provincia and departamento come from
  // the official outlines, never free text. A pin outside every outline leaves
  // them empty and the owner chooses from the official list.
  const applyDistrict = useCallback(
    (d: PeruDistrict | null) => {
      setValue('distrito', d?.distrito ?? '', { shouldValidate: true })
      setValue('provincia', d?.provincia ?? '', { shouldValidate: true })
      setValue('departamento', d?.departamento ?? '', { shouldValidate: true })
    },
    [setValue],
  )

  // Editing an older listing: show (and re-save) the official spelling.
  useEffect(() => {
    if (!data.distrito) return
    const official = findDistrict(data.distrito, data.provincia)
    if (official) applyDistrict(official)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      DistrictResolver.load()
        .then((r) => applyDistrict(r.districtForPin(lat, lng)))
        .catch(() => applyDistrict(null))
    },
    [setValue, applyDistrict]
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Location — always visible */}
      <RevealField visible={isRevealed('map')} animate={!wasInitial('map')}>
        <div>
          <h3 className="text-sm font-medium uppercase text-text-primary">Ubicación</h3>

          <div className="mt-3">
            <Suspense fallback={<div className="h-[300px] rounded-xl border border-border bg-cream" />}>
              <LocationPicker
                latitude={watchedLat ?? null}
                longitude={watchedLng ?? null}
                onChange={handleLocationChange}
              />
            </Suspense>
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

          {/* District — from the pin; corrected only from the official list. */}
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium uppercase text-text-primary">Distrito</p>
            {distrito ? (
              <p className="mt-1 text-base text-text-primary">
                {[distrito, provincia, departamento].filter(Boolean).join(', ')}
              </p>
            ) : (
              <p className="mt-1 text-sm text-error">Elige el distrito</p>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-2 text-sm font-medium text-secondary underline underline-offset-2"
            >
              Cambiar distrito
            </button>
            {(errors.distrito || errors.provincia) && !distrito && (
              <p className="mt-1.5 text-sm text-error">{errors.distrito?.message ?? errors.provincia?.message}</p>
            )}
          </div>
          {pickerOpen && (
            <OfficialDistrictPicker
              onPick={(d) => {
                applyDistrict(d)
                setPickerOpen(false)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
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
