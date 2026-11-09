// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * www.oqupa.com served the whole site with a 200, so Google kept a second
 * copy of the homepage ("Duplicate without user-selected canonical", Search
 * Console 2026-11-09). Pages on www now go to the same address on oqupa.com.
 * Done in the page because hosting cannot redirect by host name; the app-link
 * files under /.well-known are static files and stay reachable on www, so
 * links to www still open the app.
 */
const root = resolve(__dirname, '../..')
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8')
const firebaseJson = readFileSync(resolve(root, 'firebase.json'), 'utf8')

const inline = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? "")
const redirect = inline.find((s) => s.includes('www.oqupa.com'))

function run(href: string): string | null {
  const url = new URL(href)
  let went: string | null = null
  const location = {
    hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash,
    replace: (to: string) => { went = to },
  }
  new Function('location', redirect!)(location)
  return went
}

describe('www.oqupa.com goes to oqupa.com', () => {
  it('is the first script in the page, before anything loads', () => {
    expect(redirect).toBeTruthy()
    expect(indexHtml.indexOf(redirect!)).toBeLessThan(indexHtml.indexOf('<script type="module"'))
    expect(indexHtml.indexOf(redirect!)).toBeLessThan(indexHtml.indexOf('loadScript'))
  })

  it('keeps the path, the query and the anchor', () => {
    expect(run('https://www.oqupa.com/')).toBe('https://oqupa.com/')
    expect(run('https://www.oqupa.com/property/L1?utm_source=x#fotos'))
      .toBe('https://oqupa.com/property/L1?utm_source=x#fotos')
  })

  it('does nothing on oqupa.com or staging', () => {
    expect(run('https://oqupa.com/explorar')).toBeNull()
    expect(run('https://oqupa-staging.web.app/')).toBeNull()
  })

  it('the security policy allows exactly this script', () => {
    const hash = createHash('sha256').update(redirect!).digest('base64')
    expect(firebaseJson).toContain(`'sha256-${hash}'`)
  })
})
