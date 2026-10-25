const supabase = require('../../config/db');
const crypto = require('crypto');

class TransfersService {
  async getTransfers(query = {}, req = null) {
    let queryBuilder = supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'stock_transfer')
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: logs, error } = await queryBuilder;
    if (error) throw error;

    let transfers = (logs || []).map(l => ({
      ...l.changes,
      audit_id: l.id,
      created_at: l.created_at || l.changes?.created_at
    })).filter(t => t && t.transfer_id);

    if (query.status && query.status !== 'all') {
      transfers = transfers.filter(t => t.status === query.status);
    }

    if (query.branch_id) {
      transfers = transfers.filter(t => t.from_branch_id === query.branch_id || t.to_branch_id === query.branch_id);
    }

    if (req && req.user) {
      const { role, branch_id, head_office_id } = req.user;
      const isSuper = role === 'super_admin' || (role === 'admin' && !req.user.ward_area);
      if (!isSuper) {
        if (role === 'branch_admin' || role === 'staff') {
          if (!branch_id) {
            transfers = [];
          } else {
            transfers = transfers.filter(t => t.from_branch_id === branch_id || t.to_branch_id === branch_id);
          }
        } else if (role === 'ho_admin') {
          if (!head_office_id) {
            transfers = [];
          } else {
            const { data: hoBranches } = await supabase.from('branches').select('id').eq('head_office_id', head_office_id);
            const hoBranchIds = new Set((hoBranches || []).map(b => b.id));
            transfers = transfers.filter(t => 
              (t.from_branch_id && hoBranchIds.has(t.from_branch_id)) ||
              (t.to_branch_id && hoBranchIds.has(t.to_branch_id))
            );
          }
        }
      }
    }

    const { data: models } = await supabase.from('ev_models').select('id, name, company');
    const modelMap = new Map((models || []).map(m => [m.id, m]));

    const { data: branches } = await supabase.from('branches').select('id, name, code, ward_area');
    const branchMap = new Map((branches || []).map(b => [b.id, b]));

    transfers = transfers.map(t => ({
      ...t,
      model: modelMap.get(t.ev_model_id) || { name: t.model_name || 'EV Model' },
      from_branch: branchMap.get(t.from_branch_id) || { name: t.from_branch_name || 'Head Office' },
      to_branch: branchMap.get(t.to_branch_id) || { name: t.to_branch_name || 'Branch' }
    }));

    return transfers;
  }

  async initiateTransfer(data, user) {
    const { from_branch_id, to_branch_id, from_ward_area, to_ward_area, ev_model_id, quantity, notes } = data;

    if (!ev_model_id) throw new Error('EV Model is required');
    if (!quantity || Number(quantity) <= 0) throw new Error('Valid quantity is required');

    const isSuper = user.role === 'super_admin' || (user.role === 'admin' && !user.ward_area);
    if (!isSuper) {
      if (user.role === 'branch_admin' || user.role === 'staff') {
        if (!user.branch_id || !from_branch_id || user.branch_id !== from_branch_id) {
          throw new Error('Access denied: Cannot initiate transfer from another branch');
        }
      } else if (user.role === 'ho_admin') {
        if (!user.head_office_id) {
          throw new Error('Access denied: HO admin has no assigned Head Office');
        }
        if (from_branch_id) {
          const { data: fb } = await supabase.from('branches').select('head_office_id').eq('id', from_branch_id).single();
          if (fb?.head_office_id && fb.head_office_id !== user.head_office_id) {
            throw new Error('Access denied: Source branch belongs to another Head Office');
          }
        }
        if (to_branch_id) {
          const { data: tb } = await supabase.from('branches').select('head_office_id').eq('id', to_branch_id).single();
          if (tb?.head_office_id && tb.head_office_id !== user.head_office_id) {
            throw new Error('Access denied: Destination branch belongs to another Head Office');
          }
        }
      }
    }

    const transferId = `TRF-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const { data: model } = await supabase.from('ev_models').select('name').eq('id', ev_model_id).single();
    const { data: fromBranch } = from_branch_id ? await supabase.from('branches').select('name').eq('id', from_branch_id).single() : { data: null };
    const { data: toBranch } = to_branch_id ? await supabase.from('branches').select('name').eq('id', to_branch_id).single() : { data: null };

    const payload = {
      transfer_id: transferId,
      from_branch_id: from_branch_id || null,
      from_branch_name: fromBranch?.name || from_ward_area || 'Head Office (HO)',
      from_ward_area: from_ward_area || 'HO Central',
      to_branch_id: to_branch_id || null,
      to_branch_name: toBranch?.name || to_ward_area || 'Destination Ward',
      to_ward_area: to_ward_area || 'Destination Ward',
      ev_model_id,
      model_name: model?.name || 'EV Bike',
      quantity: Number(quantity),
      status: 'requested',
      notes: notes || '',
      initiated_by: user.id,
      initiated_by_name: user.name || 'Admin',
      created_at: new Date().toISOString()
    };

    // 1. Persist in dedicated bike_transfers table
    let entityUuid = null;
    try {
      const { data: bikeTransfer, error: btErr } = await supabase
        .from('bike_transfers')
        .insert([{
          transfer_id: transferId,
          from_branch_id: from_branch_id || null,
          to_branch_id: to_branch_id || null,
          ev_model_id,
          quantity: Number(quantity),
          status: 'requested',
          dispatch_notes: notes || null,
          initiated_by: user.id
        }])
        .select('*')
        .single();

      if (!btErr && bikeTransfer?.id) {
        entityUuid = bikeTransfer.id;
        payload.id = bikeTransfer.id;
      }
    } catch (_) { }

    // 2. Insert into audit_logs with UUID entity reference (never string TRF-...)
    const { error: auditErr } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: user.id,
        user_role: user.role,
        action: 'INITIATED',
        entity_type: 'stock_transfer',
        entity_id: entityUuid || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null),
        changes: payload
      }]);

    if (auditErr) throw auditErr;
    return payload;
  }

  async dispatchTransfer(transferId, data, user) {
    const { dispatch_notes, challan_number, driver_name, driver_phone } = data;

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'stock_transfer');

    if (error) throw error;
    const targetLog = (logs || []).find(l => l.changes && l.changes.transfer_id === transferId);
    if (!targetLog) throw new Error('Transfer record not found');

    if (targetLog.changes?.status !== 'requested') {
      throw new Error(`Cannot dispatch transfer in '${targetLog.changes?.status}' status`);
    }

    const isSuper = user.role === 'super_admin' || (user.role === 'admin' && !user.ward_area);
    if (!isSuper) {
      if (user.role === 'branch_admin' || user.role === 'staff') {
        if (!user.branch_id || !targetLog.changes?.from_branch_id || user.branch_id !== targetLog.changes.from_branch_id) {
          throw new Error('Access denied: Only dispatching branch staff can dispatch this transfer');
        }
      } else if (user.role === 'ho_admin') {
        if (!user.head_office_id) {
          throw new Error('Access denied: HO admin has no assigned Head Office');
        }
        const fromBranchId = targetLog.changes?.from_branch_id;
        if (fromBranchId) {
          const { data: fb } = await supabase.from('branches').select('head_office_id').eq('id', fromBranchId).single();
          if (fb?.head_office_id && fb.head_office_id !== user.head_office_id) {
            throw new Error('Access denied: Transfer belongs to another Head Office');
          }
        }
      }
    }

    const updated = {
      ...targetLog.changes,
      status: 'in_transit',
      dispatched_at: new Date().toISOString(),
      dispatched_by: user.id,
      dispatched_by_name: user.name,
      dispatch_notes: dispatch_notes || '',
      challan_number: challan_number || `CH-${Date.now().toString().slice(-6)}`,
      driver_name: driver_name || '',
      driver_phone: driver_phone || ''
    };

    await supabase.from('audit_logs').update({ changes: updated }).eq('id', targetLog.id);
    try {
      await supabase.from('bike_transfers').update({
        status: 'in_transit',
        dispatched_by: user.id,
        dispatch_notes: dispatch_notes || null,
        challan_number: updated.challan_number,
        driver_name: driver_name || null,
        driver_phone: driver_phone || null,
        updated_at: new Date().toISOString()
      }).eq('transfer_id', transferId);
    } catch (_) {}

    return updated;
  }

  async receiveTransfer(transferId, data, user) {
    const { receive_notes, condition_received } = data;

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'stock_transfer');

    if (error) throw error;
    const targetLog = (logs || []).find(l => l.changes && l.changes.transfer_id === transferId);
    if (!targetLog) throw new Error('Transfer record not found');

    if (targetLog.changes?.status !== 'in_transit') {
      throw new Error(`Cannot receive transfer in '${targetLog.changes?.status}' status. Transfer must be in transit.`);
    }

    if (!isSuper) {
      if (user.role === 'branch_admin' || user.role === 'staff') {
        if (!user.branch_id || !targetLog.changes?.to_branch_id || user.branch_id !== targetLog.changes.to_branch_id) {
          throw new Error('Access denied: Only receiving branch staff can receive this transfer');
        }
      } else if (user.role === 'ho_admin') {
        if (!user.head_office_id) {
          throw new Error('Access denied: HO admin has no assigned Head Office');
        }
        const toBranchId = targetLog.changes?.to_branch_id;
        if (toBranchId) {
          const { data: tb } = await supabase.from('branches').select('head_office_id').eq('id', toBranchId).single();
          if (tb?.head_office_id && tb.head_office_id !== user.head_office_id) {
            throw new Error('Access denied: Transfer belongs to another Head Office');
          }
        }
      }
    }

    const updated = {
      ...targetLog.changes,
      status: 'received',
      received_at: new Date().toISOString(),
      received_by: user.id,
      received_by_name: user.name,
      receive_notes: receive_notes || 'Stock physically verified and accepted',
      condition_received: condition_received || 'Good'
    };

    await supabase.from('audit_logs').update({ changes: updated }).eq('id', targetLog.id);
    try {
      await supabase.from('bike_transfers').update({
        status: 'received',
        received_by: user.id,
        receive_notes: receive_notes || null,
        condition_received: condition_received || 'Good',
        updated_at: new Date().toISOString()
      }).eq('transfer_id', transferId);
    } catch (_) {}

    try {
      const modelId = updated.ev_model_id;
      const { data: model } = await supabase.from('ev_models').select('stock_logs').eq('id', modelId).single();
      if (model) {
        const stockLogs = Array.isArray(model.stock_logs) ? model.stock_logs : [];
        stockLogs.push({
          date: new Date().toISOString(),
          type: 'transfer',
          from: updated.from_ward_area || updated.from_branch_name,
          to: updated.to_ward_area || updated.to_branch_name,
          quantity: updated.quantity,
          transfer_id: transferId,
          received_by: user.name
        });
        await supabase.from('ev_models').update({ stock_logs: stockLogs }).eq('id', modelId);
      }
    } catch (e) {
      console.warn('Non-fatal: could not update stock_logs on model', e);
    }

    return updated;
  }

  async cancelTransfer(transferId, data, user) {
    const { cancel_reason } = data;

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'stock_transfer');

    if (error) throw error;
    const targetLog = (logs || []).find(l => l.changes && l.changes.transfer_id === transferId);
    if (!targetLog) throw new Error('Transfer record not found');

    if (targetLog.changes?.status !== 'requested') {
      throw new Error(`Cannot cancel transfer in '${targetLog.changes?.status}' status`);
    }

    if (!isSuper) {
      if (user.role === 'branch_admin' || user.role === 'staff') {
        if (!user.branch_id || !targetLog.changes?.from_branch_id || user.branch_id !== targetLog.changes.from_branch_id) {
          throw new Error('Access denied: Cannot cancel transfer belonging to another branch');
        }
      } else if (user.role === 'ho_admin') {
        if (!user.head_office_id) {
          throw new Error('Access denied: HO admin has no assigned Head Office');
        }
        const fromBranchId = targetLog.changes?.from_branch_id;
        if (fromBranchId) {
          const { data: fb } = await supabase.from('branches').select('head_office_id').eq('id', fromBranchId).single();
          if (fb?.head_office_id && fb.head_office_id !== user.head_office_id) {
            throw new Error('Access denied: Transfer belongs to another Head Office');
          }
        }
      }
    }

    const updated = {
      ...targetLog.changes,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancelled_by_name: user.name,
      cancel_reason: cancel_reason || 'Cancelled by admin'
    };

    await supabase.from('audit_logs').update({ changes: updated }).eq('id', targetLog.id);
    try {
      await supabase.from('bike_transfers').update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      }).eq('transfer_id', transferId);
    } catch (_) {}

    return updated;
  }
}

module.exports = new TransfersService();
