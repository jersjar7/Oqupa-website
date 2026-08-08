/**
 * One link on the marketing content calendar (`/app/contenido`).
 *
 * A day can hold several links — a Reel and a carousel may live in different
 * Drive folders — so this is one document per LINK, not per day. The calendar
 * groups them by `date` when it renders.
 */
export interface ContentLink {
  id: string
  /**
   * The day this content is for, as 'YYYY-MM-DD' (local Lima date, never UTC)
   * — or `null` for finished material that has no publish day yet, which lives
   * on the "sin programar" shelf until someone assigns it one.
   *
   * Stored as an explicit null rather than by omitting the field: Firestore can
   * equality-match null but CANNOT match a missing field, and the shelf query
   * depends on finding these. Verified against the emulator before this was
   * built — see the contentLinks tests in tests/firestore-rules.test.js.
   */
  date: string | null
  /**
   * What the content IS, in a few words — "Reel casa Castilla", "Carrusel
   * precios". Optional because links created before 2026-08-08 have none; the
   * UI falls back to showing the address.
   *
   * A row of bare Drive addresses is unreadable: they all look identical and
   * you have to open each one to find out what it is.
   */
  label?: string
  /** Where the content lives. Usually a Google Drive folder or file. */
  url: string
  createdAt: Date
  createdByEmail: string
}
