require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../src/config/db');

async function cleanDatabase() {
  console.log('=== STARTING SUPABASE DATABASE CLEANUP ===');

  const superAdminId = '1ba61cc7-0896-41b5-8cc9-7728bb1630d3';
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in .env');
  }
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // 1. Ensure Super Admin user exists using secure environment variables
  console.log('1. Ensuring Super Admin user is configured with credentials from .env...');
  const { error: saErr } = await supabase.from('users').upsert({
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
  if (saErr) console.warn('Warning upserting super admin:', saErr.message);

  // 3. Unlink FK references in dependent tables so FK constraints are not violated
  console.log('3. Unlinking FK references in audit_logs, users, and other tables...');
  try {
    await supabase.from('audit_logs').update({ user_id: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('Audit logs notice:', e.message);
  }

  try {
    await supabase.from('users').update({ created_by: null, branch_id: null, head_office_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('Users unlinking notice:', e.message);
  }

  try {
    await supabase.from('payments').update({ branch_id: null, head_office_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('Payments unlinking notice:', e.message);
  }

  try {
    await supabase.from('tenants').update({ branch_id: null, head_office_id: null, created_by: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('Tenants unlinking notice:', e.message);
  }

  try {
    await supabase.from('bookings').update({ branch_id: null, head_office_id: null, created_by: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('Bookings unlinking notice:', e.message);
  }

  try {
    await supabase.from('ev_models').update({ branch_id: null, head_office_id: null, created_by: superAdminId }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('EV Models unlinking notice:', e.message);
  }

  try {
    await supabase.from('old_evs').update({ branch_id: null, head_office_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {
    console.log('Old EVs unlinking notice:', e.message);
  }

  // 4. Delete all dummy users (anyone that is not the Super Admin)
  console.log('4. Fetching dummy users to delete...');
  const { data: usersToDelete, error: fetchUsersErr } = await supabase
    .from('users')
    .select('id, email, name')
    .neq('role', 'super_admin');

  if (usersToDelete && usersToDelete.length > 0) {
    const userIds = usersToDelete.map(u => u.id);
    console.log(`Deleting ${userIds.length} dummy users...`);
    // Delete in chunks of 20
    for (let i = 0; i < userIds.length; i += 20) {
      const chunk = userIds.slice(i, i + 20);
      const { error: delErr } = await supabase.from('users').delete().in('id', chunk);
      if (delErr) console.error('Error deleting user chunk:', delErr.message);
    }
    console.log('Dummy users deleted successfully.');
  } else {
    console.log('No dummy users found to delete.');
  }

  // 5. Delete all dummy branches (Wards)
  console.log('5. Fetching dummy branches to delete...');
  const { data: branchesToDelete, error: fetchBranchesErr } = await supabase
    .from('branches')
    .select('id, name, code');

  if (branchesToDelete && branchesToDelete.length > 0) {
    const branchIds = branchesToDelete.map(b => b.id);
    console.log(`Deleting ${branchIds.length} dummy branches...`);
    // Delete in chunks of 20
    for (let i = 0; i < branchIds.length; i += 20) {
      const chunk = branchIds.slice(i, i + 20);
      const { error: delErr } = await supabase.from('branches').delete().in('id', chunk);
      if (delErr) console.error('Error deleting branch chunk:', delErr.message);
    }
    console.log('Dummy branches deleted successfully.');
  } else {
    console.log('No dummy branches found to delete.');
  }

  // 6. Delete all dummy head offices
  console.log('6. Deleting dummy head offices...');
  try {
    const { data: delHO, error: hoErr } = await supabase.from('head_offices').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id, name');
    if (hoErr) console.error('Error deleting head offices:', hoErr.message);
    else console.log(`Deleted ${delHO ? delHO.length : 0} dummy head offices.`);
  } catch (e) {
    console.error('Head office deletion failed:', e.message);
  }

  // 7. Verification
  console.log('7. Verifying database state...');
  const { data: finalUsers } = await supabase.from('users').select('id, name, email, phone, role');
  const { data: finalBranches } = await supabase.from('branches').select('id, name, code');
  const { data: finalHOs } = await supabase.from('head_offices').select('id, name, code');

  console.log('----------------------------------------------------');
  console.log('CLEANUP SUMMARY:');
  console.log('Remaining Users:', finalUsers);
  console.log('Remaining Branches count:', finalBranches ? finalBranches.length : 0);
  console.log('Remaining Head Offices:', finalHOs);
  console.log('----------------------------------------------------');
  console.log(`Super Admin login is active for email: ${adminEmail} (Credentials configured via .env)`);
  console.log('Ready for Super Admin to create custom Wards, HO Admins, Ward Admins, and Staff dynamically!');
}

cleanDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
