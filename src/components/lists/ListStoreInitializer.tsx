import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useListStore } from '@/stores/listStore'

export default function ListStoreInitializer() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const initialize = useListStore((s) => s.initialize)
  const reset = useListStore((s) => s.reset)

  useEffect(() => {
    if (firebaseUser) {
      initialize(firebaseUser.uid)
    } else {
      reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid])

  return null
}
