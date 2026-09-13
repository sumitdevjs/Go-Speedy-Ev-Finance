const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');

class PurchasesService {
  async getPurchases(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);
    
    let queryBuilder = supabase
      .from('tenants')
      .select('*, ev_models(name, company)', { count: 'exact' });
      
    if (query.status) {
      // When showing cancelled, we only want cancelled direct purchases
      queryBuilder = queryBuilder.eq('status', query.status).eq('installment_daily_rate', 0);
    } else {
      queryBuilder = queryBuilder.in('status', ['completed', 'direct_purchase']);
    }
    
    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone'], query.search));
    }

    if (query.has_pending_docs !== undefined && query.has_pending_docs !== '') {
      queryBuilder = queryBuilder.eq('has_pending_docs', query.has_pending_docs === 'true');
    }

    // Insurance status filter
    if (query.insurance_status) {
      const today = new Date().toISOString().split('T')[0];
      if (query.insurance_status === 'scooty_expired') {
        queryBuilder = queryBuilder.lt('scooty_policy_expiry', today);
      } else if (query.insurance_status === 'scooty_not_expired') {
        queryBuilder = queryBuilder.gte('scooty_policy_expiry', today);
      } else if (query.insurance_status === 'rider_expired') {
        queryBuilder = queryBuilder.lt('rider_policy_expiry', today);
      } else if (query.insurance_status === 'rider_not_expired') {
        queryBuilder = queryBuilder.gte('rider_policy_expiry', today);
      }
    }

    const { data, count, error } = await queryBuilder
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }
}

module.exports = new PurchasesService();
