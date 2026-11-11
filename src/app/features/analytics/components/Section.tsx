import type { ReactNode } from 'react'

/** One white card on cream with a Roboto Serif title (ADR-038 type rules). */
export default function Section({
  title, subtitle, aside, children, className = '', testId,
}: {
  title: string
  subtitle?: ReactNode
  aside?: ReactNode
  children: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section
      data-testid={testId}
      className={`min-w-0 break-inside-avoid rounded-2xl border border-border bg-white p-5 shadow-light sm:p-6 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-serif text-[22px] font-normal leading-tight text-text-primary">{title}</h2>
        {aside && <div className="text-sm text-text-secondary">{aside}</div>}
      </div>
      {subtitle && <p className="mb-4 text-sm text-text-secondary">{subtitle}</p>}
      {children}
    </section>
  )
}

/** "Necesitamos más datos…" — a section's frame stays; the note replaces its numbers. */
export function MoreData({ text }: { text: string }) {
  return (
    <div
      role="note"
      className="rounded-xl bg-surface-muted px-4 py-5 font-serif text-sm font-light italic text-text-secondary"
    >
      {text}
    </div>
  )
}
