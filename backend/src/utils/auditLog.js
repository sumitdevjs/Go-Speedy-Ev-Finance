const supabase = require('../config/db');

/**
 * Write one row to audit_logs. Never throws — a logging failure must never
 * break the actual mutation that already succeeded.
 */
async function logAudit({ userId, userRole, action, entityType, entityId, changes, ip }) {
  try {
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      changes: changes && Object.keys(changes).length > 0 ? changes : null,
      ip_address: ip || null,
    }]);
  } catch (error) {
    console.error('[Audit Log Error]', error);
  }
}

/**
 * Build a { field: { from, to } } diff for the Audit page's before/after view.
 * Only includes keys that were actually part of `updates` AND whose value
 * genuinely changed — untouched fields don't show up as noise. Secret fields
 * (password / password_hash / any *_hash) are always skipped, even if passed
 * in by mistake, so a raw or hashed password can never end up in the log.
 */
function buildDiff(before = {}, updates = {}) {
  const diff = {};
  for (const key of Object.keys(updates)) {
    if (/password|_hash$/i.test(key)) continue;
    const oldVal = before ? before[key] ?? null : null;
    const newVal = updates[key] ?? null;
    if (oldVal !== newVal) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }
  return diff;
}

module.exports = { logAudit, buildDiff };
