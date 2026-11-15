import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step1Schema, type Step1Data } from '@/schemas/listingSchema'
import { useListingFormStore } from '@/stores/listingFormStore'
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_DESCRIPTIONS,
  LISTING_ROLE_LABELS,
  VENTA_PROPERTY_TYPES,
  ALQUILER_LONG_TERM_PROPERTY_TYPES,
  ALQUILER_SHORT_TERM_PROPERTY_TYPES,
  ListingRole,
  type PropertyType,
} from '@/types/enums'
import WizardNav from './WizardNav'
import { focusFirstError } from '../useWizardPageChange'
import { WIZARD_HEADING, choiceButtonClass, choiceClass } from './wizardStyles'

/** The three answers to "¿Vendes o alquilas?" (D2): the plazo is part of the answer. */
type Deal = 'venta' | 'mes' | 'noche'

const DEALS: Array<{ deal: Deal; label: string }> = [
  { deal: 'venta', label: 'Venta' },
  { deal: 'mes', label: 'Alquiler por mes' },
  { deal: 'noche', label: 'Alquiler por noche' },
]

const DEAL_FIELDS: Record<Deal, Pick<Step1Data, 'operationType' | 'rentalDurationType'>> = {
  venta: { operationType: 'venta', rentalDurationType: '' },
  mes: { operationType: 'alquiler', rentalDurationType: 'longTerm' },
  noche: { operationType: 'alquiler', rentalDurationType: 'shortTerm' },
}

const TYPES_FOR: Record<Deal, PropertyType[]> = {
  venta: VENTA_PROPERTY_TYPES,
  mes: ALQUILER_LONG_TERM_PROPERTY_TYPES,
  noche: ALQUILER_SHORT_TERM_PROPERTY_TYPES,
}

function dealOf(operationType: string | undefined, rentalDurationType: string | undefined): Deal | null {
  if (operationType === 'venta') return 'venta'
  if (operationType !== 'alquiler') return null
  if (rentalDurationType === 'shortTerm') return 'noche'
  // An older Alquiler saved without a length: nothing chosen, so the person
  // picks one (hostile review 2026-11-02).
  return rentalDurationType === 'longTerm' ? 'mes' : null
}

export default function WizardStep1() {
  const navigate = useNavigate()
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
      // D3: the owner is the usual case, so it is chosen from the start.
      role: (data.role || 'owner') as Step1Data['role'],
    },
  })

  const selected = watch()
  const deal = dealOf(selected.operationType, selected.rentalDurationType)
  const availableTypes = deal ? TYPES_FOR[deal] : []
  // The choices open only when asked for; picking one closes them again.
  const [roleOpen, setRoleOpen] = useState(false)
  const role = (selected.role || 'owner') as ListingRole

  function chooseDeal(next: Deal) {
    const fields = DEAL_FIELDS[next]
    setValue('operationType', fields.operationType, { shouldValidate: true })
    setValue('rentalDurationType', fields.rentalDurationType, { shouldValidate: true })
    // A type that this answer does not offer (a Cuarto for sale) is cleared.
    if (selected.propertyType && !TYPES_FOR[next].includes(selected.propertyType as PropertyType)) {
      setValue('propertyType', undefined as unknown as Step1Data['propertyType'])
    }
  }

  function onSubmit(formData: Step1Data) {
    updateData({
      ...formData,
      rentalDurationType: formData.operationType === 'alquiler' ? formData.rentalDurationType || 'longTerm' : '',
    })
    nextStep()
  }

  const dealError = errors.operationType?.message ?? errors.rentalDurationType?.message

  return (
    <form onSubmit={handleSubmit(onSubmit, focusFirstError)} className="space-y-8">
      <section>
        <h2 className={WIZARD_HEADING}>¿Vendes o alquilas?</h2>
        {dealError && <p data-wizard-error className="mt-1 text-sm text-error">{dealError}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {DEALS.map(({ deal: d, label }) => (
            <button
              key={d}
              type="button"
              aria-pressed={deal === d}
              onClick={() => chooseDeal(d)}
              className={choiceButtonClass(deal === d)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {deal && (
        <section>
          <h2 className={WIZARD_HEADING}>Tipo de propiedad</h2>
          {errors.propertyType && <p data-wizard-error className="mt-1 text-sm text-error">{errors.propertyType.message}</p>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {availableTypes.map((type) => {
              const on = selected.propertyType === type
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setValue('propertyType', type as Step1Data['propertyType'], { shouldValidate: true })}
                  className={`flex min-h-14 flex-col items-start justify-center rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                    on ? 'border-secondary bg-secondary text-white' : 'border-border bg-white text-text-primary hover:border-secondary/40'
                  }`}
                >
                  <span className="text-base font-medium">{PROPERTY_TYPE_LABELS[type]}</span>
                  <span className={`text-sm ${on ? 'text-white' : 'text-text-secondary'}`}>
                    {PROPERTY_TYPE_DESCRIPTIONS[type]}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section>
        {errors.role && <p data-wizard-error className="mb-1 text-sm text-error">{errors.role.message}</p>}
        {roleOpen ? (
          <div className="grid gap-3">
            {Object.values(ListingRole).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={selected.role === r}
                onClick={() => {
                  setValue('role', r, { shouldValidate: true })
                  setRoleOpen(false)
                }}
                className={choiceClass(selected.role === r)}
              >
                {LISTING_ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-4 py-2">
            <span className="flex items-center gap-2 text-base text-text-primary">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {LISTING_ROLE_LABELS[role]}
            </span>
            <button
              type="button"
              onClick={() => setRoleOpen(true)}
              className="min-h-12 text-base text-secondary underline underline-offset-2 hover:text-secondary-hover"
            >
              {role === 'owner' ? '¿No eres el dueño?' : 'Cambiar'}
            </button>
          </div>
        )}
      </section>

      <WizardNav onBack={() => navigate(-1)} />
    </form>
  )
}
