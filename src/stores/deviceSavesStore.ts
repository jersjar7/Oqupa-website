// "Guardados sin cuenta" (Jerson, 2026-10-25): a visitor's heart saves in this
// browser — no account needed. After the THIRD save, one card invites them to
// create an account so they keep them (once per browser, ever). On sign-up or
// log-in the saves move into their Guardados list (mergeDeviceSaves).
// Browser storage can be refused (private windows, blocked site data): the
// saves then last for this visit only, and nothing breaks.
import { create } from 'zustand'

export const DEVICE_SAVES_KEY = 'oqupa_guardados'
export const NUDGE_SHOWN_KEY = 'oqupa_guardados_aviso'
const NUDGE_AT = 3

export function readDeviceSaves(): string[] {
  try {
    const raw = localStorage.getItem(DEVICE_SAVES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(DEVICE_SAVES_KEY, JSON.stringify(ids))
  } catch {
    /* storage refused: this visit only */
  }
}

function nudgeAlreadyShown(): boolean {
  try {
    return localStorage.getItem(NUDGE_SHOWN_KEY) === '1'
  } catch {
    return false
  }
}

function markNudgeShown() {
  try {
    localStorage.setItem(NUDGE_SHOWN_KEY, '1')
  } catch {
    /* storage refused */
  }
}

interface DeviceSavesState {
  ids: string[]
  /** The card after the third save is on screen. */
  nudgeOpen: boolean
  toggle: (listingId: string) => void
  /** Remove the ids that moved to the account. */
  clear: (ids: string[]) => void
  closeNudge: () => void
}

export const useDeviceSavesStore = create<DeviceSavesState>((set, get) => ({
  ids: readDeviceSaves(),
  nudgeOpen: false,

  toggle: (listingId) => {
    const ids = get().ids
    if (ids.includes(listingId)) {
      const next = ids.filter((id) => id !== listingId)
      write(next)
      set({ ids: next })
      return
    }
    const next = [...ids, listingId]
    write(next)
    const openNudge = next.length === NUDGE_AT && !nudgeAlreadyShown()
    if (openNudge) markNudgeShown()
    set({ ids: next, nudgeOpen: openNudge || get().nudgeOpen })
  },

  clear: (moved) => {
    const next = get().ids.filter((id) => !moved.includes(id))
    write(next)
    set({ ids: next })
  },

  closeNudge: () => set({ nudgeOpen: false }),
}))
