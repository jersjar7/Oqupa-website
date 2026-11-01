// "The screen is clear" for the A11b follow-up card on the website — the web
// version of the app's ContactFollowUpScreenGuard.
//
// Calm only on the ordinary pages below, the ones that match the app's list
// (map, listing, Guardados, the person's own dashboard pages). Never on
// sign-in, the account pipeline, a form (new / edit listing, the profile
// form, the realtor application, the bug report) or the internal team pages.
// And never while another dialog or sheet is open (a Modal — Stripe's payment
// form lives in one — the boost checkout, the contact gate, the listing
// sheet), nor while the person is typing in a field.

/** Marks the follow-up card itself, so it does not count as "another dialog". */
export const FOLLOW_UP_CARD_ATTR = 'data-follow-up-card'

const CALM_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/explorar\/?$/,
  /^\/guardados\/?$/,
  /^\/property\/[^/]+\/?$/,
  /^\/app\/?$/,
  /^\/app\/listings\/?$/,
  /^\/app\/leads(?:\/[^/]+)?\/?$/,
  /^\/app\/payments\/?$/,
  /^\/app\/lists(?:\/[^/]+)?\/?$/,
]

export function isFollowUpRoute(pathname: string): boolean {
  return CALM_ROUTES.some((re) => re.test(pathname))
}

const BLOCKERS = 'dialog[open], [aria-modal="true"], [role="dialog"]'

export function isScreenClearForFollowUp(doc: Document): boolean {
  for (const el of doc.querySelectorAll(BLOCKERS)) {
    if (!el.closest(`[${FOLLOW_UP_CARD_ATTR}]`)) return false
  }
  const active = doc.activeElement as HTMLElement | null
  if (active && !active.closest(`[${FOLLOW_UP_CARD_ATTR}]`)) {
    const tag = active.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) return false
  }
  return true
}
