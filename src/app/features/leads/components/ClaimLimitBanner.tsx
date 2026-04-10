interface ClaimLimitBannerProps {
  used: number
  limit: number
}

export default function ClaimLimitBanner({ used, limit }: ClaimLimitBannerProps) {
  const percentage = Math.min((used / limit) * 100, 100)
  const atLimit = used >= limit

  return (
    <div className={`rounded-xl border p-4 ${atLimit ? 'border-warning/30 bg-warning/5' : 'border-border bg-white'}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-secondary">
          {used} de {limit} reclamaciones usadas este mes
        </span>
        {atLimit && (
          <span className="text-xs font-medium text-amber-700">Limite alcanzado</span>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
