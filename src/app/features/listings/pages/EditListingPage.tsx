import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useListingDetails } from '@/hooks/useListings'
import { Spinner } from '@/app/components/ui'
import WizardProgress from '../components/WizardProgress'
import WizardStep1 from '../components/WizardStep1'
import WizardStep2 from '../components/WizardStep2'
import WizardStep3 from '../components/WizardStep3'
import WizardStep4 from '../components/WizardStep4'
import WizardStep5 from '../components/WizardStep5'
import { firestoreService } from '@/services/firestoreService'

const stepVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction * 50,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -50,
  }),
}

export default function EditListingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: result, isLoading, error } = useListingDetails(id)
  const { step, direction, updateData, setStep, setEditMode, reset } =
    useListingFormStore()
  const [initialized, setInitialized] = useState(false)

  // Pre-fill form with existing data.
  //
  // For a listing that hides its exact location, the public property document
  // holds only the blurred point (ADR-015 Phase 2). Pre-filling from it would
  // show the owner a pin 100-350m from their own house, and inviting them to
  // "correct" a position that is deliberately wrong is how a real address gets
  // lost. Read the true values from the owner-only record instead; anyone who
  // is not the owner gets null and never reaches this page anyway.
  useEffect(() => {
    if (!result || initialized) return

    const { listing, property } = result
    let cancelled = false

    async function prefill() {
      const trueLocation = listing.showExactLocation
        ? null
        : await firestoreService.getPrivatePropertyLocation(property.id)
      if (cancelled) return
      applyPrefill(trueLocation)
    }

    function applyPrefill(trueLocation: {
      latitude: number
      longitude: number
      calle: string
    } | null) {
    reset()
    setEditMode(listing.id, property.id)
    updateData({
      propertyType: property.propertyType,
      operationType: property.operationType,
      rentalDurationType: property.rentalDurationType || '',
      hasPrivateBathroom: property.specs?.hasPrivateBathroom ?? false,
      role: listing.role,
      description: listing.description,
      totalAreaInSquareMeters: property.specs.totalAreaInSquareMeters,
      bedroomCount: property.specs.bedroomCount ?? null,
      bathroomCount: property.specs.bathroomCount ?? null,
      availableParkingSpaces: property.specs.availableParkingSpaces,
      propertyAmenities: property.specs.propertyAmenities,
      latitude: trueLocation?.latitude ?? property.location.latitude,
      longitude: trueLocation?.longitude ?? property.location.longitude,
      calle: trueLocation?.calle ?? property.location.calle,
      distrito: property.location.distrito,
      provincia: property.location.provincia,
      departamento: property.location.departamento,
      existingPhotoUrls: property.media.photoKeys ?? property.media.propertyPhotoUrls,
      existingPhotoBlurHashes: property.media.photoBlurHashes ?? [],
      originalExistingPhotoUrls:
        property.media.photoKeys ?? property.media.propertyPhotoUrls,
      photos: [],
      amount: listing.price.amount,
      currency: listing.price.currency,
      wantsRealtorHelp: listing.wantsRealtorHelp,
      maxRealtors: listing.maxRealtors,
    })
    setStep(1)
    setInitialized(true)
    }

    void prefill()
    return () => {
      cancelled = true
    }
  }, [result, initialized]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-error">No se pudo cargar la publicacion</p>
        <button
          onClick={() => navigate('/app')}
          className="text-base text-secondary hover:text-secondary-hover"
        >
          Volver al dashboard
        </button>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[28px] font-normal text-text-primary">
        Editar Publicacion
      </h1>
      <p className="mt-1 text-base text-text-secondary">
        Modifica los datos de tu propiedad
      </p>

      <div className="mt-8">
        <WizardProgress currentStep={step} />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {step === 1 && <WizardStep1 />}
            {step === 2 && <WizardStep2 />}
            {step === 3 && <WizardStep3 />}
            {step === 4 && <WizardStep4 />}
            {step === 5 && <WizardStep5 />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
