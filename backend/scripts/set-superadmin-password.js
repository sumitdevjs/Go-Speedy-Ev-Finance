const bcrypt = require('bcryptjs');
const supabase = require('../src/config/db');

async function setSuperadminPassword() {
  const newPassword = process.argv[2];

  if (!newPassword || newPassword.trim().length < 6) {
    process.exit(1);
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('role', 'super_admin')
      .select('id');

    if (error || !data || data.length === 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch {
    process.exit(1);
  }
}

setSuperadminPassword();
