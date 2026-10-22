const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
const { buildSearchFilter } = require('../../utils/searchFilter');
const { ALL_WARDS, ALL_HEAD_OFFICES, DELHI_HEAD_OFFICE } = require('./delhiWardsData');

// In-memory wards state initialized with all 46 Delhi Wards (plus regional hubs)
let inMemoryWards = ALL_WARDS.map(w => ({ ...w }));

class BranchesService {
  async getAllBranches(query = {}, user = {}) {
    const { page, limit, offset } = getPaginationOptions(query);

    let useFallback = false;
    let data = [];
    let count = 0;

    try {
      let queryBuilder = supabase
        .from('branches')
        .select('*, head_office:head_office_id (id, name, code, city)', { count: 'exact' })
        .order('ward_no', { ascending: true, nullsFirst: false });

      // Filter by Branch Admin Isolation
      if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
        if (user.branch_id) {
          queryBuilder = queryBuilder.eq('id', user.branch_id);
        } else if (user.ward_area) {
          queryBuilder = queryBuilder.ilike('name', `%${user.ward_area}%`);
        }
      } else if (user && user.role === 'ho_admin' && user.head_office_id) {
        // HO Admin is strictly isolated to their assigned Head Office
        queryBuilder = queryBuilder.eq('head_office_id', user.head_office_id);
      } else if (query.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', query.head_office_id);
      }

      // Filter by Search
      if (query.search) {
        queryBuilder = queryBuilder.or(buildSearchFilter(['name', 'code', 'ward_area', 'contact_person', 'address'], query.search));
      }

      // Filter by Active
      if (query.is_active !== undefined && query.is_active !== '') {
        queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
      }

      const res = await queryBuilder.range(offset, offset + limit - 1);
      if (res.error) {
        useFallback = true;
      } else {
        data = res.data || [];
        count = res.count || 0;
      }
    } catch (e) {
      useFallback = true;
    }

    if (useFallback) {
      let filtered = [...inMemoryWards];

      // If branch_admin / staff, strictly isolate in fallback too
      if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
        const userWardIdentifier = user.branch_id || user.ward_area;
        const s = String(userWardIdentifier || '').trim().toLowerCase();
        const sNorm = s.replace(/[^a-z0-9]/g, '');
        const myWard = inMemoryWards.find(w => 
          w.id.toLowerCase() === s ||
          w.code.toLowerCase() === s ||
          String(w.ward_no) === s ||
          String(w.ward_no).padStart(2, '0') === s ||
          w.name.toLowerCase() === s ||
          w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm ||
          (w.ward_area && (w.ward_area.toLowerCase() === s || w.ward_area.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm))
        );
        if (myWard) {
          filtered = [myWard];
        }
      } else if (user && user.role === 'ho_admin' && user.head_office_id) {
        filtered = filtered.filter(w => w.head_office_id === user.head_office_id);
      } else if (query.head_office_id) {
        filtered = filtered.filter(w => w.head_office_id === query.head_office_id);
      }

      // Filter by Search (Name, Code, Area, Candidate Name, Phone, Address, Ward No)
      if (query.search) {
        const q = query.search.toLowerCase().trim();
        filtered = filtered.filter(w =>
          (w.name && w.name.toLowerCase().includes(q)) ||
          (w.code && w.code.toLowerCase().includes(q)) ||
          (w.ward_area && w.ward_area.toLowerCase().includes(q)) ||
          (w.contact_person && w.contact_person.toLowerCase().includes(q)) ||
          (w.phone && w.phone.toLowerCase().includes(q)) ||
          (w.address && w.address.toLowerCase().includes(q)) ||
          (w.ward_no && String(w.ward_no).includes(q))
        );
      }

      // Filter by Active
      if (query.is_active !== undefined && query.is_active !== '') {
        const activeBool = query.is_active === 'true';
        filtered = filtered.filter(w => w.is_active === activeBool);
      }

      count = filtered.length;
      data = filtered.slice(offset, offset + limit);
    }

    // Safely batch-enrich branches with their governing Head Office & HO Admin
    if (data && data.length > 0) {
      try {
        const missingHoIds = [...new Set(data.filter(b => !b.head_office && b.head_office_id).map(b => b.head_office_id))];
        if (missingHoIds.length > 0) {
          const { data: hoList } = await supabase
            .from('head_offices')
            .select('id, name, code, city, state')
            .in('id', missingHoIds);
          if (hoList && hoList.length > 0) {
            const hoMap = new Map(hoList.map(h => [h.id, h]));
            data.forEach(branch => {
              if (!branch.head_office && branch.head_office_id) {
                branch.head_office = hoMap.get(branch.head_office_id) || null;
              }
            });
          }
        }

        const { data: hoAdmins } = await supabase
          .from('users')
          .select('id, name, phone, email, head_office_id, branch_id, ward_area, role')
          .eq('role', 'ho_admin')
          .eq('is_active', true);

        if (hoAdmins && hoAdmins.length > 0) {
          data.forEach(branch => {
            let matched = hoAdmins.find(u => 
              (u.branch_id && String(u.branch_id).toLowerCase() === String(branch.id).toLowerCase()) ||
              (u.ward_area && branch.name && u.ward_area.toLowerCase().includes(branch.name.toLowerCase()))
            );
            if (!matched && branch.head_office_id) {
              matched = hoAdmins.find(u => u.head_office_id === branch.head_office_id);
            }
            branch.ho_admin = matched ? {
              id: matched.id,
              name: matched.name,
              phone: matched.phone,
              email: matched.email,
            } : null;
          });
        }

        // Calculate live stock stats & active rentals for branches
        const [allModelsRes, activeRentalsRes] = await Promise.all([
          supabase.from('ev_models').select('stock_logs').eq('is_active', true),
          supabase.from('tenants').select('branch_id').eq('status', 'rented')
        ]);

        const rentalsByBranch = {};
        (activeRentalsRes.data || []).forEach(r => {
          if (r.branch_id) {
            rentalsByBranch[r.branch_id] = (rentalsByBranch[r.branch_id] || 0) + 1;
          }
        });

        const allModels = allModelsRes.data || [];

        data.forEach(branch => {
          let totalStock = 0;
          allModels.forEach(m => {
            const logs = Array.isArray(m.stock_logs) ? m.stock_logs : [];
            logs.forEach(l => {
              let matches = false;
              if (l.branch_id) {
                matches = String(l.branch_id).toLowerCase() === String(branch.id).toLowerCase();
              } else if (l.ward_no && branch.ward_no) {
                matches = Number(l.ward_no) === Number(branch.ward_no);
              }
              if (matches) {
                totalStock += (Number(l.stock_added) || 0);
              }
            });
          });
          const activeCount = rentalsByBranch[branch.id] || 0;
          branch.total_stock = totalStock;
          branch.active_rentals_count = activeCount;
          branch.available_stock = Math.max(0, totalStock - activeCount);
        });

        // Enrich with assigned Branch Admin
        const branchIds = data.map(b => b.id);
        const { data: branchAdmins } = await supabase
          .from('users')
          .select('id, name, email, phone, branch_id, role')
          .in('branch_id', branchIds)
          .eq('role', 'branch_admin')
          .eq('is_active', true);

        const adminByBranch = {};
        (branchAdmins || []).forEach(u => {
          if (u.branch_id) adminByBranch[u.branch_id] = u;
        });

        data.forEach(branch => {
          branch.admin = adminByBranch[branch.id] || null;
        });
      } catch (err) {
        console.error('[getAllBranches] Enrichment error:', err);
      }
    }

    const meta = getPaginationMeta(count, page, limit);
    return { data, meta };
  }

  async getDropdown(query = {}, user = {}) {
    try {
      let queryBuilder = supabase
        .from('branches')
        .select('id, name, code, ward_no, ward_area, contact_person, phone, address, status_label, head_office_id, head_offices:head_office_id (name, code)')
        .eq('is_active', true)
        .order('ward_no', { ascending: true, nullsFirst: false });

      // Direct DB isolation for Ward Admin and HO Admin
      if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
        if (user.branch_id) {
          queryBuilder = queryBuilder.eq('id', user.branch_id);
        } else if (user.ward_area) {
          queryBuilder = queryBuilder.ilike('name', `%${user.ward_area}%`);
        }
      } else if (user && user.role === 'ho_admin' && user.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', user.head_office_id);
      } else if (query.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', query.head_office_id);
      }

      const { data, error } = await queryBuilder;
      if (!error && data) {
        return data;
      }
    } catch (e) {
      // fallback
    }

    // In-memory fallback
    let filtered = inMemoryWards.filter(w => w.is_active);

    // If the authenticated user is a branch_admin / ward_admin, isolate strictly to their own ward!
    if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
      const userWardIdentifier = user.branch_id || user.ward_area;
      const s = String(userWardIdentifier || '').trim().toLowerCase();
      const sNorm = s.replace(/[^a-z0-9]/g, '');
      const myWard = inMemoryWards.find(w => 
        w.id.toLowerCase() === s ||
        w.code.toLowerCase() === s ||
        String(w.ward_no) === s ||
        String(w.ward_no).padStart(2, '0') === s ||
        w.name.toLowerCase() === s ||
        w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm ||
        (w.ward_area && (w.ward_area.toLowerCase() === s || w.ward_area.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm))
      );
      if (myWard) {
        filtered = [myWard];
      }
    } else {
      if (query.head_office_id) {
        filtered = filtered.filter(w => w.head_office_id === query.head_office_id);
      }
    }

    return filtered.map(w => ({
      id: w.id,
      name: w.name,
      code: w.code,
      ward_no: w.ward_no,
      ward_area: w.ward_area,
      contact_person: w.contact_person,
      phone: w.phone,
      address: w.address,
      status_label: w.status_label,
      head_office_id: w.head_office_id,
      head_offices: {
        name: w.head_office?.name || 'Head Office',
        code: w.head_office?.code || 'HO',
      },
      head_office: w.head_office,
    }));
  }

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*, head_office:head_office_id (id, name, code, city, state)')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // fallback
    }

    const s = String(id || '').trim().toLowerCase();
    const sNorm = s.replace(/[^a-z0-9]/g, '');
    const found = inMemoryWards.find(w => 
      w.id.toLowerCase() === s ||
      w.code.toLowerCase() === s ||
      String(w.ward_no) === s ||
      String(w.ward_no).padStart(2, '0') === s ||
      w.name.toLowerCase() === s ||
      w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm ||
      (w.ward_area && (w.ward_area.toLowerCase() === s || w.ward_area.toLowerCase().replace(/[^a-z0-9]/g, '') === sNorm))
    );
    if (found) return found;
    throw new Error('Branch not found');
  }

  async create({ head_office_id, ward_no, name, code, ward_area, address, phone, contact_person, status_label, admin_email, admin_password }, user = {}) {
    let finalHoId = (user && user.role === 'ho_admin' && user.head_office_id)
      ? user.head_office_id
      : head_office_id;

    if (!finalHoId) {
      try {
        const { data: firstHo } = await supabase.from('head_offices').select('id').eq('is_active', true).limit(1);
        finalHoId = firstHo?.[0]?.id || null;
      } catch (e) {}
    }

    let ho = null;
    if (finalHoId) {
      try {
        const { data: hoData } = await supabase
          .from('head_offices')
          .select('id, name, code, city, state')
          .eq('id', finalHoId)
          .single();
        ho = hoData || null;
      } catch (e) {}
    }

    const newBranch = {
      head_office_id: finalHoId,
      ward_no: ward_no ? parseInt(ward_no) : null,
      name,
      code: code.toUpperCase().trim(),
      ward_area: ward_area || null,
      address: address || null,
      phone: phone || null,
      contact_person: contact_person || null,
      status_label: status_label || 'Active',
      is_active: true,
      head_office: ho,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([{
          head_office_id: newBranch.head_office_id,
          ward_no: newBranch.ward_no,
          name: newBranch.name,
          code: newBranch.code,
          ward_area: newBranch.ward_area,
          address: newBranch.address,
          phone: newBranch.phone,
          contact_person: newBranch.contact_person,
          status_label: newBranch.status_label,
          is_active: true,
        }])
        .select('*')
        .single();

      if (error) {
        console.error('[Create Branch DB Error]:', error);
        throw new Error(error.message || 'Database error creating branch');
      }

      if (data) {
        let createdAdmin = null;
        if (admin_email && admin_password) {
          try {
            const password_hash = await bcrypt.hash(admin_password, 10);
            const { data: userData, error: uErr } = await supabase
              .from('users')
              .insert([{
                name: contact_person || name,
                phone: phone || null,
                email: String(admin_email).trim().toLowerCase(),
                password_hash,
                role: 'branch_admin',
                head_office_id: finalHoId,
                branch_id: data.id,
                ward_area: ward_area || name,
                is_active: true,
                created_by: user?.id || null,
              }])
              .select('id, name, email, role, phone')
              .single();

            if (!uErr && userData) {
              createdAdmin = userData;
            } else if (uErr) {
              console.error('[Create Branch Admin Error]:', uErr);
            }
          } catch (adminErr) {
            console.error('[Create Branch Admin Exception]:', adminErr);
          }
        }

        const createdBranch = { ...data, head_office: ho, admin: createdAdmin };
        inMemoryWards.unshift(createdBranch);
        return createdBranch;
      }
    } catch (e) {
      if (e.message && e.message.includes('duplicate key') && e.message.includes('code')) {
        throw new Error(`Branch with code "${newBranch.code}" already exists`);
      }
      if (e.message && !e.message.includes('Database error')) {
        throw e;
      }
      // fallback for offline/in-memory mode if DB is unreachable
    }

    const fallbackBranch = {
      id: `ward-custom-${Date.now()}`,
      ...newBranch,
    };
    inMemoryWards.unshift(fallbackBranch);
    return fallbackBranch;
  }

  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('branches')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        const idx = inMemoryWards.findIndex(w => w.id === id);
        if (idx >= 0) inMemoryWards[idx] = { ...inMemoryWards[idx], ...data };
        return data;
      }
    } catch (e) {
      // fallback
    }

    const idx = inMemoryWards.findIndex(
      w => w.id === id || w.code === id || String(w.ward_no) === String(id)
    );
    if (idx >= 0) {
      inMemoryWards[idx] = { ...inMemoryWards[idx], ...updates };
      return inMemoryWards[idx];
    }
    throw new Error('Branch not found');
  }

  async delete(id) {
    const { data: activeRentals } = await supabase
      .from('tenants')
      .select('id')
      .eq('branch_id', id)
      .eq('status', 'rented')
      .limit(1);

    if (activeRentals && activeRentals.length > 0) {
      throw new Error('Cannot delete this branch because it has active rented contracts.');
    }

    const { data: activeUsers } = await supabase
      .from('users')
      .select('id, name')
      .eq('branch_id', id)
      .eq('is_active', true)
      .limit(1);

    if (activeUsers && activeUsers.length > 0) {
      throw new Error(`Cannot delete this branch because it has assigned staff (${activeUsers[0].name}). Reassign or remove staff first.`);
    }

    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteBranch DB Error]:', error);
      throw error;
    }

    const idx = inMemoryWards.findIndex(w => w.id === id || w.code === id);
    if (idx >= 0) {
      inMemoryWards.splice(idx, 1);
    }

    return true;
  }

  async setAdmin(branchId, { name, email, phone, password }, user = {}) {
    const branch = await this.getById(branchId);
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const password_hash = await bcrypt.hash(password, 10);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, branch_id')
      .or(`email.eq.${cleanEmail},branch_id.eq.${branch.id}`)
      .maybeSingle();

    if (existingUser) {
      const { data: updated, error } = await supabase
        .from('users')
        .update({
          name: name || branch.contact_person || branch.name,
          phone: phone || branch.phone || null,
          email: cleanEmail,
          password_hash,
          role: 'branch_admin',
          branch_id: branch.id,
          head_office_id: branch.head_office_id,
          ward_area: branch.ward_area || branch.name,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select('id, name, email, role, phone')
        .single();

      if (error) throw error;
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from('users')
        .insert([{
          name: name || branch.contact_person || branch.name,
          phone: phone || branch.phone || null,
          email: cleanEmail,
          password_hash,
          role: 'branch_admin',
          branch_id: branch.id,
          head_office_id: branch.head_office_id,
          ward_area: branch.ward_area || branch.name,
          is_active: true,
          created_by: user?.id || null,
        }])
        .select('id, name, email, role, phone')
        .single();

      if (error) throw error;
      return created;
    }
  }

  async getBranchOverview(branchId) {
    const branch = await this.getById(branchId);
    let stats = {
      totalStock: 8,
      activeRentals: 5,
      staffCount: 2,
    };

    try {
      const [staffRes, modelsRes, rentalsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('branch_id', branchId).eq('is_active', true),
        supabase.from('ev_models').select('stock_count').eq('branch_id', branchId),
        supabase.from('tenants').select('id, status', { count: 'exact' }).eq('branch_id', branchId).eq('status', 'rented'),
      ]);

      if (!staffRes.error && !modelsRes.error && !rentalsRes.error) {
        stats.totalStock = (modelsRes.data || []).reduce((acc, m) => acc + (m.stock_count || 0), 0);
        stats.activeRentals = rentalsRes.count || 0;
        stats.staffCount = staffRes.count || 0;
      }
    } catch (e) {
      // Keep sensible default stats for demo
    }

    // Enrich branch with governing HO Admin for overview modal
    try {
      const { data: hoAdmins } = await supabase
        .from('users')
        .select('id, name, phone, email, head_office_id, branch_id, ward_area, role')
        .eq('role', 'ho_admin')
        .eq('is_active', true);

      if (hoAdmins && hoAdmins.length > 0) {
        let matched = hoAdmins.find(u => 
          (u.branch_id && String(u.branch_id).toLowerCase() === String(branch.id).toLowerCase()) ||
          (u.ward_area && branch.name && u.ward_area.toLowerCase().includes(branch.name.toLowerCase()))
        );
        if (!matched && branch.head_office_id) {
          matched = hoAdmins.find(u => u.head_office_id === branch.head_office_id);
        }
        branch.ho_admin = matched ? {
          id: matched.id,
          name: matched.name,
          phone: matched.phone,
          email: matched.email,
        } : null;
      }
    } catch (err) {}

    return {
      branch,
      stats,
    };
  }

  /**
   * Full branch dashboard — all data scoped to a single ward/branch.
   * Used by branch_admin role on their personal dashboard.
   */
  async getBranchDashboard(branchId) {
    const branch = await this.getById(branchId);

    // Default values
    let summary = {
      totalStock: 0,
      oldStock: 0,
      activeRentals: 0,
      overdueCount: 0,
      todayCollections: 0,
      totalCollections: 0,
      staffCount: 0,
      pendingBookings: 0,
    };
    let overdueTenants = [];
    let recentRentals = [];
    let staffList = [];
    let recentPayments = [];

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch Models & calculate stock strictly allocated to this branch / ward
      let branchStock = 0;
      let modelIds = [];
      try {
        const { data: allModels, error: mError } = await supabase
          .from('ev_models')
          .select('id, name, company, total_price, stock_count, stock_logs, is_active')
          .eq('is_active', true);

        if (!mError && allModels) {
          modelIds = allModels.map(m => m.id);
          allModels.forEach(m => {
            const logs = Array.isArray(m.stock_logs) ? m.stock_logs : [];
            const wardLogs = logs.filter(log => {
              if (log.branch_id) {
                const bId = String(log.branch_id).trim().toLowerCase();
                if (bId === String(branch.id).toLowerCase() || bId === String(branch.code).toLowerCase()) return true;
                if (bId.replace(/[^a-z0-9]/g, '') === String(branch.name).toLowerCase().replace(/[^a-z0-9]/g, '')) return true;
              }
              if (log.ward_no && branch.ward_no && Number(log.ward_no) === Number(branch.ward_no)) return true;
              if (log.ward_area) {
                const lArea = String(log.ward_area).toLowerCase().replace(/[^a-z0-9]/g, '');
                const bName = String(branch.name).toLowerCase().replace(/[^a-z0-9]/g, '');
                if (lArea === bName || lArea.includes(bName) || bName.includes(lArea)) return true;
              }
              return false;
            });
            const wardCount = wardLogs.reduce((acc, l) => acc + (Number(l.stock_added) || 0), 0);
            branchStock += Math.max(0, wardCount);
          });
        }
      } catch (e) {
        console.error('[getBranchDashboard] Stock calculation error:', e);
      }

      summary.totalStock = branchStock;

      // 2. Fetch Old EVs
      try {
        const { data } = await supabase
          .from('old_evs')
          .select('id, status')
          .or(`branch_id.eq.${branch.id},ward.ilike.%${branch.name}%`)
          .eq('status', 'available');
        if (data) summary.oldStock = data.length;
      } catch (e) {}

      // 3. Fetch Staff for this branch / ward
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, role, phone, is_active, created_at, ward_area')
          .or(`branch_id.eq.${branch.id},ward_area.ilike.%${branch.name}%`)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (!error && data) staffList = data;
      } catch (e) {
        try {
          const { data } = await supabase
            .from('users')
            .select('id, name, email, role, phone, is_active, created_at, ward_area')
            .ilike('ward_area', `%${branch.name}%`)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          if (data) staffList = data;
        } catch (e2) {}
      }
      summary.staffCount = staffList.length;

      // 4. Fetch Rentals for this branch
      let rentals = [];
      try {
        let tQuery = supabase
          .from('tenants')
          .select('id, name, phone, status, created_at, ev_model_id, downpayment_paid, booking_amount, ev_models(name), computed_balance')
          .order('created_at', { ascending: false })
          .limit(100);

        if (modelIds.length > 0) {
          tQuery = tQuery.in('ev_model_id', modelIds);
        } else {
          tQuery = tQuery.eq('branch_id', branch.id);
        }

        const { data, error } = await tQuery;
        if (!error && data) rentals = data;
      } catch (e) {}

      const active = rentals.filter(r => r.status === 'rented');
      summary.activeRentals = active.length;

      const overdue = active
        .filter(r => r.computed_balance && r.computed_balance.daysOverdue > 0)
        .sort((a, b) => b.computed_balance.daysOverdue - a.computed_balance.daysOverdue);
      summary.overdueCount = overdue.length;
      overdueTenants = overdue.slice(0, 8);
      recentRentals = rentals.slice(0, 6);

      const tenantIds = rentals.map(r => r.id);

      // 5. Fetch Collections / Payments
      let payments = [];
      if (tenantIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('id, amount, payment_date, tenant_id, mode, tenants(name)')
            .in('tenant_id', tenantIds)
            .order('payment_date', { ascending: false })
            .limit(100);
          if (!error && data) payments = data;
        } catch (e) {}
      }

      const totalPayments = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const totalDown = rentals.reduce((s, t) => s + Number(t.downpayment_paid || 0), 0);
      const totalBookAmt = rentals.reduce((s, t) => s + Number(t.booking_amount || 0), 0);
      summary.totalCollections = totalPayments + totalDown + totalBookAmt;

      const todayPayments = payments.filter(p => (p.payment_date || '').startsWith(todayStr));
      summary.todayCollections = todayPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      recentPayments = payments.slice(0, 6);

      // 6. Pending Bookings
      try {
        const { data } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('branch_id', branch.id)
          .eq('status', 'pending');
        if (data) summary.pendingBookings = data.length;
      } catch (e) {}

    } catch (err) {
      console.error('[BranchesService.getBranchDashboard]', err);
    }

    return { branch, summary, overdueTenants, recentRentals, staffList, recentPayments };
  }
}

module.exports = new BranchesService();
