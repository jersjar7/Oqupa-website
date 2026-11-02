import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/**
 * One word for the person who owns the listing: "dueño", on the website and
 * the app (feature audit 2026-11-02, "dueño" vs "propietario"). The approved
 * wizard already says "Soy el dueño" / "¿No eres el dueño?" and the follow-up
 * card "¿Pudiste contactar al dueño?", while the contact gate said "Escríbele
 * al propietario" for the same person. The app's suite pins the same rule.
 *
 * Comments may say anything. The legal pages (Términos, Privacidad) keep their
 * own defined terms and are not checked.
 */
const SRC = resolve(__dirname, '../..')
const LEGAL = new Set(['pages/TermsPage.tsx', 'pages/PrivacyPage.tsx'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

describe('the owner is "dueño"', () => {
  it('no text a person reads says "propietario"', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SRC)) {
      const rel = relative(SRC, file)
      if (LEGAL.has(rel)) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return // comments
        const code = line.replace(/\s\/\/.*$/, '')
        if (/propietari/i.test(code)) offenders.push(`${rel}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(offenders).toEqual([])
  })
})
