const supabase = require('../../config/db');
const crypto = require('crypto');
const { fetchAll } = require('../../utils/fetchAll');

class TransfersService {
  async getTransfers(query = {}, req = null) {
    const rows = await fetchAll(() => supabase.from('bike_transfers').select('*').order('created_at', { ascending: false }));
    let transfers = rows.map(row => ({ ...row.details, ...row }));
    const user = req?.user;
    if (user && user.role !== 'super_admin' && user.role !== 'admin') {
      if (user.role === 'branch_admin' || user.role === 'staff') {
        transfers = transfers.filter(t => user.branch_id && [t.from_branch_id, t.to_branch_id].includes(user.branch_id));
      } else if (user.role === 'ho_admin' && user.head_office_id) {
        const { data: branches, error } = await supabase.from('branches').select('id').eq('head_office_id', user.head_office_id);
        if (error) throw error;
        const ids = new Set((branches || []).map(b => b.id));
        transfers = transfers.filter(t => ids.has(t.from_branch_id) || ids.has(t.to_branch_id));
      } else transfers = [];
    }
    if (query.status && query.status !== 'all') transfers = transfers.filter(t => t.status === query.status);
    if (query.branch_id) transfers = transfers.filter(t => [t.from_branch_id, t.to_branch_id].includes(query.branch_id));
    const models = await fetchAll(() => supabase.from('ev_models').select('id, name, company'));
    const branches = await fetchAll(() => supabase.from('branches').select('id, name, code, ward_area'));
    const modelMap = new Map(models.map(m => [m.id, m]));
    const branchMap = new Map(branches.map(b => [b.id, b]));
    return transfers.map(t => ({ ...t,
      model_name: t.model_name || modelMap.get(t.ev_model_id)?.name || 'EV Model',
      from_branch_name: t.from_branch_name || branchMap.get(t.from_branch_id)?.name || t.from_ward_area || 'Head Office',
      to_branch_name: t.to_branch_name || branchMap.get(t.to_branch_id)?.name || t.to_ward_area || 'Head Office',
      model: modelMap.get(t.ev_model_id) || { name: t.model_name || 'EV Model' },
      from_branch: branchMap.get(t.from_branch_id) || { name: t.from_branch_name || 'Head Office' },
      to_branch: branchMap.get(t.to_branch_id) || { name: t.to_branch_name || 'Head Office' },
    }));
  }

  async initiateTransfer(data, user) {
    if (!data.ev_model_id || !Number.isSafeInteger(Number(data.quantity)) || Number(data.quantity) <= 0) {
      throw new Error('EV model and a positive integer quantity are required');
    }
    // Database checks the actor's current branch/HO and writes transfer + audit
    // together. No successful response is possible after a partial write.
    const { data: transfer, error } = await supabase.rpc('initiate_transfer', {
      p_actor: user.id,
      p_data: {
        transfer_id: `TRF-${crypto.randomUUID()}`, ev_model_id: data.ev_model_id,
        from_branch_id: data.from_branch_id || null, to_branch_id: data.to_branch_id || null,
        from_ward_area: data.from_ward_area || '', to_ward_area: data.to_ward_area || '',
        notes: data.notes || '', quantity: Number(data.quantity),
      },
    });
    if (error) throw error;
    return transfer;
  }

  async transition(transferId, action, data, user) {
    const { data: transfer, error } = await supabase.rpc('change_transfer', {
      p_transfer: transferId, p_action: action, p_data: data, p_actor: user.id,
    });
    if (error) throw error;
    return transfer;
  }
  dispatchTransfer(id, data, user) { return this.transition(id, 'dispatch', data, user); }
  receiveTransfer(id, data, user) { return this.transition(id, 'receive', data, user); }
  cancelTransfer(id, data, user) { return this.transition(id, 'cancel', data, user); }
}
module.exports = new TransfersService();
