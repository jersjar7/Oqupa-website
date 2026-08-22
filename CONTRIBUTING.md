# Contributing to the Oqupa Website

A practical guide for developers (and for Claude in future sessions) to find meaningful work fast. Three contribution paths: **tests**, **bug fixes**, and **new features**.

> **On coverage numbers:** The overall statement coverage sits around 14%. That number is misleading. The codebase deliberately separates logic from presentation — all stateful logic lives in hooks, and components are pure UI. The majority of the 0% entries in the coverage report are either React component files (`.tsx`) that have no extractable logic, Firebase service wrappers that need the emulator to test properly, Canvas/pixel/SDK initializers that can't be tested in jsdom, or static data files (constants, enums, lists) where TypeScript's type-checker already provides the guarantee. The realistic ceiling for Vitest unit tests is around **45–55% statements** — beyond that, you need the Firebase emulator suite or Playwright end-to-end tests, which are different tools. The items below are the genuine unit-test opportunities.

---

## Quick start

```bash
git checkout development
git checkout -b feature/<your-branch-name>

cd Oqupa-website
npm install
npm run dev        # local dev server → http://localhost:5173 (always uses staging Firebase)

npm test           # run test suite
npm run coverage   # coverage report → open coverage/index.html
```

See `CLAUDE.md` for the full architecture overview, git workflow, and environment setup.

---

## 1 — Test coverage (highest ROI, start here)

The suite runs with **Vitest** + **@testing-library/react**. See `CLAUDE.md → Testing` for patterns (fixtures, IntersectionObserver mocking, commit style).

### Hooks — priority order

Pick the next unchecked hook and write its test file in `src/hooks/__tests__/<hookName>.test.ts`.

- [ ] `useAnimateOnScroll` — **7 usages** across every landing section. IntersectionObserver mock needed (see CLAUDE.md pattern). `isVisible` starts false, becomes true once on intersection, then `unobserve` is called and state never resets.
- [ ] `useDocumentMeta` — **6 usages** (every public page). Sets `document.title`, OG/Twitter meta tags, and the `<link rel="canonical">`. Verify tags are created when missing, updated when present, and title resets to `"Oqupa"` on unmount.
- [ ] `useGallery` — **5 usages**, ~45% covered. The callbacks (`next`, `prev`, `goTo`, `onTouchStart`, `onTouchEnd`) are untested. Use `renderHook`; a 50px touch diff threshold triggers swipe.
- [ ] `useRevealedFields` — **4 usages** in the listing wizard. Pure logic: the revealed set only grows (once shown, stays shown). Test with `skipReveal: true` (all fields immediately visible), progressive reveal as conditions flip to `true`, and confirm already-met conditions on first render skip animation.
- [ ] `useInfiniteScroll` — 1 usage (Explore page load-more). IntersectionObserver mock; `onLoadMore` fires when enabled and sentinel enters viewport, does not fire when `enabled: false`.
- [ ] `useMobileMenu` — 1 usage (Header). Test `toggle`, `close`, Escape key handler, and the auto-close on window resize to > 768px. Verify `document.body` scroll-lock styles are applied on open and cleared on close.
- [ ] `useMediaQuery` / `useIsDesktop` — 1 usage. Mock `window.matchMedia` and the `change` event to verify the boolean updates reactively.
- [ ] `useScrollHeader` — 1 usage (Layout). Same IntersectionObserver pattern as `useAnimateOnScroll`. `isScrolled` is `false` initially; becomes `true` when `heroRef` exits the viewport.
- [ ] `useExpansionPopup` — 1 usage (Layout). localStorage + `setTimeout`. Use `vi.useFakeTimers()` to control the 5-second show delay and the 3-second collapse-after-join timer.
- [ ] `useMapCameraStorage` — 1 usage (ExploreMap). localStorage round-trip; `savedCamera` reads on init, `saveCamera` serializes to JSON, invalid JSON returns `null`.
- [ ] `useExploreInteraction` — 1 usage (ExplorePage). Has real logic: hover debounce (75ms delay on null to prevent flicker), Escape key dismiss, scroll-to-card on marker click. Use `vi.useFakeTimers()` for the debounce.

### Guards — one missing

- [ ] `ContentGuard` — 0% coverage, 1 usage. Follows identical pattern to all other guards (which are all 100%). `isMarketingMemberEmail` gates access; non-member redirects to `/app`.

### Auth error mapping

- [ ] `getLoginAuthError`, `getPhoneAuthError`, `getMagicLinkAuthError`, `getForgotPasswordAuthError` — all in `src/lib/authErrors.ts` (currently 39%). Add to the existing `src/lib/__tests__/authErrors.test.ts`.

### Schemas

- [ ] `src/schemas/listingSchema.ts` — 0%. Test step1–step4 individually (valid pass, required-field failures, cross-field rules like alquiler needing `rentalDurationType`, and property types that don't require rooms).
- [ ] `src/schemas/profileSchema.ts` — 0%. Test `profileSchema` (name min/max, contactTimeSlot enum) and `changePasswordSchema` (passwords must match).

---

## 2 — Known bugs and reliability gaps

These are either confirmed issues or areas where low test coverage makes silent regressions likely.

### Confirmed / high-confidence

- **`ContentGuard` is untested.** It is the only access guard without a test suite. All the other guards' tests caught real issues during initial development; there is no reason to believe this one is different.

- **`authErrors.ts` — 3 of 5 functions untested.** `getLoginAuthError`, `getPhoneAuthError`, `getMagicLinkAuthError`, and `getForgotPasswordAuthError` exercise the same `extractFirebaseErrorCode` helper but are not covered. A regression in the shared helper would go unnoticed for three of the five flows.

- **`useRevealedFields` uses `setState during render`.** This is the React pattern for derived state updates and is technically allowed, but it is unusual and can cause subtle infinite-loop bugs if the conditions object reference changes on every render. Adding tests would catch any such regression.

### Coverage deserts worth watching

These files are at 0% and are nontrivial enough that silent bugs are plausible:

| File | Risk |
|------|------|
| `src/lib/errorBuffer.ts` | Wraps `console.error` globally; a bug here breaks dev diagnostics |
| `src/lib/shareUtils.ts` | Generates share text from listing data; wrong output harms the brand |
| `src/schemas/listingSchema.ts` | Invalid data could be submitted to Firestore if step validation is wrong |
| `src/hooks/useBugReportForm.ts` | Bug reports may silently fail to submit |
| `src/hooks/useExpansionForm.ts` | Expansion city signups may silently fail |

---

## 3 — Feature ideas

These are engineering-level improvements that are clearly scoped, consistent with the existing architecture, and do not require product decisions.

- **`useAnimateOnScroll` — configurable `rootMargin`.** The hook hard-codes `'0px 0px -100px 0px'`. Exposing it as an option (defaulting to the current value) would let sections that need a different trigger point customize it without forking the hook.

- **`useGallery` — keyboard navigation.** `PhotoCarousel` already handles `ArrowLeft`/`ArrowRight` keys, but the logic lives in the component, not the hook. Moving it into `useGallery` would let any gallery consumer get keyboard support for free and make it testable at the hook level.

- **`useExpansionPopup` — reset on demand.** There is currently no way to re-show the popup after a user has collapsed it without clearing localStorage manually. A `reset()` function in the hook (useful for testing and for in-app support flows) would be straightforward to add.

- **`ContentGuard` + `MetricsGuard` — unified `RosterGuard`.** Both guards follow exactly the same shape (check email allowlist → spinner while loading → redirect or render children). A generic `RosterGuard` component parameterised by a `check: (email) => boolean` and `redirectTo` prop would eliminate the duplication and ensure future guards are consistent.

- **Schema tests as a CI gate.** The `listingSchema` and `profileSchema` schemas currently have 0% coverage. Adding tests for them and requiring coverage ≥ 80% for `src/schemas/**` in `vite.config.ts` (via `coverageThresholds`) would prevent regressions in form validation from going unnoticed.

---

## What intentionally has no unit tests

These categories appear in the coverage report at 0% but should not have Vitest unit tests added:

| Category | Examples | Why no unit test |
|----------|----------|-----------------|
| **Firebase service layer** | All files in `src/services/` | Every function makes a live Firestore/Auth/Storage call. The existing emulator suite (`tests/`) covers data correctness; a Vitest mock would only test that you called the mock. |
| **Hooks that only call services** | `useProperty`, `useBoost`, `useContentLinks`, `useListings`, `useTeamTasks`, `useNumbersData`, `useBoundaryPolygons` | These are one-line TanStack Query wrappers over service functions. The logic to test is in the service, not the hook. |
| **Form hooks with Firebase + reCAPTCHA** | `useBugReportForm`, `useExpansionForm` | Depend on Cloud Functions + reCAPTCHA together. The submission path is an emulator concern. |
| **Analytics / tracking** | `analytics.ts`, `metaPixel.ts`, `tiktokPixel.ts` | Thin adapters over external SDKs (`fbq()`, `ttq()`, Firebase Analytics). Mocking the SDK only confirms you called the mock. |
| **Canvas painting** | `brandedCardPainter.ts` (414 lines), `blurhash.ts` | Both require the Canvas 2D API; jsdom's canvas stub returns `null` from `getContext('2d')`. Needs Playwright screenshot tests, not Vitest. |
| **SDK initializers** | `firebase.ts`, `stripe.ts`, `recaptcha.ts` | Load third-party scripts or initialize SDKs at module evaluation time — no isolatable logic. |
| **Static data** | `constants.ts`, `peruDepartamentos.ts`, `appStoreLinks.ts` | Export named values with no logic. TypeScript's type-checker is the right tool here. |
| **React component files (`.tsx`)** | Landing sections, page components, feature components | In this codebase, components are presentational — all logic lives in hooks. Testing a `.tsx` file would mean mocking 5–15 hooks and asserting JSX structure, which breaks on every UI change and catches no real bugs. Test the hooks instead. |

---

## Adding a new contributor to the access lists

The Oqupa access system has **one source of truth** (`src/app/features/access/people.ts`) that derives all other lists. To add a developer or marketer:

1. Add their entry to `people.ts`.
2. Run `npm run access:check` — it will report any drift between the TS lists and `firestore.rules`.
3. Run `npm run access:sync` to write the updated allowlists into `firestore.rules`.
4. Deploy the updated rules manually to both projects (rules are not auto-deployed by CI).

See `CLAUDE.md → Internal metrics dashboard` and `CLAUDE.md → Internal dev board` for the two-list invariant and its failure mode.
