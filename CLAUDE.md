# CLAUDE.md — Oqupa Website

Reference for Claude Code when working on this project.

## Quick Reference

- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Dev:** `npm run dev` (Vite dev server at localhost:5173)
- **Deploy:** `npm run build && firebase deploy --only hosting` (manual)
- **Firebase project:** `oqupa-production` (region: `southamerica-east1`)
- **Firebase account:** `admin@oqupa.com`
- **Domain:** oqupa.com

## Architecture

React 19 + Vite 6 + TypeScript 5.9 (strict) + Tailwind CSS 4. Single-page app using BrowserRouter on Firebase Hosting (SPA rewrite). No SSR, no backend server — Firestore is the database, accessed directly from the client.

### Path alias

`@/` maps to `./src/` (configured in both tsconfig.json and vite.config.ts).

### Code splitting

Vite splits into 3 chunks: `index` (app code), `vendor` (React/Router), `firebase` (Firebase SDK).

## Git Workflow & Environment Strategy

**Never work directly on `master`.** Always create a new feature branch from `development`, then merge to `development` for staging QA. Only merge `development` → `master` when ready for production release.

| Branch | Firebase project | Deploy target |
|--------|-----------------|---------------|
| `feature/*` | `oqupa-staging` (via `npm run dev`) | Local only |
| `development` | `oqupa-staging` | CI auto-deploys to staging hosting |
| `master` | `oqupa-production` | CI auto-deploys to production hosting |

**All local development (`npm run dev`) always connects to staging, regardless of branch.** The environment is determined by Vite's build mode, not by git branch.

```
feature/xyz → merge to development → CI deploys to staging → QA → merge to master → CI deploys to production
```

## Key Patterns

### Hooks-based architecture
All stateful logic lives in custom hooks under `src/hooks/`. Components are presentational. Each hook has a single responsibility.

### Scroll animations
Components use `useAnimateOnScroll()` which returns `{ ref, isVisible }`. Attach `ref` to the element, conditionally apply animation classes based on `isVisible`. Uses IntersectionObserver, fires once.

### Firestore access
All Firestore operations go through `src/services/firestoreService.ts`. The Firebase app is initialized in `src/lib/firebase.ts` and exports `db`.

### Explore page data flow
The Explore page (`/explorar`) uses paginated Firestore queries via `useInfiniteQuery` from TanStack Query. The `useExploreListings` hook loads 30 listings per page ordered by `boostScore` DESC then `publishedAt` DESC, flattening all pages into a single array. `operationType` filtering (Venta/Alquiler/Todos) is done **server-side** at the Firestore query level — when `operationType` is set, the query adds `where('operationType', '==', value)` and uses the `operationType + status + boostScore + publishedAt` index. When null (Todos tab), it omits the filter and uses the `status + boostScore + publishedAt` index. Other filters (propertyType, rentalDurationType, price range) remain client-side in `useMapFilters` since they reference Property fields. The list panel uses infinite scroll (`useInfiniteScroll` with IntersectionObserver sentinel) to load more pages. The map uses `@googlemaps/markerclusterer` for marker clustering via the `ClusteredMarkers` component.

### Firestore query patterns

| Query | Filters | Order | Index |
|-------|---------|-------|-------|
| Venta/Alquiler | `status == 'active'` + `operationType == X` | boostScore DESC, publishedAt DESC | operationType + status + boostScore + publishedAt |
| Todos | `status == 'active'` | boostScore DESC, publishedAt DESC | status + boostScore + publishedAt |

**Required fields on every listing document:** `boostScore` (default: 1), `operationType`, `status`, `publishedAt` (on activation).

### Styling
Tailwind utility classes inline. Brand theme (colors, fonts, shadows) defined as CSS custom properties in `src/index.css`. Custom animations also defined there. No component CSS files.

### Text Styles

Two font families defined in `src/index.css`:
- **Gotham** (`font-sans`, the body default) — Book (400), Medium (500), Bold (700)
- **Roboto Serif** (`font-serif`) — Light (300), Regular (400), Medium (500), Bold (700)

Semantic styles mapped to Tailwind classes (mirrors Flutter `AppTextStyles`):

| Style | Tailwind classes | Font | Use for |
|-------|-----------------|------|---------|
| **Header 1** | `font-serif text-[28px] font-normal` | Roboto Serif 400, Title Case | **Page titles, hero headings, KPI display values.** Brand-deck primary heading style. |
| **Header 2** | `font-sans text-[22px] font-medium` | Gotham 500, Title Case | Section headings inside a page (e.g. "Mis propiedades" sub-section). |
| **Subhead** | `font-sans text-sm font-medium uppercase tracking-wide` | Gotham 500, UPPER CASE | Section labels, field labels, KPI card labels, table headers. |
| **Body** | `text-base` (inherits `font-sans`) | Gotham 400, Sentence case | Paragraphs, descriptions, form copy. |
| **Caption** | `font-serif text-xs font-light italic` | Roboto Serif 300 italic, Sentence case | Fine print, metadata, secondary detail text, timestamps. |
| **Legal** | `font-serif text-xs font-light` | Roboto Serif 300, Sentence case | Legal links (privacy, terms). |
| **Button** | `font-sans text-base font-bold uppercase tracking-[1px]` | Gotham 700, UPPER CASE | All button / CTA labels. |

**Brand rule (per Oqupa Brand Deck typography slide):** Roboto Serif is the **primary heading font** for titles and hero display values. Gotham handles labels, body, and buttons. Do NOT default new headings to Gotham — Header 1 (Roboto Serif, Title Case) is the correct choice for page titles and any hero/display element.

### Language
All user-facing text is in Spanish. Variable names and code comments are in English.

## Firestore Collections (used by website)

| Collection | Used for | Rules |
|------------|----------|-------|
| `waitlist` | Landing page signups | Public create only |
| `mail` | Trigger Email extension queue | Public create only |
| `listings` | The **advertisement**: `description`, `price`, `status`, `viewCount`, `ownerId`, `operationType` | Public read |
| `properties` | The **physical asset**: `propertyType`, `specs` (beds/baths/m²), `location`, `media` | Public read |

> **`description` lives on the LISTING, never on the property.** It is ad copy, so it belongs to the ad — the same physical property re-advertised later gets a new one. `Property` has no `description` field at all, and `createProperty` does not accept one; `createListing` does.
>
> On 2026-08-08 this cost real trust: a check for descriptions ran against `properties`, found none on any of the 50, and was reported to Jerson as "the website collects a description and throws it away — a bug affecting every listing". **49 of the 50 listings had one, and the page renders it fine.** The trace even followed `createProperty` and correctly saw no description there, then stopped one function short of `createListing`.
>
> The lesson is not "remember where description lives". It is: **an empty result is not a finding.** Before reporting that something does not exist, confirm from the other direction — here, one look at a live listing page would have settled it in seconds.
| `config` | Platform configuration (pricing, feature flags) | Public read |
| `payments` | Boost payment records | Owner read only |
| `publicMetrics` | Daily aggregate snapshots for the internal `/app/numbers` dashboard | Read = email allowlist; write = server only |
| `teamTasks` | Tasks on the internal dev board at `/app/equipo` | Read + write = email allowlist (roster) |
| `contentLinks` | Where each piece of marketing content lives, on `/app/contenido` | Read + write = marketing access list |
| `growthPlan` | Progress on the six-week growth plan, one doc per day (`YYYY-MM-DD`) | Read + write = marketing access list; `notes` capped at 2000 chars |

### Internal metrics dashboard (`/app/numbers`)

The team metrics dashboard is a gated tab inside the authenticated dashboard shell, **not** a public page. It used to live at the public `oqupa.com/numbers` URL; that route now `<Navigate replace>`s to `/app/numbers` so old bookmarks still flow through `AuthGuard` + `MetricsGuard`.

- Access is an **email allowlist** (small set of teammates), not a role. To add/remove someone you must edit the list in **two places that must stay in sync**:
  1. `src/app/components/guards/MetricsGuard.tsx` — `METRICS_ALLOWED_EMAILS` (client gate + sidebar/bottom-tab visibility via `capabilities.isMetricsViewer`).
  2. `firestore.rules` → `match /publicMetrics/{date}` — the read allowlist (so the data itself is protected, not just the UI).
  Both lists are lowercased and compared case-insensitively. If they drift, a user either sees an empty/error dashboard (UI allows, rules deny) or a hidden-but-readable collection (rules allow, UI hides). After editing `firestore.rules`, redeploy it manually (it is **not** auto-deployed by CI) to **both** projects.
- `MetricsPage` is `React.lazy()`-loaded so `recharts` stays in its own chunk — non-viewers never download it.
- Source data: `publicMetrics/{YYYY-MM-DD}` written daily (03:30 Lima) by the `snapshotPlatformMetrics` Cloud Function (Admin SDK, bypasses rules). Aggregates only — no PII.

### Marketing content page (`/app/contenido`)

Three views behind one marketing-gated tab. **Plan** sits apart on the right because it is a different job from the other two; **Calendario** and **Sin programar** share a toggle on the left because they are two halves of one job — where the assets live.

| View | What it is |
|---|---|
| **Plan** | The six-week growth plan. Text seeded from `src/app/features/plan/planContent.ts`; per-day progress written live to Firestore `growthPlan/{YYYY-MM-DD}`. See the `growth-day` skill. |
| **Calendario** | One row per day of a month, each holding any number of content links. |
| **Sin programar** | Finished material with **no publish day yet**. Count rides on the tab so it is visible without opening the view. |

**One link is one record with an optional day.** `contentLinks.date` is either `'YYYY-MM-DD'` or **`null`** — null means it sits on the shelf. Assigning a day moves the *same* record onto the calendar; nothing is copied, so there is no second place to keep in sync.

> **`date: null` is written explicitly, never by omitting the field.** Firestore can equality-match null but **cannot match a missing field**, and the shelf query is `where('date', '==', null)`. Omit it and the shelf silently finds nothing. Both halves — that a null date never leaks into a month range query, and that the shelf query finds it — are pinned by tests in `tests/firestore-rules.test.js`.

**The date is NOT immutable.** It was until 2026-08-08; the rule pinned it so a stray write could not move content between days. Moving material between days, and between the shelf and the calendar, is the point of the shelf, so the pin is gone. What it protected is kept: a date can still only ever be a real calendar day or null.

**The shelf sorts in the browser, not in the query.** `where(date == null)` combined with `orderBy(createdAt)` would need a composite index, and a forgotten index is what shipped the team board broken on 2026-08-01. The shelf holds tens of items; sorting client-side costs nothing and removes a deploy step that can be missed.

**Day picker** (`DayPickerDialog`): a month grid where every cell lists what is already scheduled that day, because a plain date field makes you choose blind. Read-only — it shows what is there and edits nothing. **The week starts on Sunday**: `new Intl.Locale('es-PE').getWeekInfo()` reports `firstDay: 7`. Hardcoded from that verified value rather than called at runtime, since `getWeekInfo` is missing in some browsers and a silent fallback shifts the whole grid by a day.

### Internal dev board (`/app/equipo`)

A shared to-do board for the four developers, gated exactly like `/app/numbers` (email allowlist, own sidebar tab, invisible to everyone else) except the list grants **read + write** — the board is collaborative by design, so any teammate can add, claim, reassign, finish, or delete any task.

- Layout: a row of per-person columns (fixed height, internal scroll, newest first, `created` / `done` stamps on each card) above one full-width "Por hacer" container holding unclaimed tasks.
- No `status` field. Where a task renders is derived: `assigneeEmail === null` → the shared list; assigned + no `doneAt` → that person's column, in progress; `doneAt` set → finished. The two can't disagree.
- **Roster lives in two places that must stay in sync:**
  1. `src/app/features/team/teamRoster.ts` — `TEAM_MEMBERS` (drives access, the sidebar tab via `capabilities.isTeamMember`, and which columns render, in order).
  2. `firestore.rules` → `isTeamMember()` — the data gate.
  Same failure mode as the metrics allowlist if they drift. Rules are **not** auto-deployed — redeploy manually to staging **and** production after any roster change.
- Every task carries a `team` field pinned to `'dev'`. There is only one board today; the field exists so a second one (marketing) can be added later by adding roster entries, with no migration of existing documents.
- Realtime via `onSnapshot` (`teamTaskService.subscribe`) so teammates see each other's changes without refreshing. Needs the `teamTasks: team + createdAt DESC` composite index.

**Firestore rules AND indexes** are version-controlled at the repo root (`firestore.rules`,
`firestore.indexes.json`, `storage.rules`). Neither is auto-deployed by CI.

> **Deploy BOTH, or the feature ships broken while looking handled.** On 2026-08-01 the team board
> went to production with its rules deployed but its index forgotten. The page loaded, then failed
> with `permission-denied` — a misleading message, because the real cause was the missing
> `teamTasks: team + createdAt` composite index, not permissions. Indexes take a few minutes to
> build after deploying; `CREATING` is not ready.

```bash
cd /Users/jerson/developer/Oqupa-Platform
cd tests && npm test && cd ..                      # the rules suite first (273 emulator tests)
firebase deploy --only firestore:rules,firestore:indexes --project oqupa-production
```

Any feature backed by a new collection needs **three** things live, not one: the rules, the index,
and the site. Name all three before calling it shipped.

## Email Notifications

The Firebase Trigger Email extension (`firebase/firestore-send-email@0.2.4`) watches the `mail` collection. When a waitlist signup happens, `firestore.ts` creates a document in `mail` with `to`, `message.subject`, and `message.html` fields. The extension sends it via Gmail SMTP using an App Password stored in Secret Manager.

Extension config: `extensions/firestore-send-email.env`

## Deployment

CI/CD handles deployment automatically:
- Push to `development` → build with staging config → deploy to `oqupa-staging` hosting
- Push to `master` → build with production config → deploy to `oqupa-production` hosting (custom domains: `oqupa.com` and `www.oqupa.com`)

Manual deploy (if needed): `npm run build && firebase deploy --only hosting --project oqupa-production`

Firebase is used for:
- Firebase Hosting (website deployment)
- Firestore (database)
- Firebase Auth (authentication)
- Cloudflare R2 (listing/user images via `src/lib/imageUrl.ts` utility and `src/services/storageService.ts`)
- Firebase Storage (legacy image reads only)
- Trigger Email extension
- Secret Manager (SMTP password)

## File Conventions

- Pages in `src/pages/` — one per route
- Layout components in `src/components/layout/`
- Landing sections in `src/components/landing/` — rendered in order by LandingPage
- Hooks in `src/hooks/` — prefixed with `use`
- Types in `src/types/`
- Utilities in `src/lib/`

## Section IDs (anchor targets)

- `#expansion` → ExpansionSection (legacy "waitlist" UI repurposed for expansion-city interest at launch on 2026-05-04)
- `#precios` → PricingSection
- `#caracteristicas` → ShowcaseSection
- `#contacto` → Footer

## Firebase Environments

### Project Aliases
- **production:** `oqupa-production` (region: `southamerica-east1`)
- **staging:** `oqupa-staging` (region: `southamerica-east1`)

### Switching Environments
```bash
firebase use staging    # Switch to staging project
firebase use production # Switch to production project
```

### Environment Switching (Auto)

Firebase config is loaded from `VITE_FIREBASE_*` env vars (not hardcoded). Vite's env file loading handles the switching:

| Command | Firebase project | Env files loaded |
|---------|-----------------|-----------------|
| `npm run dev` | `oqupa-staging` | `.env` + `.env.development` (overrides) |
| `npm run build` | `oqupa-production` | `.env` only |

### Build Modes (MODE vs PROD)

Gate production-only behaviour on `import.meta.env.MODE === 'production'`, **not** `import.meta.env.PROD`. `vite build` sets `PROD=true` for any minified build regardless of `--mode`, so a `PROD`-gated branch will treat the staging deploy as production. Staging CI runs `vite build --mode staging` (see `.github/workflows/deploy.yml`), so `MODE === 'staging'` on staging deploys.

```ts
// src/lib/imageUrl.ts — pick the CDN host
const isProductionDeploy = import.meta.env.MODE === 'production'
const host = isProductionDeploy ? 'images.oqupa.com' : 'images-staging.oqupa.com'
```

### Environment Files
- `.env` — Production API keys + Firebase config (gitignored)
- `.env.development` — Staging Firebase overrides for dev mode (gitignored)
- `.env.staging` — Staging API keys (gitignored, reference copy)
- `.env.example` — Template with placeholder values (committed)

### Stripe Configuration
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key for Payment Element
- Set `pk_test_*` in `.env.development` for staging, `pk_live_*` in `.env` for production
- Without this key, boost payment UI will display but Stripe will not load (logged warning)

### App Check (anonymous view tracking + future App-Check-enforced callables)
- `VITE_RECAPTCHA_APPCHECK_KEY` — reCAPTCHA v3 site key registered as App Check provider
- Registered separately from `VITE_RECAPTCHA_SITE_KEY` (waitlist form): App Check needs its own site key bound to the app in Firebase console → App Check → Web app
- Set the **staging** site key in `.env.development`, the **production** site key in `.env`
- Without this key, App Check is not initialised locally and any `enforceAppCheck: true` callable (e.g. `recordListingView`) will fail closed
- Debug tokens for local dev: set `VITE_APPCHECK_DEBUG_TOKEN` in `.env.development` to a UUID of your choice, then register that same value in Firebase console → App Check → Manage debug tokens. The SDK will reuse it across sessions so you only register it once per dev environment. If the env var is unset, the SDK falls back to auto-generating a fresh token each session (which you'd have to re-register every time)

#### One-time setup per Firebase project (staging + production)

1. Firebase console → App Check → Register app (Web) → reCAPTCHA v3 → create a new site key (or reuse one not tied to the waitlist form)
2. Copy the site key into `.env.development` (staging) / `.env` (production) as `VITE_RECAPTCHA_APPCHECK_KEY`
3. Enable enforcement for Cloud Functions after verifying attested traffic appears in the console (typically 24–48h of monitoring mode first)
4. Configure a Firestore TTL policy on `listingViewDedupe.expiresAt` so dedupe docs self-prune after 30 days (Firestore console → TTL → Add policy)

> **CRITICAL: NEVER delete `.env`, `.env.development`, or `.env.staging` files.** These contain real API keys and Firebase config that are gitignored and cannot be recovered from version control. Do not `rm`, overwrite, or `touch` these files under any circumstances. If you need a temporary file for testing, use a different name (e.g., `.env.test.tmp`). Deleting these files breaks the build completely.

### CI/CD
The workflow (`.github/workflows/deploy.yml`) injects correct env vars per deploy target:
- `development` branch → staging Firebase config → deploy to `oqupa-staging` hosting
- `master` branch → production Firebase config → deploy to `oqupa-production` hosting

Firebase config values are public (visible in compiled JS), so they are hardcoded in the workflow rather than using GitHub Secrets.

## Testing

### Commands
```bash
npm test            # run once (CI)
npm run test:watch  # watch mode
npm run coverage    # coverage report → coverage/index.html
```

### Framework & environment
- **Vitest** (v4) + **@testing-library/react** (v16)
- Default environment: `node` (set in `vite.config.ts` under `test.environment`)
- Tests that touch any browser API (DOM, localStorage, navigator, window events) must opt in with the file-level directive `// @vitest-environment jsdom`
- Path alias `@/` works in test files (resolved by Vite)

### Established patterns

**Pure-function tests** — no directive needed; import and call directly. See `src/lib/__tests__/formatters.test.ts`.

**Hook tests** — `// @vitest-environment jsdom` + `renderHook` from `@testing-library/react`. Keep fixtures minimal: use `as unknown as FullType` casts so fixtures only populate the fields the hook actually reads. See `src/hooks/__tests__/useMapFilters.test.ts`.

**IntersectionObserver mocking** — jsdom has no `IntersectionObserver`. Stub it before each test with `vi.stubGlobal` and capture the constructor callback so tests can trigger intersection events manually. Clean up with `vi.unstubAllGlobals()` in `afterEach`.

**Component-under-hook tests** — when a hook's `ref` must be attached to a real DOM element, render a small `Fixture` component inside the test file instead of using `renderHook`. The fixture wires the ref and exposes state through `data-*` attributes for easy assertion.

**Commit style** — one hook per commit, message format: `test(<hookName>): <what was added>`. Build the suite incrementally (baseline → more cases → complete).

### Coverage progress

| File | Coverage | Notes |
|------|----------|-------|
| `src/hooks/useMapFilters.ts` | **100%** | Complete — all filter, bounds, coordinate, and total cases |
| `src/hooks/useAnimateOnScroll.ts` | 0% | **Next target.** 7 usages across all landing sections |
| `src/hooks/useDocumentMeta.ts` | 0% | 6 usages; SEO canonical-URL logic (see the 2026-08-10 duplicate incident) |
| `src/hooks/useGallery.ts` | ~45% | 5 usages; callbacks (`next`, `prev`, `goTo`, touch) not yet covered |
| `src/hooks/useRevealedFields.ts` | 0% | 4 usages in listing wizard; pure logic, no browser API |
| `src/hooks/useInfiniteScroll.ts` | 0% | 1 usage (Explore page load-more) |
| `src/hooks/useMobileMenu.ts` | 0% | 1 usage (Header); Escape key + resize handlers |
| `src/hooks/useMediaQuery.ts` | 0% | 1 usage; `window.matchMedia` stub needed |
| `src/hooks/useScrollHeader.ts` | 0% | 1 usage; IntersectionObserver mock (same pattern as useAnimateOnScroll) |
| `src/hooks/useExpansionPopup.ts` | 0% | 1 usage; localStorage + `setTimeout` (use `vi.useFakeTimers`) |
| `src/hooks/useMapCameraStorage.ts` | 0% | 1 usage; localStorage read/write |
| `src/hooks/useExploreInteraction.ts` | 0% | 1 usage; hover debounce (75ms), Escape dismiss, scroll-to-card — use `vi.useFakeTimers` |
| `src/lib/authErrors.ts` | ~39% | `getLoginAuthError`, `getPhoneAuthError`, `getMagicLinkAuthError`, `getForgotPasswordAuthError` untested |
| `src/schemas/listingSchema.ts` | 0% | Zod step1–4 + fullListingSchema |
| `src/schemas/profileSchema.ts` | 0% | Zod profileSchema + changePasswordSchema |
| `src/app/components/guards/ContentGuard.tsx` | 0% | Same pattern as all other guards (100%); straightforward to add |

Overall coverage last measured: **14.32 %** (statements). Realistic ceiling with Vitest unit tests: **~45–55%**. Beyond that, Firebase emulator tests or Playwright end-to-end tests are the right tool (services, Canvas, analytics SDKs, and `.tsx` component files intentionally have no unit tests in this architecture — see `CONTRIBUTING.md` for the full breakdown).

## Related Projects

- **Flutter app:** `/Users/jerson/developer/oqupa/` — iOS/Android app for the same Firebase project. Has its own Cloud Functions in `functions/` using nodemailer for realtor application emails.
