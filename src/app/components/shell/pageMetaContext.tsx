/**
 * Tiny context that lets child pages set the dashboard Topbar's title + subtitle.
 * Usage: call `useSetPageMeta({ title, subtitle })` from inside a page component.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AccessArea } from '@/app/features/access/people'

type PageMeta = {
  title: string
  subtitle?: string
  /**
   * Set this on a page whose access is restricted to a roster. The Topbar then
   * shows a quiet button next to the title listing who can reach the page.
   * Reads from the one access list, so it can never disagree with the guard.
   */
  accessArea?: AccessArea
}

type Ctx = {
  meta: PageMeta
  setMeta: (m: PageMeta) => void
}

const PageMetaContext = createContext<Ctx | null>(null)

export function PageMetaProvider({
  children,
  initial,
}: {
  children: ReactNode
  initial: PageMeta
}) {
  const [meta, setMeta] = useState<PageMeta>(initial)
  const value = useMemo(() => ({ meta, setMeta }), [meta])
  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>
}

export function usePageMeta(): PageMeta {
  const ctx = useContext(PageMetaContext)
  if (!ctx) throw new Error('usePageMeta must be used inside <PageMetaProvider>')
  return ctx.meta
}

/** Call this from a page to set its title + optional subtitle. */
export function useSetPageMeta(meta: PageMeta) {
  const ctx = useContext(PageMetaContext)
  useEffect(() => {
    ctx?.setMeta(meta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.title, meta.subtitle, meta.accessArea])
}
