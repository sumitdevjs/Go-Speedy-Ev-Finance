const bcrypt = require('bcryptjs');
const supabase = require('../src/config/db');

async function setSuperadminPassword() {
  const newPassword = process.argv[2];

  if (!newPassword || newPassword.trim().length < 6) {
    console.error('Error: Please provide a password with at least 6 characters.');
    console.log('Usage: node scripts/set-superadmin-password.js "<YourNewPassword>"');
    process.exit(1);
  }

  console.log('Updating Super Admin password...');

  const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

  // Update super admin user in Supabase
  const { data, error } = await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    })
    .eq('role', 'super_admin')
    .select('id, name, email, phone, role');

  if (error) {
    console.error('Failed to update password in database:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('Super Admin account not found in database.');
    process.exit(1);
  }

  const updatedUser = data[0];
  console.log('Super Admin password successfully updated in live database!');
  console.log('----------------------------------------------------');
  console.log(`Name:     ${updatedUser.name}`);
  console.log(`Email:    ${updatedUser.email}`);
  console.log(`Phone:    ${updatedUser.phone}`);
  console.log(`Role:     ${updatedUser.role}`);
  console.log(`Password: ${newPassword.trim()}`);
  console.log('----------------------------------------------------');
  console.log('You can now log into the application using these credentials.');
  process.exit(0);
}

setSuperadminPassword();
