import { useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { peopleWith, type AccessArea } from '@/app/features/access/people'

type Props = { area: AccessArea }

/** What each restricted area is called in the sentence "quién puede ver …". */
const AREA_LABEL: Record<AccessArea, string> = {
  admin: 'el panel de administración',
  metrics: 'Números',
  dev: 'Ing. de Software',
  marketing: 'Contenido',
}

/**
 * A quiet button beside a restricted page's title that lists who can reach it.
 *
 * WHY. These pages are invisible to everyone not on the roster, so there was no
 * way to answer "who else sees this?" without opening the source. Showing the
 * list in place makes an access mistake — someone still on it who shouldn't be,
 * someone missing who should be — visible to the people who would notice.
 *
 * It reads `peopleWith()`, the same single list the route guard and the
 * generated Firestore rules use, so what it shows cannot drift from what is
 * actually enforced. It reveals names and emails of teammates to teammates who
 * already share these pages — it is deliberately not rendered anywhere a
 * non-member can reach.
 *
 * Keyboard: Enter/Space/ArrowDown opens, Escape closes and returns focus, Tab
 * moves out and closes. The list is static text, so unlike ViewAsMenu there is
 * nothing to arrow between — it is a disclosure, not a menu.
 */
export default function AccessListButton({ area }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const people = peopleWith(area)
  const label = AREA_LABEL[area]

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  // Escape closes from anywhere while open — including from inside the panel,
  // which is focusable so screen readers can land on it.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  function handleTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={handleTriggerKey}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Ver quién tiene acceso a ${label} (${people.length} personas)`}
        title="¿Quién tiene acceso?"
        className={[
          'inline-flex items-center gap-1 rounded-md px-1.5 py-1 align-middle',
          'text-text-secondary/70 hover:text-secondary hover:bg-secondary/5',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40',
          open ? 'text-secondary bg-secondary/5' : '',
        ].join(' ')}
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium tabular-nums">{people.length}</span>
      </button>

      {open && (
        <>
          {/* Click-outside scrim. Not reachable by keyboard — Escape or Tab
              closes for those users instead. */}
          <div className="fixed inset-0 z-40" onClick={() => close(false)} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`Acceso a ${label}`}
            tabIndex={-1}
            onBlur={(e) => {
              // Close when focus leaves the panel entirely (Tab-out), but not
              // when it moves between elements inside it.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close(false)
            }}
            className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white shadow-medium z-50 p-2 focus:outline-none"
          >
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-text-secondary">
              Quién ve {label}
            </p>

            <ul className="max-h-72 overflow-y-auto">
              {people.map((p) => (
                <li key={p.email} className="px-2 py-1.5 rounded-md hover:bg-background-secondary">
                  <p className="text-sm text-text-primary leading-tight">{p.name}</p>
                  <p className="text-xs text-text-secondary leading-tight break-all">{p.email}</p>
                </li>
              ))}
            </ul>

            {/* Deliberately smaller than the emails above — this is a footnote
                about maintenance, not part of the list you came here to read. */}
            <p className="text-[10px] leading-snug text-text-secondary/80 px-2 pt-2 border-t border-border mt-1">
              Para cambiar quién entra, edita la lista de accesos y vuelve a publicar las reglas.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
