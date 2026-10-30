# Walkthrough tests (Playwright)

The public site as a visitor, at three sizes: computer (1440×900), tablet
(820×1180, touch) and phone (390×844, touch). They check what the screen
promises: the map (dots far out, pins close in, a tapped dot raising its pin
without moving the map), the card and the listing page, VER LISTA and every
sort, Venta / Alquiler, the hearts and the card after the third save
(ADR-034), /guardados, the doors (Anuncia tu propiedad, WhatsApp) — plus no
page errors, no sideways scrolling, no words cut short, header buttons on one
line.

They only read: the one thing written is this browser's own storage (saves).
Listings are read from the target's Firestore the way a visitor's browser
reads them.

```bash
npx playwright test                              # against staging (default)
E2E_BASE_URL=http://localhost:5173 npx playwright test   # against `npm run dev`
SHOTS_DIR=/tmp/walk npx playwright test          # also save a screenshot of each state, per size
npx playwright test --project=phone              # one size
```

Uses the installed Google Chrome (`channel: 'chrome'`), so no browser download.
Not part of `npm test` (Vitest) or the build. Not in CI yet: it needs live data
on staging and takes ~2 minutes; run it before promoting `development` to
`master`.

Against production, read-only, add `E2E_FIRESTORE_PROJECT=oqupa-production`
with `E2E_BASE_URL=https://oqupa.com`.

A local dev server uses a map key that Mapbox refuses for some tiles on
localhost; those console errors are ignored for localhost runs only, and the
close-in map test can time out there. Staging is the reference run.
