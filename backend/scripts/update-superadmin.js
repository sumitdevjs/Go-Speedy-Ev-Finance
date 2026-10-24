const bcrypt = require('bcryptjs');
const supabase = require('../src/config/db');

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
        process.exit(1);
      }
      updates.password_hash = await bcrypt.hash(pwd, 10);
    }
  }

  if (Object.keys(updates).length === 0) {
    process.exit(1);
  }

  updates.updated_at = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
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

updateSuperadmin();
