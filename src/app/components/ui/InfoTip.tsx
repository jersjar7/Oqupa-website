import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTipProps {
  text: string
}

export default function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <span ref={ref} className="relative ml-1 inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-primary/60 hover:text-primary transition-colors"
        aria-label="Más información"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <span
        className={`absolute left-1/2 top-full z-50 mt-1.5 w-[320px] -translate-x-1/2 rounded-lg border border-border bg-white p-2.5 text-xs font-normal normal-case text-text-secondary shadow-medium transition-opacity duration-150 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {text}
      </span>
    </span>
  )
}
