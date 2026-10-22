const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const { ALL_HEAD_OFFICES } = require('../branches/delhiWardsData');
const { calcBalance } = require('../../utils/balanceCalc');

let inMemoryHeadOffices = [...ALL_HEAD_OFFICES];

class HeadOfficesService {
  async getAllHeadOffices(user = {}) {
    try {
      let queryBuilder = supabase
        .from('head_offices')
        .select('*, branches (id, name, code, ward_no, is_active)')
        .order('created_at', { ascending: true });

      if (user && user.role === 'ho_admin' && user.head_office_id) {
        queryBuilder = queryBuilder.eq('id', user.head_office_id);
      }

      const { data, error } = await queryBuilder;

      if (!error && data) {
        try {
          const hoIds = data.map(h => h.id);
          const { data: hoAdmins } = await supabase
            .from('users')
            .select('id, name, email, phone, head_office_id, role')
            .in('head_office_id', hoIds)
            .eq('role', 'ho_admin')
            .eq('is_active', true);

          const adminByHo = {};
          (hoAdmins || []).forEach(u => {
            if (u.head_office_id) adminByHo[u.head_office_id] = u;
          });

          data.forEach(ho => {
            ho.admin = adminByHo[ho.id] || null;
          });
        } catch (enrichErr) {}

        return data;
      }
    } catch (e) {
      // fallback
    }

    if (user && user.role === 'ho_admin' && user.head_office_id) {
      return inMemoryHeadOffices.filter(ho => ho.id === user.head_office_id || ho.code === user.head_office_id);
    }
    return inMemoryHeadOffices;
  }

  async getDropdown(user = {}) {
    try {
      let queryBuilder = supabase
        .from('head_offices')
        .select('id, name, code, city')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (user && user.role === 'ho_admin' && user.head_office_id) {
        queryBuilder = queryBuilder.eq('id', user.head_office_id);
      }

      const { data, error } = await queryBuilder;

      if (!error && data) {
        return data;
      }
    } catch (e) {
      // fallback
    }

    let list = inMemoryHeadOffices;
    if (user && user.role === 'ho_admin' && user.head_office_id) {
      list = list.filter(ho => ho.id === user.head_office_id || ho.code === user.head_office_id);
    }

    return list.map(ho => ({
      id: ho.id,
      name: ho.name,
      code: ho.code,
      city: ho.city,
    }));
  }

  async getById(id, user = {}) {
    if (user && user.role === 'ho_admin' && user.head_office_id) {
      if (id !== user.head_office_id) {
        throw new Error('Access denied: You can only access your assigned Head Office');
      }
    }

    try {
      const { data, error } = await supabase
        .from('head_offices')
        .select('*, branches (*)')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // fallback
    }

    const found = inMemoryHeadOffices.find(ho => ho.id === id || ho.code === id);
    if (found) return found;
    throw new Error('Head Office not found');
  }

  async create({ name, code, city, state, admin_name, admin_phone, admin_email, admin_password }, user = {}) {
    const newHo = {
      id: `ho-custom-${Date.now()}`,
      name,
      code: code.toUpperCase().trim(),
      city,
      state,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('head_offices')
        .insert([{
          name: newHo.name,
          code: newHo.code,
          city: newHo.city,
          state: newHo.state,
          is_active: true,
        }])
        .select('*')
        .single();

      if (!error && data) {
        let createdAdmin = null;
        if (admin_email && admin_password) {
          try {
            const password_hash = await bcrypt.hash(admin_password, 10);
            const { data: userData, error: uErr } = await supabase
              .from('users')
              .insert([{
                name: admin_name || `${name} Admin`,
                phone: admin_phone || null,
                email: String(admin_email).trim().toLowerCase(),
                password_hash,
                role: 'ho_admin',
                head_office_id: data.id,
                is_active: true,
                created_by: user?.id || null,
              }])
              .select('id, name, email, role, phone')
              .single();

            if (!uErr && userData) {
              createdAdmin = userData;
            } else if (uErr) {
              console.error('[Create HO Admin Error]:', uErr);
            }
          } catch (adminErr) {
            console.error('[Create HO Admin Exception]:', adminErr);
          }
        }

        const createdHo = { ...newHo, ...data, admin: createdAdmin };
        inMemoryHeadOffices.push(createdHo);
        return createdHo;
      }
    } catch (e) {
      // fallback
    }

    inMemoryHeadOffices.push(newHo);
    return newHo;
  }

  async setAdmin(hoId, { name, email, phone, password }, user = {}) {
    const ho = await this.getById(hoId, user);
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const password_hash = await bcrypt.hash(password, 10);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, head_office_id')
      .or(`email.eq.${cleanEmail},and(head_office_id.eq.${ho.id},role.eq.ho_admin)`)
      .maybeSingle();

    if (existingUser) {
      const { data: updated, error } = await supabase
        .from('users')
        .update({
          name: name || `${ho.name} Admin`,
          phone: phone || null,
          email: cleanEmail,
          password_hash,
          role: 'ho_admin',
          head_office_id: ho.id,
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
          name: name || `${ho.name} Admin`,
          phone: phone || null,
          email: cleanEmail,
          password_hash,
          role: 'ho_admin',
          head_office_id: ho.id,
          is_active: true,
          created_by: user?.id || null,
        }])
        .select('id, name, email, role, phone')
        .single();

      if (error) throw error;
      return created;
    }
  }

  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('head_offices')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        const idx = inMemoryHeadOffices.findIndex(ho => ho.id === id);
        if (idx >= 0) inMemoryHeadOffices[idx] = { ...inMemoryHeadOffices[idx], ...data };
        return data;
      }
    } catch (e) {
      // fallback
    }

    const idx = inMemoryHeadOffices.findIndex(ho => ho.id === id || ho.code === id);
    if (idx >= 0) {
      inMemoryHeadOffices[idx] = { ...inMemoryHeadOffices[idx], ...updates };
      return inMemoryHeadOffices[idx];
    }
    throw new Error('Head Office not found');
  }

  async getHeadOfficeDashboard(headOfficeId, user = {}) {
    // 1. Resolve Head Office (strictly locked for ho_admin)
    let hoId = (user && user.role === 'ho_admin' && user.head_office_id)
      ? user.head_office_id
      : (headOfficeId || user.head_office_id);
    let headOffice = null;

    if (hoId) {
      try {
        headOffice = await this.getById(hoId, user);
      } catch (e) {
        headOffice = null;
      }
    }

    if (!headOffice) {
      try {
        const { data: firstHo } = await supabase
          .from('head_offices')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1);
        headOffice = firstHo?.[0] || null;
      } catch (e) {}
    }

    if (!headOffice) {
      headOffice = {
        id: null,
        name: 'Head Office Command',
        code: 'HO',
        city: '',
        state: '',
      };
    }

    // 2. Fetch all branches belonging to this Head Office
    let branches = [];
    try {
      const { data: brData, error: brErr } = await supabase
        .from('branches')
        .select('*')
        .eq('head_office_id', headOffice.id)
        .order('ward_no', { ascending: true, nullsFirst: false });
      if (!brErr && brData) branches = brData;
    } catch (e) {}

    const branchIds = branches.map(b => b.id);
    const branchMap = new Map(branches.map(b => [b.id, b]));

    // 3. Fetch branch admins assigned to these branches
    let branchAdmins = new Map();
    if (branchIds.length > 0) {
      try {
        const { data: adminUsers } = await supabase
          .from('users')
          .select('id, name, phone, branch_id, role, is_active')
          .in('branch_id', branchIds)
          .in('role', ['branch_admin', 'admin'])
          .eq('is_active', true);
        (adminUsers || []).forEach(u => {
          if (u.branch_id && !branchAdmins.has(u.branch_id)) {
            branchAdmins.set(u.branch_id, u);
          }
        });
      } catch (e) {}
    }

    // 4. Fetch EV Models and Old EVs to compute zonal and branch stock
    let allModels = [];
    let branchStockMap = new Map();
    let totalStock = 0;

    try {
      const { data: modelsData } = await supabase
        .from('ev_models')
        .select('id, name, company, total_price, stock_count, stock_logs, branch_id, head_office_id, is_active')
        .eq('is_active', true);
      allModels = modelsData || [];

      // Calculate total stock for this HO
      const hoModels = allModels.filter(m => !m.head_office_id || m.head_office_id === headOffice.id);
      totalStock = hoModels.reduce((sum, m) => sum + (m.stock_count || 0), 0);

      // Attribute stock to branches via stock_logs
      branches.forEach(branch => {
        let bStock = 0;
        allModels.forEach(m => {
          const logs = Array.isArray(m.stock_logs) ? m.stock_logs : [];
          const matchedLogs = logs.filter(log => {
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
          bStock += matchedLogs.reduce((acc, l) => acc + (Number(l.stock_added) || 0), 0);
        });
        branchStockMap.set(branch.id, Math.max(0, bStock));
      });
    } catch (e) {}

    // Add available old EVs to stock
    try {
      let oldEvQuery = supabase.from('old_evs').select('id, branch_id, head_office_id, status').eq('status', 'available');
      if (branchIds.length > 0) {
        oldEvQuery = oldEvQuery.or(`head_office_id.eq.${headOffice.id},branch_id.in.(${branchIds.join(',')})`);
      } else {
        oldEvQuery = oldEvQuery.eq('head_office_id', headOffice.id);
      }
      const { data: oldEvs } = await oldEvQuery;
      if (oldEvs && oldEvs.length > 0) {
        totalStock += oldEvs.length;
        oldEvs.forEach(ev => {
          if (ev.branch_id && branchStockMap.has(ev.branch_id)) {
            branchStockMap.set(ev.branch_id, (branchStockMap.get(ev.branch_id) || 0) + 1);
          }
        });
      }
    } catch (e) {}

    // 5. Fetch Tenants (Rentals and Purchases) for this HO
    let tenants = [];
    try {
      let tQuery = supabase
        .from('tenants')
        .select('id, name, phone, status, branch_id, head_office_id, total_price, downpayment_paid, booking_amount, installment_daily_rate, start_date, expected_end_date, late_fee_daily_rate, ev_model_id, created_at, ev_models(name)')
        .order('created_at', { ascending: false });

      if (branchIds.length > 0) {
        tQuery = tQuery.or(`head_office_id.eq.${headOffice.id},branch_id.in.(${branchIds.join(',')})`);
      } else {
        tQuery = tQuery.eq('head_office_id', headOffice.id);
      }

      const { data: tData } = await tQuery;
      if (tData) tenants = tData;
    } catch (e) {}

    const tenantIds = tenants.map(t => t.id);

    // 6. Fetch Payments for these tenants and HO
    let payments = [];
    try {
      let pQuery = supabase
        .from('payments')
        .select('id, tenant_id, amount, payment_date, mode, branch_id, head_office_id, created_at')
        .order('created_at', { ascending: false });

      if (branchIds.length > 0) {
        pQuery = pQuery.or(`head_office_id.eq.${headOffice.id},branch_id.in.(${branchIds.join(',')})`);
      } else {
        pQuery = pQuery.eq('head_office_id', headOffice.id);
      }

      const { data: pData } = await pQuery;
      if (pData) payments = pData;
    } catch (e) {}

    // Group payments by tenant
    const paymentsByTenant = payments.reduce((acc, p) => {
      acc[p.tenant_id] = (acc[p.tenant_id] || 0) + Number(p.amount || 0);
      return acc;
    }, {});

    // Compute balances for all tenants
    let activeRentals = 0;
    let directPurchases = 0;
    let overdueCount = 0;
    let totalOutstanding = 0;
    let overdueTenantsList = [];

    const branchRentalsMap = new Map();
    const branchOverdueMap = new Map();

    tenants.forEach(tenant => {
      const isRented = tenant.status === 'rented';
      const isDirect = tenant.status === 'completed' || tenant.status === 'direct_purchase';

      if (isRented) activeRentals++;
      if (isDirect) directPurchases++;

      if (tenant.branch_id) {
        if (isRented) {
          branchRentalsMap.set(tenant.branch_id, (branchRentalsMap.get(tenant.branch_id) || 0) + 1);
        }
      }

      if (isRented) {
        const totalPaid = paymentsByTenant[tenant.id] || 0;
        const balance = calcBalance(tenant, totalPaid);
        totalOutstanding += balance.outstanding || 0;

        if (balance.daysOverdue > 0) {
          overdueCount++;
          if (tenant.branch_id) {
            branchOverdueMap.set(tenant.branch_id, (branchOverdueMap.get(tenant.branch_id) || 0) + 1);
          }

          const br = branchMap.get(tenant.branch_id);
          overdueTenantsList.push({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            model_name: tenant.ev_models?.name || 'EV Bike',
            branch_id: tenant.branch_id,
            branch_name: br ? br.name : 'Central Branch',
            ward_no: br?.ward_no || null,
            ward_code: br?.code || null,
            daysOverdue: balance.daysOverdue,
            outstanding: balance.outstanding,
            totalLateFee: balance.totalLateFee || 0,
            netTotalDue: balance.netTotalDue || balance.outstanding,
          });
        }
      }
    });

    // Sort overdue watchlist by daysOverdue descending
    overdueTenantsList.sort((a, b) => b.daysOverdue - a.daysOverdue);
    const recentOverdue = overdueTenantsList.slice(0, 8);

    // Revenue calculations
    const todayStr = new Date().toISOString().split('T')[0];
    let totalCollections = 0;
    let todayCollections = 0;
    let cashCollections = 0;
    let onlineCollections = 0;
    const branchCollectionsMap = new Map();

    payments.forEach(p => {
      const amt = Number(p.amount || 0);
      totalCollections += amt;

      if (p.payment_date === todayStr || (p.created_at && p.created_at.startsWith(todayStr))) {
        todayCollections += amt;
      }

      if (p.mode === 'cash') cashCollections += amt;
      else if (p.mode === 'online') onlineCollections += amt;

      if (p.branch_id) {
        branchCollectionsMap.set(p.branch_id, (branchCollectionsMap.get(p.branch_id) || 0) + amt);
      }
    });

    const cashPercent = totalCollections > 0 ? Math.round((cashCollections / totalCollections) * 100) : 50;
    const onlinePercent = totalCollections > 0 ? 100 - cashPercent : 50;

    // 7. Build Real Ward / Branch Performance Matrix
    const wardPerformance = branches.map(b => {
      const bStock = branchStockMap.get(b.id) || 0;
      const bRentals = branchRentalsMap.get(b.id) || 0;
      const bOverdue = branchOverdueMap.get(b.id) || 0;
      const bCollections = branchCollectionsMap.get(b.id) || 0;
      const bAdmin = branchAdmins.get(b.id) || null;

      return {
        id: b.id,
        name: b.name,
        code: b.code,
        ward_no: b.ward_no,
        ward_area: b.ward_area || b.name,
        contact_person: bAdmin ? bAdmin.name : (b.contact_person || 'Vacant'),
        phone: bAdmin ? bAdmin.phone : (b.phone || ''),
        has_assigned_admin: Boolean(bAdmin),
        address: b.address || headOffice.city,
        is_active: b.is_active !== false,
        stock_count: bStock,
        active_rentals: bRentals,
        overdue_count: bOverdue,
        total_collected: bCollections,
      };
    });

    // Only alert if the HO has total stock but specific branches are zero
    // (avoids false positives when no stock has been distributed yet across the zone)
    const depletedStockWards = totalStock > 0
      ? wardPerformance.filter(w => w.stock_count === 0).length
      : 0;

    const summary = {
      totalWards: branches.length,
      activeWards: branches.filter(b => b.is_active !== false).length,
      depletedStockWards,
      totalStock,
      activeRentals,
      directPurchases,
      overdueCount,
      totalOutstanding,
      totalCollections,
      todayCollections,
      modeBreakdown: {
        cash: cashCollections,
        online: onlineCollections,
        cashPercent,
        onlinePercent,
      },
    };

    return {
      headOffice,
      summary,
      wardPerformance,
      recentOverdue,
      recentRentals: tenants.filter(t => t.status === 'rented').slice(0, 6),
    };
  }
}

module.exports = new HeadOfficesService();
