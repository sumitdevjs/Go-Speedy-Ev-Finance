const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');

class AuditService {
  async getLogs(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);
    
    let queryBuilder = supabase
      .from('audit_logs')
      .select('*, users(name, email, ward_area)', { count: 'exact' });

    if (query.user_id) queryBuilder = queryBuilder.eq('user_id', query.user_id);
    if (query.action) queryBuilder = queryBuilder.eq('action', query.action);
    if (query.entity_type) queryBuilder = queryBuilder.eq('entity_type', query.entity_type);
    
    if (query.from) queryBuilder = queryBuilder.gte('created_at', query.from);
    if (query.to) queryBuilder = queryBuilder.lte('created_at', query.to);

    const { data, count, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // entity_id is polymorphic, so PostgREST can't embed it like `users`
    // above — batch-resolve the target user's name separately.
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

    // Resolve target tenant names (from entity_id and changes)
    const allTenantIds = new Set();
    data.forEach(row => {
      if (row.entity_type === 'tenants' && row.entity_id) {
        allTenantIds.add(row.entity_id);
      }
      if (row.changes?.tenant_id && typeof row.changes.tenant_id === 'string') {
        allTenantIds.add(row.changes.tenant_id);
      }
      if (row.changes?.tenant_id?.to) {
        allTenantIds.add(row.changes.tenant_id.to);
      }
      if (row.changes?.tenant_id?.from) {
        allTenantIds.add(row.changes.tenant_id.from);
      }
    });

    const targetTenantIds = [...allTenantIds];

    if (targetTenantIds.length > 0) {
      const { data: targets, error: targetsError } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', targetTenantIds);

      if (targetsError) console.error('[Audit] Failed to resolve target tenant names:', targetsError);

      const nameById = new Map((targets || []).map(t => [t.id, t.name]));
      data.forEach(row => {
        if (row.entity_type === 'tenants' && row.entity_id) {
          row.entity_name = nameById.get(row.entity_id) || null;
        }

        // Replace UUIDs inside changes with actual names
        if (row.changes?.tenant_id && typeof row.changes.tenant_id === 'string') {
          const tName = nameById.get(row.changes.tenant_id);
          if (tName) row.changes.tenant_id = tName;
        } else if (row.changes?.tenant_id?.to) {
          const toName = nameById.get(row.changes.tenant_id.to);
          const fromName = row.changes.tenant_id.from ? nameById.get(row.changes.tenant_id.from) : null;
          if (toName) row.changes.tenant_id.to = toName;
          if (fromName) row.changes.tenant_id.from = fromName;
        }
      });
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }
}

module.exports = new AuditService();
