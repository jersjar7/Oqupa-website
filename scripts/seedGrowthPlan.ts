/**
 * Seed the six-week growth plan into Firestore.
 *
 *   npm run plan:seed -- --project=oqupa-staging
 *   npm run plan:seed -- --project=oqupa-production
 *   npm run plan:seed -- --project=oqupa-staging --dry
 *
 * SAFETY: this is idempotent and never destroys progress. On a day that already
 * exists it writes ONLY the content fields (action, why, minutes...) and leaves
 * status, notes, completedAt and completedByEmail exactly as they are. So
 * re-running after editing the wording is safe at any point in the six weeks.
 *
 * Requires ADC (`gcloud auth application-default login` as admin@oqupa.com) and
 * firebase-admin, which lives in the Flutter repo's functions folder:
 *
 *   NODE_PATH=../oqupa/functions/node_modules npm run plan:seed -- --project=…
 */
import { PLAN_DAYS, PLAN_START, PLAN_END, PLAN_TOTAL_SPEND } from '../src/app/features/plan/planContent'

// firebase-admin is resolved via NODE_PATH — it is not a dependency of the
// site. The package is CommonJS and this file runs as ESM, so it is pulled in
// with createRequire rather than a bare `require`.
import { createRequire } from 'node:module'
const admin = createRequire(import.meta.url)('firebase-admin') as typeof import('firebase-admin')

const args = process.argv.slice(2)
const projectArg = args.find((a) => a.startsWith('--project='))
const dryRun = args.includes('--dry')
const project = projectArg?.split('=')[1]

const ALLOWED = ['oqupa-staging', 'oqupa-production']

if (!project || !ALLOWED.includes(project)) {
  console.error(
    `Pass --project=<${ALLOWED.join('|')}>. Refusing to guess which environment to write to.`,
  )
  process.exit(1)
}

/** The fields the seed owns. Anything not listed here belongs to the user. */
function contentOf(day: (typeof PLAN_DAYS)[number]) {
  return {
    day: day.day,
    date: day.date,
    week: day.week,
    phase: day.phase,
    theme: day.theme,
    category: day.category,
    action: day.action,
    why: day.why,
    minutes: day.minutes,
    doneWhen: day.doneWhen,
    spend: day.spend,
    owner: day.owner,
  }
}

async function main() {
  // Guard against a plan that silently lost or duplicated a day in editing.
  const dates = new Set(PLAN_DAYS.map((d) => d.date))
  if (dates.size !== PLAN_DAYS.length) {
    throw new Error('Duplicate dates in planContent.ts — refusing to seed.')
  }
  if (PLAN_DAYS.length !== 42) {
    throw new Error(`Expected 42 days, found ${PLAN_DAYS.length} — refusing to seed.`)
  }
  PLAN_DAYS.forEach((d, i) => {
    if (d.day !== i + 1) throw new Error(`Day numbering breaks at index ${i} (day ${d.day}).`)
  })

  console.log(`Plan: ${PLAN_DAYS.length} days, ${PLAN_START} → ${PLAN_END}, $${PLAN_TOTAL_SPEND} committed.`)
  console.log(`Target: ${project}${dryRun ? ' (DRY RUN — nothing will be written)' : ''}`)

  admin.initializeApp({ projectId: project })
  const db = admin.firestore()

  const existing = await db.collection('growthPlan').get()
  const known = new Set(existing.docs.map((d) => d.id))
  const withProgress = existing.docs.filter(
    (d) => d.data()['status'] !== 'pending' || (d.data()['notes'] ?? '') !== '',
  ).length

  console.log(
    `Found ${known.size} existing day(s), ${withProgress} with recorded progress (will be preserved).`,
  )

  if (dryRun) {
    const creating = PLAN_DAYS.filter((d) => !known.has(d.date)).length
    console.log(`Would create ${creating} and update ${PLAN_DAYS.length - creating}. No writes made.`)
    return
  }

  const batch = db.batch()
  let created = 0
  for (const day of PLAN_DAYS) {
    const ref = db.collection('growthPlan').doc(day.date)
    if (known.has(day.date)) {
      // Content only — progress fields are deliberately absent from this write.
      batch.set(ref, contentOf(day), { merge: true })
    } else {
      created++
      batch.set(ref, {
        ...contentOf(day),
        status: 'pending',
        notes: '',
        completedAt: null,
        completedByEmail: '',
      })
    }
  }
  await batch.commit()

  const after = await db.collection('growthPlan').count().get()
  console.log(
    `Done. Created ${created}, updated ${PLAN_DAYS.length - created}. Collection now holds ${after.data().count} days.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message)
    process.exit(1)
  })
