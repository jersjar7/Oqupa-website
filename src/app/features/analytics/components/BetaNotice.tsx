import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/** Per browser: once closed, the notice stays closed. */
export const BETA_NOTICE_KEY = 'oqupa_analiticaBetaNoticeClosed'

const EMAIL = 'admin@oqupa.com'

function readClosed(): boolean {
  try {
    return localStorage.getItem(BETA_NOTICE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Analítica is in beta (Jerson, weekly meeting 2026-11-14). His exact words,
 * approved 2026-11-15 — do not edit them without him. A white card on cream,
 * like the page's sections; the × closes it for good in this browser. Never on
 * the printed report.
 */
export default function BetaNotice({ className = '' }: { className?: string }) {
  const [closed, setClosed] = useState(readClosed)
  const [justClosed, setJustClosed] = useState(false)
  const doneRef = useRef<HTMLSpanElement | null>(null)

  // The × is gone; keep keyboard focus here (Tab goes on to the page's next control)
  // instead of dropping it onto <body>, and tell a screen reader what happened.
  useEffect(() => {
    if (justClosed) doneRef.current?.focus({ preventScroll: true })
  }, [justClosed])

  if (closed) {
    return justClosed
      ? <span ref={doneRef} tabIndex={-1} className="sr-only">Aviso cerrado</span>
      : null
  }

  const close = () => {
    try {
      localStorage.setItem(BETA_NOTICE_KEY, '1')
    } catch {
      // Storage blocked (private window, site data off): closes for this visit only.
    }
    setClosed(true)
    setJustClosed(true)
  }

  return (
    <section
      aria-label="Analítica está en beta"
      className={`relative rounded-2xl border border-border bg-white p-4 pr-12 shadow-light sm:p-6 sm:pr-16 print:hidden ${className}`}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={close}
        className="absolute right-1 top-1 flex h-11 w-11 sm:right-2 sm:top-2 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-background-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="space-y-3 text-sm leading-relaxed text-text-primary sm:text-base">
        <p>
          En Oqupa queremos darte las mejores herramientas para el mercado inmobiliario de Piura. A medida que crecemos, Analítica te mostrará datos cada vez más útiles sobre tus propiedades, para ayudarte a anunciarlas mejor y para que quienes buscan encuentren la propiedad ideal para ellos.
        </p>
        <p>
          Analítica está en beta: seguimos aprendiendo de ti y fortaleciendo los datos. Si tienes comentarios o ideas, escríbenos a{' '}
          <a href={`mailto:${EMAIL}`} className="whitespace-nowrap text-secondary underline underline-offset-2 hover:text-secondary-hover">{EMAIL}</a>.
        </p>
        <p>Nos alegra construir Oqupa para toda nuestra comunidad en Piura.</p>
      </div>
    </section>
  )
}
