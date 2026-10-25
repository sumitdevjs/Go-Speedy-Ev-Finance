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

    if (user.role === 'branch_admin' || user.role === 'staff') {
      if (tenant.branch_id && user.branch_id && tenant.branch_id !== user.branch_id) {
        throw new Error('Access denied: Customer belongs to another branch');
      }
    } else if (user.role === 'ho_admin') {
      if (tenant.head_office_id && user.head_office_id && tenant.head_office_id !== user.head_office_id) {
        throw new Error('Access denied: Customer belongs to another Head Office');
      }
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
      .order('created_at', { ascending: false });

    const { data: logs, error } = await queryBuilder;
    if (error) throw error;

    // Deduplicate audit events by canonical penalty_id to prevent inflated metrics,
    // ensuring immutable ownership and tenant fields are preserved from levy events.
    const penaltyMap = new Map();

    (logs || []).forEach(l => {
      const p = l.changes;
      if (!p || !p.penalty_id) return;
      const penId = p.penalty_id;

      if (!penaltyMap.has(penId)) {
        penaltyMap.set(penId, {
          penalty_id: penId,
          tenant_id: p.tenant_id || l.entity_id || null,
          tenant_name: p.tenant_name || null,
          customer_phone: p.customer_phone || null,
          vehicle_number: p.vehicle_number || null,
          branch_id: p.branch_id || null,
          head_office_id: p.head_office_id || null,
          amount: Number(p.amount) || 0,
          reason: p.reason || 'Penalty',
          status: p.status || 'unpaid',
          audit_log_id: l.id,
          created_at: l.created_at || p.created_at,
          waived_reason: p.waived_reason || null,
          waived_by: p.waived_by || null,
          waived_at: p.waived_at || null
        });
      } else {
        const canonical = penaltyMap.get(penId);
        // Backfill immutable ownership & customer fields if missing from newer event
        if (!canonical.tenant_id && (p.tenant_id || l.entity_id)) {
          canonical.tenant_id = p.tenant_id || l.entity_id;
        }
        if (!canonical.branch_id && p.branch_id) canonical.branch_id = p.branch_id;
        if (!canonical.head_office_id && p.head_office_id) canonical.head_office_id = p.head_office_id;
        if (!canonical.tenant_name && p.tenant_name) canonical.tenant_name = p.tenant_name;
        if (!canonical.customer_phone && p.customer_phone) canonical.customer_phone = p.customer_phone;
        if (!canonical.vehicle_number && p.vehicle_number) canonical.vehicle_number = p.vehicle_number;
      }

      const canonical = penaltyMap.get(penId);
      if (l.action === 'PENALTY_WAIVED' || p.status === 'waived') {
        canonical.status = 'waived';
        canonical.waived_reason = p.reason || p.waived_reason || canonical.waived_reason || 'Waived';
        canonical.waived_by = p.waived_by || canonical.waived_by;
        canonical.waived_at = p.waived_at || l.created_at || canonical.waived_at;
      }
    });

    let penalties = Array.from(penaltyMap.values());

    // Apply strict branch/HO scope before returning records
    if (req && req.user) {
      const { role, branch_id, head_office_id } = req.user;
      const effectiveRole = role === 'super_admin' || (role === 'admin' && !req.user.ward_area) ? 'super_admin' : role;
      
      if (effectiveRole === 'branch_admin' || effectiveRole === 'staff') {
        const userBranch = branch_id || req.headers['x-branch-id'];
        if (!userBranch) {
          penalties = [];
        } else {
          penalties = penalties.filter(p => p.branch_id && p.branch_id === userBranch);
        }
      } else if (effectiveRole === 'ho_admin') {
        if (!head_office_id) {
          penalties = [];
        } else {
          penalties = penalties.filter(p => p.head_office_id && p.head_office_id === head_office_id);
        }
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

    if (user.role === 'branch_admin' || user.role === 'staff') {
      if (targetLog.changes?.branch_id && user.branch_id && targetLog.changes.branch_id !== user.branch_id) {
        throw new Error('Access denied: Cannot waive penalty belonging to another branch');
      }
    } else if (user.role === 'ho_admin') {
      if (targetLog.changes?.head_office_id && user.head_office_id && targetLog.changes.head_office_id !== user.head_office_id) {
        throw new Error('Access denied: Cannot waive penalty belonging to another Head Office');
      }
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
  async getTenantActivePenalties(tenantId, req = null) {
    const { data: tenant, error: fetchErr } = await supabase
      .from('tenants')
      .select('id, branch_id, head_office_id')
      .eq('id', tenantId)
      .maybeSingle();

    if (fetchErr || !tenant) return { all: [], unpaid: [], totalUnpaid: 0 };

    if (req?.user) {
      const u = req.user;
      const isSuper = u.role === 'super_admin' || (u.role === 'admin' && !u.ward_area);
      if (!isSuper) {
        if (u.role === 'branch_admin' || u.role === 'staff') {
          if (!u.branch_id || !tenant.branch_id || tenant.branch_id !== u.branch_id) {
            throw new Error('Access denied: Unauthorized access to tenant penalties');
          }
        } else if (u.role === 'ho_admin') {
          if (!u.head_office_id || !tenant.head_office_id || tenant.head_office_id !== u.head_office_id) {
            throw new Error('Access denied: Tenant penalties belong to another Head Office');
          }
        }
      }
    }

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'penalty')
      .eq('entity_id', tenantId);

    const penaltyMap = new Map();
    (logs || []).forEach(l => {
      const p = l.changes;
      if (p && p.penalty_id) {
        if (!penaltyMap.has(p.penalty_id)) {
          penaltyMap.set(p.penalty_id, { ...p });
        } else {
          const existing = penaltyMap.get(p.penalty_id);
          if (l.action === 'PENALTY_WAIVED' || p.status === 'waived') {
            existing.status = 'waived';
          }
        }
      }
    });

    const penalties = Array.from(penaltyMap.values());
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
