// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRevealedFields } from '../useRevealedFields'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRevealedFields', () => {
  // ── skipReveal mode ─────────────────────────────────────────────────────────

  describe('skipReveal = true (edit mode)', () => {
    it('makes every field immediately visible regardless of conditions', () => {
      const conditions = { name: false, price: false, description: false }
      const { result } = renderHook(() => useRevealedFields(conditions, true))

      expect(result.current.isRevealed('name')).toBe(true)
      expect(result.current.isRevealed('price')).toBe(true)
      expect(result.current.isRevealed('description')).toBe(true)
    })

    it('returns true for unknown field IDs too (skipReveal bypasses the set)', () => {
      const conditions = { name: false }
      const { result } = renderHook(() => useRevealedFields(conditions, true))

      expect(result.current.isRevealed('nonexistent')).toBe(true)
    })

    it('marks every field as wasInitial since all were visible on first render', () => {
      const conditions = { a: false, b: false }
      const { result } = renderHook(() => useRevealedFields(conditions, true))

      expect(result.current.wasInitial('a')).toBe(true)
      expect(result.current.wasInitial('b')).toBe(true)
    })

    it('wasInitial returns true for unknown IDs when skipReveal is set', () => {
      const conditions = {}
      const { result } = renderHook(() => useRevealedFields(conditions, true))

      expect(result.current.wasInitial('anything')).toBe(true)
    })
  })

  // ── skipReveal = false, initial conditions ──────────────────────────────────

  describe('initial state without skipReveal', () => {
    it('starts with no fields revealed when all conditions are false', () => {
      const conditions = { fieldA: false, fieldB: false }
      const { result } = renderHook(() => useRevealedFields(conditions, false))

      expect(result.current.isRevealed('fieldA')).toBe(false)
      expect(result.current.isRevealed('fieldB')).toBe(false)
    })

    it('starts with fields revealed whose conditions are already true on first render', () => {
      const conditions = { alreadyMet: true, notYet: false }
      const { result } = renderHook(() => useRevealedFields(conditions, false))

      expect(result.current.isRevealed('alreadyMet')).toBe(true)
      expect(result.current.isRevealed('notYet')).toBe(false)
    })

    it('starts with all fields revealed when all initial conditions are true', () => {
      const conditions = { a: true, b: true, c: true }
      const { result } = renderHook(() => useRevealedFields(conditions, false))

      expect(result.current.isRevealed('a')).toBe(true)
      expect(result.current.isRevealed('b')).toBe(true)
      expect(result.current.isRevealed('c')).toBe(true)
    })

    it('returns false for a field ID not present in conditions', () => {
      const conditions = { known: false }
      const { result } = renderHook(() => useRevealedFields(conditions, false))

      expect(result.current.isRevealed('unknown')).toBe(false)
    })
  })

  // ── wasInitial ──────────────────────────────────────────────────────────────

  describe('wasInitial', () => {
    it('returns true for a field that was already revealed on the first render', () => {
      const conditions = { alreadyMet: true, notYet: false }
      const { result } = renderHook(() => useRevealedFields(conditions, false))

      expect(result.current.wasInitial('alreadyMet')).toBe(true)
    })

    it('returns false for a field that was not met on the first render, even after it becomes revealed later', () => {
      let met = false
      const { result, rerender } = renderHook(() =>
        useRevealedFields({ field: met }, false)
      )

      // Field is not revealed yet.
      expect(result.current.wasInitial('field')).toBe(false)

      // Now the condition becomes true.
      met = true
      act(() => { rerender() })

      // isRevealed should now be true, but wasInitial must still be false.
      expect(result.current.isRevealed('field')).toBe(true)
      expect(result.current.wasInitial('field')).toBe(false)
    })

    it('returns false for a field ID not in the initial conditions', () => {
      const conditions = { known: true }
      const { result } = renderHook(() => useRevealedFields(conditions, false))

      expect(result.current.wasInitial('unknown')).toBe(false)
    })
  })

  // ── Progressive reveal ──────────────────────────────────────────────────────

  describe('progressive reveal on re-render', () => {
    it('reveals a field when its condition becomes true on a subsequent render', () => {
      let met = false
      const { result, rerender } = renderHook(() =>
        useRevealedFields({ field: met }, false)
      )

      expect(result.current.isRevealed('field')).toBe(false)

      met = true
      act(() => { rerender() })

      expect(result.current.isRevealed('field')).toBe(true)
    })

    it('keeps a field revealed even after its condition goes back to false (one-way ratchet)', () => {
      let met = true
      const { result, rerender } = renderHook(() =>
        useRevealedFields({ field: met }, false)
      )

      // Initially revealed because condition started true.
      expect(result.current.isRevealed('field')).toBe(true)

      // Condition turns false (e.g. user clears the prerequisite input).
      met = false
      act(() => { rerender() })

      // Field must stay visible — the revealed set only grows.
      expect(result.current.isRevealed('field')).toBe(true)
    })

    it('reveals fields independently — one becoming true does not affect others', () => {
      let metA = false
      const { result, rerender } = renderHook(() =>
        useRevealedFields({ fieldA: metA, fieldB: false }, false)
      )

      expect(result.current.isRevealed('fieldA')).toBe(false)
      expect(result.current.isRevealed('fieldB')).toBe(false)

      metA = true
      act(() => { rerender() })

      expect(result.current.isRevealed('fieldA')).toBe(true)
      expect(result.current.isRevealed('fieldB')).toBe(false)
    })

    it('reveals multiple fields at once when several conditions become true simultaneously', () => {
      let met = false
      const { result, rerender } = renderHook(() =>
        useRevealedFields({ a: met, b: met, c: false }, false)
      )

      expect(result.current.isRevealed('a')).toBe(false)
      expect(result.current.isRevealed('b')).toBe(false)

      met = true
      act(() => { rerender() })

      expect(result.current.isRevealed('a')).toBe(true)
      expect(result.current.isRevealed('b')).toBe(true)
      expect(result.current.isRevealed('c')).toBe(false)
    })

    it('keeps already-revealed fields visible when new conditions become true on later renders', () => {
      let metB = false
      const { result, rerender } = renderHook(() =>
        useRevealedFields({ a: true, b: metB }, false)
      )

      expect(result.current.isRevealed('a')).toBe(true)
      expect(result.current.isRevealed('b')).toBe(false)

      metB = true
      act(() => { rerender() })

      // Both must be visible.
      expect(result.current.isRevealed('a')).toBe(true)
      expect(result.current.isRevealed('b')).toBe(true)
    })
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles an empty conditions object without throwing', () => {
      expect(() => {
        renderHook(() => useRevealedFields({}, false))
      }).not.toThrow()
    })

    it('with empty conditions, isRevealed always returns false for any ID', () => {
      const { result } = renderHook(() => useRevealedFields({}, false))

      expect(result.current.isRevealed('anyField')).toBe(false)
    })

    it('initialSet is frozen on first render — adding a new field later does not affect wasInitial', () => {
      // Start with one field not met.
      const { result, rerender } = renderHook(
        ({ conditions, skip }: { conditions: Record<string, boolean>; skip: boolean }) =>
          useRevealedFields(conditions, skip),
        { initialProps: { conditions: { original: false } as Record<string, boolean>, skip: false } }
      )

      expect(result.current.wasInitial('newField')).toBe(false)

      // Re-render with an extra field now present AND met.
      act(() => {
        rerender({ conditions: { original: false, newField: true }, skip: false })
      })

      // isRevealed should work for newField (it became true on re-render).
      expect(result.current.isRevealed('newField')).toBe(true)
      // But wasInitial must remain false — the field wasn't in the initial snapshot.
      expect(result.current.wasInitial('newField')).toBe(false)
    })
  })
})
