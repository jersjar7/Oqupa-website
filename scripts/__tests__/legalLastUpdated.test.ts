// The legal pages' "Última actualización" is read from git so it can never go
// stale (Jerson, 2026-11-01). Each test builds a throwaway repo.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IGNORE_REVS_FILE, lastUpdated, legalLastUpdated, limaDate } from '../legalLastUpdated'

let repo: string

function git(args: string[], env: Record<string, string> = {}): string {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', HOME: repo, ...env },
  }).trim()
}

function commit(file: string, text: string, isoDate: string): string {
  mkdirSync(join(repo, file, '..'), { recursive: true })
  appendFileSync(join(repo, file), text)
  git(['add', '-A'])
  git(['commit', '-q', '-m', text], { GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate })
  return git(['rev-parse', 'HEAD'])
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'legal-dates-'))
  git(['init', '-q'])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'Test'])
  git(['config', 'commit.gpgsign', 'false'])
})

afterEach(() => rmSync(repo, { recursive: true, force: true }))

describe('limaDate', () => {
  it('uses the day in Lima, not UTC or the Mac’s clock', () => {
    // 03:00 UTC on 2 Nov is still 1 Nov in Lima (UTC−5).
    expect(limaDate(new Date('2026-11-02T03:00:00Z'))).toBe('2026-11-01')
    expect(limaDate(new Date('2026-11-02T05:00:00Z'))).toBe('2026-11-02')
  })
})

describe('lastUpdated', () => {
  it('is the day of the newest commit that touched the page', () => {
    commit('page.tsx', 'a', '2026-04-28T12:00:00-05:00')
    commit('other.tsx', 'b', '2026-06-01T12:00:00-05:00')
    commit('page.tsx', 'c', '2026-10-24T12:00:00-05:00')
    commit('other.tsx', 'd', '2026-11-01T12:00:00-05:00')
    expect(lastUpdated('page.tsx', repo)).toBe('2026-10-24')
  })

  it('counts the day in Lima: a late-night Washington commit is the next day there', () => {
    commit('page.tsx', 'a', '2026-10-24T23:30:00-07:00')
    expect(lastUpdated('page.tsx', repo)).toBe('2026-10-25')
  })

  it('skips commits listed in the ignore file (full or short hash, comments allowed)', () => {
    commit('page.tsx', 'text', '2026-10-24T12:00:00-05:00')
    const style = commit('page.tsx', 'style', '2026-10-31T12:00:00-05:00')
    const wiring = commit('page.tsx', 'wiring', '2026-11-01T12:00:00-05:00')
    writeFileSync(
      join(repo, IGNORE_REVS_FILE),
      `# styling sweep\n${style}\n${wiring.slice(0, 7)}  # wiring\n`,
    )
    git(['add', '-A'])
    git(['commit', '-q', '-m', 'ignore'])
    expect(lastUpdated('page.tsx', repo)).toBe('2026-10-24')
  })

  it('shows today while the page has uncommitted edits', () => {
    commit('page.tsx', 'a', '2026-04-28T12:00:00-05:00')
    appendFileSync(join(repo, 'page.tsx'), 'edit')
    expect(lastUpdated('page.tsx', repo, new Date('2026-11-01T15:00:00Z'))).toBe('2026-11-01')
  })

  it('refuses a shallow clone instead of showing the build day', () => {
    commit('page.tsx', 'a', '2026-04-28T12:00:00-05:00')
    commit('other.tsx', 'b', '2026-11-01T12:00:00-05:00')
    const shallow = mkdtempSync(join(tmpdir(), 'legal-dates-shallow-'))
    try {
      execFileSync('git', ['clone', '-q', '--depth', '1', `file://${repo}`, shallow])
      expect(() => lastUpdated('page.tsx', shallow)).toThrow(/fetch-depth: 0/)
    } finally {
      rmSync(shallow, { recursive: true, force: true })
    }
  })

  it('refuses a page that was never committed', () => {
    commit('other.tsx', 'a', '2026-04-28T12:00:00-05:00')
    expect(() => lastUpdated('page.tsx', repo)).toThrow(/no commit found/)
  })
})

describe('legalLastUpdated on this repo', () => {
  it('gives both pages a real date', () => {
    const dates = legalLastUpdated(process.cwd())
    expect(dates.privacy).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(dates.terms).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
