const supabase = require('../../config/db');

class ModelsService {
  async getAllModels() {
    const { data, error } = await supabase
      .from('ev_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createModel(modelData, createdBy) {
    const { data, error } = await supabase
      .from('ev_models')
      .insert([{
        ...modelData,
        created_by: createdBy
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateModel(id, updates) {
    // If trying to change price or deactivate, check for active rentals
    if (updates.total_price !== undefined || updates.is_active === false) {
      const { count, error: countError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('ev_model_id', id)
        .eq('status', 'rented');

      if (countError) throw countError;

      if (count > 0) {
        if (updates.total_price !== undefined) {
          throw new Error(`Cannot change price: there are ${count} active rentals using this model`);
        }
        if (updates.is_active === false) {
          throw new Error(`Cannot deactivate: there are ${count} active rentals using this model`);
        }
      }
    }

    const { data, error } = await supabase
      .from('ev_models')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new ModelsService();
