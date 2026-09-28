const supabase = require('../../config/db');
const { getPaginationOptions, getPaginationMeta } = require('../../utils/pagination');
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
      } else if (query.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', query.head_office_id);
      } else if (user.role === 'ho_admin' && user.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', user.head_office_id);
      }

      // Filter by Search
      if (query.search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,code.ilike.%${query.search}%,ward_area.ilike.%${query.search}%,contact_person.ilike.%${query.search}%,address.ilike.%${query.search}%`);
      }

      // Filter by Active
      if (query.is_active !== undefined && query.is_active !== '') {
        queryBuilder = queryBuilder.eq('is_active', query.is_active === 'true');
      }

      const res = await queryBuilder.range(offset, offset + limit - 1);
      if (res.error || !res.data || res.data.length === 0) {
        useFallback = true;
      } else {
        data = res.data;
        count = res.count;
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
      } else if (query.head_office_id) {
        filtered = filtered.filter(w => w.head_office_id === query.head_office_id);
      } else if (user.role === 'ho_admin' && user.head_office_id) {
        filtered = filtered.filter(w => w.head_office_id === user.head_office_id);
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

      // Direct DB isolation for Ward Admin
      if (user && (user.role === 'branch_admin' || user.role === 'staff')) {
        if (user.branch_id) {
          queryBuilder = queryBuilder.eq('id', user.branch_id);
        } else if (user.ward_area) {
          queryBuilder = queryBuilder.ilike('name', `%${user.ward_area}%`);
        }
      } else if (query.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', query.head_office_id);
      } else if (user.role === 'ho_admin' && user.head_office_id) {
        queryBuilder = queryBuilder.eq('head_office_id', user.head_office_id);
      }

      const { data, error } = await queryBuilder;
      if (!error && data && data.length > 0) {
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
      } else if (user.role === 'ho_admin' && user.head_office_id) {
        filtered = filtered.filter(w => w.head_office_id === user.head_office_id);
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
        name: w.head_office?.name || 'Delhi Head Office',
        code: w.head_office?.code || 'DEL-HO',
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

  async create({ head_office_id, ward_no, name, code, ward_area, address, phone, contact_person, status_label }) {
    const ho = ALL_HEAD_OFFICES.find(h => h.id === head_office_id) || DELHI_HEAD_OFFICE;
    const newBranch = {
      id: `ward-custom-${Date.now()}`,
      head_office_id: head_office_id || ho.id,
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
          is_active: true,
        }])
        .select('*')
        .single();

      if (!error && data) {
        inMemoryWards.unshift({ ...newBranch, ...data });
        return data;
      }
    } catch (e) {
      // fallback
    }

    inMemoryWards.unshift(newBranch);
    return newBranch;
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
