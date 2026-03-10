import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, ChevronDown } from 'lucide-react'

export interface UserMenuItem {
  label: string
  icon: React.ReactNode
  to?: string
  onClick?: () => void
  className?: string
}

interface UserMenuProps {
  userName: string
  items: UserMenuItem[]
}

export default function UserMenu({ userName, items }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-black/5"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </div>
        <span className="hidden sm:inline">{userName}</span>
        <ChevronDown className="h-4 w-4 text-text-tertiary" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-white py-1 shadow-medium">
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-black/5 ${item.className ?? 'text-text-primary'}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => {
                  setIsOpen(false)
                  item.onClick?.()
                }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-black/5 ${item.className ?? 'text-text-primary'}`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
