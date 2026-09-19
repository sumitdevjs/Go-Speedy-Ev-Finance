const supabase = require('../../config/db');

class HeadOfficesService {
  async getAllHeadOffices() {
    const { data, error } = await supabase
      .from('head_offices')
      .select('*, branches (id, name, code, ward_no, is_active)')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getDropdown() {
    const { data, error } = await supabase
      .from('head_offices')
      .select('id, name, code, city')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async getById(id) {
    const { data, error } = await supabase
      .from('head_offices')
      .select('*, branches (*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create({ name, code, city, state }) {
    const { data, error } = await supabase
      .from('head_offices')
      .insert([{
        name,
        code: code.toUpperCase().trim(),
        city,
        state,
        is_active: true,
      }])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Head Office with this code already exists');
      throw error;
    }
    return data;
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from('head_offices')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new HeadOfficesService();
