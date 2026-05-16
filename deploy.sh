#!/usr/bin/env bash
set -euo pipefail

DOMAIN="easy.cycl.group"
LETSENCRYPT_EMAIL="Alexander.wyrwol@me.com"
COMPOSE_FILE="docker-compose.yml"
PROD_OVERRIDE="docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

check_deps() {
  for cmd in docker openssl; do
    command -v "$cmd" &>/dev/null || error "$cmd ist nicht installiert. Bitte zuerst installieren."
  done
  docker compose version &>/dev/null || error "Docker Compose Plugin nicht gefunden."
}

gen_secret() {
  openssl rand -base64 32 | tr -d '=/+' | head -c 40
}

setup_env() {
  info "Erstelle .env Dateien..."

  # Shared secrets (consistent across files)
  local POSTGRES_PASSWORD REDIS_PASSWORD API_KEY
  POSTGRES_PASSWORD=$(gen_secret)
  REDIS_PASSWORD=$(gen_secret)
  API_KEY=$(gen_secret)

  # core-api/.env
  if [[ ! -f core-api/.env ]]; then
    cat > core-api/.env <<EOF
POSTGRES_HOST=postgres
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_PORT=5432
POSTGRES_DB=open_asm
POSTGRES_SSL=false

PORT=6276
GRPC_PORT=16276
OASM_CLOUD_APIKEY=${API_KEY}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
GEO_IP_URL=geo-ip:4360
EOF
    info "core-api/.env erstellt"
  else
    warn "core-api/.env existiert bereits – wird nicht überschrieben"
    # Read existing values for consistency
    POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD core-api/.env | cut -d= -f2)
    REDIS_PASSWORD=$(grep REDIS_URL core-api/.env | sed 's/.*:\/\/:\(.*\)@.*/\1/')
    API_KEY=$(grep OASM_CLOUD_APIKEY core-api/.env | cut -d= -f2)
  fi

  # console/.env
  if [[ ! -f console/.env ]]; then
    cat > console/.env <<EOF
VITE_API_URL=https://${DOMAIN}
EOF
    info "console/.env erstellt"
  else
    warn "console/.env existiert bereits – wird nicht überschrieben"
  fi

  # worker/.env
  if [[ ! -f worker/.env ]]; then
    cat > worker/.env <<EOF
WORKER_API_KEY=${API_KEY}
WORKER_MAX_CONCURRENCY=10
WORKER_GRPC_HOST=core-api
WORKER_GRPC_PORT=16276
EOF
    info "worker/.env erstellt"
  else
    warn "worker/.env existiert bereits – wird nicht überschrieben"
  fi

  # Inject Redis password into prod override
  sed -i "s/__REDIS_PASSWORD__/${REDIS_PASSWORD}/g" "$PROD_OVERRIDE" 2>/dev/null || true
}

setup_nginx() {
  local NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
  local NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

  if [[ ! -f "$NGINX_CONF" ]]; then
    info "Installiere Nginx-Konfiguration für ${DOMAIN}..."
    cp nginx/easy.cycl.group.conf "$NGINX_CONF"
    ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    nginx -t && systemctl reload nginx
    info "Nginx konfiguriert"
  else
    warn "Nginx-Konfiguration existiert bereits – wird nicht überschrieben"
  fi
}

setup_ssl() {
  if [[ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    info "Beantrage Let's Encrypt Zertifikat für ${DOMAIN}..."
    certbot --nginx \
      -d "${DOMAIN}" \
      --email "${LETSENCRYPT_EMAIL}" \
      --agree-tos \
      --non-interactive \
      --redirect
    info "SSL-Zertifikat eingerichtet"
  else
    warn "Zertifikat für ${DOMAIN} existiert bereits – wird nicht erneuert"
  fi
}

deploy() {
  info "Baue und starte Docker-Stack..."
  docker compose -f "$COMPOSE_FILE" -f "$PROD_OVERRIDE" pull --ignore-pull-failures 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" -f "$PROD_OVERRIDE" up -d --build
  info "Stack gestartet"
}

wait_healthy() {
  info "Warte auf API-Health..."
  local retries=60
  until curl -sf http://localhost:6276/api/health &>/dev/null; do
    retries=$((retries - 1))
    [[ $retries -le 0 ]] && error "API antwortet nicht nach 60 Sekunden. Logs: docker compose logs core-api"
    sleep 1
  done
  info "API ist bereit"
}

# ── Main ──────────────────────────────────────────────────────────────────────
info "=== OASM Deployment: ${DOMAIN} ==="
check_deps
setup_env

# Nginx + SSL nur wenn root und nginx verfügbar
if [[ $EUID -eq 0 ]] && command -v nginx &>/dev/null && command -v certbot &>/dev/null; then
  setup_nginx
  setup_ssl
else
  warn "Nginx/Certbot-Setup übersprungen (nicht root oder nicht installiert)"
  warn "Führe manuell aus: sudo bash deploy.sh"
fi

deploy
wait_healthy

echo ""
info "=== Deployment abgeschlossen ==="
info "App erreichbar unter: https://${DOMAIN}"
info "Swagger Docs:         https://${DOMAIN}/api/docs"
info "Logs:                 docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
