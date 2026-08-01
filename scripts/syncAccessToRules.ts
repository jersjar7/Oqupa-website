/**
 * Writes the access lists from `people.ts` into `firestore.rules`.
 *
 * Firestore rules are evaluated by Google, not by this app, so they cannot
 * import TypeScript — the rules file will always hold a second copy of the
 * emails. This script makes that copy GENERATED instead of hand-maintained,
 * and `accessSync.test.ts` fails the build if the two ever disagree.
 *
 *   npm run access:sync     rewrite the generated blocks
 *   npm run access:check    fail if they are stale (also runs in tests/CI)
 *
 * Only the lines BETWEEN the markers are touched. Everything else in
 * firestore.rules is left exactly as it is.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { emailsWith, type AccessArea } from '../src/app/features/access/people'

const RULES_PATH = resolve(import.meta.dirname, '../../firestore.rules')

/** Rules function name → the access area that fills it. */
const GENERATED: Array<{ marker: string; area: AccessArea; fn: string }> = [
  { marker: 'ACCESS:admin',     area: 'admin',     fn: 'isAdmin' },
  { marker: 'ACCESS:metrics',   area: 'metrics',   fn: 'isMetricsViewer' },
  { marker: 'ACCESS:dev',       area: 'dev',       fn: 'isTeamMember' },
  { marker: 'ACCESS:marketing', area: 'marketing', fn: 'isMarketingMember' },
]

function block(fn: string, area: AccessArea, indent: string): string {
  const emails = emailsWith(area)
    .map((e) => `${indent}               '${e}',`)
    .join('\n')
  return [
    `${indent}function ${fn}() {`,
    `${indent}  return request.auth != null &&`,
    `${indent}         request.auth.token.email != null &&`,
    `${indent}         request.auth.token.email.lower() in [`,
    emails,
    `${indent}         ];`,
    `${indent}}`,
  ].join('\n')
}

export function renderRules(source: string): string {
  let out = source
  for (const { marker, area, fn } of GENERATED) {
    const start = `// >>> GENERATED ${marker} — do not edit by hand; run npm run access:sync`
    const end = `// <<< GENERATED ${marker}`
    const re = new RegExp(
      `([ \\t]*)${escape(start)}[\\s\\S]*?[ \\t]*${escape(end)}`,
      'm',
    )
    const match = out.match(re)
    if (!match) {
      throw new Error(
        `Marker "${marker}" not found in firestore.rules. ` +
          `Every generated block must keep its >>> / <<< comments.`,
      )
    }
    const indent = match[1] ?? '    '
    out = out.replace(
      re,
      `${indent}${start}\n${block(fn, area, indent)}\n${indent}${end}`,
    )
  }
  return out
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const current = readFileSync(RULES_PATH, 'utf8')
const next = renderRules(current)
const checkOnly = process.argv.includes('--check')

if (current === next) {
  console.log('firestore.rules is in sync with people.ts')
  process.exit(0)
}

if (checkOnly) {
  console.error('firestore.rules is STALE — people.ts has changed.')
  console.error('Run:  npm run access:sync   then commit both files.')
  process.exit(1)
}

writeFileSync(RULES_PATH, next)
console.log('firestore.rules updated from people.ts')
console.log('Remember to deploy it — rules do NOT deploy automatically:')
console.log('  cd .. && firebase deploy --only firestore:rules --project oqupa-staging')
console.log('  cd .. && firebase deploy --only firestore:rules --project oqupa-production')
