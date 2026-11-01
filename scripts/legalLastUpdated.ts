// The "Última actualización" date on the legal pages, worked out from git at
// build time so nobody has to remember to change it (Jerson, 2026-11-01).
//
// The date is the day (Lima time) of the newest commit that touched the page's
// source file. Commits that changed the file without changing what a reader
// sees — a styling sweep, the wiring of this script — can be listed in
// legal-dates-ignore-revs.txt so they do not move the date. Forgetting to list
// one only makes the date newer than it needs to be, never stale.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const LEGAL_PAGES = {
  privacy: 'src/pages/PrivacyPage.tsx',
  terms: 'src/pages/TermsPage.tsx',
} as const

export type LegalPage = keyof typeof LEGAL_PAGES
export const IGNORE_REVS_FILE = 'legal-dates-ignore-revs.txt'

/** YYYY-MM-DD for the given instant, in Lima. */
export function limaDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function readIgnoreRevs(cwd: string): Set<string> {
  const path = join(cwd, IGNORE_REVS_FILE)
  if (!existsSync(path)) return new Set()
  return new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.replace(/#.*/, '').trim())
      .filter(Boolean),
  )
}

export function lastUpdated(file: string, cwd: string, now: Date = new Date()): string {
  // A shallow clone (CI's default) only knows the newest commit, so every
  // page would silently show the build day. Refuse instead.
  if (git(cwd, ['rev-parse', '--is-shallow-repository']) === 'true') {
    throw new Error(
      `${file}: the git history is shallow, so its last-updated date cannot be known. ` +
        'Check out with fetch-depth: 0.',
    )
  }

  // Edited but not committed yet: a local preview shows today.
  if (git(cwd, ['status', '--porcelain', '--', file]) !== '') return limaDate(now)

  const ignore = readIgnoreRevs(cwd)
  const log = git(cwd, ['log', '--format=%H %cI', '--', file])
  for (const line of log.split('\n')) {
    const [hash, iso] = line.split(' ')
    if (!hash || !iso) continue
    if ([...ignore].some((rev) => hash.startsWith(rev))) continue
    return limaDate(new Date(iso))
  }
  throw new Error(`${file}: no commit found, so its last-updated date cannot be known.`)
}

export function legalLastUpdated(cwd: string, now: Date = new Date()): Record<LegalPage, string> {
  return {
    privacy: lastUpdated(LEGAL_PAGES.privacy, cwd, now),
    terms: lastUpdated(LEGAL_PAGES.terms, cwd, now),
  }
}
