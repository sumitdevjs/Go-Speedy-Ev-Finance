const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const { buildDiff } = require('../../utils/auditLog');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { applyScope, resolveCreateScope } = require('../../middleware/scope');

const { ALL_WARDS } = require('../branches/delhiWardsData');

class StaffService {
  async getAllStaff(query = {}, req = null) {
    const { page, limit, offset } = getPaginationOptions(query);

    let queryBuilder = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
      // If caller is branch_admin or staff, isolate to their own ward!
      if (req.user?.role === 'branch_admin' || req.user?.role === 'staff') {
        const userWard = req.user.ward_area || req.user.branch_id;
        if (userWard) {
          queryBuilder = queryBuilder.ilike('ward_area', `%${userWard}%`);
        }
      }
      // If caller is ho_admin, strictly scope to their own HO's staff only
      if (req.user?.role === 'ho_admin') {
        queryBuilder = queryBuilder
          .in('role', ['branch_admin', 'staff', 'admin'])
          .eq('head_office_id', req.user.head_office_id);
      }
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone', 'email'], query.search));
    }

    // Filter by active status: 'true' or 'false'
    if (query.is_active !== undefined && query.is_active !== '') {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    // Filter by role if specified
    if (query.role && query.role !== 'all') {
      queryBuilder = queryBuilder.eq('role', query.role);
    }

    const { data, count, error } = await queryBuilder
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Safely batch-resolve branch & head office info if present
    if (data && data.length > 0) {
      const branchIds = [...new Set(data.map(u => u.branch_id).filter(Boolean))];
      const hoIds = [...new Set(data.map(u => u.head_office_id).filter(Boolean))];

      const [branchesRes, hoRes] = await Promise.all([
        branchIds.length > 0
          ? supabase.from('branches').select('id, name, code, ward_no, ward_area, head_office_id').in('id', branchIds)
          : { data: [] },
        hoIds.length > 0
          ? supabase.from('head_offices').select('id, name, code, city, state').in('id', hoIds)
          : { data: [] },
      ]);

      const branchMap = new Map((branchesRes.data || []).map(b => [b.id, b]));
      const hoMap = new Map((hoRes.data || []).map(h => [h.id, h]));

      data.forEach(u => {
        const isMaster = u.role === 'super_admin' || (u.role === 'admin' && !u.ward_area);
        if (isMaster) {
          u.display_role = 'Super Admin';
          u.role = 'super_admin';
        } else if (u.role === 'ho_admin') {
          u.display_role = 'Head Office Admin';
          u.role = 'ho_admin';
        } else if (u.role === 'branch_admin' || (u.role === 'admin' && u.ward_area)) {
          u.display_role = 'Branch Admin';
          u.role = 'branch_admin';
        } else if (u.role === 'staff') {
          u.display_role = 'Staff';
        } else {
          u.display_role = 'Branch Admin';
          u.role = 'branch_admin';
        }

        // Attach resolved branch
        if (u.branch_id && branchMap.has(u.branch_id)) {
          u.branches = branchMap.get(u.branch_id);
        } else if (u.ward_area) {
          const s = String(u.ward_area).trim().toLowerCase();
          const sNorm = s.replace(/[^a-z0-9]/g, '');
          const matched = ALL_WARDS.find(w =>
            w.name.toLowerCase() === s ||
            w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm ||
            (w.ward_area && w.ward_area.toLowerCase().includes(s))
          );
          if (matched) {
            u.branches = {
              id: matched.id,
              name: matched.name,
              code: matched.code,
              ward_no: matched.ward_no,
              ward_area: matched.ward_area,
            };
          }
        }

        // Attach resolved head office
        if (u.head_office_id && hoMap.has(u.head_office_id)) {
          u.head_offices = hoMap.get(u.head_office_id);
        } else if (u.branches?.head_office_id && hoMap.has(u.branches.head_office_id)) {
          u.head_offices = hoMap.get(u.branches.head_office_id);
        }
      });
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  async createStaff({ name, phone, email, password, role, ward_area, branch_id, head_office_id, verification_doc }, createdBy, req = null) {
    if (req?.user?.role === 'ho_admin') {
      if (role === 'super_admin' || role === 'ho_admin') {
        throw new Error('Access denied: Head Office Admins can only create Branch Admins and Staff');
      }
      head_office_id = req.user.head_office_id;
    }

    const password_hash = await bcrypt.hash(password, 10);

    let assignedBranchId = branch_id || null;
    let assignedHoId = head_office_id || null;

    if (req) {
      const scope = resolveCreateScope(req, { branch_id, head_office_id });
      assignedBranchId = scope.branch_id;
      assignedHoId = scope.head_office_id;
      if (req.user?.role === 'ho_admin') {
        assignedHoId = req.user.head_office_id;
      }
    }
    
    const insertPayload = {
      name,
      phone,
      email: email || null,
      password_hash,
      role: role || 'staff',
      ward_area: ward_area || assignedBranchId || null,
      verification_doc: verification_doc || null,
      is_active: true,
      created_by: createdBy
    };
    if (assignedBranchId) insertPayload.branch_id = assignedBranchId;
    if (assignedHoId) insertPayload.head_office_id = assignedHoId;

    let { data, error } = await supabase
      .from('users')
      .insert([insertPayload])
      .select('*')
      .single();

    // Fallback if branch_id / head_office_id / verification_doc columns do not exist yet in DB schema
    if (error && (error.code === '42703' || error.message?.includes('branch_id') || error.message?.includes('verification_doc'))) {
      delete insertPayload.branch_id;
      delete insertPayload.head_office_id;
      delete insertPayload.verification_doc;
      insertPayload.ward_area = ward_area || assignedBranchId || null;
      const retry = await supabase
        .from('users')
        .insert([insertPayload])
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') throw new Error('Phone or email already exists');
      throw error;
    }
    
    return data;
  }

  async updateStaff(id, updates, requestingUserId, req = null) {
    if (requestingUserId && id === requestingUserId && 'role' in updates) {
      throw new Error('Cannot change your own role');
    }

    if (req?.user?.role === 'ho_admin') {
      if (updates.role === 'super_admin' || updates.role === 'ho_admin') {
        throw new Error('Access denied: Head Office Admins can only assign Branch Admin or Staff roles');
      }
      updates.head_office_id = req.user.head_office_id;
    }

    const { data: before } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (req?.user?.role === 'ho_admin' && before && before.head_office_id !== req.user.head_office_id) {
      throw new Error('Access denied: Cannot edit users belonging to another Head Office');
    }

    let cleanUpdates = { ...updates };
    let { data, error } = await supabase
      .from('users')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single();

    // Fallback if branch_id/head_office_id/verification_doc column doesn't exist
    if (error && (error.code === '42703' || error.message?.includes('branch_id') || error.message?.includes('verification_doc'))) {
      if (cleanUpdates.branch_id) {
        cleanUpdates.ward_area = cleanUpdates.branch_id;
      }
      delete cleanUpdates.branch_id;
      delete cleanUpdates.head_office_id;
      delete cleanUpdates.verification_doc;
      const retry = await supabase
        .from('users')
        .update(cleanUpdates)
        .eq('id', id)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') throw new Error('Phone or email already exists');
      throw error;
    }

    const diff = buildDiff(before || {}, updates);
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
