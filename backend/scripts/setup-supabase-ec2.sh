#!/usr/bin/env bash
# ==============================================================================
# Go Speedy EV Finance — 1-Click Supabase Self-Hosted Installer for Ubuntu EC2
# ==============================================================================
set -e

echo "🚀 Starting Supabase Installation on AWS EC2..."

# 1. Update system & install prerequisites
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git openssl pwgen

# 2. Install Docker & Docker Compose Plugin
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker Engine..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker "$USER"
fi

echo "✅ Docker installed successfully."

# 3. Setup Supabase Directory
INSTALL_DIR="/home/ubuntu/supabase-docker"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

if [ ! -d "supabase" ]; then
  echo "📥 Cloning Supabase Docker configuration..."
  git clone --depth 1 https://github.com/supabase/supabase
fi

cd supabase/docker

# 4. Generate Production Secrets
echo "🔐 Generating strong production secrets..."
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
DASHBOARD_PASSWORD=$(openssl rand -hex 12)

# Copy example env
cp .env.example .env

# Generate JWT tokens (ANON and SERVICE_ROLE) using Node or Python if available, or simple base64 HMAC
# Supabase uses standard HS256 JWTs with { role: "anon" } and { role: "service_role" }
# We can generate them with a simple inline node script or openssl
sudo apt-get install -y nodejs npm > /dev/null 2>&1 || true

cat << 'EOF' > generate-keys.js
const crypto = require('crypto');

const jwtSecret = process.argv[2];

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 365 * 10; // 10 years

const anonToken = sign({ role: 'anon', iss: 'supabase', iat: now, exp }, jwtSecret);
const serviceToken = sign({ role: 'service_role', iss: 'supabase', iat: now, exp }, jwtSecret);

console.log(`ANON_KEY=${anonToken}`);
console.log(`SERVICE_ROLE_KEY=${serviceToken}`);
EOF

KEYS_OUTPUT=$(node generate-keys.js "$JWT_SECRET")
ANON_KEY=$(echo "$KEYS_OUTPUT" | grep ANON_KEY | cut -d '=' -f2)
SERVICE_ROLE_KEY=$(echo "$KEYS_OUTPUT" | grep SERVICE_ROLE_KEY | cut -d '=' -f2)
rm -f generate-keys.js

# Detect EC2 private IP
PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 || hostname -I | awk '{print $1}')

# Replace values in .env
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|g" .env
sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|g" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=${ANON_KEY}|g" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|g" .env
sed -i "s|DASHBOARD_USERNAME=.*|DASHBOARD_USERNAME=admin|g" .env
sed -i "s|DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}|g" .env
sed -i "s|API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://${PRIVATE_IP}:8000|g" .env
sed -i "s|SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://${PRIVATE_IP}:8000|g" .env

# 5. Pull & Start Containers
echo "🐳 Starting Supabase Docker containers..."
sudo docker compose pull
sudo docker compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 15

# Save credentials to a secure file
CRED_FILE="/home/ubuntu/supabase-credentials.txt"
cat << EOF > "$CRED_FILE"
================================================================================
🎉 GOSPEEDY SUPABASE SETUP COMPLETE!
================================================================================

Private IP: ${PRIVATE_IP}

--- BACKEND .ENV CONFIGURATION ---
Add these to your Backend .env:
SUPABASE_URL=http://${PRIVATE_IP}:8000
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

--- DATABASE DIRECT ACCESS (POSTGRESQL) ---
Host: ${PRIVATE_IP}
Port: 5432
User: postgres
Password: ${POSTGRES_PASSWORD}
Database: postgres
Connection String: postgresql://postgres:${POSTGRES_PASSWORD}@${PRIVATE_IP}:5432/postgres

--- SUPABASE STUDIO (DASHBOARD) ---
URL: http://${PRIVATE_IP}:8000 (Kong Gateway) or port 3000 (Direct Studio)
Dashboard User: admin
Dashboard Password: ${DASHBOARD_PASSWORD}

================================================================================
EOF

cat "$CRED_FILE"
echo ""
echo "✅ Credentials also saved at: $CRED_FILE"
