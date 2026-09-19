const supabase = require('../../config/db');
const { applyScope } = require('../../middleware/scope');

class OldEvsService {
  async getAvailableOldEvs(req = null) {
    let queryBuilder = supabase
      .from('old_evs')
      .select('*, original_ev_model:original_ev_model_id (name, company, total_price), branch:branch_id (id, name, code)')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  }

  async getAllOldEvs(req = null) {
    let queryBuilder = supabase
      .from('old_evs')
      .select('*, original_ev_model:original_ev_model_id (name, company, total_price), branch:branch_id (id, name, code)')
      .order('created_at', { ascending: false });

    if (req) {
      queryBuilder = applyScope(queryBuilder, req);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
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
