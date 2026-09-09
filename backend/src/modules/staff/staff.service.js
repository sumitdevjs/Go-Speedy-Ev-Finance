const supabase = require('../../config/db');
const bcrypt = require('bcryptjs');
const { buildDiff } = require('../../utils/auditLog');

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

  async updateStaff(id, updates, requestingUserId) {
    // Mirrors the self-deactivate guard below: an admin can still edit their own
    // name/phone/email, just not their own role — otherwise a solo admin could
    // accidentally demote themselves out of the admin console.
    if (requestingUserId && id === requestingUserId && 'role' in updates) {
      throw new Error('Cannot change your own role');
    }

    // Fetch the pre-update row so the audit log can show a real before → after
    // diff instead of just dumping the new request body.
    const { data: before, error: fetchError } = await supabase
      .from('users')
      .select('name, phone, email, role, is_active')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

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

    const diff = buildDiff(before, updates);
    return { data, diff };
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

    const { data: before, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, is_active')
      .single();

    if (error) throw error;

    const diff = buildDiff(before, { is_active });
    return { data, diff };
  }
}

module.exports = new StaffService();
