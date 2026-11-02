/**
 * How full the filling button looks while a long action runs (ADR-043, D14).
 *
 * The bar is driven by two things and shows whichever is further along:
 *
 *  - a TIME curve, so it moves the moment the person taps even when the real
 *    work has not reported anything yet: 0 → 0.70 in about 4 s, easing out,
 *    then 0.70 → 0.90 slowly over about 25 s, then it waits at 0.90;
 *  - the REAL progress of the work, when it is ahead of the curve.
 *
 * Until the work is confirmed done the bar never passes 0.90 (so a full bar
 * always means "it really happened"), and it never moves backwards.
 *
 * Pure functions, so the shape can be tested without a browser or a clock.
 */

/** The bar waits here until the work is confirmed. */
export const FILL_HOLD = 0.9
/** Where the fast first part of the time curve ends. */
export const FILL_FAST_END = 0.7
/** How long the fast first part takes. */
export const FILL_FAST_MS = 4000
/** The slow second part gets to ~95% of the way to FILL_HOLD in this time. */
export const FILL_SLOW_MS = 25000

// exp(-3) ≈ 0.05: after FILL_SLOW_MS the slow part has covered 95% of its gap.
const SLOW_TAU_MS = FILL_SLOW_MS / 3

/** Fill from time alone, for a run that started `elapsedMs` ago. */
export function timeCurve(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0
  if (elapsedMs <= FILL_FAST_MS) {
    const t = elapsedMs / FILL_FAST_MS
    // Ease-out cubic: quick at first, slowing into 0.70.
    return FILL_FAST_END * (1 - Math.pow(1 - t, 3))
  }
  const slow = 1 - Math.exp(-(elapsedMs - FILL_FAST_MS) / SLOW_TAU_MS)
  return Math.min(FILL_HOLD, FILL_FAST_END + (FILL_HOLD - FILL_FAST_END) * slow)
}

/**
 * The fill to show next. `previous` is what is on screen now; `real` is the
 * work's own progress (0..1, already mapped — see `publishRealProgress`).
 */
export function nextFill(previous: number, elapsedMs: number, real: number): number {
  const target = Math.max(timeCurve(elapsedMs), clamp01(real))
  return Math.max(clamp01(previous), Math.min(FILL_HOLD, target))
}

/**
 * Publishing's real progress on the bar's scale: compressing and uploading the
 * photos (by bytes) take 0 → 0.70, saving the listing takes 0.70 → 0.90. The
 * last stretch to 1 is only ever drawn once the save is confirmed.
 */
export function publishRealProgress(
  stage: 'photos' | 'save',
  fraction: number,
): number {
  const f = clamp01(fraction)
  return stage === 'photos'
    ? FILL_FAST_END * f
    : FILL_FAST_END + (FILL_HOLD - FILL_FAST_END) * f
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
