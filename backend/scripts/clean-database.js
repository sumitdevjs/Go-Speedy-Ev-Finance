require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../src/config/db');

async function cleanDatabase() {
  const superAdminId = '1ba61cc7-0896-41b5-8cc9-7728bb1630d3';
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in .env');
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // 1. Ensure Super Admin user exists using secure environment variables
  await supabase.from('users').upsert({
    id: superAdminId,
    name: 'Super Admin',
    email: adminEmail,
    phone: null,
    password_hash: passwordHash,
    role: 'super_admin',
    head_office_id: null,
    branch_id: null,
    is_active: true,
  }, { onConflict: 'id' });


  try {
    await supabase.from('audit_logs').update({ user_id: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  try {
    await supabase.from('users').update({ created_by: null, branch_id: null, head_office_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  try {
    await supabase.from('payments').update({ branch_id: null, head_office_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  try {
    await supabase.from('tenants').update({ branch_id: null, head_office_id: null, created_by: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  try {
    await supabase.from('bookings').update({ branch_id: null, head_office_id: null, created_by: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  try {
    await supabase.from('ev_models').update({ branch_id: null, head_office_id: null, created_by: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  try {
    await supabase.from('old_evs').update({ branch_id: null, head_office_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }

  // 3. Delete all dummy users (anyone that is not the Super Admin)
  const { data: usersToDelete } = await supabase
    .from('users')
    .select('id')
    .neq('role', 'super_admin');

  if (usersToDelete && usersToDelete.length > 0) {
    const userIds = usersToDelete.map(u => u.id);
    for (let i = 0; i < userIds.length; i += 20) {
      const chunk = userIds.slice(i, i + 20);
      await supabase.from('users').delete().in('id', chunk);
    }
  }

  // 4. Delete all dummy branches (Wards)
  const { data: branchesToDelete } = await supabase
    .from('branches')
    .select('id');

  if (branchesToDelete && branchesToDelete.length > 0) {
    const branchIds = branchesToDelete.map(b => b.id);
    for (let i = 0; i < branchIds.length; i += 20) {
      const chunk = branchIds.slice(i, i + 20);
      await supabase.from('branches').delete().in('id', chunk);
    }
  }

  // 5. Delete all dummy head offices
  try {
    await supabase.from('head_offices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch { }
}

cleanDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
