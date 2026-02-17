# Oqupa Website

Marketing landing page and property listing platform for [Oqupa](https://oqupa.com), a real estate marketplace launching in Piura, Peru.

Built with React + Vite + TypeScript + Tailwind CSS. Deployed to GitHub Pages via GitHub Actions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Routing | React Router DOM 7 (HashRouter) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 4 + custom theme |
| Build | Vite 6 |
| Database | Cloud Firestore |
| Email | Firebase Trigger Email extension |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## Getting Started

```bash
npm install
npm run dev      # Dev server at localhost:5173
npm run build    # TypeScript check + Vite build → dist/
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── main.tsx                    # React DOM entry
├── App.tsx                     # HashRouter + routes
├── index.css                   # Tailwind + theme variables + animations
├── assets/
│   ├── fonts/                  # Gotham, Roboto Serif
│   └── images/                 # Hero images, mockups, logos
├── components/
│   ├── layout/
│   │   ├── Layout.tsx          # Page wrapper (Header + Footer + scroll management)
│   │   ├── Header.tsx          # Nav with mobile menu, scroll-aware styling
│   │   └── Footer.tsx          # Links, social icons, trust badges
│   ├── landing/
│   │   ├── HeroSection.tsx     # Hero banner + CTA
│   │   ├── TrustStrip.tsx      # 3 trust signal cards
│   │   ├── SolutionSection.tsx # Before/after comparison
│   │   ├── ShowcaseSection.tsx # Device mockups + feature highlights
│   │   ├── PricingSection.tsx  # Free pricing (S/ 0) highlight
│   │   ├── SocialProofSection.tsx # Verification/support benefits
│   │   └── WaitlistSection.tsx # Signup form with validation
│   └── property/               # Property detail components
├── pages/
│   ├── LandingPage.tsx         # / — main marketing page (all sections)
│   ├── PropertyPage.tsx        # /property/:id — property detail + gallery
│   ├── PrivacyPage.tsx         # /privacy
│   ├── TermsPage.tsx           # /terms
│   └── NotFoundPage.tsx        # 404
├── hooks/
│   ├── useAnimateOnScroll.ts   # IntersectionObserver animation trigger
│   ├── useGallery.ts           # Image carousel with touch swipe
│   ├── useMobileMenu.ts       # Menu state + body scroll lock + escape key
│   ├── useProperty.ts         # Fetch listing + property from Firestore
│   ├── useScrollHeader.ts     # Detect scroll past hero for header styling
│   └── useWaitlistForm.ts     # Form state, validation, Firebase submission
├── lib/
│   ├── firebase.ts            # Firebase app init + Firestore export
│   ├── firestore.ts           # Firestore operations (waitlist, listings, properties)
│   ├── constants.ts           # URLs, email, property type labels
│   └── utils.ts               # formatPrice(), getPlatform()
└── types/
    ├── property.ts            # Listing, Property, PropertySpecs interfaces
    └── waitlist.ts            # WaitlistEntry interface
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | LandingPage | Marketing landing page with all sections |
| `/property/:id` | PropertyPage | Property detail with gallery + WhatsApp contact |
| `/privacy` | PrivacyPage | Privacy policy |
| `/terms` | TermsPage | Terms of service |
| `*` | NotFoundPage | 404 page |

Uses HashRouter for GitHub Pages compatibility.

## Firebase

**Project:** `oqupa-production`
**Region:** `southamerica-east1` (São Paulo)

### Firestore Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `waitlist` | Waitlist signups from landing page | Public create, no read |
| `mail` | Email queue for Trigger Email extension | Public create, no read |
| `listings` | Property listings with price/contact | Public read |
| `properties` | Property details (specs, photos, location) | Public read |

### Trigger Email Extension

Installed as `firebase/firestore-send-email@0.2.4`. Watches the `mail` collection and sends emails via Gmail SMTP (`admin@oqupa.com`). Configured with Google Workspace App Password stored in Secret Manager.

**Config:** `extensions/firestore-send-email.env`

### Waitlist Flow

1. User fills form (name, email, intent, privacy consent)
2. Frontend validation runs
3. On submit: creates doc in `waitlist` + doc in `mail`
4. Trigger Email extension sends notification to `admin@oqupa.com`
5. Success state shown, form resets

## Deployment

Push to `master` triggers GitHub Actions → builds → deploys to GitHub Pages.

```bash
git push origin master
```

The workflow (`.github/workflows/deploy.yml`) runs `npm ci && npm run build` on Node 20, then deploys `dist/` to GitHub Pages.

**Domain:** `oqupa.com` (configured via `public/CNAME`)

## Theme

Brand colors, typography, and shadows are defined as CSS custom properties in `src/index.css`:

- **Primary:** `#F47843` (orange) — CTAs, buttons
- **Secondary:** `#3A6A55` (green) — footer, badges, trust elements
- **Accent:** `#FFCD60` (yellow) — badges, highlights
- **Background:** `#FFF9F0` (cream)
- **Fonts:** Gotham (sans), Roboto Serif (serif)

## Public Files

- `public/CNAME` — Custom domain for GitHub Pages
- `public/privacy.html` / `public/terms.html` — Static fallback pages
- `public/property.html` — Deep link redirect to mobile app
- `public/.well-known/assetlinks.json` — Android app linking
- `public/.nojekyll` — Prevents Jekyll processing on GitHub Pages
