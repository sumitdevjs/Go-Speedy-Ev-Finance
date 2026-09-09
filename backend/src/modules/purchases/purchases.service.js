const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');

class PurchasesService {
  async getPurchases(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);
    
    let queryBuilder = supabase
      .from('tenants')
      .select('*, ev_models(name, company)', { count: 'exact' })
      .in('status', ['completed', 'direct_purchase']);
    
    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone'], query.search));
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
