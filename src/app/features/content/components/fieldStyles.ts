/**
 * Shared input styling for the Contenido rows.
 *
 * Lives in its own module rather than beside the page component: the page
 * imports the shelf and the shelf needs these, so keeping them on the page
 * would make the two import each other. Circular imports survive in a bundler
 * right up until a change in evaluation order turns one side into `undefined`,
 * and the symptom then looks nothing like the cause.
 *
 * WHY EACH FIELD IS A BOX. The label and the address used to be two transparent
 * inputs sitting flush together, which read as one run-on sentence —
 * "Qué es (ej. Reel casa CaPega el enlace de Drive…" — with no way to see where
 * one ended and the next began. A border and a gap fix it without adding weight.
 */
export const FIELD_BOX =
  'rounded-md border border-border bg-white px-2 py-1 text-sm text-text-primary ' +
  'placeholder:text-text-tertiary focus:border-primary focus:outline-none ' +
  'focus:ring-2 focus:ring-primary/20 disabled:opacity-50'

/**
 * The label gets TWICE the width of the address.
 *
 * A Drive address is unreadable at any width — it is a random string you copy
 * rather than read, and there is a copy button for exactly that. The label is
 * the only part a person actually reads, so it gets the room. Ratios rather
 * than fixed widths so both still line up down the page at any window size.
 */
export const LABEL_FIELD_WIDTH = 'w-full min-w-0 sm:flex-[2]'
export const URL_FIELD_WIDTH = 'w-full min-w-0 sm:flex-1'
