const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { applyScope } = require('../../middleware/scope');
const penaltiesService = require('../penalties/penalties.service');

class CustomersService {
  async getCustomers(query = {}, req = null) {
    // 1. Fetch tenants with models & branch
    let tenantsQuery = supabase
      .from('tenants')
      .select('*, ev_models(name, company)');

    if (req) {
      tenantsQuery = applyScope(tenantsQuery, req);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;
    if (tenantsError) throw tenantsError;

    // 2. Fetch payments for balance computation
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('tenant_id, amount, payment_date, mode');

    if (paymentsError) throw paymentsError;

    const paymentsByTenant = (payments || []).reduce((acc, p) => {
      acc[p.tenant_id] = (acc[p.tenant_id] || 0) + Number(p.amount);
      return acc;
    }, {});

    // 3. Fetch all active penalties
    let penaltiesByTenant = {};
    try {
      const { data: pLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'penalty');

      (pLogs || []).forEach(l => {
        const p = l.changes;
        if (p && p.tenant_id && p.status === 'unpaid') {
          penaltiesByTenant[p.tenant_id] = (penaltiesByTenant[p.tenant_id] || 0) + Number(p.amount);
        }
      });
    } catch (e) {
      console.error('Error fetching penalties:', e);
    }

    // 4. Fetch branches for lookup
    const { data: branches } = await supabase.from('branches').select('id, name, code, ward_area');
    const branchMap = new Map((branches || []).map(b => [b.id, b]));

    // 5. Group / Deduplicate tenants by Phone into Customers
    const customerMap = new Map();

    (tenants || []).forEach(t => {
      const phone = t.phone || `TEMP_${t.id}`;
      const totalPaid = paymentsByTenant[t.id] || 0;
      const manualPenalty = penaltiesByTenant[t.id] || 0;
      
      const balance = calcBalance({
        ...t,
        manual_penalty_amount: manualPenalty
      }, totalPaid);

      // Add manual penalties to balance
      balance.manualPenalties = manualPenalty;
      balance.totalLateFee = (balance.totalLateFee || 0) + manualPenalty;
      balance.netTotalDue = (balance.outstanding || 0) + balance.totalLateFee;

      const contractSummary = {
        id: t.id,
        vehicle_number: t.vehicle_number || 'N/A',
        model_name: t.ev_models?.name || 'EV Bike',
        status: t.status,
        start_date: t.start_date,
        expected_end_date: t.expected_end_date,
        total_price: Number(t.total_price) || 0,
        total_paid: totalPaid,
        outstanding: balance.outstanding,
        days_overdue: balance.daysOverdue,
        total_late_fee: balance.totalLateFee,
        manual_penalties: manualPenalty,
        net_total_due: balance.netTotalDue,
        branch: branchMap.get(t.branch_id) || null
      };

      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          id: t.id, // primary tenant ID
          name: t.name,
          phone: t.phone,
          gender: t.gender,
          address: t.address,
          branch: branchMap.get(t.branch_id) || null,
          branch_id: t.branch_id,
          head_office_id: t.head_office_id,
          aadhar_path: t.aadhar_path,
          pan_path: t.pan_path,
          electricity_bill_path: t.electricity_bill_path,
          rider_license_path: t.rider_license_path,
          has_pending_docs: t.has_pending_docs,
          contracts: [contractSummary],
          total_paid: totalPaid,
          net_outstanding: balance.outstanding,
          total_late_fee: balance.totalLateFee,
          manual_penalties: manualPenalty,
          net_total_due: balance.netTotalDue,
          max_days_overdue: balance.daysOverdue,
          active_contract_count: t.status === 'rented' ? 1 : 0,
          status: t.status === 'rented' ? (balance.daysOverdue > 0 ? 'overdue' : 'active') : t.status,
          created_at: t.created_at
        });
      } else {
        const cust = customerMap.get(phone);
        cust.contracts.push(contractSummary);
        cust.total_paid += totalPaid;
        cust.net_outstanding += balance.outstanding;
        cust.total_late_fee += balance.totalLateFee;
        cust.manual_penalties += manualPenalty;
        cust.net_total_due += balance.netTotalDue;
        cust.max_days_overdue = Math.max(cust.max_days_overdue, balance.daysOverdue);
        if (t.status === 'rented') {
          cust.active_contract_count += 1;
          cust.status = cust.max_days_overdue > 0 ? 'overdue' : 'active';
        }
      }
    });

    let customerList = Array.from(customerMap.values());

    // 6. Filter by search
    if (query.search) {
      const s = query.search.toLowerCase();
      customerList = customerList.filter(c =>
        (c.name && c.name.toLowerCase().includes(s)) ||
        (c.phone && c.phone.includes(s)) ||
        (c.contracts && c.contracts.some(con => 
          (con.vehicle_number && con.vehicle_number.toLowerCase().includes(s)) ||
          (con.model_name && con.model_name.toLowerCase().includes(s))
        ))
      );
    }

    // 7. Filter by status
    if (query.status && query.status !== 'all') {
      customerList = customerList.filter(c => c.status === query.status);
    }

    // Sort: defaulters/overdue on top, then newest
    customerList.sort((a, b) => {
      if (b.max_days_overdue !== a.max_days_overdue) {
        return b.max_days_overdue - a.max_days_overdue;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Compute top-level summary metrics
    const totalCustomers = customerList.length;
    const activeRenters = customerList.filter(c => c.active_contract_count > 0).length;
    const overdueDefaulters = customerList.filter(c => c.max_days_overdue > 0).length;
    const completedCustomers = customerList.filter(c => c.contracts.every(con => con.status === 'completed')).length;

    return {
      data: customerList,
      summary: {
        total_customers: totalCustomers,
        active_renters: activeRenters,
        overdue_defaulters: overdueDefaulters,
        completed_customers: completedCustomers
      }
    };
  }

  async getCustomerDetails(idOrPhone, req = null) {
    // Look up by ID or Phone
    let tenantQuery = supabase
      .from('tenants')
      .select('*, ev_models(*), branches(id, name, code)')
      .or(`id.eq.${idOrPhone.length === 36 ? idOrPhone : '00000000-0000-0000-0000-000000000000'},phone.eq.${idOrPhone}`);

    const { data: tenants, error } = await tenantQuery;
    if (error || !tenants || tenants.length === 0) {
      throw new Error('Customer not found');
    }

    let authorizedTenants = tenants;
    if (req?.user) {
      const user = req.user;
      const isSuper = user.role === 'super_admin' || (user.role === 'admin' && !user.ward_area);
      if (!isSuper) {
        if (user.role === 'branch_admin' || user.role === 'staff') {
          if (!user.branch_id) {
            throw new Error('Access denied: Staff has no assigned branch');
          }
          authorizedTenants = tenants.filter(t => t.branch_id === user.branch_id || t.ward_area === user.ward_area);
          if (authorizedTenants.length === 0) {
            throw new Error('Access denied: Customer does not belong to your assigned branch');
          }
        } else if (user.role === 'ho_admin') {
          if (!user.head_office_id) {
            throw new Error('Access denied: HO admin has no assigned Head Office');
          }
          authorizedTenants = tenants.filter(t => t.head_office_id === user.head_office_id);
          if (authorizedTenants.length === 0) {
            throw new Error('Access denied: Customer does not belong to your assigned Head Office');
          }
        }
      }
    }

    // Select primaryTenant ONLY from authorizedTenants
    const primaryTenant = authorizedTenants.find(t => t.status === 'rented') || authorizedTenants[0];
    const customerPhone = primaryTenant.phone;

    // Fetch all contracts for this phone scoped to the caller's authorized boundary
    let contractsQuery = supabase
      .from('tenants')
      .select('*, ev_models(name, company), branches(id, name, code)')
      .eq('phone', customerPhone);

    if (req) {
      contractsQuery = applyScope(contractsQuery, req);
    }

    const { data: allContracts, error: contractsError } = await contractsQuery;
    if (contractsError) throw contractsError;

    const contractIds = (allContracts && allContracts.length > 0 ? allContracts : [primaryTenant]).map(c => c.id);

    // Fetch all payments across their contracts
    const { data: allPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*, users(name)')
      .in('tenant_id', contractIds)
      .order('payment_date', { ascending: false });
    if (paymentsError) throw paymentsError;

    // Fetch all penalties levied
    const { data: pLogs, error: pLogsError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'penalty')
      .in('entity_id', contractIds);
    if (pLogsError) throw pLogsError;

    const penalties = (pLogs || []).map(l => ({
      ...l.changes,
      audit_id: l.id,
      created_at: l.created_at
    }));

    const totalPaid = (allPayments || []).reduce((acc, p) => acc + Number(p.amount), 0);
    const totalManualPenalties = penalties.filter(p => p.status === 'unpaid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const balance = calcBalance(primaryTenant, totalPaid);
    balance.manualPenalties = totalManualPenalties;
    balance.totalLateFee = (balance.totalLateFee || 0) + totalManualPenalties;
    balance.netTotalDue = (balance.outstanding || 0) + balance.totalLateFee;

    return {
      profile: {
        id: primaryTenant.id,
        name: primaryTenant.name,
        phone: primaryTenant.phone,
        gender: primaryTenant.gender,
        address: primaryTenant.address,
        branch: primaryTenant.branches,
        head_office_id: primaryTenant.head_office_id,
        aadhar_path: primaryTenant.aadhar_path,
        pan_path: primaryTenant.pan_path,
        electricity_bill_path: primaryTenant.electricity_bill_path,
        rider_license_path: primaryTenant.rider_license_path,
        guarantors: primaryTenant.guarantors || [],
        references: primaryTenant.references || [],
        has_pending_docs: primaryTenant.has_pending_docs
      },
      contracts: allContracts || [primaryTenant],
      payments: allPayments || [],
      penalties: penalties || [],
      balance
    };
  }
}

module.exports = new CustomersService();
