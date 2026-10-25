const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { applyScope } = require('../../middleware/scope');
const penaltiesService = require('../penalties/penalties.service');
const { fetchAll } = require('../../utils/fetchAll');

class CustomersService {
  async getCustomers(query = {}, req = null) {
    const tenants = await fetchAll(() => {
      let q = supabase.from('tenants').select('*, ev_models(name, company)');
      return req ? applyScope(q, req) : q;
    });
    const payments = await fetchAll(() => {
      let q = supabase.from('payments').select('tenant_id, amount, payment_date, mode');
      return req ? applyScope(q, req) : q;
    });

    const paymentsByTenant = (payments || []).reduce((acc, p) => {
      acc[p.tenant_id] = (acc[p.tenant_id] || 0) + Number(p.amount);
      return acc;
    }, {});

    const penaltiesByTenant = {};
    const { data: penalties } = await penaltiesService.getPenalties({ status: 'unpaid' }, req);
    for (const p of penalties) {
      penaltiesByTenant[p.tenant_id] = (penaltiesByTenant[p.tenant_id] || 0) + Number(p.amount);
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
    if (!/^(?:[0-9]{10}|[0-9a-fA-F-]{36})$/.test(idOrPhone)) throw new Error('Invalid customer identifier');
    let tenantQuery = supabase.from('tenants').select('*, ev_models(*), branches(id, name, code)');
    tenantQuery = idOrPhone.length === 36 ? tenantQuery.eq('id', idOrPhone) : tenantQuery.eq('phone', idOrPhone);
    if (req) tenantQuery = applyScope(tenantQuery, req);
    const { data: authorizedTenants, error } = await tenantQuery;
    if (error) throw error;
    if (!authorizedTenants?.length) throw new Error('Customer not found or access denied');

    const primaryTenant = authorizedTenants.find(t => t.status === 'rented') || authorizedTenants[0];
    const customerPhone = primaryTenant.phone;

    const allContracts = await fetchAll(() => {
      let q = supabase.from('tenants').select('*, ev_models(name, company), branches(id, name, code)').eq('phone', customerPhone);
      return req ? applyScope(q, req) : q;
    });

    const contractIds = (allContracts && allContracts.length > 0 ? allContracts : [primaryTenant]).map(c => c.id);

    const allPayments = [];
    for (let i = 0; i < contractIds.length; i += 100) {
      allPayments.push(...await fetchAll(() => supabase.from('payments').select('*, users(name)').in('tenant_id', contractIds.slice(i, i + 100)).order('payment_date', { ascending: false })));
    }
    const { data: customerPenalties } = await penaltiesService.getPenalties({}, req);
    const penalties = customerPenalties.filter(p => contractIds.includes(p.tenant_id));

    const totalManualPenalties = penalties.filter(p => p.status === 'unpaid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const paidByContract = {};
    for (const p of allPayments) paidByContract[p.tenant_id] = (paidByContract[p.tenant_id] || 0) + Number(p.amount);
    const balance = { contractAmount: 0, installmentTotal: 0, outstanding: 0, totalLateFee: 0, daysOverdue: 0, daysAdvance: 0, contractExpired: false };
    for (const contract of allContracts) {
      const computed = calcBalance(contract, paidByContract[contract.id] || 0);
      for (const key of ['contractAmount','installmentTotal','outstanding','totalLateFee']) balance[key] += computed[key] || 0;
      balance.daysOverdue = Math.max(balance.daysOverdue, computed.daysOverdue || 0);
      balance.daysAdvance = Math.max(balance.daysAdvance, computed.daysAdvance || 0);
      balance.contractExpired ||= computed.contractExpired;
    }
    balance.manualPenalties = totalManualPenalties;
    balance.totalLateFee += totalManualPenalties;
    balance.netTotalDue = balance.outstanding + balance.totalLateFee;

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
