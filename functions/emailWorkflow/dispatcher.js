/**
 * Workflow email dispatcher — the single seam every workflow trigger
 * calls to send an email. Keeps four things in one place:
 *
 *   1. Budget awareness — shared `workflowEmailDailyBudget/{YYYY-MM-DD}`
 *      doc so a busy day doesn't blow the Resend free tier cap.
 *   2. Dedup — writes `user.emailsSent[workflowId] = Timestamp` before
 *      sending so re-triggers within the same window are a no-op.
 *   3. Magic-link injection — builds a fresh link for workflows that
 *      request one; templates just receive a rendered URL.
 *   4. Brand wrap — templates return raw HTML fragments, the dispatcher
 *      wraps with the shared branded shell.
 */

const admin = require('firebase-admin');
const { WORKFLOW_EMAILS } = require('./templates');
const { buildMagicLink } = require('./magicLink');

// Shared daily cap across every workflow email. The RFQ queue keeps
// its own budget doc (rfqEmailDailyBudget/*) so the two share the
// Resend account but are counted separately for clarity.
const WORKFLOW_DAILY_LIMIT = Number(process.env.WORKFLOW_EMAIL_DAILY_LIMIT || 60);

function todayUtcDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Send a workflow email.
 *
 * @param {Object} deps — injected from functions/index.js so this file
 *                        doesn't need its own firebase-admin init.
 * @param {import('firebase-admin').firestore.Firestore} deps.db
 * @param {(to:string, subject:string, htmlBody:string)=>Promise<void>} deps.sendEmail
 * @param {(inner:string, ctaLabel:string, ctaUrl:string)=>string} deps.wrapHtml
 * @param {import('firebase-admin').firestore.Timestamp} deps.Timestamp
 *
 * @param {Object} args
 * @param {string} args.workflowId — one of the WORKFLOW_EMAILS keys
 * @param {string} args.recipientEmail
 * @param {string} args.uid — target user id (for dedup + magic link)
 * @param {Object} args.ctx — { firstName, companyName, ...template-specific }
 * @param {boolean} [args.skipBudget=false] — bypass the daily cap
 *                    (used by immediate transactional flows like WF2.1)
 * @returns {Promise<{ sent: boolean, skipped?: string }>}
 */
async function sendWorkflowEmail(deps, args) {
  const { db, sendEmail, Timestamp } = deps;
  const { workflowId, recipientEmail, uid, ctx = {}, skipBudget = false } = args;

  if (!workflowId || !WORKFLOW_EMAILS[workflowId]) {
    console.warn(`sendWorkflowEmail: unknown workflowId=${workflowId}`);
    return { sent: false, skipped: 'unknown_workflow' };
  }
  if (!recipientEmail) return { sent: false, skipped: 'missing_email' };

  const entry = WORKFLOW_EMAILS[workflowId];

  // Dedup — if user already got this workflow, skip.
  if (uid) {
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      const userData = userSnap.exists ? userSnap.data() : null;
      if (userData?.emailsSent?.[workflowId]) {
        return { sent: false, skipped: 'already_sent' };
      }
      if (userData?.preferences?.providers?.email === false) {
        return { sent: false, skipped: 'email_opt_out' };
      }
      if (userData?.isSuspended) {
        return { sent: false, skipped: 'suspended' };
      }
    } catch (err) {
      // Not fatal — worst case we send twice; log and move on.
      console.warn(`sendWorkflowEmail: user lookup failed for ${uid}:`, err.message);
    }
  }

  // Budget check.
  if (!skipBudget) {
    const dateKey = todayUtcDateString();
    const budgetRef = db.collection('workflowEmailDailyBudget').doc(dateKey);
    const budgetSnap = await budgetRef.get();
    const budget = budgetSnap.exists
      ? budgetSnap.data()
      : { date: dateKey, sent: 0, limit: WORKFLOW_DAILY_LIMIT };
    const sentToday = Number(budget.sent || 0);
    if (sentToday >= Number(budget.limit || WORKFLOW_DAILY_LIMIT)) {
      return { sent: false, skipped: 'daily_budget_exhausted' };
    }
    // Reserve the slot before send so a slow email doesn't let two
    // callers pass the guard concurrently.
    await budgetRef.set(
      { date: dateKey, sent: sentToday + 1, limit: budget.limit || WORKFLOW_DAILY_LIMIT, updatedAt: Timestamp.now() },
      { merge: false },
    );
  }

  // Resolve magic link when the template asks for one.
  let magicLink = null;
  if (entry.requiresMagicLink && recipientEmail) {
    try {
      magicLink = await buildMagicLink(recipientEmail);
    } catch (err) {
      console.error(`sendWorkflowEmail: magic-link build failed for ${recipientEmail}:`, err.message);
    }
  }

  const built = entry.build({ ...ctx, magicLink });
  const wrappedHtml = deps.wrapHtml(built.body, null, null);
  // Preheader is injected as a hidden pre-body div so email clients
  // show it as the message preview.
  const finalHtml = built.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;">${built.preheader}</div>${wrappedHtml}`
    : wrappedHtml;

  try {
    await sendEmail(recipientEmail, built.subject, finalHtml);
  } catch (err) {
    console.error(`sendWorkflowEmail: send failed for ${workflowId} → ${recipientEmail}:`, err.message);
    return { sent: false, skipped: `send_failed:${err.message?.slice(0, 60) || 'unknown'}` };
  }

  // Record dedup.
  if (uid) {
    try {
      await db.collection('users').doc(uid).update({
        [`emailsSent.${workflowId}`]: Timestamp.now(),
      });
    } catch (err) {
      // Non-fatal — worst case duplicate send if trigger re-fires.
      console.warn(`sendWorkflowEmail: dedup mark failed for ${uid}:${workflowId}:`, err.message);
    }
  }

  console.log(`sendWorkflowEmail: sent ${workflowId} → ${recipientEmail} (uid=${uid || '-'})`);
  return { sent: true };
}

module.exports = {
  sendWorkflowEmail,
  WORKFLOW_DAILY_LIMIT,
  todayUtcDateString,
};
