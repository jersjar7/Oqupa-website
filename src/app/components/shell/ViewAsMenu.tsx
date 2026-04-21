import { useState } from 'react'
import { Glasses, ChevronDown, Check } from 'lucide-react'
import type { Capabilities } from './capabilities'
import { useViewAs } from './viewAsContext'

type Props = { caps: Capabilities }

/**
 * Admin-only dropdown in the topbar that lets admins render the app as a realtor
 * or owner would see it. Used for debugging + empathy with other user types.
 */
export default function ViewAsMenu({ caps }: Props) {
  const { viewAs, setViewAs } = useViewAs()
  const [open, setOpen] = useState(false)

  if (!caps.isAdmin) return null

  const label =
    viewAs === 'self' ? 'Mi vista' :
    viewAs === 'asRealtor' ? 'Vista: Agente' : 'Vista: Dueño'

  const options: Array<{ value: typeof viewAs; label: string }> = [
    { value: 'self',      label: caps.isRealtor ? 'Mi vista (Admin · Agente)' : 'Mi vista (Admin)' },
    { value: 'asRealtor', label: 'Como un Agente' },
    { value: 'asOwner',   label: 'Como un Dueño' },
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border-[1.5px] border-secondary bg-transparent text-secondary hover:bg-secondary/5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
      >
        <Glasses className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-white shadow-medium z-50 p-2"
          >
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[1.2px] text-text-secondary">
              Ver la app como...
            </p>
            {options.map((opt) => (
              <button
                key={opt.value}
                role="menuitemradio"
                aria-checked={viewAs === opt.value}
                onClick={() => { setViewAs(opt.value); setOpen(false) }}
                className={[
                  'w-full text-left text-sm px-2 py-2 rounded-md flex items-center justify-between gap-2',
                  'hover:bg-background-secondary',
                  viewAs === opt.value ? 'text-secondary font-medium' : 'text-text-primary',
                ].join(' ')}
              >
                <span>{opt.label}</span>
                {viewAs === opt.value && <Check className="h-4 w-4 text-secondary" />}
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
