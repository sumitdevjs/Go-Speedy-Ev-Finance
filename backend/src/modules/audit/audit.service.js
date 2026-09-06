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

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }
}

module.exports = new AuditService();
