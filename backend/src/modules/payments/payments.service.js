const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { applyScope } = require('../../middleware/scope');

class PaymentsService {
  async getPayments(tenantId, req = null) {
    let query = supabase.from('payments').select('*, users(id, name, phone, role)');
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else if (req) {
      query = applyScope(query, req);
    }

    if (req?.query?.mode && (req.query.mode === 'cash' || req.query.mode === 'online')) {
      query = query.eq('mode', req.query.mode);
    }
    if (req?.query?.start_date) {
      query = query.gte('payment_date', req.query.start_date);
    }
    if (req?.query?.end_date) {
      query = query.lte('payment_date', req.query.end_date);
    }
    if (req?.query?.collected_by) {
      query = query.eq('collected_by', req.query.collected_by);
    }

    const { data, error } = await query
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    try {
      const tenantIds = [...new Set(data.map(p => p.tenant_id).filter(Boolean))];
      let tMap = new Map();
      if (tenantIds.length > 0) {
        const { data: tList } = await supabase
          .from('tenants')
          .select('id, name, phone, vehicle_number, chassis_no, status, ev_model_id, branch_id, head_office_id, ev_models(name, company)')
          .in('id', tenantIds);
        tMap = new Map((tList || []).map(t => [t.id, t]));
      }

      const branchIds = [...new Set([
        ...data.map(p => p.branch_id),
        ...Array.from(tMap.values()).map(t => t.branch_id)
      ].filter(Boolean))];

      let bMap = new Map();
      if (branchIds.length > 0) {
        const { data: bList } = await supabase
          .from('branches')
          .select('id, name, code, ward_no, ward_area, head_office_id')
          .in('id', branchIds);
        bMap = new Map((bList || []).map(b => [b.id, b]));
      }

      const hoIds = [...new Set([
        ...data.map(p => p.head_office_id),
        ...Array.from(tMap.values()).map(t => t.head_office_id),
        ...Array.from(bMap.values()).map(b => b.head_office_id)
      ].filter(Boolean))];

      let hoMap = new Map();
      if (hoIds.length > 0) {
        const { data: hoList } = await supabase
          .from('head_offices')
          .select('id, name, code, city, state')
          .in('id', hoIds);
        hoMap = new Map((hoList || []).map(h => [h.id, h]));
      }

      data.forEach(p => {
        const tenant = tMap.get(p.tenant_id) || null;
        p.tenant = tenant;

        const branchId = p.branch_id || tenant?.branch_id;
        p.branch = branchId ? (bMap.get(branchId) || null) : null;

        const hoId = p.head_office_id || tenant?.head_office_id || p.branch?.head_office_id;
        p.head_office = hoId ? (hoMap.get(hoId) || null) : null;

        p.ev_model_name = tenant?.ev_models?.name || 'EV Scooter';
        p.collector_name = p.users?.name || 'Staff Member';
      });
    } catch (e) {
      console.error('Error enriching payments:', e);
    }

    return data;
  }

  async recordPayment(paymentData, collectedBy) {
    const { tenant_id, amount, payment_date, mode, notes, gst_amount, late_fee_paid, is_penalty_waiver } = paymentData;

    // 1. Check if tenant exists and is active
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) throw new Error('Tenant not found');
    if (tenant.status !== 'rented') throw new Error(`Cannot record payment: rental status is ${tenant.status}`);

    // 2. Insert Payment with branch attribution if columns exist
    const insertPayload = {
      tenant_id,
      amount,
      payment_date,
      mode,
      notes,
      gst_amount: gst_amount || 0,
      collected_by: collectedBy
    };
    if (tenant.branch_id) insertPayload.branch_id = tenant.branch_id;
    if (tenant.head_office_id) insertPayload.head_office_id = tenant.head_office_id;
    if (late_fee_paid) insertPayload.late_fee_paid = late_fee_paid;
    if (is_penalty_waiver !== undefined) insertPayload.is_penalty_waiver = Boolean(is_penalty_waiver);

    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert([insertPayload])
      .select('*')
      .single();

    if (paymentError) throw paymentError;

    // 3. Re-calculate balance to check for auto-complete
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', tenant_id);
      
    if (allPaymentsError) throw allPaymentsError;

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = calcBalance(tenant, totalPaid);

    let autoCompleted = false;

    // 4. Auto-complete if outstanding is 0
    if (balance.outstanding === 0) {
      const { error: completeError } = await supabase
        .from('tenants')
        .update({ status: 'completed' })
        .eq('id', tenant_id);

      if (!completeError) {
        autoCompleted = true;
      }
    }

    return {
      payment: newPayment,
      balance,
      autoCompleted
    };
  }
}

module.exports = new PaymentsService();
