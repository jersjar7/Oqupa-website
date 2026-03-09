# Release Notes

All notable changes to the Oqupa website are documented here. Each entry corresponds to a deployment (push to master).

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
