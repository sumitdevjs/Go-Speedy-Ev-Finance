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
      if (req.user?.role === 'branch_admin' || req.user?.role === 'staff') {
        const userWard = req.user.ward_area || req.user.branch_id;
        if (userWard) {
          queryBuilder = queryBuilder.ilike('ward_area', `%${userWard}%`);
        }
      }
      if (req.user?.role === 'ho_admin') {
        queryBuilder = queryBuilder
          .in('role', ['branch_admin', 'staff', 'admin'])
          .eq('head_office_id', req.user.head_office_id);
      }
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'phone', 'email'], query.search));
    }

    if (query.is_active !== undefined && query.is_active !== '') {
      queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
    }

    if (query.role && query.role !== 'all') {
      queryBuilder = queryBuilder.eq('role', query.role);
    }

    const { data, count, error } = await queryBuilder
      .range(offset, offset + limit - 1);

    if (error) throw error;

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

        if (u.branch_id && branchMap.has(u.branch_id)) {
          u.branches = branchMap.get(u.branch_id);
        }

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
    const requesterRole = req?.user?.role;
    if (requesterRole === 'branch_admin') {
      if (role && role !== 'staff') {
        throw new Error('Access denied: Branch Admins can only create Staff members');
      }
      role = 'staff';
    } else if (requesterRole === 'ho_admin') {
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
    const requesterRole = req?.user?.role;
    const isSelf = requestingUserId && id === requestingUserId;

    if (isSelf && 'role' in updates) {
      throw new Error('Cannot change your own role');
    }

    const { data: before, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !before) {
      throw new Error('User not found');
    }

    if (isSelf) {
      if (requesterRole === 'super_admin' || requesterRole === 'admin') {
      } else if (requesterRole === 'branch_admin') {
        const allowedKeys = ['verification_doc'];
        const disallowed = Object.keys(updates).filter(
          k => !allowedKeys.includes(k) && updates[k] !== undefined && updates[k] !== null && updates[k] !== before[k]
        );
        if (disallowed.length > 0) {
          throw new Error('Access denied: Ward Admin can only upload verification documents for their own profile. Other details can only be changed by Head Office or Super Admin.');
        }
        updates = { verification_doc: updates.verification_doc };
      } else {
        throw new Error('Access denied: You cannot edit your own profile details. Contact Super Admin.');
      }
    } else {
      if (requesterRole === 'super_admin' || requesterRole === 'admin') {
      } else if (requesterRole === 'ho_admin') {
        if (before.role !== 'branch_admin' && before.role !== 'staff') {
          throw new Error('Access denied: Head Office Admins can only edit Branch/Ward Admins and Staff.');
        }
        if (before.head_office_id && before.head_office_id !== req?.user?.head_office_id) {
          throw new Error('Access denied: Cannot edit users belonging to another Head Office');
        }
        if (updates.role && updates.role !== 'branch_admin' && updates.role !== 'staff') {
          throw new Error('Access denied: Head Office Admins can only assign Branch Admin or Staff roles');
        }
        updates.head_office_id = req.user.head_office_id;
      } else if (requesterRole === 'branch_admin') {
        if (before.role !== 'staff') {
          throw new Error('Access denied: Ward Admins can only edit Staff members.');
        }
        if (before.branch_id && before.branch_id !== req?.user?.branch_id) {
          throw new Error('Access denied: Cannot edit staff belonging to another Branch');
        }
        if (updates.role && updates.role !== 'staff') {
          throw new Error('Access denied: Branch Admins cannot alter user roles');
        }
      } else {
        throw new Error('Access denied: Unauthorized to edit users');
      }
    }

    let cleanUpdates = { ...updates };
    let { data, error } = await supabase
      .from('users')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single();

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

  async changePassword(id, newPassword, requestingUser = null) {
    if (requestingUser) {
      const requesterRole = requestingUser.role;
      const isSelf = id === requestingUser.id;

      if (requesterRole !== 'super_admin' && requesterRole !== 'admin') {
        const { data: targetUser, error: fetchErr } = await supabase
          .from('users')
          .select('id, role, branch_id, head_office_id')
          .eq('id', id)
          .single();

        if (fetchErr || !targetUser) {
          throw new Error('User not found');
        }

        if (isSelf) {
          throw new Error('Access denied: You cannot change your own password. Only Super Admin can change your password.');
        }

        if (requesterRole === 'ho_admin') {
          if (targetUser.role !== 'branch_admin' && targetUser.role !== 'staff') {
            throw new Error('Access denied: Head Office Admin can only change passwords for Branch/Ward Admins and Staff.');
          }
          if (targetUser.head_office_id && targetUser.head_office_id !== requestingUser.head_office_id) {
            throw new Error('Access denied: User does not belong to your Head Office.');
          }
        }

        else if (requesterRole === 'branch_admin') {
          if (targetUser.role !== 'staff') {
            throw new Error('Access denied: Ward Admin can only change passwords for Ward Staff.');
          }
          if (targetUser.branch_id && targetUser.branch_id !== requestingUser.branch_id) {
            throw new Error('Access denied: Staff does not belong to your Ward/Branch.');
          }
        } else {
          throw new Error('Access denied: Unauthorized to change passwords.');
        }
      }
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash, refresh_token_hash: null })
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
