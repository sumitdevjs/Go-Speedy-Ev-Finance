const supabase = require('../../config/db');
const { calcBalance } = require('../../utils/balanceCalc');
const { applyScope } = require('../../middleware/scope');

class PaymentsService {
  async getPayments(tenantId, req = null) {
    let query = supabase.from('payments').select('*, users(name), branch:branch_id (id, name, code)');
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else if (req) {
      query = applyScope(query, req);
    }

    const { data, error } = await query.order('payment_date', { ascending: false }).order('created_at', { ascending: false });

    if (error) throw error;
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

    // 2. Insert Payment with branch attribution
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        tenant_id,
        amount,
        payment_date,
        mode,
        notes,
        gst_amount: gst_amount || 0,
        late_fee_paid: late_fee_paid || 0,
        is_penalty_waiver: Boolean(is_penalty_waiver),
        branch_id: tenant.branch_id || null,
        head_office_id: tenant.head_office_id || null,
        collected_by: collectedBy
      }])
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
