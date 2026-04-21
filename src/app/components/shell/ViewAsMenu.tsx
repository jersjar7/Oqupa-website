import { useEffect, useRef, useState } from 'react'
import { Glasses, ChevronDown, Check } from 'lucide-react'
import type { Capabilities } from './capabilities'
import { useViewAs } from './viewAsContext'

type Props = { caps: Capabilities }

/**
 * Admin-only dropdown in the topbar that lets admins render the app as a
 * realtor or owner would see it. Used for debugging + empathy with other
 * user types. Keyboard-operable per WAI-ARIA menu pattern: Enter/Space to
 * open, arrow keys to move between options, Enter to select, Escape to
 * close, focus returns to the trigger on close.
 */
export default function ViewAsMenu({ caps }: Props) {
  const { viewAs, setViewAs } = useViewAs()
  const [open, setOpen] = useState(false)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  if (!caps.isAdmin) return null

  const label =
    viewAs === 'self' ? 'Mi vista' :
    viewAs === 'asRealtor' ? 'Vista: Agente' : 'Vista: Dueño'

  const options: Array<{ value: typeof viewAs; label: string }> = [
    { value: 'self',      label: caps.isRealtor ? 'Mi vista (Admin · Agente)' : 'Mi vista (Admin)' },
    { value: 'asRealtor', label: 'Como un Agente' },
    { value: 'asOwner',   label: 'Como un Dueño' },
  ]

  function openMenu(focusOnIdx: number | null = 0) {
    setOpen(true)
    setFocusIdx(focusOnIdx)
  }

  function closeMenu(returnFocus = true) {
    setOpen(false)
    setFocusIdx(null)
    if (returnFocus) triggerRef.current?.focus()
  }

  function handleTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openMenu(0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      openMenu(options.length - 1)
    }
  }

  function handleItemKey(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx((idx + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx((idx - 1 + options.length) % options.length)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      closeMenu(e.key === 'Escape')
    } else if (e.key === 'Home') {
      e.preventDefault()
      setFocusIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setFocusIdx(options.length - 1)
    }
  }

  // Move focus into the chosen item whenever focusIdx changes.
  useEffect(() => {
    if (focusIdx === null) return
    itemRefs.current[focusIdx]?.focus()
  }, [focusIdx])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeMenu(false) : openMenu(0))}
        onKeyDown={handleTriggerKey}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Vista como: ${label}. Abrir menú para cambiar.`}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border-[1.5px] border-secondary bg-transparent text-secondary hover:bg-secondary/5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
      >
        <Glasses className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Click-outside scrim. Keyboard users never reach it because its
              tabindex is not set; they close via Escape or Tab-out. */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => closeMenu(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            aria-label="Cambiar vista"
            className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-white shadow-medium z-50 p-2"
          >
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-text-secondary">
              Ver la app como...
            </p>
            {options.map((opt, idx) => (
              <button
                key={opt.value}
                ref={(el) => { itemRefs.current[idx] = el }}
                role="menuitemradio"
                aria-checked={viewAs === opt.value}
                onClick={() => { setViewAs(opt.value); closeMenu() }}
                onKeyDown={(e) => handleItemKey(e, idx)}
                className={[
                  'w-full text-left text-sm px-2 py-2 rounded-md flex items-center justify-between gap-2',
                  'hover:bg-background-secondary focus-visible:outline-none focus-visible:bg-background-secondary focus-visible:ring-2 focus-visible:ring-secondary/40',
                  viewAs === opt.value ? 'text-secondary font-medium' : 'text-text-primary',
                ].join(' ')}
              >
                <span>{opt.label}</span>
                {viewAs === opt.value && <Check className="h-4 w-4 text-secondary" aria-hidden="true" />}
              </button>
            ))}
            <p className="caption text-text-secondary px-2 pt-2 border-t border-border mt-1">
              Solo cambia lo que ves — tu cuenta sigue siendo admin.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
