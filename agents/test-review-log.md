## useMobileMenu.test.ts — 2026-09-10

**Flagged:**
- **Misleading test name:** "does not call window.scrollTo more than once when called repeatedly" — the assertion is `toHaveBeenCalledTimes(2)`, which is more than once. The test name directly contradicts the assertion. The inline comment inside the test was also self-contradictory ("scrollTo should only have been called once... second close also calls scrollTo (no guard)"). The actual behaviour being pinned is that `close()` calls `scrollTo` unconditionally on every invocation — there is no `isOpen` guard in the source — so two `close()` calls produce two `scrollTo` calls.

**Fixed:**
- Renamed "does not call window.scrollTo more than once when called repeatedly" → "calls window.scrollTo on every close() call — no isOpen guard in implementation" and updated the internal comment to accurately describe what is being asserted.

Test count: 25 → 25 (no tests removed or added). All 25 pass.

---

## useRevealedFields.test.ts — 2026-09-10
No issues found.

---

## useInfiniteScroll.test.tsx — 2026-09-10

**Flagged:**
- **Misleading test name:** "returns a ref that is attached to the sentinel DOM element" — the test only asserts `getByTestId('sentinel')` is truthy, which verifies the Fixture renders a div, not that the ref is wired to it. Ref attachment is actually verified by the separate "calls observer.observe with the sentinel element" test. The name overstated what was being asserted.
- **Redundant test:** "does not call onLoadMore when both isIntersecting is false and enabled is false" (under `enabled = false` describe block) — adds no new code-path coverage. The `&&` condition is fully exercised by the existing tests: `isIntersecting=false, enabled=true` (test 5) and `isIntersecting=true, enabled=false` (test 7). The double-false combination does not reach any branch that the other two do not already cover.

**Fixed:**
- Renamed "returns a ref that is attached to the sentinel DOM element" → "renders the sentinel element in the DOM" to accurately describe what the assertion checks.
- Removed the `isIntersecting=false && enabled=false` test — completely redundant, added no new information or bug-catching value.

Test count: 12 → 11. All 11 pass.

---

## useMediaQuery.test.ts — 2026-09-10

**Flagged:**
- **Duplicate test:** "reflects matchMedia.matches synchronously after the initial effect runs" (in `initial state` describe block) — identical setup and assertion to "returns false when matchMedia.matches is false on mount": both create a stub with `initialMatches: false`, stub `window.matchMedia`, render the hook, and assert `result.current` is `false`. The comment attempted to frame it as testing the effect's `setMatches` call, but because the same stub backs both the `useState` initializer and the effect, the result is indistinguishable from the first read. No new code path or behaviour was exercised.

**Fixed:**
- Removed the duplicate test. The "returns false when matchMedia.matches is false on mount" test already pins the same behaviour.

Test count: 14 → 13. All 13 pass.

---

## useScrollHeader.test.tsx — 2026-09-10
No issues found.

---

## useExpansionPopup.test.ts — 2026-09-10

**Flagged:**
- **Test that always passes regardless of implementation:** "clears the timer on unmount so no state update fires after unmount" — the assertion was `expect(() => { act(() => vi.advanceTimersByTime(SHOW_DELAY_MS)) }).not.toThrow()`. In React 19, calling `setState` on an unmounted component is a silent no-op (no throw, no warning), so this assertion passes whether `clearTimeout` is called or not. Removing the cleanup from the source would not break this test.

**Fixed:**
- Replaced the always-passing `not.toThrow()` assertion with `vi.getTimerCount()`: asserts there is exactly 1 pending timer before unmount and exactly 0 after unmount. This directly verifies that `clearTimeout` was called by the useEffect cleanup and will fail if the cleanup is removed.

Test count: 21 → 21 (no tests removed or added). All 21 pass.

---

## useMapCameraStorage.test.ts — 2026-09-10

**Flagged:**
- **Redundant test:** "does not throw when localStorage.getItem itself throws" — the test's only assertion was `expect(() => renderHook(() => useMapCameraStorage())).not.toThrow()`. The immediately following test, "returns null when localStorage.getItem throws", uses an identical setup and calls `renderHook` to completion before reading `result.current.savedCamera`. Any uncaught exception from inside the hook would cause `renderHook` itself to throw, failing the second test automatically. The `.not.toThrow()` wrapper adds zero detection capability that the second test does not already provide.

**Fixed:**
- Removed the "does not throw when localStorage.getItem itself throws" test — fully redundant with "returns null when localStorage.getItem throws".

Test count: 24 → 23. All 23 pass.

---
