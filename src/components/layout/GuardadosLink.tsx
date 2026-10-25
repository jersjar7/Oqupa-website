// The way back to Guardados from the header (Guardados sin cuenta, Jerson
// 2026-10-25): a heart, no words. A visitor sees it once they have saved
// something (their saves live in this browser); someone signed in always.
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'

export default function GuardadosLink() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const count = useDeviceSavesStore((s) => s.ids.length)
  if (!firebaseUser && count === 0) return null
  return (
    <Link
      to={firebaseUser ? '/app/lists' : '/guardados'}
      aria-label="Guardados"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-black/5 sm:h-12 sm:w-12"
    >
      <Heart className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
    </Link>
  )
}
