// Ayuda — the same channels as the app's SOPORTE (ADR-046 #16): WhatsApp
// (SupportService's number), correo and "Reportar un problema".
import { Link } from 'react-router-dom'
import { Bug, Mail, MessageCircle } from 'lucide-react'

export const SUPPORT_EMAIL = 'admin@oqupa.com'
export const SUPPORT_WHATSAPP_URL = `https://wa.me/51936287377?text=${encodeURIComponent('Hola, necesito ayuda con Oqupa')}`

const ROW = 'flex min-h-12 items-center gap-3 rounded-xl px-3 text-base text-text-primary hover:bg-background-secondary'

export default function HelpOptions() {
  return (
    <div className="flex flex-col">
      <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={ROW}>
        <MessageCircle className="h-5 w-5 text-secondary" aria-hidden="true" />
        Escríbenos por WhatsApp
      </a>
      <div className={ROW}>
        <Mail className="h-5 w-5 text-secondary" aria-hidden="true" />
        <span>
          Correo: <a href={`mailto:${SUPPORT_EMAIL}`} className="select-all text-secondary underline-offset-2 hover:underline">{SUPPORT_EMAIL}</a>
        </span>
      </div>
      <Link to="/reportar" className={ROW}>
        <Bug className="h-5 w-5 text-secondary" aria-hidden="true" />
        Reportar un problema
      </Link>
    </div>
  )
}
