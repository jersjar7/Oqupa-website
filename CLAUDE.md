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
| **Header 1** | `font-serif text-[28px] font-normal` | Roboto Serif 400 | Page titles (auth, dashboard, profile). Reserved for decorative/formal headings — do NOT use for general UI headings. |
| **Header 2** | `font-sans text-[28px] font-medium` | Gotham 500 | General app headings. **Preferred default** for new headings. |
| **Subhead** | `font-sans text-sm font-medium uppercase` | Gotham 500 | Section labels, field labels |
| **Body** | `text-base` (inherits `font-sans`) | Gotham 400 | Body text, descriptions, form text |
| **Caption** | `font-serif text-xs font-light italic` | Roboto Serif 300 italic | Fine print, secondary details, timestamps |
| **Legal** | `font-serif text-xs font-light` | Roboto Serif 300 | Legal links, privacy/terms text |
| **Button** | `font-sans text-base font-bold uppercase` | Gotham 700 | Button labels |

**Current convention:** Most existing page titles use Header 1 (`font-serif`). For new UI, prefer Header 2 (`font-sans font-medium`) unless the context is decorative or formal (legal pages, onboarding, welcome screens).

### Language
All user-facing text is in Spanish. Variable names and code comments are in English.

## Firestore Collections (used by website)

| Collection | Used for | Rules |
|------------|----------|-------|
| `waitlist` | Landing page signups | Public create only |
| `mail` | Trigger Email extension queue | Public create only |
| `listings` | Property data (read by PropertyPage) | Public read |
| `properties` | Property specs/photos (read by PropertyPage) | Public read |
| `config` | Platform configuration (pricing, feature flags) | Public read |
| `payments` | Boost payment records | Owner read only |

**Firestore rules** are version-controlled at the repo root (`firestore.rules`, `storage.rules`). Deploy from the repo root:
```bash
cd /Users/jerson/developer/Oqupa-Platform
firebase deploy --only firestore:rules --project oqupa-production
```

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
- Firebase Storage (listing images)
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

- `#lista-espera` → WaitlistSection
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

### Environment Files
- `.env` — Production API keys + Firebase config (gitignored)
- `.env.development` — Staging Firebase overrides for dev mode (gitignored)
- `.env.staging` — Staging API keys (gitignored, reference copy)
- `.env.example` — Template with placeholder values (committed)

### Stripe Configuration
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key for Payment Element
- Set `pk_test_*` in `.env.development` for staging, `pk_live_*` in `.env` for production
- Without this key, boost payment UI will display but Stripe will not load (logged warning)

> **CRITICAL: NEVER delete `.env`, `.env.development`, or `.env.staging` files.** These contain real API keys and Firebase config that are gitignored and cannot be recovered from version control. Do not `rm`, overwrite, or `touch` these files under any circumstances. If you need a temporary file for testing, use a different name (e.g., `.env.test.tmp`). Deleting these files breaks the build completely.

### CI/CD
The workflow (`.github/workflows/deploy.yml`) injects correct env vars per deploy target:
- `development` branch → staging Firebase config → deploy to `oqupa-staging` hosting
- `master` branch → production Firebase config → deploy to `oqupa-production` hosting

Firebase config values are public (visible in compiled JS), so they are hardcoded in the workflow rather than using GitHub Secrets.

## Related Projects

- **Flutter app:** `/Users/jerson/developer/oqupa/` — iOS/Android app for the same Firebase project. Has its own Cloud Functions in `functions/` using nodemailer for realtor application emails.
