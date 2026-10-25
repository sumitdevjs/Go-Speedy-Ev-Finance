const supabase = require('../../config/db');
const crypto = require('crypto');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { resolveCreateScope } = require('../../middleware/scope');
const { fetchAll } = require('../../utils/fetchAll');
const { loadModelStock, presentModelStock } = require('../../utils/modelStock');

let dbBranchesCache = [];
let lastCacheRefresh = 0;

async function getLiveBranches(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && dbBranchesCache.length > 0 && now - lastCacheRefresh < 5000) {
    return dbBranchesCache;
  }
  try {
    const { data } = await supabase.from('branches').select('*').order('ward_no', { ascending: true, nullsFirst: false });
    if (data) {
      dbBranchesCache = data;
      lastCacheRefresh = now;
    }
  } catch (e) {}
  return dbBranchesCache;
}

getLiveBranches();

function findWard(targetIdOrName, branchesList = null) {
  if (!targetIdOrName || targetIdOrName === 'all' || targetIdOrName === 'global') return null;
  const s = String(targetIdOrName).trim().toLowerCase();
  const sNorm = s.replace(/[^a-z0-9]/g, '');

  const list = (branchesList && branchesList.length > 0) ? branchesList : dbBranchesCache;

  return list.find(w => 
    (w.id && String(w.id).toLowerCase() === s) ||
    (w.code && String(w.code).toLowerCase() === s) ||
    (w.ward_no && (String(w.ward_no) === s || String(w.ward_no).padStart(2, '0') === s)) ||
    (w.name && (w.name.toLowerCase() === s || w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm)) ||
    (w.ward_area && (w.ward_area.toLowerCase() === s || w.ward_area.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm))
  ) || null;
}

function resolveWard(req, branches) {
  const user = req?.user;
  const restricted = ['branch_admin', 'staff'].includes(user?.role);
  if (restricted && !user.branch_id) throw new Error('Access denied: No assigned branch');
  if (user?.role === 'ho_admin' && !user.head_office_id) throw new Error('Access denied: No assigned Head Office');
  const selected = restricted ? user.branch_id : req?.query?.branch_id || req?.headers?.['x-branch-id'];
  const branch = findWard(selected, branches);
  if (selected && !['all', 'global'].includes(selected) && !branch) throw new Error('Invalid branch selection');
  if (user?.role === 'ho_admin' && branch && branch.head_office_id !== user.head_office_id) throw new Error('Access denied: Branch belongs to another Head Office');
  return branch;
}

class ModelsService {
  async getAllModels(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);
    const branches = await getLiveBranches();

    // Determine if a specific branch/ward is currently scoped
    const scopedWard = resolveWard(req, branches);

    let queryBuilder = supabase
      .from('ev_models')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // EV models are company-wide global models available across all wards.
    // Scoping to head office applies if user is an HO admin:
    if (req?.user?.role === 'ho_admin' && req.user.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', req.user.head_office_id);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'company', 'ward'], query.search));
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    // When viewing globally (no scoped ward), SQL filter on stock_count is valid:
    if (!scopedWard) {
      if (query.stockStatus === 'in_stock') {
        queryBuilder = queryBuilder.gt('stock_count', 0);
      } else if (query.stockStatus === 'out_of_stock') {
        queryBuilder = queryBuilder.eq('stock_count', 0);
      }
    }

    let data = await fetchAll(() => queryBuilder);

    if (data && Array.isArray(data)) {
      const balances = await loadModelStock(data);
      data.forEach(m => presentModelStock(m, scopedWard, branches, balances));

      // When a ward is scoped, filter stockStatus on the ward-calculated stock count:
      if (scopedWard && query.stockStatus) {
        if (query.stockStatus === 'in_stock') {
          data = data.filter(m => (m.stock_count || 0) > 0);
        } else if (query.stockStatus === 'out_of_stock') {
          data = data.filter(m => (m.stock_count || 0) === 0);
        }
      }
    }

    const totalCount = data ? data.length : 0;
    const paginatedData = (data || []).slice(offset, offset + limit);
    const meta = getPaginationMeta(totalCount, page, limit);

    return { data: paginatedData, meta };
  }

  // Lightweight list for dropdowns — returns all models with branch scoping
  async getAllModelsForDropdown(req = null) {
    const branches = await getLiveBranches();
    let queryBuilder = supabase
      .from('ev_models')
      .select('id, name, company, total_price, stock_count, stock_logs, is_active, kilometres')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (req?.user?.role === 'ho_admin' && req.user.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', req.user.head_office_id);
    }

    const data = await fetchAll(() => queryBuilder);

    const scopedWard = resolveWard(req, branches);

    if (data) {
      const balances = await loadModelStock(data);
      data.forEach(m => presentModelStock(m, scopedWard, branches, balances));
    }

    return data;
  }

  async createModel(modelData, createdBy, req = null) {
    const { initial_stock_date, ward = 'Delhi Central', branch_id, head_office_id, kilometres, ...restData } = modelData;
    const kmValue = Number(kilometres) || 0;
    const trimmedName = String(modelData.name || '').trim().toLowerCase();

    // Check for unique (name + kilometres) combination among active models
    const { data: existing } = await supabase
      .from('ev_models')
      .select('id, name, kilometres')
      .ilike('name', trimmedName)
      .eq('kilometres', kmValue)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      throw new Error(`An active EV model with name "${modelData.name}" and ${kmValue} km already exists. Model + Kilometres combination must be unique.`);
    }

    let assignedBranchId = branch_id || null;
    let assignedHoId = head_office_id || null;

    if (req) {
      const scope = resolveCreateScope(req, { branch_id, head_office_id });
      assignedBranchId = scope.branch_id;
      assignedHoId = scope.head_office_id;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (initial_stock_date && String(initial_stock_date).split('T')[0] < todayStr) {
      throw new Error('Initial stock date cannot be in the past (back date not allowed).');
    }

    let initialLogs = [];
    if (restData.stock_count && Number(restData.stock_count) > 0) {
      const branches = await getLiveBranches();
      const matchedBranch = findWard(assignedBranchId || ward, branches);
      initialLogs.push({
        id: crypto.randomUUID(),
        date: initial_stock_date || todayStr,
        stock_added: Number(restData.stock_count),
        ward_area: matchedBranch ? (matchedBranch.ward_no ? `Ward ${matchedBranch.ward_no}: ${matchedBranch.name}` : matchedBranch.name) : (ward || 'General'),
        branch_id: matchedBranch?.id || assignedBranchId || null,
        ward_no: matchedBranch?.ward_no || null,
      });
    }

    const insertRow = {
      ...restData,
      stock_count: Number(restData.stock_count) || 0,
      kilometres: kmValue,
      ward,
      branch_id: assignedBranchId,
      head_office_id: assignedHoId,
      created_by: createdBy,
      stock_logs: initialLogs
    };

    let { data, error } = await supabase
      .from('ev_models')
      .insert([insertRow])
      .select('*')
      .single();

    // Fallback if kilometres column doesn't exist yet on live DB
    if (error && (error.code === '42703' || error.message?.includes('kilometres'))) {
      delete insertRow.kilometres;
      const retry = await supabase
        .from('ev_models')
        .insert([insertRow])
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') {
        throw new Error(`An EV model with name "${modelData.name}" and ${kmValue} km already exists. Model + Kilometres combination must be unique.`);
      }
      throw error;
    }
    return data;
  }

  async getModelById(id, req = null) {
    const branches = await getLiveBranches();
    const { data, error } = await supabase
      .from('ev_models')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Model not found');

    const scopedWard = resolveWard(req, branches);

    presentModelStock(data, scopedWard, branches, await loadModelStock([data]));

    return data;
  }

  async addStock(id, payload, req = null) {
    const branches = await getLiveBranches(true);
    const { date, stock_added, ward_area, branch_id, ward_no } = payload;
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (date && String(date).split('T')[0] < todayStr) {
      throw new Error('Stock received date cannot be in the past (back date not allowed).');
    }

    let targetWard = null;
    if (req?.user && (req.user.role === 'branch_admin' || req.user.role === 'staff')) {
      const userWardIdentifier = req.user.branch_id || req.user.ward_area;
      targetWard = findWard(userWardIdentifier, branches);
    } else {
      targetWard = findWard(branch_id, branches) || findWard(ward_no, branches) || findWard(ward_area, branches);
    }

    if (!targetWard) {
      throw new Error('Please select an active, registered Branch/Ward to receive stock.');
    }

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
      stock_added: Number(stock_added),
      ward_area: targetWard.ward_no ? `Ward ${targetWard.ward_no}: ${targetWard.name}` : targetWard.name,
      branch_id: targetWard.id,
      ward_no: targetWard.ward_no ? Number(targetWard.ward_no) : null,
    };
    
    if (req?.user?.role === 'ho_admin' && (!req.user.head_office_id || targetWard.head_office_id !== req.user.head_office_id)) {
      throw new Error('Access denied: Branch belongs to another Head Office');
    }
    const { data, error } = await supabase.rpc('edit_model_inventory', { p_model: id, p_patch: {}, p_append: newLog });

    if (error) throw error;
    return data;
  }

  async updateModel(id, updateData) {
    if (updateData.name || updateData.kilometres !== undefined) {
      const { data: current } = await supabase
        .from('ev_models')
        .select('name, kilometres')
        .eq('id', id)
        .single();

      const nameToCheck = String(updateData.name || current?.name || '').trim().toLowerCase();
      const kmToCheck = updateData.kilometres !== undefined ? Number(updateData.kilometres) : Number(current?.kilometres || 0);

      const { data: existing } = await supabase
        .from('ev_models')
        .select('id')
        .ilike('name', nameToCheck)
        .eq('kilometres', kmToCheck)
        .eq('is_active', true)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Another active EV model with name "${updateData.name || current?.name}" and ${kmToCheck} km already exists.`);
      }
    }

    if (updateData.stock_logs && Array.isArray(updateData.stock_logs)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: current } = await supabase.from('ev_models').select('stock_logs').eq('id', id).single();
      const currentLogs = Array.isArray(current?.stock_logs) ? current.stock_logs : [];
      const hasInvalidNewPastDate = updateData.stock_logs.some((l) => {
        if (!l.date) return false;
        const existingLog = l.id ? currentLogs.find(orig => orig.id === l.id) : null;
        if (existingLog && existingLog.date === l.date) return false;
        return String(l.date).split('T')[0] < todayStr;
      });
      if (hasInvalidNewPastDate) {
        throw new Error('Stock log date cannot be set to a past date (back date not allowed).');
      }

    }

    const payload = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.rpc('edit_model_inventory', { p_model: id, p_patch: payload });

    if (error) {
      if (error.code === '23505') {
        throw new Error(`An EV model with this name and kilometre reading already exists. Model + Kilometres combination must be unique.`);
      }
      throw error;
    }
    return data;
  }

  async deleteModel(id) {
    const { data: activeRentals, error: rError } = await supabase
      .from('tenants')
      .select('id')
      .eq('ev_model_id', id)
      .eq('status', 'rented')
      .limit(1);

    if (activeRentals && activeRentals.length > 0) {
      throw new Error('Cannot delete this EV model because it has active rented contracts.');
    }

    const { error } = await supabase
      .from('ev_models')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async resetModelStock(id) {
    const { data, error } = await supabase.rpc('edit_model_inventory', { p_model: id, p_patch: {}, p_reset: true });

    if (error) throw error;
    return data;
  }

  /**
   * Ward-wise Stock Breakdown across all Delhi Wards.
   * Returns each ward with its total stock, rented count, available stock, and model breakdown.
   */
  async getWardStockBreakdown(query = {}, user = null) {
    const branches = await getLiveBranches();
    const allModels = await fetchAll(() => supabase.from('ev_models').select('id, name, company, total_price, stock_count, stock_logs, is_active').eq('is_active', true));
    const activeRentals = await fetchAll(() => supabase.from('tenants').select('id, branch_id, ev_model_id').eq('status', 'rented'));

    const rentalsByBranch = {};
    (activeRentals || []).forEach(r => {
      if (r.branch_id) {
        rentalsByBranch[r.branch_id] = (rentalsByBranch[r.branch_id] || 0) + 1;
      }
    });

    // If caller is branch_admin, filter to their branch only; if ho_admin, filter to their HO branches
    let targetBranches = branches;
    if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
      targetBranches = branches.filter(b => user.branch_id && b.id === user.branch_id);
    } else if (user && user.role === 'ho_admin') {
      targetBranches = branches.filter(b => user.head_office_id && b.head_office_id === user.head_office_id);
    }

    const balances = await loadModelStock(allModels || []);
    const breakdown = targetBranches.map(b => {
      const modelsBreakdown = (allModels || []).map(m => {
        const stock = Number(balances.get(m.id)?.branches[b.id]) || 0;
        return {
          id: m.id,
          name: m.name,
          company: m.company,
          stock,
        };
      });

      const totalStock = modelsBreakdown.reduce((sum, mb) => sum + mb.stock, 0);
      const activeRentalCount = rentalsByBranch[b.id] || 0;
      const availableStock = totalStock;

      return {
        id: b.id,
        ward_no: b.ward_no,
        code: b.code,
        name: b.name,
        ward_area: b.ward_area,
        contact_person: b.contact_person,
        phone: b.phone,
        address: b.address,
        total_stock: totalStock,
        active_rentals: activeRentalCount,
        available_stock: availableStock,
        models: modelsBreakdown,
      };
    });

    // Sort by ward_no ascending
    breakdown.sort((a, b) => (a.ward_no || 999) - (b.ward_no || 999));

    return breakdown;
  }
}

module.exports = new ModelsService();
