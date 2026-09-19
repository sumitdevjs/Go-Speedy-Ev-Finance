const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');

class BranchesService {
  async getAllBranches(query = {}, user = {}) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('branches')
      .select('*, head_office:head_office_id (id, name, code, city)', { count: 'exact' })
      .order('ward_no', { ascending: true, nullsFirst: false });

    // Filter by Head Office
    if (query.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', query.head_office_id);
    } else if (user.role === 'ho_admin' && user.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', user.head_office_id);
    }

    // Filter by Search
    if (query.search) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,code.ilike.%${query.search}%,ward_area.ilike.%${query.search}%`);
    }

    // Filter by Active
    if (query.is_active !== undefined && query.is_active !== '') {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    const { data, count, error } = await queryBuilder.range(offset, offset + limit - 1);
    if (error) throw error;

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  async getDropdown(query = {}, user = {}) {
    let queryBuilder = supabase
      .from('branches')
      .select('id, name, code, ward_no, ward_area, head_office_id, head_offices:head_office_id (name, code)')
      .eq('is_active', true)
      .order('ward_no', { ascending: true, nullsFirst: false });

    if (query.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', query.head_office_id);
    } else if (user.role === 'ho_admin' && user.head_office_id) {
      queryBuilder = queryBuilder.eq('head_office_id', user.head_office_id);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  }

  async getById(id) {
    const { data, error } = await supabase
      .from('branches')
      .select('*, head_office:head_office_id (id, name, code, city, state)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create({ head_office_id, ward_no, name, code, ward_area, address, phone }) {
    const { data, error } = await supabase
      .from('branches')
      .insert([{
        head_office_id,
        ward_no: ward_no ? parseInt(ward_no) : null,
        name,
        code: code.toUpperCase().trim(),
        ward_area: ward_area || null,
        address: address || null,
        phone: phone || null,
        is_active: true,
      }])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Branch with this code already exists');
      throw error;
    }
    return data;
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from('branches')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async getBranchOverview(branchId) {
    // 1. Fetch branch info
    const branch = await this.getById(branchId);

    // 2. Fetch stats concurrently
    const [staffRes, modelsRes, rentalsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', true),
      supabase.from('ev_models').select('stock_count').eq('branch_id', branchId),
      supabase.from('tenants').select('id, status', { count: 'exact' }).eq('branch_id', branchId).eq('status', 'rented'),
    ]);

    const totalStock = (modelsRes.data || []).reduce((acc, m) => acc + (m.stock_count || 0), 0);
    const activeRentals = rentalsRes.count || 0;
    const staffCount = staffRes.count || 0;

    return {
      branch,
      stats: {
        totalStock,
        activeRentals,
        staffCount,
      },
    };
  }
}

module.exports = new BranchesService();
