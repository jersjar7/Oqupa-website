import { useState, useCallback, useRef } from 'react'

/**
 * Progressive reveal hook: fields appear one at a time as previous fields are completed.
 * The revealed set only grows — once a field is shown, it stays visible even if the
 * user clears the previous field.
 *
 * @param conditions - Map of field ID to whether its prerequisite is met
 * @param skipReveal - When true (edit mode), all fields are immediately visible
 */
export function useRevealedFields(
  conditions: Record<string, boolean>,
  skipReveal: boolean
) {
  // Track which fields were already visible on first render (skip animation for those)
  const initialSet = useRef<Set<string> | null>(null)

  if (initialSet.current === null) {
    const set = new Set<string>()
    if (skipReveal) {
      for (const id of Object.keys(conditions)) set.add(id)
    } else {
      for (const [id, met] of Object.entries(conditions)) {
        if (met) set.add(id)
      }
    }
    initialSet.current = set
  }

  // Revealed set only grows — once a field is shown, it stays visible
  const [revealed, setRevealed] = useState<Set<string>>(() => {
    return new Set(initialSet.current!)
  })

  // React allows setState during render if it's conditional and doesn't loop.
  // Check if any new conditions became true that aren't in the revealed set yet.
  let needsUpdate = false
  for (const [id, met] of Object.entries(conditions)) {
    if (met && !revealed.has(id)) {
      needsUpdate = true
      break
    }
  }

  if (needsUpdate) {
    const newSet = new Set(revealed)
    for (const [id, met] of Object.entries(conditions)) {
      if (met) newSet.add(id)
    }
    setRevealed(newSet)
  }

  const isRevealed = useCallback(
    (id: string) => skipReveal || revealed.has(id),
    [skipReveal, revealed]
  )

  const wasInitial = useCallback(
    (id: string) => skipReveal || initialSet.current!.has(id),
    [skipReveal]
  )

  return { isRevealed, wasInitial }
}
