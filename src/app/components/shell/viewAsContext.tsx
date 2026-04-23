/**
 * View-as mode: admins can temporarily render the app as a realtor or owner would see it
 * for debugging / empathy. This is purely visual — it does NOT grant extra permissions
 * (enforced by Firestore rules + server), only changes what's rendered.
 *
 * State is intentionally not persisted across reloads — safer default for a debug-only flag.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ViewAs } from './capabilities'

type ViewAsContextValue = {
  viewAs: ViewAs
  setViewAs: (v: ViewAs) => void
}

const ViewAsContext = createContext<ViewAsContextValue | null>(null)

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAs] = useState<ViewAs>('self')
  const value = useMemo(() => ({ viewAs, setViewAs }), [viewAs])
  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>
}

export function useViewAs(): ViewAsContextValue {
  const ctx = useContext(ViewAsContext)
  if (!ctx) throw new Error('useViewAs must be used inside <ViewAsProvider>')
  return ctx
}
