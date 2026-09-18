const supabase = require('../../config/db');

class OldEvsService {
  async getAvailableOldEvs() {
    const { data, error } = await supabase
      .from('old_evs')
      .select('*, original_ev_model:original_ev_model_id (name, company, total_price)')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getAllOldEvs() {
    const { data, error } = await supabase
      .from('old_evs')
      .select('*, original_ev_model:original_ev_model_id (name, company, total_price)')
      .order('created_at', { ascending: false });

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
