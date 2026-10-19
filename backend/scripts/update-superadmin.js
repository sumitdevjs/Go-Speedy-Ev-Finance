const bcrypt = require('bcryptjs');
const supabase = require('../src/config/db');

/**
 * CLI utility to update Super Admin credentials (email, phone, name, password)
 * 
 * Usage:
 *   node scripts/update-superadmin.js --email "new@company.com"
 *   node scripts/update-superadmin.js --phone "9876543210"
 *   node scripts/update-superadmin.js --name "Admin Name"
 *   node scripts/update-superadmin.js --password "NewPass@2026"
 *   node scripts/update-superadmin.js --email "new@company.com" --password "NewPass@2026"
 */
async function updateSuperadmin() {
  const args = process.argv.slice(2);
  const updates = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      updates.email = args[++i].trim();
    } else if (args[i] === '--phone' && args[i + 1]) {
      updates.phone = args[++i].trim();
    } else if (args[i] === '--name' && args[i + 1]) {
      updates.name = args[++i].trim();
    } else if (args[i] === '--password' && args[i + 1]) {
      const pwd = args[++i].trim();
      if (pwd.length < 6) {
        console.error('Error: Password must be at least 6 characters.');
        process.exit(1);
      }
      updates.password_hash = await bcrypt.hash(pwd, 10);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log('Usage:');
    console.log('  node scripts/update-superadmin.js --email "<new_email>"');
    console.log('  node scripts/update-superadmin.js --phone "<10_digit_phone>"');
    console.log('  node scripts/update-superadmin.js --password "<new_password>"');
    console.log('  node scripts/update-superadmin.js --name "<full_name>"');
    process.exit(1);
  }

  updates.updated_at = new Date().toISOString();

  console.log('Updating Super Admin in live database with:', Object.keys(updates).join(', '));

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('role', 'super_admin')
    .select('id, name, email, phone, role');

  if (error) {
    console.error('Failed to update Super Admin:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('No Super Admin account found in database.');
    process.exit(1);
  }

  const user = data[0];
  console.log('Super Admin successfully updated!');
  console.log('----------------------------------------------------');
  console.log(`Name:     ${user.name}`);
  console.log(`Email:    ${user.email}`);
  console.log(`Phone:    ${user.phone}`);
  console.log(`Role:     ${user.role}`);
  console.log('----------------------------------------------------');
  console.log('You can now log in using your updated credentials.');
  process.exit(0);
}

updateSuperadmin();
