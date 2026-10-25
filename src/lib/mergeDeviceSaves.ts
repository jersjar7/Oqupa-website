// On sign-up or log-in, a visitor's device saves move into their Guardados
// list — the default list, or "Guardados" made once when they have none — in one
// write, and only then leave the device. A failed write keeps them on the
// device for the next sign-in (Jerson, 2026-10-25).
import type { UserList } from '@/types/userList'

interface Service {
  ensureDefaultList: (uid: string) => Promise<string>
  addListings: (uid: string, listId: string, listingIds: string[]) => Promise<void>
}

export async function mergeDeviceSaves({ uid, lists, deviceIds, service, clear }: {
  uid: string
  lists: UserList[]
  deviceIds: string[]
  service: Service
  clear: (ids: string[]) => void
}): Promise<boolean> {
  if (deviceIds.length === 0) return true
  try {
    const target = lists.find((l) => l.isDefault) ?? lists[0]
    const listId = target ? target.id : await service.ensureDefaultList(uid)
    await service.addListings(uid, listId, deviceIds)
    clear(deviceIds)
    return true
  } catch {
    return false
  }
}
