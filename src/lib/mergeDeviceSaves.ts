// On sign-up or log-in, a visitor's device saves move into their Guardados —
// the app's store since ADR-046 #1 — in one write, and only then leave the
// device. A failed write keeps them on the device for the next sign-in
// (Jerson, 2026-10-25). A listing already saved is kept once, its date intact.

interface Service {
  addMany: (uid: string, listingIds: string[]) => Promise<void>
}

export async function mergeDeviceSaves({ uid, savedIds, deviceIds, service, clear }: {
  uid: string
  savedIds: string[]
  deviceIds: string[]
  service: Service
  clear: (ids: string[]) => void
}): Promise<boolean> {
  if (deviceIds.length === 0) return true
  try {
    const saved = new Set(savedIds)
    const fresh = deviceIds.filter((id) => !saved.has(id))
    if (fresh.length > 0) await service.addMany(uid, fresh)
    clear(deviceIds)
    return true
  } catch {
    return false
  }
}
