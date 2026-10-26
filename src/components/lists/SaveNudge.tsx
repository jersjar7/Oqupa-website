// The card after a visitor's third save (Guardados sin cuenta, Jerson
// 2026-10-25): exactly "No pierdas tus guardados. Crea una cuenta", CREAR
// CUENTA and an ×. Once per browser, ever (deviceSavesStore). On a phone it
// sits under the header — the listing card and the bar own the bottom; on a
// computer, bottom-left, clear of the list. × or a tap elsewhere closes it.
// Never for someone signed in.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { setReturnUrl } from '@/lib/utils'

export default function SaveNudge() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const open = useDeviceSavesStore((s) => s.nudgeOpen)
  const close = useDeviceSavesStore((s) => s.closeNudge)
  const navigate = useNavigate()
  const location = useLocation()
  const ref = useRef<HTMLDivElement | null>(null)
  const visible = open && !firebaseUser

  useEffect(() => {
    if (!visible) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    // After the tap that opened it has finished.
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [visible, close])

  if (!visible) return null
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="No pierdas tus guardados"
      className="fixed inset-x-3 top-[76px] z-[45] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white py-3 pl-4 pr-2 shadow-large md:inset-x-auto md:bottom-6 md:left-6 md:top-auto md:mx-0"
    >
      <p className="flex-1 text-[15px] font-medium leading-snug text-text-primary">No pierdas tus guardados. Crea una cuenta</p>
      <button
        type="button"
        onClick={() => {
          close()
          setReturnUrl(location.pathname)
          navigate('/app/register')
        }}
        className="shrink-0 whitespace-nowrap rounded-full bg-primary px-4 py-2 font-sans text-xs font-bold uppercase tracking-[1px] text-white hover:bg-primary-hover"
      >
        Crear cuenta
      </button>
      <button type="button" aria-label="Cerrar" onClick={close} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-background-secondary">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
