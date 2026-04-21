import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/app/components/ui'

type Props = {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  trend?: { direction: 'up' | 'down'; text: string }
  tone?: 'default' | 'warning' | 'success'
  icon?: React.ReactNode
  cta?: { label: string; to: string }
}

/**
 * Generic role-aware dashboard KPI card. Big Roboto Serif number in
 * Pacific Green, uppercase label, optional subline + trend indicator,
 * optional action CTA that links somewhere.
 */
export default function StatCard({
  label, value, sub, trend, tone = 'default', icon, cta,
}: Props) {
  const valueColor =
    tone === 'warning' ? 'text-error' :
    tone === 'success' ? 'text-secondary' :
                         'text-secondary'

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            {label}
          </p>
          <div className={`mt-2 font-serif text-[36px] leading-none ${valueColor}`}>
            {value}
          </div>
          {sub && <div className="mt-1.5 text-sm text-text-secondary">{sub}</div>}
          {trend && (
            <p className={`mt-2 inline-flex items-center gap-1 text-xs ${
              trend.direction === 'up' ? 'text-secondary' : 'text-error'
            }`}>
              {trend.direction === 'up'
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <TrendingDown className="h-3.5 w-3.5" />}
              {trend.text}
            </p>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 shrink-0 rounded-full bg-background-secondary grid place-items-center">
            {icon}
          </div>
        )}
      </div>
      {cta && (
        <Link
          to={cta.to}
          className="-mx-2 mt-4 inline-flex h-8 items-center gap-1 px-2 text-[13px] text-secondary hover:bg-background-secondary rounded-md"
        >
          {cta.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </Card>
  )
}
