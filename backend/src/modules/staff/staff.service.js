const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const { buildDiff } = require('../../utils/auditLog');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { applyScope, resolveCreateScope } = require('../../middleware/scope');

class StaffService {
  async getAllStaff(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone', 'email'], query.search));
    }

    // Filter by active status: 'true' or 'false'
    if (query.is_active !== undefined && query.is_active !== '') {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    const { data, count, error } = await queryBuilder
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Safely batch-resolve branch & head office info if present
    if (data && data.length > 0) {
      try {
        const branchIds = [...new Set(data.map(u => u.branch_id).filter(Boolean))];
        if (branchIds.length > 0) {
          const { data: bList } = await supabase.from('branches').select('id, name, code, ward_no').in('id', branchIds);
          const bMap = new Map((bList || []).map(b => [b.id, b]));
          data.forEach(u => { if (u.branch_id) u.branches = bMap.get(u.branch_id) || null; });
        }
        const hoIds = [...new Set(data.map(u => u.head_office_id).filter(Boolean))];
        if (hoIds.length > 0) {
          const { data: hoList } = await supabase.from('head_offices').select('id, name, code').in('id', hoIds);
          const hoMap = new Map((hoList || []).map(h => [h.id, h]));
          data.forEach(u => { if (u.head_office_id) u.head_offices = hoMap.get(u.head_office_id) || null; });
        }
      } catch (e) {}
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  async createStaff({ name, phone, email, password, role, ward_area, branch_id, head_office_id }, createdBy, req = null) {
    const password_hash = await bcrypt.hash(password, 10);

    let assignedBranchId = branch_id || null;
    let assignedHoId = head_office_id || null;

    if (req) {
      const scope = resolveCreateScope(req, { branch_id, head_office_id });
      assignedBranchId = scope.branch_id;
      assignedHoId = scope.head_office_id;
    }
    
    const insertPayload = {
      name,
      phone,
      email: email || null,
      password_hash,
      role: role || 'staff',
      ward_area,
      is_active: true,
      created_by: createdBy
    };
    if (assignedBranchId) insertPayload.branch_id = assignedBranchId;
    if (assignedHoId) insertPayload.head_office_id = assignedHoId;

    const { data, error } = await supabase
      .from('users')
      .insert([insertPayload])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Phone or email already exists');
      throw error;
    }
    
    return data;
  }

  async updateStaff(id, updates, requestingUserId) {
    // Mirrors the self-deactivate guard below: an admin can still edit their own
    // name/phone/email, just not their own role — otherwise a solo admin could
    // accidentally demote themselves out of the admin console.
    if (requestingUserId && id === requestingUserId && 'role' in updates) {
      throw new Error('Cannot change your own role');
    }

    // Fetch the pre-update row so the audit log can show a real before → after
    // diff instead of just dumping the new request body.
    const { data: before, error: fetchError } = await supabase
      .from('users')
      .select('name, phone, email, role, ward_area, branch_id, head_office_id, is_active')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, phone, email, role, ward_area, branch_id, head_office_id, is_active')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Phone or email already exists');
      throw error;
    }

    const diff = buildDiff(before, updates);
    return { data, diff };
  }

  async changePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash, refresh_token_hash: null }) // force logout on pwd change
      .eq('id', id);

    if (error) throw error;
  }

  async toggleActive(id, is_active, requestingUserId) {
    if (id === requestingUserId) {
      throw new Error('Cannot deactivate yourself');
    }

    const { data: before, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, is_active')
      .single();

    if (error) throw error;

    const diff = buildDiff(before, { is_active });
    return { data, diff };
  }
}

module.exports = new StaffService();
