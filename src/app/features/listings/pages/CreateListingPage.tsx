import { useEffect } from 'react'
import { useListingFormStore } from '@/stores/listingFormStore'
import WizardProgress from '../components/WizardProgress'
import WizardStep1 from '../components/WizardStep1'
import WizardStep2 from '../components/WizardStep2'
import WizardStep3 from '../components/WizardStep3'
import WizardStep4 from '../components/WizardStep4'

export default function CreateListingPage() {
  const { step, isEditMode, reset } = useListingFormStore()

  // Reset if coming from edit mode (only on mount)
  useEffect(() => {
    if (isEditMode) reset()
  }, [isEditMode, reset])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-2xl font-bold text-text-primary">
        Crear Publicacion
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Completa los datos de tu propiedad
      </p>

      <div className="mt-8">
        <WizardProgress currentStep={step} />

        {step === 1 && <WizardStep1 />}
        {step === 2 && <WizardStep2 />}
        {step === 3 && <WizardStep3 />}
        {step === 4 && <WizardStep4 />}
      </div>
    </div>
  )
}
