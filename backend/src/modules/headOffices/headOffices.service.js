const supabase = require('../../config/db');
const { ALL_HEAD_OFFICES } = require('../branches/delhiWardsData');

let inMemoryHeadOffices = [...ALL_HEAD_OFFICES];

class HeadOfficesService {
  async getAllHeadOffices() {
    try {
      const { data, error } = await supabase
        .from('head_offices')
        .select('*, branches (id, name, code, ward_no, is_active)')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // fallback
    }

    return inMemoryHeadOffices;
  }

  async getDropdown() {
    try {
      const { data, error } = await supabase
        .from('head_offices')
        .select('id, name, code, city')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // fallback
    }

    return inMemoryHeadOffices.map(ho => ({
      id: ho.id,
      name: ho.name,
      code: ho.code,
      city: ho.city,
    }));
  }

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('head_offices')
        .select('*, branches (*)')
        .eq('id', id)
        .single();

      if (!error && data) return data;
    } catch (e) {
      // fallback
    }

    const found = inMemoryHeadOffices.find(ho => ho.id === id || ho.code === id);
    if (found) return found;
    throw new Error('Head Office not found');
  }

  async create({ name, code, city, state }) {
    const newHo = {
      id: `ho-custom-${Date.now()}`,
      name,
      code: code.toUpperCase().trim(),
      city,
      state,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('head_offices')
        .insert([{
          name: newHo.name,
          code: newHo.code,
          city: newHo.city,
          state: newHo.state,
          is_active: true,
        }])
        .select('*')
        .single();

      if (!error && data) {
        inMemoryHeadOffices.push({ ...newHo, ...data });
        return data;
      }
    } catch (e) {
      // fallback
    }

    inMemoryHeadOffices.push(newHo);
    return newHo;
  }

  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('head_offices')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        const idx = inMemoryHeadOffices.findIndex(ho => ho.id === id);
        if (idx >= 0) inMemoryHeadOffices[idx] = { ...inMemoryHeadOffices[idx], ...data };
        return data;
      }
    } catch (e) {
      // fallback
    }

    const idx = inMemoryHeadOffices.findIndex(ho => ho.id === id || ho.code === id);
    if (idx >= 0) {
      inMemoryHeadOffices[idx] = { ...inMemoryHeadOffices[idx], ...updates };
      return inMemoryHeadOffices[idx];
    }
    throw new Error('Head Office not found');
  }
}

module.exports = new HeadOfficesService();
