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

## Git Workflow

**Never work directly on `master`.** Always create a new feature branch for changes, then merge to `master` when ready. Example: `git checkout -b feat/my-feature`.

## Key Patterns

### Hooks-based architecture
All stateful logic lives in custom hooks under `src/hooks/`. Components are presentational. Each hook has a single responsibility.

### Scroll animations
Components use `useAnimateOnScroll()` which returns `{ ref, isVisible }`. Attach `ref` to the element, conditionally apply animation classes based on `isVisible`. Uses IntersectionObserver, fires once.

### Firestore access
All Firestore operations go through `src/lib/firestore.ts`. The Firebase app is initialized in `src/lib/firebase.ts` and exports `db`.

### Styling
Tailwind utility classes inline. Brand theme (colors, fonts, shadows) defined as CSS custom properties in `src/index.css`. Custom animations also defined there. No component CSS files.

### Language
All user-facing text is in Spanish. Variable names and code comments are in English.

## Firestore Collections (used by website)

| Collection | Used for | Rules |
|------------|----------|-------|
| `waitlist` | Landing page signups | Public create only |
| `mail` | Trigger Email extension queue | Public create only |
| `listings` | Property data (read by PropertyPage) | Public read |
| `properties` | Property specs/photos (read by PropertyPage) | Public read |

**Important:** Firestore rules are managed in the Firebase Console, not in this repo. The `oqupa-production` project's Firestore is in `southamerica-east1`.

## Email Notifications

The Firebase Trigger Email extension (`firebase/firestore-send-email@0.2.4`) watches the `mail` collection. When a waitlist signup happens, `firestore.ts` creates a document in `mail` with `to`, `message.subject`, and `message.html` fields. The extension sends it via Gmail SMTP using an App Password stored in Secret Manager.

Extension config: `extensions/firestore-send-email.env`

## Deployment

The site is deployed to Firebase Hosting via GitHub Actions on push to master. Custom domains: `oqupa.com` and `www.oqupa.com`.

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

## Related Projects

- **Flutter app:** `/Users/jerson/developer/oqupa/` — iOS/Android app for the same Firebase project. Has its own Cloud Functions in `functions/` using nodemailer for realtor application emails.
