const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');

class ModelsService {
  async getAllModels(query = {}) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('ev_models')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'company', 'ward'], query.search));
    }

    if (query.stockStatus === 'in_stock') {
      queryBuilder = queryBuilder.gt('stock_count', 0);
    } else if (query.stockStatus === 'out_of_stock') {
      queryBuilder = queryBuilder.eq('stock_count', 0);
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    const { data, count, error } = await queryBuilder
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  // Lightweight list for dropdowns — returns all models without pagination
  async getAllModelsForDropdown() {
    const { data, error } = await supabase
      .from('ev_models')
      .select('id, name, company, total_price, stock_count, is_active')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createModel(modelData, createdBy) {
    const { data, error } = await supabase
      .from('ev_models')
      .insert([{
        ...modelData,
        created_by: createdBy
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateModel(id, updates) {
    // If trying to change price or deactivate, check for active rentals
    if (updates.total_price !== undefined || updates.is_active === false) {
      const { count, error: countError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('ev_model_id', id)
        .eq('status', 'rented');

      if (countError) throw countError;

      if (count > 0) {
        if (updates.total_price !== undefined) {
          throw new Error(`Cannot change price: there are ${count} active rentals using this model`);
        }
        if (updates.is_active === false) {
          throw new Error(`Cannot deactivate: there are ${count} active rentals using this model`);
        }
      }
    }

    const { data, error } = await supabase
      .from('ev_models')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new ModelsService();
