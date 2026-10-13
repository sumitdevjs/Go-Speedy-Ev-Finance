const supabase = require('../../config/db');
const { applyScope } = require('../../middleware/scope');
const crypto = require('crypto');

class PenaltiesService {
  /**
   * Super Admin / Admin adds penalty of any amount
   */
  async createPenalty(penaltyData, user) {
    const { tenant_id, amount, reason, notes, penalty_date } = penaltyData;

    const penaltyAmount = Number(amount);
    if (!penaltyAmount || penaltyAmount <= 0) {
      throw new Error('Penalty amount must be a positive number');
    }

    // 1. Fetch tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, phone, vehicle_number, branch_id, head_office_id, late_fee_daily_rate, status')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Customer / Contract not found');
    }

    const penaltyId = `pen_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const payload = {
      penalty_id: penaltyId,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      customer_phone: tenant.phone,
      vehicle_number: tenant.vehicle_number || 'N/A',
      branch_id: tenant.branch_id || null,
      head_office_id: tenant.head_office_id || null,
      amount: penaltyAmount,
      reason: reason || 'Payment Overdue Penalty',
      notes: notes || '',
      penalty_date: penalty_date || new Date().toISOString().split('T')[0],
      status: 'unpaid', // unpaid, paid, waived
      created_by: user.id,
      created_by_name: user.name || 'Super Admin',
      created_by_role: user.role,
      created_at: new Date().toISOString()
    };

    // 2. Insert into audit_logs as persistent ledger
    const { data: auditEntry, error: auditError } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: user.id,
        user_role: user.role,
        action: 'PENALTY_LEVIED',
        entity_type: 'penalty',
        entity_id: tenant.id,
        changes: payload
      }])
      .select('*')
      .single();

    if (auditError) throw auditError;

    return {
      penalty: payload,
      audit_id: auditEntry.id
    };
  }

  /**
   * Get all penalties with optional scoping and filters
   */
  async getPenalties(query = {}, req = null) {
    let queryBuilder = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'penalty')
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: logs, error } = await queryBuilder;
    if (error) throw error;

    let penalties = (logs || [])
      .map(l => {
        const p = l.changes || {};
        return {
          ...p,
          audit_log_id: l.id,
          created_at: l.created_at || p.created_at
        };
      })
      .filter(p => p && p.penalty_id);

    // Apply tenant filter
    if (query.tenant_id) {
      penalties = penalties.filter(p => p.tenant_id === query.tenant_id);
    }

    // Apply status filter
    if (query.status && query.status !== 'all') {
      penalties = penalties.filter(p => p.status === query.status);
    }

    // Apply branch scope if user is branch restricted
    if (req && req.user) {
      const { role, branch_id, head_office_id } = req.user;
      const effectiveRole = role === 'super_admin' || (role === 'admin' && !req.user.ward_area) ? 'super_admin' : role;
      
      if (effectiveRole === 'branch_admin' || effectiveRole === 'staff') {
        const userBranch = branch_id || req.headers['x-branch-id'];
        if (userBranch) {
          penalties = penalties.filter(p => !p.branch_id || p.branch_id === userBranch);
        }
      } else if (effectiveRole === 'ho_admin' && head_office_id) {
        penalties = penalties.filter(p => !p.head_office_id || p.head_office_id === head_office_id);
      }
    }

    // Apply search filter
    if (query.search) {
      const s = query.search.toLowerCase();
      penalties = penalties.filter(p => 
        (p.tenant_name && p.tenant_name.toLowerCase().includes(s)) ||
        (p.customer_phone && p.customer_phone.includes(s)) ||
        (p.reason && p.reason.toLowerCase().includes(s)) ||
        (p.vehicle_number && p.vehicle_number.toLowerCase().includes(s))
      );
    }

    // Calculate metrics
    const totalAmount = penalties.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const unpaidAmount = penalties.filter(p => p.status === 'unpaid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const waivedAmount = penalties.filter(p => p.status === 'waived').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const paidAmount = penalties.filter(p => p.status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return {
      data: penalties,
      summary: {
        total_count: penalties.length,
        total_amount: totalAmount,
        unpaid_amount: unpaidAmount,
        waived_amount: waivedAmount,
        paid_amount: paidAmount
      }
    };
  }

  /**
   * Waive a penalty (Super Admin / Authorized admin)
   */
  async waivePenalty(penaltyId, user, waiveReason = '') {
    // Find the log entry with this penalty_id
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'penalty')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const targetLog = (logs || []).find(l => l.changes && l.changes.penalty_id === penaltyId);
    if (!targetLog) {
      throw new Error('Penalty not found');
    }

    const updatedChanges = {
      ...targetLog.changes,
      status: 'waived',
      waived_by: user.id,
      waived_by_name: user.name || 'Super Admin',
      waived_at: new Date().toISOString(),
      waived_reason: waiveReason || 'Waived by Super Admin'
    };

    const { error: updateError } = await supabase
      .from('audit_logs')
      .update({ changes: updatedChanges })
      .eq('id', targetLog.id);

    if (updateError) throw updateError;

    // Log the waiver action
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      user_role: user.role,
      action: 'PENALTY_WAIVED',
      entity_type: 'penalty',
      entity_id: updatedChanges.tenant_id,
      changes: {
        penalty_id: penaltyId,
        amount: updatedChanges.amount,
        waived_by: user.id,
        waived_by_name: user.name,
        reason: waiveReason
      }
    }]);

    return { success: true, penalty: updatedChanges };
  }

  /**
   * Get unpaid manual penalties for a single tenant
   */
  async getTenantActivePenalties(tenantId) {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'penalty')
      .eq('entity_id', tenantId);

    const penalties = (logs || [])
      .map(l => l.changes)
      .filter(p => p && p.penalty_id);

    const unpaid = penalties.filter(p => p.status === 'unpaid');
    const totalUnpaid = unpaid.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return {
      all: penalties,
      unpaid,
      totalUnpaid
    };
  }
}

module.exports = new PenaltiesService();
