# Release Notes

All notable changes to the Oqupa website are documented here. Each entry corresponds to a deployment (push to master).

---

## 2026-08-04 (3) — The website starts counting listing views

### Bug Fixes

- **The website had never recorded a single listing view.** Not few — none. View recording is protected so the counts cannot be inflated by a script, and that protection needs a key the site was never given. So every view the website reported was rejected by the server, and the error was discarded silently. Confirmed against production: the collection that tracks web views was completely empty.
- **Every view number on the platform, until today, came from the mobile app alone.** Web traffic was invisible in them.

### Why now

The six-week growth plan is about to put paid traffic on the website — the platform where the traffic actually is. Without this, the plan could not measure what any of that traffic looked at. Fixing the measurement before spending the budget rather than after.

### Technical

- The keys existed all along: dedicated reCAPTCHA v3 sites for production and staging, correctly domain-bound, created and never connected. `.env.example` already documented the variable name.
- Added by appending in CI rather than folding into the stored environment secrets — those cannot be read back, so rewriting one risks silently dropping config nobody can verify. Appending cannot.
- **Not** the waitlist form's key, which is a different reCAPTCHA site. Using that one would have produced valid-looking tokens the server rejects — failing exactly as silently as before.
- **Verified end to end on staging, not assumed:** the tracking collection held 0 records, a property page was opened in a real browser, and the record appeared — correct listing, correct user, with the 30-day dedupe stamp that stops repeat visits inflating the count.

> **Reading the numbers:** view counts on the website will rise from today. That is the same visitors finally being counted, not a marketing result. Compare against 4 August, not against last week.

---

## 2026-08-04 (2) — The map was showing 30 of 47 properties

### Bug Fixes

- **A third of the catalogue was invisible on the explore map.** Properties load 30 at a time, and the next batch only arrived when someone scrolled the **list** panel — but people using a map pan and zoom instead. So the map simply drew fewer properties, with nothing to suggest more existed. On the **Todos** tab that was 30 of 47 (**36% missing**); on **Venta**, 30 of 36.
- **It hid the oldest listings.** Properties are ordered newest-first, so the ones cut off were the April sellers — Roberto, Cesa Group, Jonathan, Victoria, Branko. The people who have waited longest for a buyer were the least visible.
- **Not a regression.** This has been true since the explore page shipped and only became noticeable once inventory passed 30 — meaning it got quietly worse exactly as recruiting sellers succeeded. It is also what made the app and the website disagree in the 2026-08-04 comparison: the pins the app showed and the website did not were properties the website had never loaded.

### Technical

- The explore hook keeps fetching until the catalogue is complete. The list still paginates visually; only the timing of the data changes. Guarded three ways against a request loop: only while another page exists, never while one is in flight, and never past a fixed ceiling.
- **The ceiling is surfaced, not silent.** Beyond it the panel states that the map is showing a subset. A quiet cap would be this same bug again with a larger number. It cannot trigger at Piura's current size; when it does, the correct fix is querying by map viewport rather than loading everything.
- Sabotage-verified: removing the auto-load fails 3 of the 4 new tests.
- **Known, not fixed here:** the mobile app has the same design and has not hit it yet — its page size is 50 against 36 sale listings. The same bug is waiting at 50 per tab.
- 334 tests pass; lint, type-check and build clean.

---

## 2026-08-04 — A guard against the class of bug that broke the property pages

### Bug Fixes

- **The admin view-switcher could crash the dashboard header.** Found by the new linter on its first run — the same mistake, still live, that had taken down every property page hours earlier. The menu returned early for non-admins *above* one of its hooks, so the moment sign-in resolved and the account turned out to be an admin, the number of hooks changed between renders and React threw. Only ever affected the two admin accounts, which is why it survived months of normal use.

### Technical

- **The site now has a linter, and it blocks the build.** There was none: CI ran a type-check and the tests, and neither can see React hook order. That is precisely why the 2026-08-03 property-page crash reached production with 323 tests passing and a green build.
- `react-hooks/rules-of-hooks` is an **error** — a violation is a page that crashes for every visitor, not a style preference. Sabotage-verified: reintroducing the exact change that broke the property pages now fails `npm run lint` in about a second, naming the cause.
- Scope is deliberately narrow. Pre-existing issues that would need a sweep through working code are warnings (10 today) rather than errors. A lint step that floods the console on day one gets ignored, and an ignored guard is worth nothing.
- Two genuine escape errors fixed in the password-symbol regex, proven behaviour-identical across every relevant character first. Note for later: that regex is **duplicated** between the validation schema and the checklist UI — if the copies ever disagree, the UI will tell someone their password is fine while validation rejects it. Worth removing that duplication.
- 330 tests pass; lint, type-check and build all clean.

---

## 2026-08-04 — Hotfix: every property page was showing "Algo salió mal"

### Bug Fixes

- **Opening any listing from the map or the list failed.** The page showed *"Algo salió mal — Ocurrió un error inesperado"* instead of the property. The map and the cards worked, so the site looked healthy; the failure was on the one screen that matters most, the detail page a buyer reaches after clicking. Broken from the 2026-08-03 contact-disclosure deploy until this fix.
- **Cause.** In ADR-015 Phase 3.4 a plain `const whatsappNumber = …` was replaced by `const [contactLoading] = useState(false)` in the same spot — which sits below the page's `isLoading` and `not found` early returns. That position is harmless for a variable and invalid for a React hook: the loading render returned before reaching it, the loaded render ran it, the hook count changed between renders, and React threw #310. It affected every listing equally; a hidden-address listing was simply the one that got clicked.

### Technical

- **A test now covers the loading → loaded transition**, which is the only moment the fault existed — either state rendered on its own passes, which is exactly why 323 tests stayed green while the live page was dead. Sabotage-verified: restoring the old arrangement fails it.
- **Follow-up, not in this release:** the project has no ESLint. `react-hooks/rules-of-hooks` flags this precise mistake and is not installed, and CI runs only the build — TypeScript cannot see hook-order errors. Tracked as its own piece of work.

---

## 2026-08-03 — Who can see this page, shown on the page

### New Features

- **Each restricted tab now says who can reach it.** Next to the title on **Números**, **Ing. de Software** and **Contenido** there is a quiet button showing a headcount; pressing it lists every person's name and email. These pages are invisible to anyone off the roster, so until now the only way to answer "who else sees this?" was to read the source — which meant nobody checked, and an access mistake could sit unnoticed indefinitely.
- **It cannot show a list that isn't the real one.** The panel reads the same single access list that the route guards and the generated Firestore rules are built from. Its tests assert the rendered list against the actual access check rather than a copied roster, so they keep holding as people join and leave. Verified by deliberately breaking the component to show everyone: 8 tests failed, which is the point.

### Access

- **Contenido goes from 2 people to 6.** Added **Hernán** (`hrn.mv11@gmail.com`), **Daniel** (`godoy.degs@gmail.com`), and **Kaden** and **Libardo**, who keep Números and gain Contenido alongside it.
- **Hernán is on Contenido only.** His removal from Números on 2026-08-01 still stands — these are two separate decisions, and there is now a test naming him and asserting he stays out of Números, because a careless roster edit is the easy way to undo that by accident.
- Firestore rules regenerated from the access list and deployed to staging and production. The Números and dev gates are unchanged.

### Technical

- The button is wired through the shared page header rather than added to three pages, so a fourth restricted tab costs one line and an unrestricted page cannot accidentally grow one.
- 323 website tests and 269 rules emulator tests pass.

---

## 2026-08-02 — Six-week growth plan inside Contenido

### New Features

- **A `Plan` view in Contenido, holding one specific action for each of 42 days.** `/app/contenido` now has a **Plan / Calendario** toggle. Plan opens by default, because the daily question is "what do I do today" — the calendar is reference material you go looking for. Today's action sits at the top with its definition of done; below it six collapsible weeks, current week open, each day tickable with a note on how it went. Runs 3 August to 13 September 2026, about 40 minutes a day, with $70 of ad budget committed in week 5 and nothing before that.
- **Why the plan looks like this.** A full production baseline taken on 2 August found Oqupa has never observed a single organic event: every listing was personally recruited by the founders, most views and contact clicks came from the team itself, and all seven payment attempts were internal. The platform's largest supplier — a verified agent with 8 photographed listings — had received zero views in fifteen days. So the plan's goal is deliberately binary: **one listing and one interested buyer that nobody on the team recruited.**

### Security / Access

- **The plan can be worked but not rewritten.** Content is seeded from `planContent.ts` with the Admin SDK. Firestore rules forbid client create and delete outright, and restrict updates to `status`, `notes`, `completedAt` and `completedByEmail` — so a browser can record progress but cannot change what a day says to do, the minutes, or the spend. Marketing allowlist only; a dev-team member cannot read it. 13 new emulator tests cover both directions.

### Technical

- Re-seeding after an edit **preserves recorded progress** — verified against staging by writing progress, re-seeding, and confirming it survived, rather than assuming it.
- The plan is 42 documents keyed by date, read whole and ordered by document id, so **no composite index is required**.
- Deploy order was rules → data → website, deliberately. The reverse order is what left the Contenido tab broken on 1 August.

---

## 2026-08-01 — Content calendar, one access list per team, tab rename

### New Features

- **`Contenido` — a month-at-a-glance content calendar for the marketing team.** One row per day of the month, each holding one or more Google Drive links, so the social team always knows where a given day's assets live. Today is highlighted, weekends are shaded, and a running "N de 31 días con contenido" counter sits in the header. Month arrows move between months. A day always shows one empty link slot; extra slots appear as links are added. Restricted to the `marketing` access area. Data lives in Firestore under `contentCalendar/{YYYY-MM-DD}`.
- **`Equipo` renamed to `Ing. de Software`** — the board is engineering-specific and the generic name read as company-wide now that marketing has its own page.

### Security / Access

- **All four access lists collapsed into one file.** Access to the admin panel, the metrics dashboard, the engineering board and the content calendar was previously defined in four separate places, each with its own copy of the emails — so adding a teammate meant remembering all four, and the lists had already begun to disagree. There is now a single roster (`src/app/features/access/people.ts`) where each person carries the areas they may enter, and every guard and every navigation item reads from it.
- **The Firestore rules copy is generated, not hand-written.** `npm run access:sync` writes the emails into `firestore.rules` between generated markers; `npm run access:check` fails if the two have drifted. The comparison is enforced in the Oqupa-Platform CI workflow, which checks out both repos and gates the rules deploy — the website repo alone does not contain `firestore.rules`.
- **Access is area-scoped, so a marketing addition cannot leak the engineering board.** Tests assert the separation in both directions, with guards against passing vacuously.

### Bug Fixes

- **Month label read "Agosto De 2026".** Tailwind's `capitalize` upper-cases every word; Spanish capitalises only the first letter. The label is now built in JS.

### Technical

- 282 vitest tests now run **in CI** on every push. They existed before but only ever executed when someone ran them locally — the same failure shape as the Cloud Functions, where 109 tests went unrun for months.
- The content calendar range-filters and orders on the same `date` field, so it needs **no composite index**.
- **Deploy note:** the Firestore rules for these collections are **not** auto-deployed. Rules AND indexes both went out manually to production. The Contenido tab was initially invisible in production because the rules were deployed but the website itself had not been promoted to `master` — deploying one half of a change looks handled and ships broken.

---

## 2026-05-17 — User-facing bug report form at /reportar

### New Features

- **`/reportar` — a low-friction page for users to report website bugs.** Three visible fields: how to contact them (email or phone), what happened, and an optional collapsible "Detalles técnicos" section. Replaces the previous pattern of just telling users to email `admin@oqupa.com`. Linked from the footer ("Reportar un problema"). On submit it sends a formatted email to `admin@oqupa.com`, which the team triages on its daily duty rotation.
- **Automatic client-error capture — users don't need to open DevTools.** A global in-memory ring buffer (`src/lib/errorBuffer.ts`, initialized in `main.tsx`) records the last 20 uncaught errors, unhandled promise rejections, and `console.error` calls. When the user opens `/reportar`, the optional technical field is pre-filled with whatever was captured before they got there, plus page URL and user-agent are attached silently. The manual "paste the console" path is kept as a desktop fallback but is no longer the primary mechanism, so no screenshot tutorial is needed.
- **Email subject routes to the on-duty developer.** Same-day refinement: the subject is `[Bug web] Para <Name>` where `<Name>` is the developer on duty that day per the team rotation (computed in America/Lima time), instead of the report's first 60 chars. Lets whoever is on rotation spot/filter their reports at a glance in the shared admin@oqupa.com inbox. The duty map is duplicated in the CF and the client fallback and must stay in sync.

### Technical

- **Submit path mirrors the proven waitlist form.** Primary: reCAPTCHA Enterprise token (`bug_report` action) → new `submitBugReportWithCaptcha` Cloud Function, which verifies the token server-side (score ≥ 0.5, same threshold as `submitWaitlistWithCaptcha`) and writes the `mail` doc with the Admin SDK. Degraded fallback when reCAPTCHA is unavailable: direct client write to the public-create `mail` collection. Either path produces the same email via the Trigger Email extension.
- **User input is HTML-escaped** in both the Cloud Function and the client fallback before going into the email body — bug reports contain free-form text and console dumps, which the existing (unescaped) waitlist code would have mangled or allowed injection through. The waitlist code was intentionally left as-is; the flaw was just not replicated.
- New files: `src/pages/BugReportPage.tsx`, `src/hooks/useBugReportForm.ts`, `src/lib/errorBuffer.ts`. Route `/reportar` added in `App.tsx`; footer link added; `firestoreService.submitBugReport()` added. 254/254 vitest pass; `tsc -b && vite build` clean.
- **Deploy note:** the `submitBugReportWithCaptcha` Cloud Function is **not** auto-deployed by CI — it was manually `firebase deploy --only functions:submitBugReportWithCaptcha`'d to **both** `oqupa-staging` and `oqupa-production`, each followed by the required `gcloud run services update submitbugreportwithcaptcha --no-invoker-iam-check` (GCP org policy blocks `allUsers` invoker bindings on new 2nd-gen callables). CF code is committed in the `oqupa` repo (`functions/index.js`).
- **Known environment caveat:** email delivery is **production-only**. `oqupa-staging` has no Trigger Email extension installed, so on staging the `mail` doc is written but never sent (identical to the waitlist form's staging behavior). This feature was therefore validated directly on production, the same way the waitlist form was.

---

## 2026-05-13 — Move /numbers metrics dashboard behind an allowlisted dashboard tab

### Security / Access

- **The team metrics dashboard is no longer a public URL.** Shipped the v2 follow-up promised in the 2026-05-12 entry. Previously `oqupa.com/numbers` was an unlinked-but-public page (`noindex`, but reachable by anyone who had the URL) and the backing `publicMetrics` collection allowed `read: if true` — so active-listing counts, lifetime boost revenue, contact rates, and district breakdowns were exposed to anyone who guessed the path. The page now lives at `/app/numbers` as a gated tab inside the authenticated dashboard shell, restricted to a small email allowlist of teammates. Non-allowlisted authenticated users are redirected to `/app`; the old public `/numbers` route now `<Navigate replace>`s to `/app/numbers` so existing bookmarks still resolve (through `AuthGuard` + `MetricsGuard`). The Flutter app is intentionally untouched — this is web-only.
- **`publicMetrics` Firestore rule tightened** from open read to an email allowlist: `read: if request.auth != null && request.auth.token.email.lower() in [...]`. Writes were already server-only (the `snapshotPlatformMetrics` Cloud Function uses the Admin SDK and bypasses rules). Verified post-deploy: an anonymous Firestore REST read of `publicMetrics` returns `403 PERMISSION_DENIED`.

### Technical

- **New `MetricsGuard`** (`src/app/components/guards/MetricsGuard.tsx`) mirrors `AdminGuard`: a `METRICS_ALLOWED_EMAILS` list + `isMetricsAllowedEmail()` helper, case-insensitive (lowercased) matching. `Capabilities` gains `isMetricsViewer`, wired so the "Números" sidebar/bottom-tab entry only renders for allowlisted users. Access is tied to the **real** user, not the admin "view-as" simulation, so an admin debugging as another role does not see revenue numbers.
- **The allowlist now lives in two files that must be kept in sync** — `MetricsGuard.tsx` (UI gate) and `firestore.rules` `match /publicMetrics/{date}` (data gate). This invariant is documented in `Oqupa-website/CLAUDE.md` → "Internal metrics dashboard". Editing one without the other produces either an empty/error dashboard or a hidden-but-readable collection.
- **`NumbersPage.tsx` → `src/app/features/metrics/pages/MetricsPage.tsx`.** Same charts, adapted for the dashboard shell: topbar title/subtitle via `useSetPageMeta` (snapshot date pulled from Firestore), in-page `<h1>` and the `noindex` meta hack dropped (it is behind auth now). Still `React.lazy()`-loaded so `recharts` stays in its own chunk; non-viewers never download it (`MetricsPage` chunk ≈ 9 KB gzipped, charts vendor chunk loads on demand).
- **Tests:** new `MetricsGuard.test.tsx` mirrors the `AdminGuard` suite (loading, non-allowlisted redirect, allowlisted render, case-insensitive match, helper unit tests). 254/254 vitest pass; `tsc -b && vite build` clean.
- **Deploy note:** `firestore.rules` is **not** auto-deployed by CI — it was manually `firebase deploy --only firestore:rules`'d to **both** `oqupa-staging` and `oqupa-production` alongside the master push that auto-deployed the website. Any future allowlist edit must repeat that manual rules deploy to both projects.
- **Cloudflare cache caveat (one-time, expired):** the SPA HTML at `oqupa.com/numbers` is Cloudflare-cached `max-age=3600`, so for up to ~1h after deploy a stale client could still hit the old bundle and see an error state (the rule was already tightened, so the data fetch failed closed — no leak). Resolved within the hour as the cache rotated.

---

## 2026-05-13 — Clearer reCAPTCHA failure copy on phone verification

### UX Improvements
- **More actionable error message when the security check fails during phone-number entry.** When Firebase Auth returns `auth/captcha-check-failed` or `auth/missing-client-identifier` (the codes raised when the in-browser reCAPTCHA token can't be produced — typically because an ad blocker or privacy extension is blocking the Google reCAPTCHA script), the previous copy ("La verificación de seguridad falló. Recarga la página e intenta de nuevo. Si persiste, intenta desde otro navegador.") told the user something was wrong but not what they could do about it. New copy names the likely cause and gives three concrete recovery steps in priority order: "La verificación de seguridad de Google falló. Suele ser un bloqueador de anuncios o una extensión del navegador." followed by "Recarga la página, prueba en modo incógnito, o desde Chrome o Safari. Si persiste, escríbenos a admin@oqupa.com." Incognito mode resolves the extension-blocker case in one click — the most common cause — and the admin@oqupa.com fallback gives users a real support channel when everything else fails. Surfaced in `src/lib/authErrors.ts` so both phone-verify entry points (`AuthPipelinePage` during signup and `ProfilePage` when adding a phone later) pick up the new wording automatically.

### Technical
- Touched: `src/lib/authErrors.ts` only (4-line copy diff).
- No behaviour change, no new dependencies, TypeScript build passes (`tsc -b && vite build`).
- **Security: `npm audit fix` lockfile bumps.** Recently published advisories against `protobufjs` (one HIGH, six total CVEs covering DoS, prototype pollution, code injection in generated toObject, and unsafe-option-path issues) plus moderate `postcss` and `@protobufjs/utf8` advisories tripped the CI `npm audit --audit-level=high` gate. Patch-level updates within existing semver ranges restore a clean audit: `protobufjs` 7.5.5 → 7.5.8, `@protobufjs/codegen` 2.0.4 → 2.0.5, `@protobufjs/inquire` 1.1.0 → 1.1.1, `@protobufjs/utf8` 1.1.0 → 1.1.1, `postcss` 8.5.9 → 8.5.14. No `package.json` changes (lockfile only), no behaviour change, build still passes. protobufjs is a transitive dep of `@grpc/proto-loader` → `@firebase/firestore`; postcss is a dev-only Tailwind dep.

---

## 2026-05-12 — Internal team metrics dashboard at oqupa.com/numbers

### New Features
- **Daily-snapshot metrics dashboard for the team.** New unlinked route at `oqupa.com/numbers` showing the platform's live numbers in one page. Renders five KPI tiles (active listings, verified users, total listing views, total contact clicks with derived contact-rate %, and lifetime boost revenue in S/.), four time-series charts (active listings, verified users, views & contacts, cumulative revenue) plotted over the last 90 daily snapshots, and three current-state breakdowns of active inventory (operation type donut, property type bar, top-10 distrito bar). The page is intentionally unlinked from the rest of the site and sets `<meta name="robots" content="noindex, nofollow">` so it stays out of search results. The team finds it by knowing the URL — no auth gate at v1 since numbers are low; an email-allowlist gate is documented as a v2 follow-up.

### Technical
- **New Cloud Function:** `snapshotPlatformMetrics` (in `oqupa/functions/`, deployed to `southamerica-east1`, scheduled daily at 03:30 Lima). Aggregates `listings` + `users` + completed `payments` via Admin SDK (bypasses rules so payment PII never reaches the client) and writes a single doc per day to `publicMetrics/{YYYY-MM-DD}`. Doc holds only aggregated counts and group-bys — no PII, no per-user fields. Property-side fields (`propertyType`, `location.distrito`) are pulled by batched `db.getAll(...)` over chunks of 30 since listings only carry a `propertyId` reference. Failure mode is graceful: a crashed run produces a one-day chart gap and nothing else. Scale ceiling at the current in-memory pattern is roughly 100k listings.
- **New Firestore rule:** `match /publicMetrics/{date}` allows `read: if true` and blocks all writes — clients can read aggregated dashboard data but cannot tamper with what the dashboard sees; only the Cloud Function (Admin SDK) populates the collection.
- **New website page** at `src/pages/NumbersPage.tsx` + data hook `src/hooks/useNumbersData.ts` reads the last 90 days from `publicMetrics` ordered by `date` desc. Uses `recharts` for all chart rendering.
- **Bundle-size hygiene:** `NumbersPage` is `React.lazy()`-imported and `recharts` + d3 transitive deps are split into a dedicated `charts` chunk via `vite.config.ts` `manualChunks`. Visitors to the public site do not download the ~90 KB gzipped chart code; main bundle is unchanged.
- **Production seeding:** the function was manually triggered post-deploy so the first snapshot exists immediately rather than waiting for tomorrow's 03:30 schedule. Subsequent days run automatically.

---

## 2026-05-10 — Property Page Redesign + App Store Launch on Web

### New Features
- **App Store + Google Play badges** are now live on the website, since the Oqupa mobile app shipped on both stores (iOS released 2026-05-07, Android shortly after). Two new pieces are reusable across the codebase: `src/lib/appStoreLinks.ts` exports the canonical store URLs (App Store ID `6758535934`, Android package `com.oqupa.app` — both auto-redirect users to their region's store), and a new `<AppStoreBadges />` component renders custom Tailwind pills with the Apple wordmark and the four-color Google Play triangle, opens in a new tab, accepts a `className` for layout. The badges currently render in two surfaces:
  - **PropertyPage right-column banner** — replaces the pre-launch "App movil disponible el 11 de Mayo / Avisarme cuando este lista" placeholder. Banner copy rewritten for the launched state ("Descarga la app de Oqupa · Busca propiedades y publica las tuyas desde tu celular"), badges centered.
  - **Footer (every page)** — new "DESCARGA LA APP" subhead block in the left brand column, badges left-aligned next to the logo + tagline so they're reachable from any page.

### UX Improvements
- **PropertyPage two-column layout on desktop.** The detail page below the gallery used to stack everything in a narrow `max-w-2xl` (~672px) column, leaving the WhatsApp CTA buried at the bottom of the scroll on widescreen monitors. It's now a two-column CSS grid (`lg:grid-cols-3`) inside a `max-w-6xl` container that matches the gallery width:
  - **Left column (lg:col-span-2, scrollable):** price + Destacado badge in the header row, location, feature badges, description.
  - **Right column (lg:col-span-1, sticky below the navbar):** WhatsApp CTA, owner-only boost CTA / status block, app-download banner. `lg:sticky lg:top-24 lg:self-start lg:h-fit` on the aside is what makes the sticky behavior work inside a CSS grid item.
  - Mobile and tablet (`<lg`) stay single-column — same look as before.
  - A subtle 1px hairline (`lg:border-l lg:border-border lg:pl-8`) divides the columns at the `lg` breakpoint only.
- **View count surfaced on listing pages.** `listing.viewCount` (already populated by the App-Check-enforced `recordListingView` Cloud Function) had no UI. It now appears as "N vistas" with an Eye icon in the price-row header next to the share button.
- **Share button is now a pill, not an icon.** The circular share-icon button is replaced by a "Compartir" Subhead-styled rounded-full pill button — more discoverable inside the wider header row, matches the existing border / hover treatment.
- **WhatsApp CTA refresh:** copy changed from "Contactar por WhatsApp" → "Escríbele por WhatsApp" (with the í tilde), font dropped from `text-lg` → `text-sm` and `whitespace-nowrap` added so it stays on one line in the narrower right column. Two helper notes attached just below the button: a no-intermediaries assurance ("Tu mensaje llega directamente a quien publica el aviso. En Oqupa no hay intermediarios") and an etiquette nudge ("Tip: tu mensaje ya incluye la dirección. Cuéntale cuándo te gustaría visitarla").
- **Header + Footer "Publica Gratis" now goes straight to the listing wizard.** Both links used to scroll to the legacy `#precios` section anchor. They now route to `/app/listings/new` with a `setReturnUrl('/app/listings/new')` stash so anonymous users bouncing through `/app/login` land back in the wizard after sign-in — same flow as the hero's "Publicar mi propiedad". The `NavLink` interface in `Header.tsx` was extended with an optional `beforeNavigate?: () => void` so route links can carry a side-effect cleanly.
- **Expansion popup gains a context line.** The collapsed orange "PIDE OQUPA EN TU DEPARTAMENTO" bar was ambiguous to first-time visitors who didn't know Oqupa is Piura-only. A small "Por ahora disponible solo en Piura" caption (white at 80% opacity, sentence case, leading-tight) now sits above the bold uppercase title so the CTA is contextualised correctly. Bar padding tightened (`py-3.5` → `py-3`) to keep the footprint roughly the same.

### Bug Fixes
- **Hero desktop "Publicar mi propiedad" no longer drops signed-in users on the landing page.** The desktop button at `HeroSection.tsx:60` had `onClick={() => { stashPublishReturn(); setReturnUrl(location.pathname) }}` — the second `setReturnUrl` call was clobbering the first, so anonymous users who clicked Publicar bounced through `/app/login` and then landed back at `/` instead of `/app/listings/new`. Removed the redundant call (mobile was already correct), cleaned up the now-unused `useLocation` import.
- **Listing-edit `operationType` payload fix (carried from 2026-05-08).** The website's listing-edit flow had been omitting `operationType` from the `updateListing()` call since launch. Property doc was getting the new value on every edit but the listing doc kept the old, pinning any home-map query result to the wrong tab. Affected ~3% of active listings on production at the time of the diagnostic. After this release no NEW listings can drift; existing diverged listings still need the Phase 3 reconciliation pass.

### Technical
- New files: `src/components/AppStoreBadges.tsx`, `src/lib/appStoreLinks.ts`.
- Touched: `src/pages/PropertyPage.tsx` (the bulk of the diff — 398 → 524 line range refactor), `src/components/landing/HeroSection.tsx`, `src/components/landing/ExpansionPopup.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`.
- No type changes: `Listing.viewCount` already existed, no new dependencies, `lucide-react` `Eye` icon imported alongside the existing `Sparkles`.
- TypeScript build passes (`tsc -b && vite build`).

---

## 2026-05-04 — Launch Day Email Campaign

### New Email Infrastructure
- **Sent the May 4 launch announcement** to 37 recipients (9 waitlist-only + 28 existing users, deduped by email). Hand-coded brand-aligned HTML with monochromatic orange-gradient feature cards, Roboto Serif heading + Gotham body via self-hosted `@font-face`, Apple/iCloud-friendly meta tags (`format-detection`, `x-apple-data-detectors` reset, `mso-line-height-alt` for Outlook), VML pill CTA fallback, and a "view in browser" link.
- **Static landing page** `public/email/launch.html` for the view-in-browser link, generated by `sed` substitution from the canonical template at `email/launch-2026-05-04/index.html`.
- **Hero asset** `public/email/launch-hero.jpg` (1200×625 JPEG, 198 KB, downscaled from the 3024×1576 `explorar` page screenshot). Filename is intentionally distinct from the earlier `explorar.jpg` because Cloudflare had cached a stale HTML response for that URL after Firebase Hosting's SPA fallback fired pre-deploy.

### Technical
- `email/launch-2026-05-04/send.cjs` — node script that reads waitlist + users from production Firestore, dedupes by email, personalizes per recipient, and queues mail docs into the `mail` collection (handled by the firestore-send-email extension via Gmail SMTP). Idempotency lock at `campaigns/may4_launch.sentAt`. Dry-run by default; `--test=<email>` for QA; `--send` for the real campaign.
- `email/launch-2026-05-04/README.md` — full design + engineering rationale, sender setup, send process, known limitations.
- Configured `equipo@oqupa.com` as a Workspace alias on `admin@oqupa.com` for the sender identity. Inbound to `equipo@` lands in admin@'s inbox; Gmail auto-registered it as a Send-As alias so the SMTP relay accepts the rewritten From header without DMARC issues.
- Removed the stale `public/email/explorar.jpg` (replaced by `launch-hero.jpg`). The deploy ships clean.

---

## 2026-05-04 — Launch-Day Landing Page Cleanup

### UX Improvements
- **Hero now uses two direct CTAs.** Dropped the "4 de Mayo / 11 de Mayo" date stack and the modal-mediated flow. Both desktop and mobile heroes show "Publicar mi propiedad" → `/app/listings/new` (anonymous visitors are routed through `/app/login` and bounced back via the `setReturnUrl` mechanism) and "Explorar Piura" → `/explorar`. This removes the pre-launch "adelántate" / "11 de mayo" framing that was incoherent on launch day.
- **Waitlist UI repurposed for expansion-city interest.** The platform launched in Piura today, so the "lista de espera" framing no longer fits. The same UI is now an expansion-interest signup: heading "Lleva Oqupa a tu departamento" with a `<select>` dropdown of Peru's 24 departamentos + Callao (excluding Piura). The floating popup, the in-page section, and the navigation link all share the new framing. Submit button: "Quiero Oqupa en mi departamento". Section anchor: `#lista-espera` → `#expansion`.
- **Footer column heading "Lanzamiento" → "Plataforma"**, and its first link "Lista de Espera" → "Pide en tu departamento" pointing at `#expansion`.
- **Header sign-in CTA tildes** (desktop + mobile): "Iniciar Sesion" → "Iniciar sesión". Slipped the prior tildes pass since it lives in the layout, not the auth pipeline.
- **PiuraOnlyBanner copy** moved from the pre-launch "Estamos lanzando" to the present-tense "Lanzamos en Piura". The "Estás fuera de Piura?" link now scrolls to the in-page expansion form instead of opening a `mailto:` draft.

### Removed
- `src/components/landing/SocialProofSection.tsx` — was never imported anywhere; dead code from a prior design.
- `src/components/landing/PostPropertyModal.tsx`, `src/components/landing/SearchPropertyModal.tsx` — both modals were intermediate "are you sure?" dialogs added for the pre-launch teaser. With the hero CTAs going direct now, they have no reason to exist.

### Technical
- New `src/lib/peruDepartamentos.ts` exports the canonical list (excluding Piura) used by the dropdown and form validation.
- Renamed `WaitlistSection` → `ExpansionSection`, `WaitlistPopup` → `ExpansionPopup`, `useWaitlistForm` → `useExpansionForm`, `useWaitlistPopup` → `useExpansionPopup`. Internal pubsub event name (`expand-waitlist-popup`) and the Firestore collection name (`waitlist`) were intentionally **not** renamed — the latter would force a Trigger Email rule update and a data migration for zero functional gain. The data shape inside changed: `WaitlistEntry.city` (free text) → `WaitlistEntry.departamento` (allowlist value), and the `budget` field was dropped (always empty). Email subject/body updated to "Solicitud de expansión: {departamento}".
- 244/244 tests still pass — no logic changed, the form rewrite stayed compatible with existing assertions because no tests targeted the legacy waitlist form directly.

---

## 2026-05-04 — Spanish Typography Pass on Auth Pipeline

### UX Improvements
- **Tildes restored across every auth page**: All user-facing strings on `/app/login`, `/app/register`, `/app/forgot-password`, `/app/auth/complete`, `/app/auth/set-password`, and the four-step `/app/verify` pipeline now carry their proper Spanish accents (contraseña, teléfono, número, código, sesión, verificación, página, política, términos, etc.) and inverted question marks where appropriate (¿Cómo te llamas?, ¿Olvidaste tu contraseña?, ¿No tienes cuenta?, ¿Ya tienes cuenta?). Buttons follow Spanish sentence-case ("Crear cuenta", "Iniciar sesión", "Volver a iniciar sesión") instead of title-case.
- **Form validation messages, toast notifications, and Firebase error mappings updated** to match: every entry in `authSchema.ts` and every catalog in `authErrors.ts` (login, register, phone, magic-link, forgot-password) now uses correct Spanish accents.

### Technical
- Tests refreshed to assert against the tilde'd strings (`/cómo te llamas/i`, `/correo válido/i`, `/aún no detectamos/i`, etc.). 244/244 still passing — no logic changed.

---

## 2026-05-04 — Web Signup Flow + Email Verification Gate

### New Features
- **Account creation on the web**: New `/app/register` page with email + password + confirm-password. The page existed originally but was deleted in the magic-link migration (2026-03-08, commit `5b10cf9`) and never restored when magic-link itself was retired — so the website had no path for new users to create an account at all. The login page now also surfaces a "No tienes cuenta? Crea una" CTA below the forgot-password link, and the register page links back to `/app/login` for users who already have an account.
- **Email verification is now enforced**: After registration, the user lands on the existing post-auth pipeline at `/app/verify`, where a new first step ("Verifica tu correo") gates the rest of the flow. The step shows the user's email, a "Reenviar correo" action (re-sends the Firebase verification link), and a "Ya verifique" button that reloads the Firebase user and advances on success or shows "Aun no detectamos la verificacion" on failure. The pipeline is now 4 steps (email → name → phone → SMS code) instead of 3.

### Security
- **Dashboard blocks unverified email**: `VerifiedGuard` previously checked only name + phone. It now also redirects to the pipeline when `firebaseUser.emailVerified === false`, closing a gap where legacy accounts or users who manually navigated past the pipeline could reach the dashboard with an unverified email. Mid-registration users (Firebase auth user exists but Firestore doc hasn't loaded yet) are also redirected to the pipeline instead of being waved through to the dashboard.
- **GuestGuard treats unverified email as "not fully verified"**: An already-logged-in user landing on `/app/login` is sent to `/app/verify` (not the dashboard) until email + name + phone are all done.

### UX Improvements
- **`SetPasswordPage` verifyEmail success now has a "Continuar" button**: When the verification action link is clicked in the same browser as the open signup session, the success screen sends the user back to `/app/verify` with one click instead of asking them to navigate manually. The "vuelve a la app de Oqupa" copy is preserved as a hint for users who clicked the link from a different device.

### Technical
- New `authService.sendEmailVerificationToCurrentUser()` (continueUrl `/app/verify`) and `authService.reloadCurrentFirebaseUser()`.
- New `authStore.refreshFirebaseUser()` action so a verification flip done in another tab is visible without a sign-out/sign-in cycle.
- New `getRegisterAuthError()` mapping in `lib/authErrors.ts` covers `email-already-in-use`, `invalid-email`, `weak-password`, `operation-not-allowed`, `too-many-requests`, `network-request-failed`, plus a generic fallback.
- 23 new tests (`RegisterPage.test.tsx` 15 cases + `lib/authErrors.test.ts` 8 cases) plus extended coverage on `AuthPipelinePage`, `VerifiedGuard`, `GuestGuard`, and `PasswordLoginPage`. 244/244 passing.

### Deployment Notes
- **Firebase Console action URL must be customized per project** for the verification email link to land on our Oqupa-branded `SetPasswordPage` instead of Firebase's default English hosted page. Production: already set to `https://oqupa.com/app/auth/set-password`. Staging: still pending — the email currently uses the default `https://oqupa-staging.firebaseapp.com/__/auth/action`. To fix, go to Firebase Console → Authentication → Templates → Email address verification → pencil → "customize action URL" → set to `https://oqupa-staging.web.app/app/auth/set-password`. Same console also lets you change the email language to Spanish (Latin America).

---

## 2026-04-25 — Staging Image URL Fix + AnimatedImage Fallback

### Bug Fixes
- **Photos render correctly on staging again**: Listing detail pages and explore-page thumbnails on `oqupa-staging.web.app` had been silently broken since the R2 migration on 2026-04-12 — image URLs were being constructed with the production-only `/cdn-cgi/image/...` Cloudflare Image Transformation prefix pointing at the production CDN host. That path only works on origins served behind Cloudflare; staging Firebase Hosting silently fell through its catch-all SPA rewrite and returned HTML for every image request, leaving `<img>` elements at zero dimensions. The view-side URL builder now branches on `import.meta.env.MODE === 'production'` instead of `import.meta.env.PROD` (which Vite sets `true` for any `vite build`, regardless of which environment the build targets).
- **`AnimatedImage` no longer hides failed loads**: The component starts at `opacity-0` and only fades in when `onLoad` fires — but failed loads (404, DNS error, CORS block) never fire `onLoad`, so the element stayed invisible with no broken-image icon. Added an `onError` handler that renders a fallback `<div>` with the lucide `ImageOff` icon and "No se pudo cargar la imagen" copy. Surfaced while debugging the staging image issue above; would have made the bug obvious from page one.

### Technical
- **CI: staging build now uses `--mode staging`**: `.github/workflows/deploy.yml` explicitly passes `--mode staging` to `npm run build` for the staging deploy, so `import.meta.env.MODE === 'staging'`. Production deploy still uses the default mode (`'production'`). Both branches are constant-folded by Vite, so the inactive code path is eliminated from the bundle (verified: staging bundle has no `cdn-cgi/image` string, prod bundle has no `images-staging.oqupa.com` string).
- All 153 existing tests still pass — Vitest defaults to `MODE='test'` which evaluates the staging branch the tests already assert on.

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
