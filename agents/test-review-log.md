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
