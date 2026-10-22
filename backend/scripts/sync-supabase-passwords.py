import subprocess
import os

env_path = '/home/ubuntu/supabase-docker/supabase/docker/.env'
if not os.path.exists(env_path):
    print("Error: .env not found at", env_path)
    exit(1)

pw = None
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith('POSTGRES_PASSWORD='):
            pw = line.split('=', 1)[1].strip("'\"")
            break

if not pw:
    print("Error: POSTGRES_PASSWORD not found in .env")
    exit(1)

print("Found POSTGRES_PASSWORD:", pw[:4] + '****')

sql = f"""
ALTER USER anon WITH PASSWORD '{pw}';
ALTER USER authenticated WITH PASSWORD '{pw}';
ALTER USER authenticator WITH PASSWORD '{pw}';
ALTER USER dashboard_user WITH PASSWORD '{pw}';
ALTER USER pgbouncer WITH PASSWORD '{pw}';
ALTER USER postgres WITH PASSWORD '{pw}';
ALTER USER service_role WITH PASSWORD '{pw}';
ALTER USER supabase_admin WITH PASSWORD '{pw}';
ALTER USER supabase_auth_admin WITH PASSWORD '{pw}';
ALTER USER supabase_functions_admin WITH PASSWORD '{pw}';
ALTER USER supabase_replication_admin WITH PASSWORD '{pw}';
ALTER USER supabase_storage_admin WITH PASSWORD '{pw}';
"""

p = subprocess.Popen(
    ['sudo', 'docker', 'exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', '_supabase'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)
out, err = p.communicate(input=sql)
print("STDOUT:", out)
if err:
    print("STDERR:", err)

# Restart services that depend on db auth
print("Restarting supabase-rest and supabase-auth...")
subprocess.run(['sudo', 'docker', 'restart', 'supabase-rest', 'supabase-auth', 'supabase-storage', 'supabase-meta'])
print("Done!")
