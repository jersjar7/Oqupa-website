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

## useExploreInteraction.test.ts — 2026-09-10

**Flagged:**
- **Test that always passes regardless of implementation:** "stops responding to Escape after unmount" (in `Escape key listener` describe block) — the only assertion was `expect(() => fireKeydown('Escape')).not.toThrow()`. In React 19, calling `setState` on an unmounted component is a silent no-op (no throw, no warning). Whether or not `removeEventListener` is called in the cleanup, pressing Escape after unmount never throws. Removing `return () => window.removeEventListener('keydown', handler)` from the source would not break this test.
- **Test that always passes regardless of implementation:** "does not call setHoveredId after unmount if null timeout was pending" (in `debounce timer cleanup on unmount` describe block) — the assertion `expect(() => act(() => vi.advanceTimersByTime(75))).not.toThrow()` has the same flaw. In React 19, a pending `setTimeout` calling `setHoveredId(null)` on an unmounted component is a silent no-op. Removing `clearTimeout` from the cleanup effect would not break this test.

**Fixed:**
- Replaced the always-passing `not.toThrow()` assertion in "stops responding to Escape after unmount" with `vi.spyOn(window, 'removeEventListener')`: asserts the spy was called with `'keydown'` during unmount. This directly verifies the cleanup runs `removeEventListener` and will fail if the cleanup is removed from the source.
- Renamed "does not call setHoveredId after unmount if null timeout was pending" → "clears the pending debounce timeout on unmount" and replaced the always-passing `not.toThrow()` assertion with `vi.getTimerCount()`: asserts 1 pending timer before unmount and 0 after, directly verifying `clearTimeout` was called. Same pattern applied to `useExpansionPopup.test.ts`.

Test count: 35 → 35 (no tests removed or added). All 35 pass.

---

## Second batch review — 2026-09-10

The following files were written in the second batch session (commits 3bd5258 through c43c700). Each was reviewed against the criteria in `test-verifier.md`. Issues found are documented per-file below.

---

## useContentLinks.test.ts (reactive hooks portion) — 2026-09-10
No issues found. The pure-function section (dateKey, daysInMonth) was reviewed in the first batch. The reactive hooks section (useContentLinks, useShelvedLinks) correctly mocks the service, verifies loading state, grouping logic, sort order, null-date filtering, error handling, and re-subscription on prop change.

---

## people.test.ts — 2026-09-10
No issues found. emailsWith, personFor, and peopleWith are all tested with known-good and known-bad inputs, null/undefined, case-insensitivity, and consistency invariants.

---

## teamRoster.test.ts — 2026-09-10
No issues found. isTeamMemberEmail, isMarketingMemberEmail, canAccessTeam, memberFor, membersOf, and TEAM_MEMBERS all have targeted tests with representative inputs and null/undefined safety checks.

---

## planContent.test.ts — 2026-09-10

**Flagged:**
- **Duplicate test:** "all days have a valid PlanOwner value" (line 123) is an exact duplicate of "owner is either 'jerson' or 'engineering' for every day" (line 81). Both iterate PLAN_DAYS and assert that each day's `owner` is contained in `['jerson', 'engineering']`. No new code path or edge case is exercised by the second test.

**Fixed:**
- Replaced "all days have a valid PlanOwner value" with "each day has only the required fields (no unexpected nulls in action/doneWhen)" which verifies that `action`, `doneWhen`, `why`, `phase`, `theme`, and `category` are all strings — an assertion that complements the existing field presence check without duplicating the owner check.

Test count: 13 → 13 (replaced, not removed). All 13 pass.

---

## appStoreLinks.test.ts — 2026-09-10

**Flagged:**
- **Redundant test:** "both URLs use HTTPS" — tests 1 and 2 already use regex patterns anchored at `^https://apps.apple.com/` and `^https://play.google.com/`, which implicitly verify HTTPS. The third test (`startsWith('https://')`) adds no new detection capability.

**Fixed:**
- Replaced "both URLs use HTTPS" with "both URLs contain the expected path structure" which asserts `APP_STORE_URL` contains `/app/` and `GOOGLE_PLAY_URL` contains `/store/apps/details`. This pins structural correctness not covered by tests 1 and 2.

Test count: 3 → 3 (replaced, not removed). All 3 pass.

---

## constants.test.ts — 2026-09-10
No issues found. All exported constants are tested with type checks, range guards, and structural assertions appropriate for their types.

---

## metaPixel.test.ts — 2026-09-10
No issues found. Production guard is correctly tested via the `__testing.isProduction` export, and all three exported functions verify early-return behaviour and no side-effects in non-production mode.

---

## tiktokPixel.test.ts — 2026-09-10
No issues found. Same pattern as metaPixel — production guard, no side-effects in test environment, idempotency verified.

---

## stripe.test.ts — 2026-09-10
No issues found. The singleton test correctly verifies reference equality of the same Promise object across two calls within the same module instance.

---

## listingFormStore.test.ts — 2026-09-10
No issues found. Initial state, navigation (nextStep/prevStep/setStep with direction and boundary clamping), updateData merge, setEditMode, reset, sessionStorage persistence, File exclusion, and QuotaExceededError survival are all tested.

---

## listStore.test.ts — 2026-09-10
No issues found. Pure helper functions (isSavedInAnyList, getListsContaining) and the Zustand store (initialize, subscription callback, re-subscribe cleanup, reset) are all covered.

---

## brandedCardConfig.test.ts — 2026-09-10
No issues found. All fields of buildBrandedCardConfig are exercised with concrete assertions; rental duration defaults, null specs, and currency symbols are all covered.

---

## enums.test.ts — 2026-09-10
No issues found. Enum values, all label maps, property type lists, and utility functions (isAlquilerOnlyType, propertyTypeHasRooms, propertyTypeIsRoom) are all tested with representative inputs.

---

## exploreEmptyState.test.ts — 2026-09-10
No issues found. All three branches of getExploreEmptyMessage are covered including the precedence rule (total=0 takes priority over filteredCount).

---

## peruDepartamentos.test.ts — 2026-09-10
No issues found. Array membership, absence of Piura, no duplicates, and alphabetical sort are all verified.

---

## realtorApplicationSchema.test.ts — 2026-09-10
No issues found. Boundary values (0/50 for yearsExperience, 20/500 for motivation, 0/100 for businessName) and rejection cases are all tested.

---

## useGrowthPlan.test.ts — 2026-09-10
No issues found. todayKey pure function tested; hook covers initial state, data delivery, week grouping, doneCount, remainingMinutes, today identification, error handling, and per-week doneCount.

---

## useTeamTasks.test.ts — 2026-09-10
No issues found. Sorting logic (in-progress before done, done by doneAt DESC, in-progress by createdAt DESC) is well-covered; grouping by lowercase assignee email and the re-subscribe guard are also tested.

---

## useListListings.test.ts — 2026-09-10
No issues found.

---

## useListings.test.ts — 2026-09-10
No issues found.

---

## useProperty.test.ts — 2026-09-10
No issues found.

---

## useBoost.test.ts — 2026-09-10
No issues found.

---

## useAdmin.test.ts — 2026-09-10
No issues found.

---

## useRealtorLeads.test.ts — 2026-09-10
No issues found.

---

## useBugReportForm.test.ts — 2026-09-10
No issues found.

---

## useExpansionForm.test.ts — 2026-09-10
No issues found.

---

## useNumbersData.test.ts — 2026-09-10
No issues found.

---

## contentLinkService.test.ts — 2026-09-10
No issues found.

---

## teamTaskService.test.ts — 2026-09-10
No issues found.

---

## growthPlanService.test.ts — 2026-09-10
No issues found.

---

## listService.test.ts — 2026-09-10
No issues found.

---

## contactService.test.ts — 2026-09-10
No issues found.

---

## boostService.test.ts — 2026-09-10
No issues found.

---

## authStore.test.ts — 2026-09-10
No issues found.

---

## listStore.test.ts (extended) — 2026-09-10
No issues found.

---

## storageService.test.ts — 2026-09-10
No issues found.

---

## blurhash.test.ts — 2026-09-10
No issues found. blurHashToDataUrl and generateBlurHash both tested with success path, error paths (bad hash, null context), custom dimensions, and correct pixel/encode call arguments.

---

## analytics.test.ts — 2026-09-10
No issues found. All AnalyticsLogger methods tested for GA event name+params, Meta/TikTok forwarding, optional parameter inclusion, and truncation behaviour.

---

## authService.test.ts — 2026-09-10
No issues found.

---

## firestoreService.test.ts — 2026-09-10
No issues found.

---

## clientId.test.ts — 2026-09-10
No issues found. UUID generation, singleton rehydration, localStorage error fallback, and crypto API fallbacks (getRandomValues, Math.random) all tested.

---

## recaptcha.test.ts — 2026-09-10
No issues found. No-key early return, script injection, load/error events, scriptLoaded guard, and grecaptcha.enterprise.ready path all tested.

---

## fieldStyles.test.ts — 2026-09-10
No issues found.

---

## useBoundaryPolygons.test.ts — 2026-09-11
No issues found. Early-return guards, GeoJSON loading (Polygon and MultiPolygon), coordinate swapping ([lng,lat] → LatLng(lat,lng)), multi-layer fetch, isInsideBoundary (permissive default while loading, containsLocation forwarding), cleanup (setMap(null) on all instances, no-throw on empty polygon ref), cancellation (deferred-fetch unmount prevents setIsLoaded, multi-layer mid-fetch unmount), and the module-level geojsonCache (fetch count does not increase on second mount) are all correctly covered. The "does not throw when unmounted before fetch resolves" test correctly pins that the synchronous cleanup does not throw when polygonsRef.current is empty — not an always-passing assertion.

---

## AuthPipelinePage.submissions.test.tsx — 2026-09-11
No issues found. Name step (updateUserName, refreshUser, toast.success, advance to phone, error stays on step), phone step (sendPhoneVerificationCode with +51 prefix via placeholder selector, toast.success, captcha-check-failed reinit asserting both cleanupRecaptcha and initializeRecaptcha, skip navigate), verify-code step (verifyPhoneCode with stored verificationId, updateUserContactInfo with whatsappPhoneNumber, navigate /app or returnUrl, error toast, stays on step, Cambiar número goes back), email-verify error path (sendEmailVerificationToCurrentUser throws → toast.error, refreshFirebaseUser throws → inline error), and resend button disabled-state guard (cooldown > 0) are all tested and catch real regressions.

---

## CompleteSignInPage.success.test.tsx — 2026-09-11
No issues found. Auto-completing from localStorage email (navigate to /app/verify when phone not verified, to /app when phone verified), return URL (completeMagicLinkSignIn called, consumeReturnUrl called — navigation to unregistered route is expected and commented), and manual email form (completeMagicLinkSignIn called with typed email, navigate to /app/verify) are all covered. The return-URL test correctly limits its assertion to what the test router can observe.

---

## SetPasswordPage.extra.test.tsx — 2026-09-11
No issues found. Success path (navigate to /app, confirmSetPassword called with correct oobCode/password/email), generic error path (message containing "no pudimos configurar"), emailVerified state (heading, email shown, Continuar navigates to /app/verify), expired-code invalid state (enlace de verificación expiró text), and the verifyEmail-mode link suppression ("Solicitar un nuevo enlace" absent for verifyEmail mode) are all covered with concrete assertions.

---

## PhotoCarousel.test.tsx (explore/PhotoCarousel) — 2026-09-11

**Flagged:**
- **Test that always passes regardless of implementation:** "prefers microThumb over blurHash when both are provided" — wrapped the key assertion in `if (firstSlide) { ... }`. In jsdom, the style attribute selector `[style*="backgroundImage"]` (camelCase) never matches because jsdom serialises inline styles as `background-image` (kebab-case). The `document.querySelector` returned null, the `if` guard silently skipped the assertion, and the test passed no matter what the component rendered.

**Fixed:**
- Replaced the `[style*="backgroundImage"]` selector with `.shrink-0` (the class on the first slide's wrapper div in the component source). Removed the `if (firstSlide)` guard and added `expect(firstSlide).not.toBeNull()` followed by the unconditional `expect(firstSlide!.style.backgroundImage).toContain(...)` assertion. The test now fails if the element is absent or if the background style is wrong.

Test count: 19 → 19 (no tests removed or added). All 19 pass.

---

## recaptcha.test.ts (timeout callbacks) — 2026-09-11
No issues found. Script-load timeout ("reCAPTCHA script load timeout" at 5001ms with fake timers, `vi.useFakeTimers()` in `beforeEach` so it applies before `await import`) and token timeout ("reCAPTCHA token timeout" at 5001ms when `grecaptcha.enterprise.ready` never calls callback) are correctly covered. The `.catch()` capture pattern before advancing fake timers avoids unhandled-rejection warnings. No always-passing assertions detected.

---

## Third batch closing summary — 2026-09-11

Six final batch test files reviewed (written on 2026-09-11 to reach the 50% coverage milestone).

| File | Issues | Fixes |
|------|--------|-------|
| `useBoundaryPolygons.test.ts` | 0 | — |
| `AuthPipelinePage.submissions.test.tsx` | 0 | — |
| `CompleteSignInPage.success.test.tsx` | 0 | — |
| `SetPasswordPage.extra.test.tsx` | 0 | — |
| `PhotoCarousel.test.tsx` | 1 | Conditional assertion replaced with unconditional + null guard |
| `recaptcha.test.ts` (timeout paths) | 0 | — |

---

## Overall campaign summary — 2026-09-11

Three review sessions covering 51 distinct test files written across the full coverage campaign (first batch: hooks and simple utilities; second batch: stores, services, schemas, components, and complex hooks; third batch: boundary hook, auth page submissions, and the 50% milestone files).

| Metric | Count |
|--------|-------|
| Total test files reviewed | 51 |
| Files with issues found | 8 |
| Total issues flagged | 11 |
| Tests removed (redundant/always-passing) | 3 |
| Tests replaced (duplicate or misleading) | 3 |
| Tests renamed (misleading names) | 2 |
| Tests fixed in-place (wrong assertion) | 3 |
| Suite size after all fixes | 1849 passing, 5 skipped (104 test files) |

**Issue breakdown by type:**
- Always-passing assertions (React 19 silent no-op or unconditional pass): 4 (`useExpansionPopup`, `useExploreInteraction` ×2, `PhotoCarousel`)
- Misleading test names: 2 (`useMobileMenu`, `useInfiniteScroll`)
- Redundant/duplicate tests: 4 (`useInfiniteScroll`, `useMediaQuery`, `useMapCameraStorage`, `planContent`, `appStoreLinks`)
- Wrong assertion target: 1 (`PhotoCarousel` — broken selector)

Coverage at campaign close: **50.00% statements** (target met).

---

## e045b58 leftover additions (utils.test.ts, authService.test.ts, contactService.test.ts) — 2026-10-07

**Flagged:**
- **Incomplete assertion target (authService.test.ts, checkAccountExists):** both tests only asserted the returned boolean mirrored the mocked `data.exists`. Neither verified the callable name or the payload, so calling the wrong Cloud Function or sending `{ email: '' }` / no email would still pass.

**Fixed:**
- Strengthened the "returns true" test (renamed to "calls the checkAccountExists Cloud Function with the email and returns true when it exists") to also assert `httpsCallableMock` was called with `'checkAccountExists'` and `callableInvokerMock` with `{ email: 'user@test.com' }`.

No issues in utils.test.ts (legacy plain-path branch, both `/`-prefixed and non-prefixed) or contactService.test.ts (not-found / permission-denied / aborted mappings each match a distinct source branch, no duplicates). refreshSession no-user test is not always-passing: removing the guard makes `null.getIdToken` reject.

Test count: unchanged. All 122 tests in the three files pass.

---

## 18d2c90 batch (21 test files, 28+ new tests) — 2026-10-07

Reviewed every test added in `test(coverage): improve branch coverage from 82.21% to 85.28%`.

**Flagged:**
- **Misleading name + self-contradictory comment (brandedCardPainter.test.ts):** "cdn-cgi URL where tier 3 fetch (direct URL) succeeds (line 144 true branch)". With `imgShouldError = true` the blob `<img>` inside `fetchAsBlob` also errors, so `result3` is null and the success branch is never taken. The same commit wraps that branch in `/* v8 ignore */` as untestable, which confirms it. The test only proves the direct-URL retry was attempted.
- **Weak assertion (listingFormStore.test.ts):** the new "non-QuotaExceededError" test and the older QuotaExceededError test both only asserted `not.toThrow()`. The only thing line 108 decides is whether `console.warn` fires, so the "false branch" test could not tell the two branches apart.
- **Weak assertion (errorBuffer.test.ts):** the stack-undefined test only checked the message was present. Removing `?? ''` would print "undefined" and the test would still pass.
- **Weak assertion (authStore.test.ts, claimMonth default):** a `/^\d{4}-\d{2}$/` regex passes even with an off-by-one `getMonth()` bug.
- **Incomplete assertion (authService.test.ts, verifyPhoneCode non-phone provider):** asserted the link path ran but not that the update-phone path did not.

**Fixed:**
- brandedCardPainter: renamed to "cdn-cgi URL: retries the fetch with the stripped direct URL after tiers 1 and 2 fail", rewrote the comment to match, and asserted ordering (first fetch is the cdn-cgi URL, then the exact direct URL).
- listingFormStore: spied `console.warn`. The Quota test asserts it was called; the non-Quota test asserts it was not.
- errorBuffer: asserts `'TypeError: stack missing'` and `not.toContain('undefined')`.
- authStore: claimMonth compared to the exact computed `YYYY-MM`.
- authService: added `expect(updatePhoneNumberMock).not.toHaveBeenCalled()`.

No issues in dashboardHelpers, ListingsPage, useGrowthPlan, formatters, shareUtils, metaPixel, tiktokPixel, utils (TTL), boostService, contentLinkService, firestoreService, storageService, or teamTaskService additions.

**Outside verifier scope, for the user:** this commit also adds `/* v8 ignore */` to 13 production source files. Several hide branches that are reachable and worth testing rather than dead: `useExploreListings` `if (isFetchingNextPage) return` (prevents duplicate fetches); and `brandedCardPainter` tier-3/tier-4 success returns (testable with a URL-aware img mock). As a result, the CLAUDE.md entry "brandedCardPainter 100% branches" is not accurate. Source files were not modified by the verifier.

Test count: unchanged. Full suite: 104 files, 1842 passed, 5 skipped.

---

**Correction (same day):** the entry above originally listed `useBoundaryPolygons` `if (!cancelled)` (line 77) as reachable. It is not: nothing is awaited between the last `if (cancelled) return` (line 42) and line 77, so `cancelled` cannot change in between. The existing test named "line 74 cancelled branch" actually exercises line 42. The v8 ignore there is legitimate.

---
