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
      .select('id, name, phone, email, role, ward_area, is_active, head_office_id, branch_id, branches:branch_id (id, name, code, ward_no), head_offices:head_office_id (id, name, code), created_at, updated_at', { count: 'exact' })
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
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        phone,
        email: email || null,
        password_hash,
        role: role || 'staff',
        ward_area,
        branch_id: assignedBranchId,
        head_office_id: assignedHoId,
        is_active: true,
        created_by: createdBy
      }])
      .select('id, name, phone, email, role, ward_area, branch_id, head_office_id, is_active, created_at')
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
