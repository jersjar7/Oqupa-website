import { Fragment } from 'react'

const STEP_LABELS = ['Tipo', 'Detalles', 'Ubicacion', 'Precio']

interface WizardProgressProps {
  currentStep: number
}

export default function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep

          return (
            <Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-gray-200 text-text-tertiary'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    isActive ? 'font-medium text-primary' : 'text-text-tertiary'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`mt-4 h-0.5 flex-1 ${
                    isCompleted ? 'bg-primary/30' : 'bg-gray-200'
                  }`}
                />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
