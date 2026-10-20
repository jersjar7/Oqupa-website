import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/app/components/ui'
import {
  CLOSE_SURVEY_CHANNELS,
  CLOSE_SURVEY_CHANNEL_LABELS as CHANNEL_LABELS,
  CLOSE_SURVEY_FEEDBACK_MAX,
  submitCloseSurvey,
  type CloseSurveyAnswers,
  type CloseSurveyChannel,
} from '@/services/closeSurveyService'

interface CloseSurveyModalProps {
  isOpen: boolean
  listingId: string
  isRental: boolean
  onClose: () => void
  onSubmit?: (answers: CloseSurveyAnswers) => Promise<void>
}

type Step = 'question' | 'where' | 'feedback'

/**
 * Asked after a listing is marked Vendido / Alquilado. Nothing is sent until
 * the first question is answered; after that, closing any way — or the page
 * going away — sends what was answered, a typed comment included. Only Omitir
 * drops the comment.
 */
export default function CloseSurveyModal({
  isOpen,
  listingId,
  isRental,
  onClose,
  onSubmit = submitCloseSurvey,
}: CloseSurveyModalProps) {
  const [step, setStep] = useState<Step>('question')
  const [viaOqupa, setViaOqupa] = useState<CloseSurveyAnswers['viaOqupa'] | null>(null)
  const [channel, setChannel] = useState<CloseSurveyChannel | null>(null)
  const [feedback, setFeedback] = useState('')
  const sent = useRef(false)

  // A fresh survey each time it opens.
  useEffect(() => {
    if (isOpen) {
      setStep('question')
      setViaOqupa(null)
      setChannel(null)
      setFeedback('')
      sent.current = false
    }
  }, [isOpen])

  // Read at send time, so a send from the unmount cleanup sees the latest answers.
  const latest = useRef({ viaOqupa, channel, feedback, listingId, onSubmit })
  latest.current = { viaOqupa, channel, feedback, listingId, onSubmit }

  const send = (withFeedback: boolean) => {
    const now = latest.current
    if (sent.current || !now.viaOqupa) return
    sent.current = true
    const trimmed = withFeedback ? now.feedback.trim() : ''
    now.onSubmit({ listingId: now.listingId, viaOqupa: now.viaOqupa, channel: now.channel, feedback: trimmed || null }).catch(() => {})
  }

  // The page went away mid-survey (browser Back, the list reloading): keep
  // what was answered, as closing does.
  const sendRef = useRef(send)
  sendRef.current = send
  useEffect(() => () => sendRef.current(true), [])

  const finish = (withFeedback: boolean) => {
    send(withFeedback)
    onClose()
  }

  const answer = (value: CloseSurveyAnswers['viaOqupa']) => {
    setViaOqupa(value)
    setStep(value === 'no' ? 'where' : 'feedback')
  }

  const choice = (label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-white px-4 py-3 text-left text-base text-text-primary transition-colors hover:border-primary hover:bg-primary/5"
    >
      {label}
    </button>
  )

  const title = (text: string) => (
    <h2 className="mb-4 font-serif text-[22px] font-normal text-text-primary">{text}</h2>
  )

  return (
    <Modal isOpen={isOpen} onClose={() => finish(true)}>
      {step === 'question' && (
        <div className="space-y-2">
          {title(isRental ? '¿Lo rentaste gracias a Oqupa?' : '¿Lo vendiste gracias a Oqupa?')}
          {choice('Sí', () => answer('yes'))}
          {choice('No', () => answer('no'))}
          {choice('Prefiero no responder', () => answer('skip'))}
        </div>
      )}

      {step === 'where' && (
        <div className="space-y-2">
          {title(isRental ? '¿Dónde lo rentaste?' : '¿Dónde lo vendiste?')}
          {CLOSE_SURVEY_CHANNELS.map((key) =>
            choice(CHANNEL_LABELS[key], () => {
              setChannel(key)
              setStep('feedback')
            }),
          )}
        </div>
      )}

      {step === 'feedback' && (
        <div>
          {title('¿Qué te gustó de Oqupa y qué te hubiera ayudado más?')}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tu opinión nos ayuda a mejorar (opcional)"
            maxLength={CLOSE_SURVEY_FEEDBACK_MAX}
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => finish(true)}
            className="mt-4 w-full rounded-full bg-primary px-6 py-3 font-sans text-base font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-primary-hover"
          >
            ENVIAR
          </button>
          <button
            type="button"
            onClick={() => finish(false)}
            className="mt-2 w-full py-2 text-base text-primary hover:text-primary-hover"
          >
            Omitir
          </button>
        </div>
      )}
    </Modal>
  )
}
