const supabase = require('../../config/db');
const crypto = require('crypto');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { resolveCreateScope } = require('../../middleware/scope');
const { ALL_WARDS } = require('../branches/delhiWardsData');

let dbBranchesCache = [];
let lastCacheRefresh = 0;

async function getLiveBranches() {
  const now = Date.now();
  if (dbBranchesCache.length > 0 && now - lastCacheRefresh < 60000) {
    return dbBranchesCache;
  }
  try {
    const { data } = await supabase.from('branches').select('*');
    if (data && data.length > 0) {
      dbBranchesCache = data;
      lastCacheRefresh = now;
    }
  } catch (e) {}
  return dbBranchesCache;
}

// Initial fetch
getLiveBranches();

function findWard(targetIdOrName, branchesList = null) {
  if (!targetIdOrName || targetIdOrName === 'all' || targetIdOrName === 'global') return null;
  const s = String(targetIdOrName).trim().toLowerCase();
  const sNorm = s.replace(/[^a-z0-9]/g, '');

  const list = (branchesList && branchesList.length > 0) ? branchesList : dbBranchesCache;

  // 1. Check live DB branches cache first
  const fromDb = list.find(w => 
    (w.id && String(w.id).toLowerCase() === s) ||
    (w.code && String(w.code).toLowerCase() === s) ||
    (w.ward_no && (String(w.ward_no) === s || String(w.ward_no).padStart(2, '0') === s)) ||
    (w.name && (w.name.toLowerCase() === s || w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm)) ||
    (w.ward_area && (w.ward_area.toLowerCase() === s || w.ward_area.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm))
  );
  if (fromDb) return fromDb;

  // 2. Fallback to ALL_WARDS
  return ALL_WARDS.find(w => 
    (w.id && w.id.toLowerCase() === s) ||
    (w.code && w.code.toLowerCase() === s) ||
    (w.ward_no && (String(w.ward_no) === s || String(w.ward_no).padStart(2, '0') === s)) ||
    (w.name && (w.name.toLowerCase() === s || w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm)) ||
    (w.ward_area && (w.ward_area.toLowerCase() === s || w.ward_area.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm))
  ) || null;
}

function isLogForWard(log, targetWard) {
  if (!log || !targetWard) return false;
  if (log.branch_id) {
    const bId = String(log.branch_id).trim().toLowerCase();
    if (targetWard.id && bId === String(targetWard.id).toLowerCase()) return true;
    if (targetWard.code && bId === String(targetWard.code).toLowerCase()) return true;
    if (targetWard.name && bId.replace(/[^a-z0-9]/g, '') === String(targetWard.name).toLowerCase().replace(/[^a-z0-9]/g, '')) return true;
    if (targetWard.ward_no && (bId === `ward-del-${String(targetWard.ward_no).padStart(2, '0')}` || bId === `ward-del-${targetWard.ward_no}`)) return true;
  }
  if (log.ward_no && targetWard.ward_no && Number(log.ward_no) === Number(targetWard.ward_no)) return true;
  if (log.ward_area && targetWard.name) {
    const lArea = String(log.ward_area).toLowerCase().replace(/[^a-z0-9]/g, '');
    const wName = String(targetWard.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lArea === wName || lArea.includes(wName) || wName.includes(lArea)) return true;
  }
  return false;
}

class ModelsService {
  async getAllModels(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);
    const branches = await getLiveBranches();

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

    // Determine if a specific branch/ward is currently scoped
    const branchHeader = req?.headers?.['x-branch-id'];
    const branchQuery = req?.query?.branch_id;
    const userBranch = req?.user?.role === 'branch_admin' ? req?.user?.branch_id : null;
    const userWardArea = req?.user?.role === 'branch_admin' ? req?.user?.ward_area : null;

    const targetBranchIdentifier = branchHeader || branchQuery || userBranch || userWardArea;
    const scopedWard = findWard(targetBranchIdentifier, branches);

    if (data && Array.isArray(data)) {
      data.forEach(m => {
        const modelLogs = Array.isArray(m.stock_logs) ? m.stock_logs : [];
        m.total_global_stock = m.stock_count;

        if (scopedWard) {
          // Calculate stock strictly for this scoped ward
          const wardLogs = modelLogs.filter(log => isLogForWard(log, scopedWard));
          const wardStockCount = wardLogs.reduce((acc, l) => acc + (Number(l.stock_added) || 0), 0);
          m.stock_count = Math.max(0, wardStockCount);
          m.scoped_ward = { id: scopedWard.id, name: scopedWard.name, ward_no: scopedWard.ward_no };
        } else {
          // Super admin global view: calculate breakdown across all wards
          const wardSummaryMap = {};
          modelLogs.forEach(log => {
            let label = log.ward_area || 'General';
            const matched = findWard(log.branch_id || log.ward_no || log.ward_area, branches);
            if (matched) {
              label = `Ward ${matched.ward_no}: ${matched.name}`;
            }
            wardSummaryMap[label] = (wardSummaryMap[label] || 0) + (Number(log.stock_added) || 0);
          });
          m.ward_stock_summary = Object.entries(wardSummaryMap).map(([ward_label, stock]) => ({ ward_label, stock }));
          m.scoped_ward = null;
        }
      });
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  // Lightweight list for dropdowns — returns all models with branch scoping
  async getAllModelsForDropdown(req = null) {
    const branches = await getLiveBranches();
    let queryBuilder = supabase
      .from('ev_models')
      .select('id, name, company, total_price, stock_count, stock_logs, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (req?.user?.role === 'ho_admin' && req.user.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', req.user.head_office_id);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;

    const branchHeader = req?.headers?.['x-branch-id'];
    const branchQuery = req?.query?.branch_id;
    const userBranch = req?.user?.role === 'branch_admin' ? req?.user?.branch_id : null;
    const userWardArea = req?.user?.role === 'branch_admin' ? req?.user?.ward_area : null;

    const targetBranchIdentifier = branchHeader || branchQuery || userBranch || userWardArea;
    const scopedWard = findWard(targetBranchIdentifier, branches);

    if (data && scopedWard) {
      data.forEach(m => {
        const modelLogs = Array.isArray(m.stock_logs) ? m.stock_logs : [];
        const wardLogs = modelLogs.filter(log => isLogForWard(log, scopedWard));
        const wardStockCount = wardLogs.reduce((acc, l) => acc + (Number(l.stock_added) || 0), 0);
        m.stock_count = Math.max(0, wardStockCount);
      });
    }

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
    if (restData.stock_count && Number(restData.stock_count) > 0) {
      initialLogs.push({
        id: crypto.randomUUID(),
        date: initial_stock_date || new Date().toISOString().split('T')[0],
        stock_added: Number(restData.stock_count),
        ward_area: ward || 'Delhi Central',
        branch_id: assignedBranchId,
        ward_no: null,
      });
    }

    const { data, error } = await supabase
      .from('ev_models')
      .insert([{
        ...restData,
        stock_count: Number(restData.stock_count) || 0,
        ward,
        branch_id: assignedBranchId,
        head_office_id: assignedHoId,
        created_by: createdBy,
        stock_logs: initialLogs
      }])
      .select('*')
      .single();

    if (error) throw error;
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

    const branchHeader = req?.headers?.['x-branch-id'];
    const branchQuery = req?.query?.branch_id;
    const userBranch = req?.user?.role === 'branch_admin' ? req?.user?.branch_id : null;
    const userWardArea = req?.user?.role === 'branch_admin' ? req?.user?.ward_area : null;

    const targetBranchIdentifier = branchHeader || branchQuery || userBranch || userWardArea;
    const scopedWard = findWard(targetBranchIdentifier, branches);

    const modelLogs = Array.isArray(data.stock_logs) ? data.stock_logs : [];
    data.total_global_stock = data.stock_count;

    if (scopedWard) {
      const wardLogs = modelLogs.filter(log => isLogForWard(log, scopedWard));
      const wardStockCount = wardLogs.reduce((acc, l) => acc + (Number(l.stock_added) || 0), 0);
      data.stock_count = Math.max(0, wardStockCount);
      data.scoped_ward = { id: scopedWard.id, name: scopedWard.name, ward_no: scopedWard.ward_no };
    } else {
      const wardSummaryMap = {};
      modelLogs.forEach(log => {
        let label = log.ward_area || 'General';
        const matched = findWard(log.branch_id || log.ward_no || log.ward_area, branches);
        if (matched) {
          label = `Ward ${matched.ward_no}: ${matched.name}`;
        }
        wardSummaryMap[label] = (wardSummaryMap[label] || 0) + (Number(log.stock_added) || 0);
      });
      data.ward_stock_summary = Object.entries(wardSummaryMap).map(([ward_label, stock]) => ({ ward_label, stock }));
      data.scoped_ward = null;
    }

    return data;
  }

  async addStock(id, payload, req = null) {
    const branches = await getLiveBranches();
    const { date, stock_added, ward_area, branch_id, ward_no } = payload;
    
    // Resolve target ward:
    // If caller is a branch_admin / ward_admin, strictly lock to their own ward!
    let targetWard = null;
    if (req?.user && (req.user.role === 'branch_admin' || req.user.role === 'staff')) {
      const userWardIdentifier = req.user.branch_id || req.user.ward_area;
      targetWard = findWard(userWardIdentifier, branches);
    } else {
      targetWard = findWard(branch_id || ward_no || ward_area, branches) || findWard(branch_id, branches) || findWard(ward_no, branches) || findWard(ward_area, branches);
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
      ward_area: targetWard ? (targetWard.ward_no ? `Ward ${targetWard.ward_no}: ${targetWard.name}` : targetWard.name) : (ward_area || 'General'),
      branch_id: targetWard?.id || branch_id || null,
      ward_no: targetWard?.ward_no || (ward_no ? Number(ward_no) : null),
    };
    
    const existingLogs = Array.isArray(model.stock_logs) ? model.stock_logs : [];
    const updatedLogs = [...existingLogs, newLog];
    const newCount = (model.stock_count || 0) + Number(stock_added);

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

  async updateModel(id, updateData) {
    const { data, error } = await supabase
      .from('ev_models')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Ward-wise Stock Breakdown across all Delhi Wards.
   * Returns each ward with its total stock, rented count, available stock, and model breakdown.
   */
  async getWardStockBreakdown(query = {}, user = null) {
    const branches = await getLiveBranches();
    const { data: allModels, error: mError } = await supabase
      .from('ev_models')
      .select('id, name, company, total_price, stock_count, stock_logs, is_active')
      .eq('is_active', true);

    if (mError) throw mError;

    // Fetch active rentals count grouped by branch
    const { data: activeRentals } = await supabase
      .from('tenants')
      .select('id, branch_id, ev_model_id')
      .eq('status', 'rented');

    const rentalsByBranch = {};
    (activeRentals || []).forEach(r => {
      if (r.branch_id) {
        rentalsByBranch[r.branch_id] = (rentalsByBranch[r.branch_id] || 0) + 1;
      }
    });

    // If caller is branch_admin, filter to their branch only
    let targetBranches = branches;
    if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
      targetBranches = branches.filter(b => b.id === user.branch_id || b.ward_area === user.ward_area);
    }

    const breakdown = targetBranches.map(b => {
      const modelsBreakdown = (allModels || []).map(m => {
        const logs = Array.isArray(m.stock_logs) ? m.stock_logs : [];
        const wardLogs = logs.filter(l => isLogForWard(l, b));
        const stock = wardLogs.reduce((acc, l) => acc + (Number(l.stock_added) || 0), 0);
        return {
          id: m.id,
          name: m.name,
          company: m.company,
          stock: Math.max(0, stock),
        };
      });

      const totalStock = modelsBreakdown.reduce((sum, mb) => sum + mb.stock, 0);
      const activeRentalCount = rentalsByBranch[b.id] || 0;
      const availableStock = Math.max(0, totalStock - activeRentalCount);

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
