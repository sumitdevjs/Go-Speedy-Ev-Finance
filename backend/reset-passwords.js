/**
 * Script to reset admin and staff passwords in Supabase
 * Run: node reset-passwords.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPasswords() {
  const users = [
    { phone: '9999999999', email: 'admin@gmail.com', name: 'Admin', role: 'admin', password: 'Admin@123' },
    { phone: '8888888888', email: 'staff@gmail.com', name: 'Staff', role: 'staff', password: 'Staff@123' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);

    // Try update first
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', u.phone)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: hash, is_active: true })
        .eq('phone', u.phone);
      if (error) console.error(`❌ Update failed for ${u.phone}:`, error.message);
      else console.log(`✅ Password reset for ${u.role} (${u.phone})`);
    } else {
      // Insert if not exists
      const { error } = await supabase
        .from('users')
        .insert({ name: u.name, phone: u.phone, email: u.email, password_hash: hash, role: u.role, is_active: true });
      if (error) console.error(`❌ Insert failed for ${u.phone}:`, error.message);
      else console.log(`✅ Created ${u.role} user (${u.phone})`);
    }
  }

  console.log('\nDone! Try logging in with:');
  console.log('  Admin: 9999999999 / Admin@123');
  console.log('  Staff: 8888888888 / Staff@123');
}

resetPasswords().catch(console.error);
