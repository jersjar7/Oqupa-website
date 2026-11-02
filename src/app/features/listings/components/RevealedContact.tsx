// The seller's number once the server has handed it over, with LLAMAR and
// COPIAR beside WhatsApp (ADR-046 #6): someone without WhatsApp can still
// reach the seller.
import { useEffect, useRef } from 'react'
import { Copy, MessageCircle, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { displayPhone, telHref } from '../contactReveal'

export default function RevealedContact({
  phone,
  whatsappUrl = null,
}: {
  phone: string
  /** Phone: WhatsApp is offered here as the main button (review 2026-11-02). */
  whatsappUrl?: string | null
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (whatsappUrl) panelRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [whatsappUrl])
  async function copy() {
    try {
      await navigator.clipboard.writeText(phone.replace(/[^\d+]/g, ''))
      toast.success('Número copiado')
    } catch {
      toast.error('No se pudo copiar. Mantén presionado el número para copiarlo.')
    }
  }

  return (
    <div ref={panelRef} className="mt-3 rounded-xl border border-border bg-white p-3">
      <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">Número de contacto</p>
      <p className="mt-1 select-all text-lg text-text-primary">{displayPhone(phone)}</p>
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-sans text-sm font-bold uppercase tracking-[1px] text-white hover:bg-[#1DA851]"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          WhatsApp
        </a>
      )}
      <div className="mt-2 flex gap-2">
        <a
          href={telHref(phone)}
          aria-label="Llamar"
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-secondary font-sans text-sm font-bold uppercase tracking-[1px] text-secondary hover:border-secondary-hover hover:text-secondary-hover"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Llamar
        </a>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar"
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-secondary font-sans text-sm font-bold uppercase tracking-[1px] text-secondary hover:border-secondary-hover hover:text-secondary-hover"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar
        </button>
      </div>
    </div>
  )
}
