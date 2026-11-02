// The seller's number once the server has handed it over, with LLAMAR and
// COPIAR beside WhatsApp (ADR-046 #6): someone without WhatsApp can still
// reach the seller.
import { Copy, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { displayPhone, telHref } from '../contactReveal'

export default function RevealedContact({ phone }: { phone: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(phone.replace(/[^\d+]/g, ''))
      toast.success('Número copiado')
    } catch {
      toast.error('No se pudo copiar. Mantén presionado el número para copiarlo.')
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-white p-3">
      <p className="font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">Número de contacto</p>
      <p className="mt-1 select-all text-lg text-text-primary">{displayPhone(phone)}</p>
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
