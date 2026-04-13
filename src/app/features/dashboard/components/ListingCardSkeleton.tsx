export default function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-light animate-pulse" aria-busy="true" aria-label="Cargando publicacion">
      {/* Photo skeleton */}
      <div className="h-48 bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="flex gap-3">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="flex gap-2 pt-1">
          <div className="h-8 flex-1 rounded-xl bg-gray-200" />
          <div className="h-8 w-24 rounded-xl bg-gray-200" />
        </div>
      </div>
    </div>
  )
}
