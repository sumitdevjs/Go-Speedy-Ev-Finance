const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');

class AuditService {
  async getLogs(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);
    
    let queryBuilder = supabase
      .from('audit_logs')
      .select('*, users(name, email)', { count: 'exact' });

    if (query.user_id) queryBuilder = queryBuilder.eq('user_id', query.user_id);
    if (query.action) queryBuilder = queryBuilder.eq('action', query.action);
    if (query.entity_type) queryBuilder = queryBuilder.eq('entity_type', query.entity_type);
    
    if (query.from) queryBuilder = queryBuilder.gte('created_at', query.from);
    if (query.to) queryBuilder = queryBuilder.lte('created_at', query.to);

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // entity_id is polymorphic (users/tenants/bookings/payments/...), so it has
    // no FK constraint and PostgREST can't embed it automatically like `users`
    // (the actor) above. For staff/user actions specifically, batch-resolve the
    // target user's name so the log can say *who* the change was made to.
    const targetUserIds = [...new Set(
      data
        .filter(row => row.entity_type === 'users' && row.entity_id)
        .map(row => row.entity_id)
    )];

    if (targetUserIds.length > 0) {
      const { data: targets, error: targetsError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', targetUserIds);

      if (targetsError) console.error('[Audit] Failed to resolve target user names:', targetsError);

      const nameById = new Map((targets || []).map(u => [u.id, u.name]));
      data.forEach(row => {
        if (row.entity_type === 'users' && row.entity_id) {
          row.entity_name = nameById.get(row.entity_id) || null;
        }
      });
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }
}

module.exports = new AuditService();
