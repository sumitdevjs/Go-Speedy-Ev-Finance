const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { applyScope } = require('../../middleware/scope');

async function fetchAll(buildQuery) {
  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;

  try {
    const q = buildQuery();
    if (typeof q.range !== 'function') {
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    }

    while (true) {
      const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
      if (error) {
        const { data: directData, error: directErr } = await buildQuery();
        if (directErr) throw directErr;
        return directData || [];
      }
      if (!data || data.length === 0) break;
      allRows.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return allRows;
  } catch (err) {
    const { data: directData, error: directErr } = await buildQuery();
    if (directErr) throw directErr;
    return directData || [];
  }
}

class ReportsService {
  async getCollectionReport(query = {}, req = null) {
    const payments = await fetchAll(() => {
      let q = supabase
        .from('payments')
        .select('*, users(name), branches(name, code)');

      if (req) {
        q = applyScope(q, req);
      }

      if (query.start_date) {
        q = q.gte('payment_date', query.start_date);
      }
      if (query.end_date) {
        q = q.lte('payment_date', query.end_date);
      }

      return q.order('payment_date', { ascending: false });
    });

    let totalCollected = 0;
    let cashTotal = 0;
    let onlineTotal = 0;
    let lateFeeTotal = 0;

    const collectorMap = {};
    const branchMap = {};
    const dailyMap = {};

    (payments || []).forEach(p => {
      const amt = Number(p.amount) || 0;
      const lateFee = Number(p.late_fee_paid) || 0;
      totalCollected += amt;
      lateFeeTotal += lateFee;

      if (p.mode === 'cash') cashTotal += amt;
      else if (p.mode === 'online') onlineTotal += amt;

      const collectorName = p.users?.name || 'Unknown Staff';
      collectorMap[collectorName] = (collectorMap[collectorName] || 0) + amt;

      const branchName = p.branches?.name || 'Head Office / Unassigned';
      branchMap[branchName] = (branchMap[branchName] || 0) + amt;

      const date = p.payment_date || (p.created_at ? p.created_at.split('T')[0] : 'Unknown');
      dailyMap[date] = (dailyMap[date] || 0) + amt;
    });

    return {
      summary: {
        total_collected: totalCollected,
        cash_total: cashTotal,
        online_total: onlineTotal,
        late_fee_collected: lateFeeTotal,
        transactions_count: (payments || []).length
      },
      by_collector: Object.entries(collectorMap).map(([name, total]) => ({ name, total })),
      by_branch: Object.entries(branchMap).map(([name, total]) => ({ name, total })),
      daily_trend: Object.entries(dailyMap).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  async getOverdueReport(query = {}, req = null) {
    const tenants = await fetchAll(() => {
      let q = supabase
        .from('tenants')
        .select('*, ev_models(name, company), branches(id, name, code)')
        .eq('status', 'rented');

      if (req) {
        q = applyScope(q, req);
      }
      return q;
    });

    const tenantIds = (tenants || []).map(t => t.id).filter(Boolean);
    const paymentsByTenant = {};

    if (tenantIds.length > 0) {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < tenantIds.length; i += CHUNK_SIZE) {
        const chunk = tenantIds.slice(i, i + CHUNK_SIZE);
        const payments = await fetchAll(() => {
          return supabase
            .from('payments')
            .select('tenant_id, amount')
            .in('tenant_id', chunk);
        });

        (payments || []).forEach(p => {
          paymentsByTenant[p.tenant_id] = (paymentsByTenant[p.tenant_id] || 0) + Number(p.amount || 0);
        });
      }
    }

    let penaltiesByTenant = {};
    const { data: pLogs, error: pLogsErr } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'penalty');

    if (pLogsErr) {
      throw new Error(`Failed to fetch penalties for overdue report: ${pLogsErr.message || pLogsErr}`);
    }

    const penaltyMap = new Map();
    (pLogs || []).forEach(l => {
      const p = l.changes;
      if (p && p.tenant_id && p.status === 'unpaid') {
        const penId = p.penalty_id || l.id;
        if (!penaltyMap.has(penId)) {
          penaltyMap.set(penId, p);
        }
      }
    });

    for (const p of penaltyMap.values()) {
      penaltiesByTenant[p.tenant_id] = (penaltiesByTenant[p.tenant_id] || 0) + Number(p.amount || 0);
    }

    const buckets = {
      b1_15: { label: '1 - 15 Days', count: 0, total_due: 0, customers: [] },
      b16_30: { label: '16 - 30 Days', count: 0, total_due: 0, customers: [] },
      b31_60: { label: '31 - 60 Days', count: 0, total_due: 0, customers: [] },
      b60_plus: { label: '60+ Days (Critical)', count: 0, total_due: 0, customers: [] }
    };

    let totalDefaulters = 0;
    let grandTotalOverdueDue = 0;

    (tenants || []).forEach(t => {
      const totalPaid = paymentsByTenant[t.id] || 0;
      const manualPenalty = penaltiesByTenant[t.id] || 0;
      const balance = calcBalance(t, totalPaid);

      if (balance.daysOverdue > 0) {
        totalDefaulters++;
        const totalLateFee = (balance.totalLateFee || 0) + manualPenalty;
        const netDue = (balance.outstanding || 0) + totalLateFee;
        grandTotalOverdueDue += netDue;

        const record = {
          tenant_id: t.id,
          name: t.name,
          phone: t.phone,
          vehicle_number: t.vehicle_number || 'N/A',
          model_name: t.ev_models?.name || 'EV Bike',
          branch_name: t.branches?.name || 'Head Office',
          branch_id: t.branch_id,
          days_overdue: balance.daysOverdue,
          installment_rate: t.installment_daily_rate,
          outstanding_installments: balance.outstanding,
          auto_late_fee: balance.totalLateFee,
          manual_penalties: manualPenalty,
          total_late_fee: totalLateFee,
          net_total_due: netDue,
          start_date: t.start_date
        };

        if (balance.daysOverdue <= 15) {
          buckets.b1_15.count++;
          buckets.b1_15.total_due += netDue;
          buckets.b1_15.customers.push(record);
        } else if (balance.daysOverdue <= 30) {
          buckets.b16_30.count++;
          buckets.b16_30.total_due += netDue;
          buckets.b16_30.customers.push(record);
        } else if (balance.daysOverdue <= 60) {
          buckets.b31_60.count++;
          buckets.b31_60.total_due += netDue;
          buckets.b31_60.customers.push(record);
        } else {
          buckets.b60_plus.count++;
          buckets.b60_plus.total_due += netDue;
          buckets.b60_plus.customers.push(record);
        }
      }
    });

    return {
      summary: {
        total_defaulters: totalDefaulters,
        grand_total_overdue: grandTotalOverdueDue
      },
      buckets
    };
  }

  async getSalesPerformanceReport(query = {}, req = null) {
    const records = await fetchAll(() => {
      let q = supabase
        .from('tenants')
        .select('id, name, status, total_price, downpayment_paid, booking_amount, created_at, branch_id, ev_model_id, ev_models(name), branches(name)');

      if (req) {
        q = applyScope(q, req);
      }

      if (query.start_date) {
        q = q.gte('created_at', query.start_date);
      }
      if (query.end_date) {
        q = q.lte('created_at', query.end_date);
      }

      return q;
    });

    let rentalCount = 0;
    let completedSalesCount = 0;
    let totalContractValue = 0;
    let totalDownpaymentCollected = 0;

    const modelMap = {};
    const branchMap = {};

    (records || []).forEach(r => {
      const price = Number(r.total_price) || 0;
      const dp = Number(r.downpayment_paid) || 0;
      totalContractValue += price;
      totalDownpaymentCollected += dp;

      if (r.status === 'completed') completedSalesCount++;
      else rentalCount++;

      const modelName = r.ev_models?.name || 'EV Bike';
      modelMap[modelName] = (modelMap[modelName] || 0) + 1;

      const branchName = r.branches?.name || 'Head Office';
      branchMap[branchName] = (branchMap[branchName] || 0) + 1;
    });

    return {
      summary: {
        total_contracts: (records || []).length,
        active_rentals: rentalCount,
        completed_sales: completedSalesCount,
        total_contract_value: totalContractValue,
        total_downpayment_collected: totalDownpaymentCollected
      },
      by_model: Object.entries(modelMap).map(([name, count]) => ({ name, count })),
      by_branch: Object.entries(branchMap).map(([name, count]) => ({ name, count }))
    };
  }
}

module.exports = new ReportsService();
