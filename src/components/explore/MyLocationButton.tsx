// My Location on the explore map (ADR-046 #4), the app's rule (ADR-040):
// inside the Piura region the map goes to the person; outside it, or with
// location off or refused, to the default Piura view. Never an error.
import { useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { currentPosition, myLocationTarget, type CameraTarget, type LatLng } from '@/lib/map/myLocation'

export default function MyLocationButton({
  onTarget,
  locate = () => currentPosition(),
}: {
  onTarget: (target: CameraTarget) => void
  locate?: () => Promise<LatLng | null>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      aria-label="Mi ubicación"
      aria-busy={busy}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          onTarget(myLocationTarget(await locate()))
        } finally {
          setBusy(false)
        }
      }}
      className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-text-primary shadow-medium hover:bg-background-secondary disabled:opacity-60 md:right-[10px] md:top-[84px] md:h-[29px] md:w-[29px] md:rounded-md"
    >
      <LocateFixed className={`h-5 w-5 md:h-4 md:w-4 ${busy ? 'animate-pulse' : ''}`} aria-hidden="true" />
    </button>
  )
}
