const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { applyScope } = require('../../middleware/scope');

class PaymentsService {
  async getPayments(tenantId, req = null) {
    let query = supabase.from('payments').select('*, users(name)');
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else if (req) {
      query = applyScope(query, req);
    }

    const { data, error } = await query.order('payment_date', { ascending: false }).order('created_at', { ascending: false });

    if (error) throw error;

    if (data && data.some(p => p.branch_id)) {
      try {
        const branchIds = [...new Set(data.map(p => p.branch_id).filter(Boolean))];
        if (branchIds.length > 0) {
          const { data: bList } = await supabase.from('branches').select('id, name, code').in('id', branchIds);
          const bMap = new Map((bList || []).map(b => [b.id, b]));
          data.forEach(p => { if (p.branch_id) p.branch = bMap.get(p.branch_id) || null; });
        }
      } catch (e) {}
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
