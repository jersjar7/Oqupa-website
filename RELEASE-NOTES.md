# Release Notes

All notable changes to the Oqupa website are documented here. Each entry corresponds to a deployment (push to master).

---

## 2026-04-24 — Listing Wizard: Photos Step + Drag-and-Drop Reorder

### New Features
- **Photos are their own wizard step**: The publish flow is now 5 steps — Tipo → Detalles → Ubicación → Fotos → Precio — instead of cramming photos onto the location step. The Fotos step has a dedicated Roboto Serif page heading and a square-thumbnail grid (2 columns on mobile, 4 on desktop).
- **Drag-and-drop photo reorder**: Built on @dnd-kit. On desktop, click-and-drag any tile to reposition; on mobile, long-press (200ms) to pick up. The dragged tile shows a lifted, shadowed preview while the original dims. A subtle hint under the count tells users how to reorder on each platform.
- **Minimum 3 photos before publishing**: The "Continuar" button is disabled until at least 3 photos are present. A live counter ("Sube al menos 3 fotos para continuar (N/3)") shows progress toward the threshold.

### UX Improvements
- **Cover is implicit at position 0**: The first photo is the cover. To change the cover, just drag any photo to the first slot. The `PORTADA` badge (orange, uppercase, tracking-[1px]) marks whichever photo is in position 0.
- **Cleaner tile chrome**: Removed the per-tile chevron-arrow buttons and "Hacer portada" labels — drag-to-reorder + drag-to-position-0 cover both jobs without crowding the grid.
- **Spanish keyboard accessibility**: Tab to a tile, press Space/Enter to pick it up, arrow keys to move it, Space again to drop or Esc to cancel. The screen-reader live region announces every step in Spanish ("Recogiste la foto N de M", "Foto N sobre la posición M", etc.).
- **Reduced-motion support**: The drop animation is instant when `prefers-reduced-motion: reduce` is set.

### Bug Fixes
- **photoBlurHashes drift after edit-mode reorder**: Editing a listing that uploaded N new photos used to write only the new hashes to `photoBlurHashes`, so existing photos lost their hashes and the cover-photo blurhash could end up pointing at the wrong image. Submit now builds the full ordered hash array using the same mapping that produces `photoKeys`, so both arrays are always written together and aligned.
- **Removed photos no longer orphan in R2**: Deleting an existing photo in edit mode used to drop it from Firestore but leave the R2 object behind. The wizard now diffs against a snapshot taken at edit-init and calls the new `deleteR2Objects` Cloud Function for any keys the user removed (best-effort — failure is logged, doesn't roll back the listing update).
- **Photo upload CSP block**: `browser-image-compression@2`'s web worker fetches itself from `cdn.jsdelivr.net` at runtime, but that host wasn't in our `script-src` allowlist — so compression silently failed and uploads broke. Added the host to the CSP. Surfaced by end-to-end testing of the new wizard.

### Technical
- New `usePhotoQueue` hook centralises the unified photo queue (existing URLs + freshly-picked Files), preview-URL memoization, and the submit-shape splitter that produces `photos`, `existingPhotoUrls`, `existingPhotoBlurHashes`, and the `photoOrder` mapping.
- Photo step decomposed into `PhotoStep`, `PhotoGrid`, `PhotoTile`, `PhotoDropzone`. `WizardStep4.tsx` is now a thin re-export so the page-level slot stays stable.
- New `storageService.deleteR2Photos(objectKeys)` wraps the `deleteR2Objects` callable for batch R2 cleanup.
- Form store gains `existingPhotoBlurHashes` (parallel to `existingPhotoUrls`) and `originalExistingPhotoUrls` (snapshot at edit-init for the delete diff).
- 15 new tests for `usePhotoQueue` and `PhotoGrid` covering reorder, blurhash alignment, gating hints, cover badge, and the Spanish aria-labels.

### Deployment Notes
- **R2 CORS update required**: The R2 buckets need `https://oqupa.com`, `https://*.oqupa.com`, `https://oqupa-production.web.app`, and `https://oqupa-production.firebaseapp.com` in their `AllowedOrigins`. Without this, photo uploads from production will hit a CORS preflight wall. Update via Cloudflare dashboard → R2 → bucket → Settings → CORS Policy.

---

## 2026-04-24 — Anonymous Listing View Tracking

### New Features
- **Listing views now count anonymous visitors**: `listing.viewCount` previously only incremented for signed-in users, massively undercounting real traffic from social shares, search, and direct links. Views now count for every unique device per day, matching how most real-estate browsers actually arrive at the site.

### Technical
- **Unified view tracking through a Cloud Function**: New App-Check-enforced `recordListingView` callable in `southamerica-east1` handles views from both authenticated and anonymous visitors. Server-side dedupe is one-view-per-day keyed on `uid` for signed-in users and on a persistent localStorage `clientId` (UUID) for anonymous visitors. Owner self-views are filtered server-side.
- **Firestore App Check enabled** with reCAPTCHA v3 as the attestation provider on both staging and production web apps. New `VITE_RECAPTCHA_APPCHECK_KEY` env var required; see CLAUDE.md for setup.
- **New server-only `listingViewDedupe` Firestore collection** stores one dedupe doc per `{principal, listingId}` per day. A 30-day TTL policy on the `expiresAt` field prunes old docs automatically.
- **Pinned App Check debug token** via optional `VITE_APPCHECK_DEBUG_TOKEN` in `.env.development` keeps the token stable across local dev sessions so it only needs to be registered in Firebase console once.

---

## 2026-03-14 — OAuth Sign-In, Map & Validation Improvements, Header Consistency

### New Features
- **Apple & Google OAuth sign-in**: Added social login buttons with official logos on the login page
- **US phone number support**: Country code selector now supports +1 (US) in addition to +51 (Peru), with a chevron indicator
- **Pre-publish validation**: Listings are validated before activation — incomplete listings show specific error messages instead of silently failing

### UX Improvements
- **Header always has cream background**: Landing page header no longer starts transparent — consistent `#FFFAF5` background from the start
- **Nav links match page order**: Reordered to Explorar → Publica Gratis → Lista de Espera → Contacto
- **"Mi Perfil" in landing page menu**: Logged-in dropdown now shows Mis Propiedades, Mi Perfil, and Salir
- **Context-aware app menu**: On profile page shows "Mis Publicaciones"; on other pages shows "Mi Perfil" + "Mis Publicaciones"
- **Consistent header sizing**: App layout logo enlarged from `h-8` to `h-12` and header uses padding-based height to match landing page
- **Logo always links home**: App layout logo now navigates to `/` instead of `/app`
- **Map pin UX**: Improved map marker interaction and placement behavior
- **WhatsApp message formatting**: Property address now uses comma-separated location fields

### Bug Fixes
- **OAuth popup fix**: Pass `browserPopupRedirectResolver` explicitly to fix blocked popups
- **reCAPTCHA v2 fallback**: Reverted Enterprise config — use v2 reCAPTCHA for phone verification compatibility

### Technical
- Consolidated Firestore reads to reduce redundant fetches
- Imported `Home` and `User` icons in both header components for unified menu rendering

---

## 2026-03-10 — Auth Session Fixes & UX Improvements

### Bug Fixes
- **Cross-tab auth session restoration**: Replaced `getAuth()` with `initializeAuth()` using explicit persistence (IndexedDB + localStorage) to fix `onAuthStateChanged` not firing in new tabs
- **Login redirect race condition**: Login pages now wait for user document to load before redirecting, preventing verified users from briefly hitting `/app/verify` and consuming the return URL
- **PropertyPage content overlapping header**: Added top padding so the gallery starts below the fixed header

### UX Improvements
- **No more "Ingresar" flash**: Header auth blocks wait for auth initialization before rendering, preventing a brief flash of the login button for already-authenticated users
- **Return URL preservation**: Login flow now remembers and restores the page users were trying to visit before being redirected to sign in
- **Phone verification gate on WhatsApp contact**: Property page contact button now requires phone verification before opening WhatsApp
- **Shared UserMenu component**: Unified user menu across Header and AppLayout for consistent auth UI
- **Auth initialization at App root**: Moved auth setup to the App component so all routes benefit from early session detection

---

## 2026-03-09 — Zillow-style Property Image Gallery

### New Features
- **Desktop image grid**: Hero image (left half) + up to 4 thumbnails in a 2×2 grid (right half), replacing the full-width carousel
- **"Ver todas las X fotos" overlay**: Appears on the last thumbnail when the property has more than 5 images
- **Full-screen gallery modal**: Click any image to open a full-viewport carousel with prev/next arrows, counter badge, touch swipe, and Escape-to-close
- Graceful handling of edge cases: 0 images (placeholder), 1 image (full-width hero), 2–4 images (adaptive grid)

### Technical
- Rewrote `PropertyGallery` in `PropertyPage.tsx` with responsive breakpoints: mobile keeps the existing swipeable carousel, desktop shows the new grid
- Added `GalleryModal` component with body scroll lock and keyboard navigation
- `useGallery` hook now accepts optional `initialSlide` parameter for modal start position

---

## 2026-03-08 — Interactive Map Exploration & Listing Map Picker

### New Features
- **Explore page** (`/explorar`): Zillow-style interactive map to browse all active listings
  - Price-label markers on Google Maps centered on Piura
  - Click marker to see info card with photo, price, specs, and "Ver detalles" link
  - Filter by operation type (Venta / Alquiler), property type, and price range
  - Desktop: sidebar with filters + full map; Mobile: full-screen map with bottom drawer
- **Map picker** in listing wizard (Step 3): click-to-place + draggable marker replaces placeholder
- **"Explorar" nav link** in header (desktop and mobile) navigates to `/explorar`
- Removed description-as-title from property detail page (price serves as header)

### Infrastructure
- Google Maps API key (web, restricted to `oqupa.com`, `www.oqupa.com`, `localhost:5173`)
- Cloud Map ID for vector map rendering and Advanced Markers
- Maps JavaScript API enabled in Google Cloud Console

### Technical
- Added `@vis.gl/react-google-maps` (already in dependencies) with dedicated `maps` build chunk (24KB)
- New service: `getActiveListingsWithProperties()` batch-fetches active listings + properties
- New hooks: `useExploreListings` (React Query, 5-min stale), `useMapFilters` (client-side filtering)
- New components: ExploreMap, PropertyMarker, PropertyInfoCard, ExploreFilters, LocationPicker
- New types: `ListingWithProperty`, `MapFilters`
- New utility: `formatShortPrice()` for compact price labels (e.g. "S/ 250K")
- Header refactored to support both route links (`<Link>`) and hash-scroll anchors (`<a>`)
- `.env` added to `.gitignore` for API key management

---

## 2026-03-08 — Magic Link (Passwordless) Authentication

### New Features
- Magic link sign-in as primary auth method — users enter email, receive a sign-in link
- Merged Login + Register into unified "Ingresar" page (MagicLinkPage)
- Password login available as fallback at `/app/login/password`
- Cross-device magic link support (prompts for email if opened on different device)
- New user accounts auto-created on first magic link sign-in
- `/app/register` now redirects to `/app/login`

### Infrastructure
- Enabled Firebase Email Link (passwordless) sign-in method
- Activated DKIM authentication for `oqupa.com` in Google Workspace

### Technical
- Added `sendMagicLink`, `completeMagicLinkSignIn`, `isSignInLink` to authService
- New pages: MagicLinkPage, CompleteSignInPage, PasswordLoginPage
- New route: `/app/auth/complete` handles magic link redirect
- Added `magicLinkSchema` (email-only Zod schema)
- Removed LoginPage and RegisterPage
- Updated AppLayout nav: single "Ingresar" button (removed "Crear Cuenta")
- Updated Header nav text to "Ingresar"
- ForgotPasswordPage back-link now points to `/app/login/password`

---

## 2026-03-01 — Publisher Web App & Firebase Hosting Migration

### New Features
- Full publisher web app at `/app/*` for property owners to manage listings
- Authentication: login, register, forgot password, phone SMS verification pipeline
- Dashboard: responsive listing grid with status badges, activate/deactivate
- Create Listing: 4-step wizard (basics, details, location + photos, price)
- Edit Listing: pre-fills wizard with existing data, handles photo add/remove
- Profile page: edit name, contact preferences, view verification status
- Auth guards (AuthGuard, VerifiedGuard) protect publisher routes
- Error boundary catches unhandled exceptions in publisher app
- "Iniciar Sesion" button added to landing page header

### Infrastructure
- Migrated hosting from GitHub Pages to Firebase Hosting
- Custom domains: `oqupa.com` and `www.oqupa.com` on Firebase Hosting
- Switched from HashRouter to BrowserRouter (clean URLs, SPA rewrite)
- Firebase Auth and Storage initialized alongside Firestore
- Added `oqupa.com` to Firebase Auth authorized domains

### Technical
- State management: Zustand (authStore, listingFormStore)
- Server state: TanStack Query with QueryClientProvider
- Forms: React Hook Form + Zod v4 validation
- Image compression: browser-image-compression before Firebase Storage upload
- 7 reusable UI components: Button, Input, Select, Card, Badge, Modal, Spinner
- TypeScript types matching Flutter app Firestore schemas exactly
- SMS rate limiting (60s cooldown) on phone verification
- Firestore `stripUndefined()` utility converts undefined to null before writes

### Bug Fixes
- Fixed PropertyPage using wrong contactInfo structure
- Fixed PropertyPage using `ciudad` instead of `departamento`
- Fixed Firestore rejecting undefined values on listing edit

### Dependencies Added
- zustand, @tanstack/react-query, react-hook-form, @hookform/resolvers, zod
- browser-image-compression, lucide-react

---

## 2026-02-23 — Hero Section Brand Refresh

- Updated page background color to `#FFFAF5`
- Swapped header logo from black monochrome to multicolor variant
- Changed "Proximamente 2026" badge to Pacific Green background with white text
- Updated hero heading color to Pacific Green (`#3A6A55`)
- Simplified CTA button: auto-width, removed arrow icon

---

## 2026-02-16 — Firebase Email Extension & Landing Page Updates

- Added Firebase Trigger Email extension for waitlist notification emails to `admin@oqupa.com`
- Waitlist form now sends email notification on signup via Firestore `mail` collection
- Updated pricing section to free model (S/ 0) with "Gratis" badge
- Improved mobile responsiveness for CTA buttons
- Shortened button labels for mobile screens
- Added project documentation (README.md, CLAUDE.md)

## 2025-XX-XX — Brand Deck Application

- Applied new brand colors: primary orange (#F47843), secondary green (#3A6A55), accent yellow (#FFCD60), cream background (#FFF9F0)
- Added custom typography: Gotham (sans) and Roboto Serif (serif)
- Updated logos to Oqupa branding

## 2025-XX-XX — React + Vite Migration

- Migrated entire website from static HTML to React 19 + Vite + TypeScript + Tailwind CSS
- Added component-based architecture with custom hooks
- Implemented HashRouter with routes for landing, property detail, privacy, terms, and 404 pages
- Added scroll animations via IntersectionObserver
- Added property detail page with image gallery and swipe gestures
- Added waitlist signup form with validation and Firestore integration
- Set up GitHub Actions CI/CD for automatic deployment to GitHub Pages
- Code splitting for Firebase and vendor chunks

## 2025-XX-XX — Legal Pages

- Added terms of service page
- Added privacy policy page for Google Play compliance

## 2025-XX-XX — Firebase Project Update

- Updated Firebase configuration to `oqupa-production` project

## 2025-XX-XX — Property Listing Page

- Added property detail page with image gallery
- Deep linking support for mobile app

## 2025-XX-XX — Initial Launch

- Landing page with hero section, trust signals, and waitlist
- Custom domain (oqupa.com) via GitHub Pages
- Favicon and basic SEO meta tags
