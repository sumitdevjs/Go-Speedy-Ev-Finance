const supabase = require('../../config/db');
const { applyScope } = require('../../middleware/scope');

class OldEvsService {
  async getAvailableOldEvs(req = null) {
    let queryBuilder = supabase
      .from('old_evs')
      .select('*, original_ev_model:original_ev_model_id (name, company, total_price)')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;

    if (data && data.some(ev => ev.branch_id)) {
      try {
        const branchIds = [...new Set(data.map(ev => ev.branch_id).filter(Boolean))];
        if (branchIds.length > 0) {
          const { data: bList } = await supabase.from('branches').select('id, name, code').in('id', branchIds);
          const bMap = new Map((bList || []).map(b => [b.id, b]));
          data.forEach(ev => { if (ev.branch_id) ev.branch = bMap.get(ev.branch_id) || null; });
        }
      } catch (e) {}
    }

    return data;
  }

  async getAllOldEvs(req = null) {
    let queryBuilder = supabase
      .from('old_evs')
      .select('*, original_ev_model:original_ev_model_id (name, company, total_price)')
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;

    if (data && data.some(ev => ev.branch_id)) {
      try {
        const branchIds = [...new Set(data.map(ev => ev.branch_id).filter(Boolean))];
        if (branchIds.length > 0) {
          const { data: bList } = await supabase.from('branches').select('id, name, code').in('id', branchIds);
          const bMap = new Map((bList || []).map(b => [b.id, b]));
          data.forEach(ev => { if (ev.branch_id) ev.branch = bMap.get(ev.branch_id) || null; });
        }
      } catch (e) {}
    }

    return data;
  }

  async updateOldEvPrice(id, price) {
    const { data, error } = await supabase
      .from('old_evs')
      .update({ price })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new OldEvsService();
