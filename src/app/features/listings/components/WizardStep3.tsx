import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { PIURA_CENTER } from '@/lib/constants'
import { Input } from '@/app/components/ui'
// Mapbox is large: loaded only when this step is shown.
const LocationPicker = lazy(() => import('./LocationPicker'))
import OfficialDistrictPicker from './OfficialDistrictPicker'
import WizardNav from './WizardNav'
import { focusFirstError } from '../useWizardPageChange'
import WizardAddressSearch from './WizardAddressSearch'
import { WIZARD_HEADING, choiceButtonClass } from './wizardStyles'
import { WIZARD_BUTTON } from './WizardNav'
import { DistrictResolver } from '@/lib/map/districtResolver'
import { DepartamentoBorder } from '@/lib/map/departamentoBorder'
import { findDistrict, type PeruDistrict } from '@/lib/map/peruGeography'
import type { AddressResult } from '@/lib/map/addressSearch'

type Point = { lat: number; lng: number }

const TAP_HINT = 'Toca el mapa donde está tu propiedad o busca la dirección.'

export default function WizardStep3() {
  const { data, updateData, nextStep, prevStep, isEditMode } = useListingFormStore()

  const [showExactLocation, setShowExactLocation] = useState(data.showExactLocation)
  const [hasPinPlaced, setHasPinPlaced] = useState(() => data.latitude != null)
  // A place waiting for the person's yes — where they are (D6), or a search
  // result — while the page asks "¿Ubicación es correcta?". Only a yes (or a
  // tap on the map) places the pin: the saved point is always the person's
  // confirmed pin, never a geocoding result as such (hostile review).
  const [here, setHere] = useState<(Point & { street?: string }) | null>(null)
  // Where the map should move to (the person, or a search result).
  const [focus, setFocus] = useState<(Point & { key: number }) | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      // No pin until the person places one: never a silent city-centre pin.
      latitude: (data.latitude ?? undefined) as number,
      longitude: (data.longitude ?? undefined) as number,
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
  // True while the district for a fresh pin is being worked out: nothing is
  // wrong yet, so no red "Elige el distrito".
  const [findingDistrict, setFindingDistrict] = useState(false)

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

  const pinPlacedRef = useRef(hasPinPlaced)
  pinPlacedRef.current = hasPinPlaced

  // D6: with no pin yet, the map opens where the person is — if they allow
  // it and they are in Piura — and asks whether the property is there.
  useEffect(() => {
    if (hasPinPlaced || isEditMode) return
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined
    if (!geo) return
    let cancelled = false
    try {
      geo.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          DepartamentoBorder.load()
            .then((b) => b.contains(p.lat, p.lng))
            .catch(() => false)
            .then((inside) => {
              if (cancelled || !inside || pinPlacedRef.current) return
              setHere(p)
              setFocus({ ...p, key: Date.now() })
            })
        },
        () => {
          // Refused or unavailable: the map stays on Piura and says what to do.
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      )
    } catch {
      // Some browsers throw instead of calling back.
    }
    return () => {
      cancelled = true
    }
    // Asked once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Everything on this page goes into the draft as it changes, so ATRÁS (or
  // the browser's back button) and coming back find it all still there. The
  // pin only once the person placed it.
  useEffect(() => {
    const sub = watch((v) => {
      updateData({
        calle: v.calle ?? '',
        urbanizacion: v.urbanizacion ?? '',
        distrito: v.distrito ?? '',
        provincia: v.provincia ?? '',
        departamento: v.departamento ?? '',
        ...(pinPlacedRef.current && typeof v.latitude === 'number' && typeof v.longitude === 'number'
          ? { latitude: v.latitude, longitude: v.longitude }
          : {}),
      })
    })
    return () => sub.unsubscribe()
  }, [watch, updateData])

  function changeShowExactLocation(value: boolean) {
    setShowExactLocation(value)
    updateData({ showExactLocation: value })
  }

  function onSubmit(formData: Step3Data) {
    updateData({
      ...formData,
      showExactLocation,
    })
    nextStep()
  }

  const handleLocationChange = useCallback(
    (lat: number, lng: number) => {
      pinPlacedRef.current = true
      setHere(null)
      setValue('latitude', lat, { shouldValidate: true })
      setValue('longitude', lng, { shouldValidate: true })
      setHasPinPlaced(true)
      setFindingDistrict(true)
      DistrictResolver.load()
        .then((r) => applyDistrict(r.districtForPin(lat, lng)))
        .catch(() => applyDistrict(null))
        .finally(() => setFindingDistrict(false))
    },
    [setValue, applyDistrict]
  )

  function chooseResult(r: AddressResult) {
    setFocus({ lat: r.latitude, lng: r.longitude, key: Date.now() })
    setHere({ lat: r.latitude, lng: r.longitude, ...(r.isStreet ? { street: r.name } : {}) })
  }

  function confirmHere() {
    if (!here) return
    const { street } = here
    handleLocationChange(here.lat, here.lng)
    // A street from the search is a good start for "Dirección" — never over
    // what the person already typed.
    if (street && !getValues('calle')) setValue('calle', street, { shouldValidate: true })
  }

  const pinned = typeof watchedLat === 'number' && typeof watchedLng === 'number'

  return (
    <form onSubmit={handleSubmit(onSubmit, focusFirstError)} className="space-y-8">
      <section>
        <h2 className={WIZARD_HEADING}>Ubicación</h2>
        <div className="mt-3">
          <WizardAddressSearch near={here ?? (pinned ? { lat: watchedLat, lng: watchedLng } : PIURA_CENTER)} onChoose={chooseResult} />
        </div>
        <div className="mt-3">
          <Suspense fallback={<div className="h-[300px] rounded-xl border border-border bg-cream" />}>
            <LocationPicker
              latitude={pinned ? watchedLat : null}
              longitude={pinned ? watchedLng : null}
              provisional={here}
              focus={focus}
              onChange={handleLocationChange}
            />
          </Suspense>
        </div>
        {here ? (
          <div className="mt-3 rounded-xl border border-border bg-white p-4">
            <p className={WIZARD_HEADING}>¿Ubicación es correcta?</p>
            {/* As the app's map: NO outlined, then SÍ filled (2026-11-13). */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHere(null)}
                className={`${WIZARD_BUTTON} border-[1.5px] border-secondary bg-white text-secondary hover:border-secondary-hover hover:text-secondary-hover`}
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmHere}
                className={`${WIZARD_BUTTON} bg-secondary text-white hover:bg-secondary-hover`}
              >
                Sí
              </button>
            </div>
          </div>
        ) : (
          !pinned && <p className="mt-2 text-base text-text-secondary">{TAP_HINT}</p>
        )}
        {(errors.latitude || errors.longitude) && (
          <p data-wizard-error className="mt-1.5 text-sm text-error">Selecciona una ubicación en el mapa</p>
        )}
      </section>

      {hasPinPlaced && (
        <section className="space-y-6">
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
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm font-medium uppercase text-text-primary">Distrito</p>
            {findingDistrict ? (
              <p className="mt-1 text-sm text-text-tertiary">Buscando el distrito…</p>
            ) : distrito ? (
              <p className="mt-1 text-base text-text-primary">
                {[distrito, provincia, departamento].filter(Boolean).join(', ')}
              </p>
            ) : (
              <p data-wizard-error className="mt-1 text-sm text-error">Elige el distrito</p>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-1 min-h-12 text-base font-medium text-secondary underline underline-offset-2"
            >
              Cambiar distrito
            </button>
            {(errors.distrito || errors.provincia) && !distrito && !findingDistrict && (
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

          <div>
            <h2 className={WIZARD_HEADING}>¿Mostrar tu dirección exacta?</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={showExactLocation === v}
                  onClick={() => changeShowExactLocation(v)}
                  className={choiceButtonClass(showExactLocation === v)}
                >
                  {v ? 'Sí' : 'No'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {showExactLocation
                ? 'Se mostrará tu dirección completa y ubicación exacta en el mapa'
                : 'Se mostrará solo el distrito y una ubicación aproximada en el mapa'}
            </p>
          </div>
        </section>
      )}

      <WizardNav onBack={prevStep} />
    </form>
  )
}
