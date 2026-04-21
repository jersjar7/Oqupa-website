import { Bell } from 'lucide-react'
import type { Capabilities } from './capabilities'
import { useViewAs } from './viewAsContext'
import ViewAsMenu from './ViewAsMenu'

type Props = {
  title: string
  subtitle?: string
  caps: Capabilities
  actions?: React.ReactNode
}

/**
 * Sticky page header for the authenticated /app area. Shows the decorative page title
 * (Roboto Serif in Pacific Green), optional subtitle, notification bell, ViewAsMenu
 * (admin only), and a slot for page-specific actions (e.g. "Crear anuncio" on listings).
 *
 * When an admin is in view-as mode, a warning ribbon appears at the top so they
 * can't forget they're debugging.
 */
export default function Topbar({ title, subtitle, caps, actions }: Props) {
  const { viewAs, setViewAs } = useViewAs()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#FFFAF5]/90 backdrop-blur-md">
      {caps.isAdmin && viewAs !== 'self' && (
        <div className="bg-accent/40 text-[#8A6400] text-xs px-6 py-1.5 flex items-center gap-2 justify-between">
          <span>
            <strong>Modo debug:</strong>{' '}
            estás viendo la app como {viewAs === 'asRealtor' ? 'un Agente' : 'un Dueño'}.
          </span>
          <button
            onClick={() => setViewAs('self')}
            className="underline font-medium hover:text-[#6A4E00]"
          >
            Volver a mi vista
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="font-serif text-[28px] font-normal leading-tight text-secondary truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ViewAsMenu caps={caps} />
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 text-text-secondary" />
          </button>
          {actions}
        </div>
      </div>
    </header>
  )
}
