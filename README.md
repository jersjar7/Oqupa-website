# Oqupa Website

Marketing landing page and publisher web app for [Oqupa](https://oqupa.com), a real estate marketplace launching in Piura, Peru.

Built with React + Vite + TypeScript + Tailwind CSS. Deployed to Firebase Hosting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Routing | React Router DOM 7 (BrowserRouter) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 4 + custom theme |
| Build | Vite 6 |
| State | Zustand (client), TanStack Query (server) |
| Forms | React Hook Form + Zod v4 |
| Database | Cloud Firestore |
| Auth | Firebase Auth (email + phone SMS) |
| Storage | Firebase Storage (property photos) |
| Email | Firebase Trigger Email extension |
| Hosting | Firebase Hosting |
| Domain | oqupa.com + www.oqupa.com |

## Getting Started

```bash
npm install
npm run dev      # Dev server at localhost:5173
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # Preview production build
```

## Deployment

Deployed to **Firebase Hosting** under the `oqupa-production` project.

### Manual deploy (current workflow)

```bash
npm run build
firebase deploy --only hosting --project oqupa-production
```

Requires Firebase CLI (`npm i -g firebase-tools`) and login (`firebase login` with `admin@oqupa.com`).

### Deploy checklist

1. Ensure you're on `master` with latest changes
2. Run `npm run build` — verify no TypeScript errors
3. Run `firebase deploy --only hosting --project oqupa-production`
4. Verify at https://oqupa.com and https://oqupa.com/app/login
5. Update `RELEASE-NOTES.md` if this is a notable release

### Firebase Hosting config

- **Config file:** `firebase.json`
- **Public directory:** `dist/`
- **SPA rewrite:** All routes → `index.html`
- **Asset caching:** `Cache-Control: public, max-age=31536000, immutable` for `/assets/**`
- **Custom domains:** `oqupa.com` (A record → `199.36.158.100`), `www.oqupa.com` (CNAME → `oqupa-production.web.app`)
- **DNS provider:** GoDaddy

## Project Structure

```
src/
├── main.tsx                    # React DOM entry + QueryClientProvider
├── App.tsx                     # BrowserRouter + all routes
├── index.css                   # Tailwind + theme variables + animations
├── assets/
│   ├── fonts/                  # Gotham, Roboto Serif
│   └── images/                 # Hero images, mockups, logos
├── app/                        # Publisher app module (/app/*)
│   ├── components/
│   │   ├── ui/                 # Button, Input, Card, Modal, Badge, Spinner, Select
│   │   ├── guards/             # AuthGuard, VerifiedGuard
│   │   └── ErrorBoundary.tsx   # Catches unhandled exceptions
│   ├── features/
│   │   ├── auth/pages/         # LoginPage, RegisterPage, ForgotPasswordPage, AuthPipelinePage
│   │   ├── dashboard/          # DashboardPage, ListingCard, EmptyState
│   │   ├── listings/           # CreateListingPage, EditListingPage, WizardStep1-4
│   │   └── profile/            # ProfilePage
│   └── layouts/
│       └── AppLayout.tsx       # Publisher app shell (topbar, auth-aware nav)
├── components/
│   ├── layout/                 # Header, Footer, Layout (landing page)
│   ├── landing/                # Hero, Trust, Pricing, Waitlist sections
│   └── property/               # Property detail components
├── pages/                      # Landing page routes
│   ├── LandingPage.tsx         # / — marketing page
│   ├── PropertyPage.tsx        # /property/:id — property detail
│   ├── PrivacyPage.tsx         # /privacy
│   ├── TermsPage.tsx           # /terms
│   └── NotFoundPage.tsx        # 404
├── hooks/                      # Custom React hooks
├── stores/
│   ├── authStore.ts            # Zustand: auth state, user, session
│   └── listingFormStore.ts     # Zustand: multi-step wizard form state
├── services/
│   ├── authService.ts          # Firebase Auth wrapper
│   ├── firestoreService.ts     # All Firestore CRUD operations
│   └── storageService.ts       # Firebase Storage upload + compression
├── schemas/                    # Zod validation schemas
│   ├── authSchema.ts           # Login, register, phone, verification
│   ├── listingSchema.ts        # Wizard steps 1-4
│   └── profileSchema.ts       # Profile, password change
├── lib/
│   ├── firebase.ts             # Firebase app init + auth + storage + firestore
│   ├── firestore.ts            # Legacy Firestore operations (waitlist, public listings)
│   ├── constants.ts            # URLs, email, property type labels
│   └── utils.ts                # formatPrice(), getPlatform()
└── types/
    ├── user.ts                 # User, ContactInfo interfaces
    ├── listing.ts              # Listing, Price, Media interfaces
    ├── property.ts             # Property, Specs, Location interfaces
    ├── enums.ts                # PropertyType, OperationType, ListingStatus, etc.
    └── waitlist.ts             # WaitlistEntry interface
```

## Routes

### Landing page (public)

| Path | Page | Description |
|------|------|-------------|
| `/` | LandingPage | Marketing landing page with all sections |
| `/property/:id` | PropertyPage | Property detail with gallery + WhatsApp contact |
| `/privacy` | PrivacyPage | Privacy policy |
| `/terms` | TermsPage | Terms of service |
| `*` | NotFoundPage | 404 page |

### Publisher app (`/app/*`)

| Path | Page | Guard | Description |
|------|------|-------|-------------|
| `/app/login` | LoginPage | — | Email/password login |
| `/app/register` | RegisterPage | — | Create account |
| `/app/forgot-password` | ForgotPasswordPage | — | Password reset |
| `/app/verify` | AuthPipelinePage | AuthGuard | Name + phone + SMS verification |
| `/app` | DashboardPage | AuthGuard + VerifiedGuard | Listing management dashboard |
| `/app/listings/new` | CreateListingPage | AuthGuard + VerifiedGuard | 4-step listing wizard |
| `/app/listings/:id/edit` | EditListingPage | AuthGuard + VerifiedGuard | Edit existing listing |
| `/app/profile` | ProfilePage | AuthGuard | User profile settings |

## Firebase

**Project:** `oqupa-production`
**Region:** `southamerica-east1` (São Paulo)

### Firestore Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `users` | User profiles with contact info and verification status | Owner read/write |
| `listings` | Property listings with price/contact/status | Owner write, authenticated read |
| `properties` | Property details (specs, photos, location) | Owner write, authenticated read |
| `waitlist` | Waitlist signups from landing page | Public create, no read |
| `mail` | Email queue for Trigger Email extension | Public create, no read |

### Auth

- Email/password authentication
- Phone SMS verification (Peru +51, via Firebase RecaptchaVerifier)
- Auth state persisted via `onAuthStateChanged` listener
- Authorized domain: `oqupa.com`

## Theme

Brand colors, typography, and shadows are defined as CSS custom properties in `src/index.css`:

- **Primary:** `#F47843` (orange) — CTAs, buttons
- **Secondary:** `#3A6A55` (green) — footer, badges, trust elements
- **Accent:** `#FFCD60` (yellow) — badges, highlights
- **Background:** `#FFF9F0` (cream)
- **Fonts:** Gotham (sans), Roboto Serif (serif)
