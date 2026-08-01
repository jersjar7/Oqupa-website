/**
 * One link on the marketing content calendar (`/app/contenido`).
 *
 * A day can hold several links — a Reel and a carousel may live in different
 * Drive folders — so this is one document per LINK, not per day. The calendar
 * groups them by `date` when it renders.
 */
export interface ContentLink {
  id: string
  /** The day this content is for, as 'YYYY-MM-DD'. Local Lima date, not UTC. */
  date: string
  /** Where the content lives. Usually a Google Drive folder or file. */
  url: string
  createdAt: Date
  createdByEmail: string
}
