// The contact follow-up card (metrics plan A11b) — the website's copy of the
// app's contact_follow_up_sheet.dart, word for word. Draft wording (Jerson's
// spec, 2026-10-31), for him to approve; change it on both platforms at once.
//
// The contacted listing sits above the question so it still makes sense hours
// or days after WhatsApp. Every answer goes to the session the moment it is
// given. Closing the card — the (x), Escape, a click outside — counts as
// `dismissed`, or as `skipped` on "¿Por qué?". Clicking the listing opens it in
// a new tab and leaves the question waiting here, as the app opens it above
// the card.
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/app/components/ui'
import { thumbnail } from '@/lib/imageUrl'
import { getPriceSuffix } from '@/lib/formatters'
import { FOLLOW_UP_CARD_ATTR } from '@/lib/followUpScreen'
import type { FollowUpSession } from '@/lib/contactFollowUpCoordinator'
import type { DueFollowUpCard, FollowUpAnswer, FollowUpCardName, FollowUpContactRole } from '@/services/contactFollowUpService'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS, type Currency, type PropertyType, type RentalDurationType } from '@/types/enums'

const who = (role: FollowUpContactRole) => (role === 'agent' ? 'agente' : 'dueño')

/** Identical to the app's ContactFollowUpCopy. */
export const CONTACT_FOLLOW_UP_COPY = {
  wrote: (role: FollowUpContactRole) => `¿Pudiste contactar al ${who(role)}?`,
  reply: (role: FollowUpContactRole) => `¿El ${who(role)} te respondió?`,
  reason: '¿Por qué?',
  yes: 'SÍ',
  notYet: 'TODAVÍA NO',
  notInterested: 'YA NO ME INTERESA',
  skip: 'Omitir',
  thanks: '¡Gracias!',
  /** In the order of the server's ALLOWED_ANSWERS.reason. */
  reasons: [
    ['found_other', 'ENCONTRÉ OTRA'],
    ['price', 'EL PRECIO'],
    ['not_convinced', 'NO ME CONVENCIÓ'],
    ['other', 'OTRO'],
  ] as const satisfies readonly (readonly [FollowUpAnswer, string])[],
}

const BUTTON = 'h-[52px] w-full rounded-full font-sans text-base font-bold uppercase tracking-[1px] transition-colors'
const PRIMARY = `${BUTTON} bg-secondary text-white hover:bg-secondary-hover`
const SECONDARY = `${BUTTON} border border-secondary bg-white text-secondary hover:bg-cream-strong`

function typeLabel(type: string | null): string | null {
  if (!type) return null
  return PROPERTY_TYPE_LABELS[type as PropertyType] ?? null
}

/** "S/. 1,700/mes", "US$ 250,000" — the site's (and the app's) price with its period. */
function priceLabel(card: DueFollowUpCard): string | null {
  if (card.priceAmount == null || !card.priceCurrency) return null
  const symbol = CURRENCY_SYMBOLS[card.priceCurrency as Currency]
  if (!symbol) return null
  const suffix = getPriceSuffix(card.operationType ?? '', (card.rentalDurationType ?? undefined) as RentalDurationType | undefined)
  return `${symbol} ${card.priceAmount.toLocaleString('es-PE')}${suffix}`
}

interface ContactFollowUpCardProps {
  card: DueFollowUpCard
  session: FollowUpSession
  /** Called once the card is answered or closed. */
  onDone: () => void
}

export default function ContactFollowUpCard({ card, session, onDone }: ContactFollowUpCardProps) {
  const [step, setStep] = useState<FollowUpCardName>(card.card)
  const [open, setOpen] = useState(true)
  /** Set once the card is answered or closed, so nothing is sent twice. */
  const finished = useRef(false)
  const stepRef = useRef(step)
  stepRef.current = step

  const send = (c: FollowUpCardName, a: FollowUpAnswer) => {
    session.answer(c, a).catch(() => {})
  }
  const closeAnswer = (s: FollowUpCardName): FollowUpAnswer => (s === 'reason' ? 'skipped' : 'dismissed')

  const end = () => {
    setOpen(false)
    onDone()
  }

  /** The answer that ends the card: send it, close, and thank them. */
  const finish = (c: FollowUpCardName, a: FollowUpAnswer) => {
    if (finished.current) return
    finished.current = true
    send(c, a)
    end()
    toast(CONTACT_FOLLOW_UP_COPY.thanks, { duration: 2000 })
  }

  const close = () => {
    if (finished.current) return
    finished.current = true
    send(stepRef.current, closeAnswer(stepRef.current))
    end()
  }

  const notInterested = () => {
    if (finished.current) return
    send('reply', 'not_interested')
    setStep('reason')
    session.stepShown('reason')
  }

  // The page or the person went away with the card open: closing it. Decided
  // a moment after the unmount, so React's development rehearsal (StrictMode
  // unmounts and remounts once) is not taken for one.
  const alive = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      setTimeout(() => {
        if (alive.current || finished.current) return
        finished.current = true
        const s = stepRef.current
        session.answer(s, closeAnswer(s)).catch(() => {})
      }, 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const title = (text: string) => (
    <h2 className="mb-4 font-serif text-[22px] font-normal leading-snug text-text-primary">{text}</h2>
  )

  const line = [typeLabel(card.propertyType), card.district].filter(Boolean).join(' · ')
  const price = priceLabel(card)

  return (
    <Modal
      isOpen={open}
      onClose={close}
      placement="sheet"
      surface="cream"
      ariaLabel={step === 'wrote' ? CONTACT_FOLLOW_UP_COPY.wrote(card.contactRole) : step === 'reply' ? CONTACT_FOLLOW_UP_COPY.reply(card.contactRole) : CONTACT_FOLLOW_UP_COPY.reason}
      dataAttributes={{ [FOLLOW_UP_CARD_ATTR]: '' }}
    >
      <a
        href={`/property/${encodeURIComponent(card.listingId)}`}
        target="_blank"
        rel="noopener"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-white p-2.5 transition-colors hover:bg-cream-strong"
      >
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px]">
          {card.photoKey ? (
            <img src={thumbnail(card.photoKey)} alt="" className="h-full w-full object-cover" />
          ) : (
            <span data-testid="follow-up-photo-placeholder" className="flex h-full w-full items-center justify-center bg-surface-strong text-text-tertiary">
              <Home className="h-6 w-6" aria-hidden="true" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          {line && (
            <span className="block truncate font-sans text-[15px] font-medium text-text-primary">{line}</span>
          )}
          {price && (
            <span className="mt-1 block font-sans text-[15px] font-bold text-text-primary">{price}</span>
          )}
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-text-tertiary" aria-hidden="true" />
      </a>

      <div className="mt-[18px] flex flex-col gap-2.5">
        {step === 'wrote' && (
          <>
            {title(CONTACT_FOLLOW_UP_COPY.wrote(card.contactRole))}
            <button type="button" className={PRIMARY} onClick={() => finish('wrote', 'yes')}>{CONTACT_FOLLOW_UP_COPY.yes}</button>
            <button type="button" className={SECONDARY} onClick={() => finish('wrote', 'not_yet')}>{CONTACT_FOLLOW_UP_COPY.notYet}</button>
          </>
        )}
        {step === 'reply' && (
          <>
            {title(CONTACT_FOLLOW_UP_COPY.reply(card.contactRole))}
            <button type="button" className={PRIMARY} onClick={() => finish('reply', 'yes')}>{CONTACT_FOLLOW_UP_COPY.yes}</button>
            <button type="button" className={SECONDARY} onClick={() => finish('reply', 'not_yet')}>{CONTACT_FOLLOW_UP_COPY.notYet}</button>
            <button type="button" className={SECONDARY} onClick={notInterested}>{CONTACT_FOLLOW_UP_COPY.notInterested}</button>
          </>
        )}
        {step === 'reason' && (
          <>
            {title(CONTACT_FOLLOW_UP_COPY.reason)}
            {CONTACT_FOLLOW_UP_COPY.reasons.map(([answer, label]) => (
              <button key={answer} type="button" className={SECONDARY} onClick={() => finish('reason', answer)}>{label}</button>
            ))}
            <button type="button" className="mx-auto px-2 py-2 font-sans text-base font-normal text-secondary hover:text-secondary-hover" onClick={() => finish('reason', 'skipped')}>
              {CONTACT_FOLLOW_UP_COPY.skip}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
