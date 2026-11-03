import { useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useSetPageMeta } from '@/app/components/shell/pageMetaContext'
import WizardProgress from '../components/WizardProgress'
import WizardStep1 from '../components/WizardStep1'
import WizardStep2 from '../components/WizardStep2'
import WizardStep3 from '../components/WizardStep3'
import WizardStep4 from '../components/WizardStep4'
import WizardStep5 from '../components/WizardStep5'
import { useScrollTopOnPageChange } from '../useWizardPageChange'

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

export default function CreateListingPage() {
  useSetPageMeta({
    title: 'Crear publicación',
    subtitle: 'Completa los datos de tu propiedad',
  })
  const { step, direction, reset, leaveEdit, draftVersion } = useListingFormStore()
  const top = useRef<HTMLDivElement>(null)
  useScrollTopOnPageChange(step, top)

  // Opened over an edit, or over a draft that was already published (the
  // person left during publishing, or in the moment "¡PUBLICADO!" showed):
  // start a fresh one — before anything is painted, so the old page (an
  // edit's address included) never flashes on screen (third review #1).
  // An edit in memory goes back to the stored draft — never cleared: the
  // unfinished new listing and its photos are kept (hostile review #3).
  const [staleAtOpen] = useState(() => {
    const s = useListingFormStore.getState()
    return s.isEditMode ? 'edit' : s.publishedListingId ? 'published' : null
  })
  const [fresh, setFresh] = useState(!staleAtOpen)
  useLayoutEffect(() => {
    if (!staleAtOpen) return
    if (staleAtOpen === 'edit') leaveEdit()
    else reset()
    setFresh(true)
  }, [staleAtOpen, reset, leaveEdit])
  if (!fresh) return null

  return (
    <div ref={top} className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      {/* Title lives in the Topbar via useSetPageMeta */}

      <div className="mt-2">
        <WizardProgress currentStep={step} />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${step}-${draftVersion}`}
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
