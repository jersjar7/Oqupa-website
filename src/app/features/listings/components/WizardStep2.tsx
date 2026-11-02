import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step2Schema, type Step2Data, MAX_COUNT, minBedrooms, descriptionHint } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import { Input } from '@/app/components/ui'
import { propertyTypeHasRooms, propertyTypeIsRoom, type PropertyType } from '@/types/enums'
import { parseLocaleNumber } from '@/lib/localeNumber'
import { bedroomsLabel } from '@/lib/roomCounts'
import { editAwareResolver } from '../editLimits'
import WizardNav from './WizardNav'
import { focusFirstError } from '../useWizardPageChange'
import WizardStepper from './WizardStepper'
import WizardAmenities from './WizardAmenities'
import { WIZARD_HEADING, choiceClass } from './wizardStyles'

/** A finite number, or null — what the draft can keep of a half-typed box. */
const kept = (n: number | null | undefined): number | null =>
  typeof n === 'number' && Number.isFinite(n) ? n : null

// The area box is text so "120,5" can be typed; a default value arrives as a number.
const readArea = (v: unknown) => (typeof v === 'number' ? v : parseLocaleNumber(String(v ?? '')))

/** Oficina and Local: baños optional, from 0 (as the app). */
const hasOptionalBathrooms = (t: string) => t === 'oficina' || t === 'local'

export default function WizardStep2() {
  const { data, updateData, nextStep, prevStep, isEditMode } = useListingFormStore()

  const type = (data.propertyType || '') as PropertyType | ''
  const hasRooms = type ? propertyTypeHasRooms(type) : false
  const isRoom = type ? propertyTypeIsRoom(type) : false
  const optionalBaths = hasOptionalBathrooms(type)
  const bedMin = hasRooms ? minBedrooms(type) : 0
  const bathMin = hasRooms ? 1 : 0

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: editAwareResolver(zodResolver(step2Schema)),
    defaultValues: {
      propertyType: data.propertyType,
      description: data.description,
      totalAreaInSquareMeters: data.totalAreaInSquareMeters ?? undefined,
      // − / + start from a sensible count instead of an empty box (D4).
      // An older listing's count is shown as it is — even below today's
      // minimum, even missing — so an edit that leaves it alone does not
      // change it (hostile review #6). A new listing starts at 1 / 1.
      bedroomCount: hasRooms ? (isEditMode ? data.bedroomCount : data.bedroomCount ?? 1) : null,
      bathroomCount: hasRooms
        ? (isEditMode ? data.bathroomCount : data.bathroomCount ?? 1)
        : optionalBaths ? data.bathroomCount ?? 0 : null,
      availableParkingSpaces: data.availableParkingSpaces ?? 0,
      propertyAmenities: data.propertyAmenities ?? [],
      hasPrivateBathroom: data.hasPrivateBathroom ?? false,
    },
  })

  const description = watch('description') ?? ''
  const bedrooms = watch('bedroomCount') ?? null
  const bathrooms = watch('bathroomCount') ?? null
  const parking = watch('availableParkingSpaces') ?? 0
  const amenities = watch('propertyAmenities') ?? []
  const hasPrivateBathroom = watch('hasPrivateBathroom')

  // Everything on the page goes into the draft as it changes, so ATRÁS (or
  // the browser's back button), a refresh and coming back find it there.
  useEffect(() => {
    const sub = watch((v) =>
      updateData({
        description: v.description ?? '',
        totalAreaInSquareMeters: kept(v.totalAreaInSquareMeters),
        bedroomCount: kept(v.bedroomCount),
        bathroomCount: kept(v.bathroomCount),
        availableParkingSpaces: kept(v.availableParkingSpaces) ?? 0,
        propertyAmenities: (v.propertyAmenities ?? []).filter((a): a is string => typeof a === 'string'),
        hasPrivateBathroom: v.hasPrivateBathroom ?? false,
      }),
    )
    return () => sub.unsubscribe()
  }, [watch, updateData])

  const setCount = (field: 'bedroomCount' | 'bathroomCount' | 'availableParkingSpaces') => (n: number) =>
    setValue(field, n, { shouldValidate: Boolean(errors[field]) })

  function onSubmit(formData: Step2Data) {
    const baths = formData.bathroomCount ?? null
    updateData({
      // Saved without spaces at the ends, as the app saves it.
      description: formData.description.trim(),
      totalAreaInSquareMeters: formData.totalAreaInSquareMeters,
      bedroomCount: hasRooms ? formData.bedroomCount ?? null : null,
      // Oficina / Local: 0 baños is "not said", as the app keeps it.
      bathroomCount: hasRooms ? baths : optionalBaths && baths ? baths : null,
      availableParkingSpaces: formData.availableParkingSpaces ?? 0,
      propertyAmenities: formData.propertyAmenities,
      hasPrivateBathroom: isRoom ? (formData.hasPrivateBathroom ?? false) : false,
    })
    nextStep()
  }

  const hint = descriptionHint(description)
  const descriptionError = errors.description
    ? (hint ?? errors.description.message)
    : null

  return (
    <form onSubmit={handleSubmit(onSubmit, focusFirstError)} className="space-y-8">
      <section>
        <label htmlFor="description" className={`${WIZARD_HEADING} block`}>
          Descripción
        </label>
        <textarea
          id="description"
          rows={5}
          aria-invalid={descriptionError ? 'true' : undefined}
          placeholder="Cuenta cómo es tu propiedad: lo que más te gusta, qué hay cerca."
          className={`mt-3 w-full rounded-xl border bg-white px-4 py-2.5 text-base text-text-primary placeholder:text-text-tertiary transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 ${
            descriptionError ? 'border-error' : 'border-border'
          }`}
          {...register('description')}
        />
        {descriptionError ? (
          <p className="mt-1.5 text-sm text-error">{descriptionError}</p>
        ) : (
          hint && <p className="mt-1.5 text-sm text-text-secondary">{hint}</p>
        )}
      </section>

      <section>
        <h2 className={WIZARD_HEADING}>Medidas</h2>
        <div className="mt-3">
          <Input
            label="Área total (m²)"
            type="text"
            inputMode="decimal"
            placeholder="Ej: 120"
            hint="Área construida de la propiedad. Si es terreno sin construir, ingresa el área total del lote."
            error={errors.totalAreaInSquareMeters?.message}
            {...register('totalAreaInSquareMeters', { setValueAs: readArea })}
          />
        </div>
        <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-white px-4">
          {hasRooms && (
            <WizardStepper
              label="Dormitorios"
              value={bedrooms}
              min={bedMin}
              max={MAX_COUNT}
              onChange={setCount('bedroomCount')}
              display={(n) => bedroomsLabel(n, { bare: true, propertyType: type })}
            />
          )}
          {(hasRooms || optionalBaths) && (
            <WizardStepper label="Baños" value={bathrooms} min={bathMin} max={MAX_COUNT} onChange={setCount('bathroomCount')} />
          )}
          <WizardStepper
            label="Estacionamientos"
            value={parking}
            min={0}
            max={MAX_COUNT}
            onChange={setCount('availableParkingSpaces')}
          />
        </div>
        {(errors.bedroomCount || errors.bathroomCount || errors.availableParkingSpaces) && (
          <p data-wizard-error className="mt-1.5 text-sm text-error">
            {errors.bedroomCount?.message ?? errors.bathroomCount?.message ?? errors.availableParkingSpaces?.message}
          </p>
        )}

        {isRoom && (
          <div className="mt-4">
            <p className="text-base text-text-primary">Baño privado</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={hasPrivateBathroom === v}
                  onClick={() => setValue('hasPrivateBathroom', v)}
                  className={choiceClass(hasPrivateBathroom === v)}
                >
                  {v ? 'Sí' : 'No'}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className={WIZARD_HEADING}>¿Qué tiene?</h2>
        <div className="mt-3">
          <WizardAmenities
            chosen={amenities}
            isShortStay={data.rentalDurationType === 'shortTerm'}
            onChange={(next) => setValue('propertyAmenities', next, { shouldValidate: Boolean(errors.propertyAmenities) })}
          />
        </div>
        {errors.propertyAmenities && <p data-wizard-error className="mt-1.5 text-sm text-error">{errors.propertyAmenities.message}</p>}
      </section>

      <WizardNav onBack={prevStep} />
    </form>
  )
}
