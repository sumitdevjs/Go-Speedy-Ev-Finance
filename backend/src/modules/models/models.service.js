const supabase = require('../../config/db');
const crypto = require('crypto');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { applyScope, resolveCreateScope } = require('../../middleware/scope');

class ModelsService {
  async getAllModels(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('ev_models')
      .select('*, branch:branch_id (id, name, code, ward_no)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

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

  // Lightweight list for dropdowns — returns all models with branch scoping
  async getAllModelsForDropdown(req = null) {
    let queryBuilder = supabase
      .from('ev_models')
      .select('id, name, company, total_price, stock_count, is_active, branch_id')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  }

  async createModel(modelData, createdBy, req = null) {
    const { initial_stock_date, ward = 'Delhi Central', branch_id, head_office_id, ...restData } = modelData;

    let assignedBranchId = branch_id || null;
    let assignedHoId = head_office_id || null;

    if (req) {
      const scope = resolveCreateScope(req, { branch_id, head_office_id });
      assignedBranchId = scope.branch_id;
      assignedHoId = scope.head_office_id;
    }
    
    let initialLogs = [];
    if (restData.stock_count > 0 && initial_stock_date) {
      initialLogs = [{
        id: crypto.randomUUID(),
        date: initial_stock_date,
        stock_added: restData.stock_count,
        ward_area: ward,
      }];
    }

    const { data, error } = await supabase
      .from('ev_models')
      .insert([{
        ...restData,
        ward,
        branch_id: assignedBranchId,
        head_office_id: assignedHoId,
        stock_logs: initialLogs,
        created_by: createdBy
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateModel(id, updates) {

    const { data, error } = await supabase
      .from('ev_models')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async getModelById(id) {
    const { data, error } = await supabase
      .from('ev_models')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Model not found');
    return data;
  }

  async addStock(id, payload) {
    const { date, stock_added, ward_area } = payload;
    
    const { data: model, error: fetchError } = await supabase
      .from('ev_models')
      .select('stock_count, stock_logs')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!model) throw new Error('Model not found');

    const newLog = {
      id: crypto.randomUUID(),
      date,
      stock_added,
      ward_area,
    };
    
    const updatedLogs = [...(model.stock_logs || []), newLog];
    const newCount = (model.stock_count || 0) + stock_added;

    const { data, error } = await supabase
      .from('ev_models')
      .update({ 
        stock_count: newCount,
        stock_logs: updatedLogs
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new ModelsService();
