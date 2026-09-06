const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');

class StaffService {
  async getAllStaff() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, email, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createStaff({ name, phone, email, password, role }, createdBy) {
    const password_hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        phone,
        email: email || null,
        password_hash,
        role,
        is_active: true,
        created_by: createdBy
      }])
      .select('id, name, phone, email, role, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Phone or email already exists');
      throw error;
    }
    
    return data;
  }

  async updateStaff(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, phone, email, role, is_active')
      .single();
      
    if (error) {
      if (error.code === '23505') throw new Error('Phone or email already exists');
      throw error;
    }
    return data;
  }

  async changePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);
    
    const { error } = await supabase
      .from('users')
      .update({ password_hash, refresh_token_hash: null }) // force logout on pwd change
      .eq('id', id);
      
    if (error) throw error;
  }

  async toggleActive(id, is_active, requestingUserId) {
    if (id === requestingUserId) {
      throw new Error('Cannot deactivate yourself');
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, is_active')
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new StaffService();
