#!/usr/bin/env node
/**
 * Send the May 4, 2026 launch campaign.
 *
 * Reads waitlist + users from `oqupa-production` Firestore, dedupes by email,
 * personalizes the HTML template, and queues one doc per recipient into the
 * `mail` collection (handled by the firebase/firestore-send-email extension,
 * SMTP via admin@oqupa.com Gmail App Password).
 *
 * Idempotency: writes a `campaigns/may4_launch` doc with `sentAt`. Re-runs
 * abort unless --force is passed.
 *
 * Run from a machine with gcloud ADC for oqupa-production:
 *
 *   # Dry run — print summary, write nothing
 *   NODE_PATH=/Users/jerson/developer/Oqupa-Platform/oqupa/functions/node_modules \
 *     node Oqupa-website/email/launch-2026-05-04/send.js
 *
 *   # Test send to a single address (does not mark campaign as sent)
 *   NODE_PATH=... node send.js --test=jerson.7@icloud.com
 *
 *   # Real campaign send
 *   NODE_PATH=... node send.js --send
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = path.join(__dirname, 'index.html');

const VIEW_IN_BROWSER_URL = 'https://oqupa.com/email/launch.html';
const UNSUBSCRIBE_URL = (email) =>
  `mailto:equipo@oqupa.com?subject=${encodeURIComponent(`Unsubscribe (${email})`)}`;

const FROM_HEADER = 'Oqupa <equipo@oqupa.com>';
const REPLY_TO = 'equipo@oqupa.com';
const SUBJECT = (firstName) =>
  firstName && firstName !== 'amigo'
    ? `Oqupa ya está aquí, ${firstName}`
    : 'Oqupa ya está aquí';

const CAMPAIGN_ID = 'may4_launch';
const ASSET_FROM = '../../public/email/';
const ASSET_TO = 'https://oqupa.com/email/';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const SEND = args.includes('--send');
const FORCE = args.includes('--force');
const TEST_ARG = args.find((a) => a.startsWith('--test='));
const TEST_EMAIL = TEST_ARG ? TEST_ARG.split('=')[1] : null;

if (TEST_EMAIL && SEND) {
  console.error('Use either --test=<email> or --send, not both.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const firstName = (full) => {
  if (!full) return 'amigo';
  const first = String(full).trim().split(/\s+/)[0];
  if (!first) return 'amigo';
  // Title-case so "JONATHAN" → "Jonathan", "abel" → "Abel".
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};
const isEmail = (e) =>
  typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

function rewriteAssets(html) {
  return html.split(ASSET_FROM).join(ASSET_TO);
}

function personalize(html, ctx) {
  return html
    .split('{{firstName}}').join(ctx.firstName)
    .split('{{viewInBrowserUrl}}').join(ctx.viewInBrowserUrl)
    .split('{{unsubscribeUrl}}').join(ctx.unsubscribeUrl);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

admin.initializeApp({
  projectId: 'oqupa-production',
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

(async () => {
  // 1. Load + prep template
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  }
  const rawTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const template = rewriteAssets(rawTemplate);
  console.log(`Template: ${TEMPLATE_PATH} (${rawTemplate.length} chars)`);

  // 2. Idempotency check (skipped for test sends)
  if (SEND && !FORCE) {
    const camp = await db.collection('campaigns').doc(CAMPAIGN_ID).get();
    if (camp.exists && camp.data().sentAt) {
      console.error(
        `Campaign ${CAMPAIGN_ID} already sent at ${camp
          .data()
          .sentAt.toDate()
          .toISOString()}.\nPass --force to override.`
      );
      process.exit(1);
    }
  }

  // 3. Build recipient list
  let recipients;
  if (TEST_EMAIL) {
    if (!isEmail(TEST_EMAIL)) {
      throw new Error(`Invalid --test email: ${TEST_EMAIL}`);
    }
    recipients = [{ email: TEST_EMAIL.toLowerCase(), firstName: 'Jerson', source: 'test' }];
  } else {
    const [waitlistSnap, usersSnap] = await Promise.all([
      db.collection('waitlist').get(),
      db.collection('users').get(),
    ]);

    const users = [];
    usersSnap.forEach((doc) => {
      const d = doc.data() || {};
      if (!isEmail(d.email)) return;
      users.push({
        email: d.email.trim().toLowerCase(),
        firstName: firstName(d.name),
        source: 'user',
      });
    });
    const userEmails = new Set(users.map((u) => u.email));

    const waitlistOnly = [];
    waitlistSnap.forEach((doc) => {
      const d = doc.data() || {};
      if (!isEmail(d.email)) return;
      const email = d.email.trim().toLowerCase();
      if (userEmails.has(email)) return;
      waitlistOnly.push({
        email,
        firstName: firstName(d.name),
        source: 'waitlist',
      });
    });

    recipients = [...users, ...waitlistOnly];
  }

  console.log(
    `Recipients: ${recipients.length}${TEST_EMAIL ? ` (test mode → ${TEST_EMAIL})` : ''}`
  );

  // 4. Dry-run: just print
  if (!SEND && !TEST_EMAIL) {
    console.log('\nDRY RUN. Pass --send to queue mail docs.\n');
    recipients.slice(0, 8).forEach((r) =>
      console.log(`  ${r.source.padEnd(8)} ${r.email.padEnd(40)} firstName=${r.firstName}`)
    );
    if (recipients.length > 8) console.log(`  ... and ${recipients.length - 8} more`);
    return;
  }

  // 5. Queue (atomically) into the mail collection
  console.log('\nQueueing mail docs...');
  const batch = db.batch();
  const queued = [];
  for (const r of recipients) {
    const html = personalize(template, {
      firstName: r.firstName,
      viewInBrowserUrl: VIEW_IN_BROWSER_URL,
      unsubscribeUrl: UNSUBSCRIBE_URL(r.email),
    });
    const docRef = db.collection('mail').doc();
    batch.set(docRef, {
      to: r.email,
      from: FROM_HEADER,
      replyTo: REPLY_TO,
      message: { subject: SUBJECT(r.firstName), html },
      campaign: CAMPAIGN_ID,
      source: r.source,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    queued.push({ docId: docRef.id, email: r.email, source: r.source });
  }
  await batch.commit();

  // 6. Mark campaign as sent (only on real run, not test)
  if (SEND && !TEST_EMAIL) {
    await db.collection('campaigns').doc(CAMPAIGN_ID).set({
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      count: queued.length,
      template: 'launch-2026-05-04/index.html',
    });
  }

  // 7. Audit log to /tmp (gitignored location, not in repo)
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = '/tmp/oqupa_launch';
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `sent_${ts}.json`);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      { campaign: CAMPAIGN_ID, mode: TEST_EMAIL ? 'test' : 'send', queuedAt: ts, count: queued.length, recipients: queued },
      null,
      2
    )
  );

  console.log(`\nQueued ${queued.length} mail doc${queued.length === 1 ? '' : 's'}.`);
  console.log(`Audit log: ${logPath}`);
  console.log('Trigger Email extension will dispatch shortly.');
})().catch((err) => {
  console.error('FAILED:', err.stack || err);
  process.exit(1);
});
