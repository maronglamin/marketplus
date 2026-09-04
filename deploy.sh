#!/usr/bin/env bash
# SNAP (marketplus) production deploy — nginx + Node API (PM2)
#
# On the server:
#   sudo ./deploy.sh --setup          # first time: nginx, Node 20, PM2, certbot
#   sudo ./deploy.sh                  # build, install nginx sites, restart API
#   sudo ./deploy.sh --ssl            # issue/renew Let's Encrypt certs, then reload
#
# From your laptop:
#   ./deploy.sh --remote user@host    # rsync this repo, then run deploy on the server
#
# Optional: copy deploy/deploy.env.example → deploy/deploy.env

set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_PATH"
NGINX_SRC="$REPO_ROOT/deploy/nginx"

# ---------------------------------------------------------------------------
# Defaults (override with deploy/deploy.env or the environment)
# ---------------------------------------------------------------------------
WEB_DOMAIN="${WEB_DOMAIN:-snap.cloudnexus.biz}"
API_DOMAIN="${API_DOMAIN:-api.cloudnexus.biz}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
WEB_ROOT="${WEB_ROOT:-/var/www/snap/web}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
REMOTE="${REMOTE:-}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/snap-app/marketplus}"

DO_SETUP=false
DO_SSL=false
SKIP_DEPS=false
SKIP_BUILD=false
SKIP_NGINX=false
WEB_ONLY=false
API_ONLY=false
DB_PUSH=false
DRY_RUN=false

log()  { printf '[\033[1;34mSNAP\033[0m] %s\n' "$*"; }
ok()   { printf '[\033[1;32m OK \033[0m] %s\n' "$*"; }
warn() { printf '[\033[1;33mWARN\033[0m] %s\n' "$*"; }
err()  { printf '[\033[1;31mERR \033[0m] %s\n' "$*" >&2; }

die() { err "$*"; exit 1; }

run() {
  if $DRY_RUN; then
    printf '[\033[1;35mDRY \033[0m] %s\n' "$*"
    return 0
  fi
  eval "$@"
}

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options]

  --setup         Install nginx, Node.js 20, PM2, and certbot (Debian/Ubuntu)
  --ssl           Obtain or renew Let's Encrypt certificates, then enable HTTPS
  --skip-deps     Skip npm install
  --skip-build    Skip backend compile and web production build
  --skip-nginx    Do not write nginx configs or reload nginx
  --web-only      Rebuild/publish the web app and reload nginx (skip API)
  --api-only      Rebuild/restart the API (skip web build)
  --db-push       Run `prisma db push` after generate (shared DB — use with care)
  --remote USER@HOST
                  Rsync this repo to the server, then run deploy.sh there
  --dry-run       Print commands without executing them
  -h, --help      Show this help

Environment / deploy/deploy.env:
  WEB_DOMAIN, API_DOMAIN, BACKEND_PORT, WEB_ROOT, CERTBOT_EMAIL, REMOTE_DIR
EOF
}

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  log "Loading $file"
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || return 1
}

mem_mb() {
  awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 2048
}

swap_mb() {
  awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0
}

# Leave headroom for the OS; CRA/npm will OOM if we claim 4GB on a 1GB droplet.
node_heap_mb() {
  local ram heap
  ram="$(mem_mb)"
  heap=$((ram - 384))
  if (( heap < 384 )); then heap=384; fi
  if (( heap > 2048 )); then heap=2048; fi
  echo "$heap"
}

# Small VPS (1GB) cannot run npm ci / webpack without swap. The "Killed" line is the OOM killer.
ensure_swap() {
  [[ -r /proc/meminfo ]] || return 0
  local ram swap
  ram="$(mem_mb)"
  swap="$(swap_mb)"
  log "Memory: ${ram}MB RAM, ${swap}MB swap"
  if (( ram + swap >= 2048 )); then
    return 0
  fi

  local need=$((2048 - ram))
  if (( need < 1024 )); then need=1024; fi
  if (( need > 4096 )); then need=4096; fi

  if [[ "$(id -u)" -ne 0 ]]; then
    warn "Low memory (${ram}MB) and not root — cannot add swap. npm may be OOM-killed."
    return 0
  fi

  log "Creating ${need}MB swap at /swapfile (required for npm on this droplet)"
  if $DRY_RUN; then
    return 0
  fi

  if [[ -f /swapfile ]]; then
    swapon /swapfile 2>/dev/null || true
    swap="$(swap_mb)"
    if (( ram + swap >= 2048 )); then
      ok "Existing /swapfile is active (${swap}MB)"
      return 0
    fi
    swapoff /swapfile 2>/dev/null || true
    rm -f /swapfile
  fi

  if ! fallocate -l "${need}M" /swapfile 2>/dev/null; then
    dd if=/dev/zero of=/swapfile bs=1M count="$need" status=none
  fi
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab 2>/dev/null; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  ok "Swap ready ($(swap_mb)MB)"
}

npm_install_in() {
  local dir="$1"
  local heap rc
  heap="$(node_heap_mb)"
  log "Installing npm packages in ${dir} (Node heap ${heap}MB, 1 socket)"
  set +e
  as_app "cd $(printf '%q' "$dir") && \
    export NODE_OPTIONS=--max-old-space-size=${heap} \
      npm_config_audit=false \
      npm_config_fund=false \
      npm_config_maxsockets=1 && \
    rm -rf node_modules && \
    if [ -f package-lock.json ]; then
      npm ci --no-audit --no-fund --maxsockets=1
      rc=\$?
      if [ \$rc -eq 137 ] || [ \$rc -eq 143 ]; then exit \$rc; fi
      if [ \$rc -ne 0 ]; then
        npm install --no-audit --no-fund --maxsockets=1
      fi
    else
      npm install --no-audit --no-fund --maxsockets=1
    fi"
  rc=$?
  set -e
  if [[ $rc -eq 137 || $rc -eq 143 ]]; then
    die "npm was killed by the kernel (out of memory) in $dir.
Check: free -h   and   dmesg | tail
Re-run: sudo ./deploy.sh --setup   (this now creates swap on small VPS)"
  fi
  [[ $rc -eq 0 ]] || die "npm install failed in $dir (exit $rc)"
}

as_app() {
  local cmd="$1"
  if $DRY_RUN; then
    log "[$APP_USER] $cmd"
    return 0
  fi
  if [[ "$(id -u)" -eq 0 && -n "${APP_USER:-}" && "$APP_USER" != "root" ]]; then
    sudo -u "$APP_USER" -H bash -lc "$cmd"
  else
    bash -lc "$cmd"
  fi
}

detect_app_user() {
  if [[ "$(id -u)" -eq 0 ]]; then
    APP_USER="${SUDO_USER:-root}"
  else
    APP_USER="$(id -un)"
  fi
}

require_root_for_local() {
  if [[ -n "$REMOTE" ]]; then
    return 0
  fi
  if [[ "$(id -u)" -ne 0 ]] && ! $SKIP_NGINX; then
    die "Run as root on the server (sudo ./deploy.sh), or use --remote user@host"
  fi
}

load_env_file "$REPO_ROOT/deploy/deploy.env"

# ---------------------------------------------------------------------------
# Args (override deploy.env)
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --setup) DO_SETUP=true ;;
    --ssl) DO_SSL=true ;;
    --skip-deps) SKIP_DEPS=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --skip-nginx) SKIP_NGINX=true ;;
    --web-only) WEB_ONLY=true ;;
    --api-only) API_ONLY=true ;;
    --db-push) DB_PUSH=true ;;
    --remote)
      REMOTE="${2:-}"
      [[ -n "$REMOTE" ]] || die "--remote requires user@host"
      shift
      ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1 (try --help)" ;;
  esac
  shift
done

UPLOADS_ROOT="$REPO_ROOT/appBackend/uploads"
PUBLIC_ROOT="$REPO_ROOT/appBackend/public"

# ---------------------------------------------------------------------------
# Remote path: rsync then ssh
# ---------------------------------------------------------------------------
deploy_remote() {
  need_cmd rsync || die "rsync is required for --remote"
  need_cmd ssh || die "ssh is required for --remote"

  log "Syncing repo to ${REMOTE}:${REMOTE_DIR}"
  if ! $DRY_RUN; then
    ssh -o StrictHostKeyChecking=accept-new "$REMOTE" "mkdir -p $(printf '%q' "$REMOTE_DIR")"
    rsync -az --delete \
      --exclude-from="$REPO_ROOT/deploy/rsync-exclude" \
      "$REPO_ROOT/" "$REMOTE:$REMOTE_DIR/"
  else
    log "rsync -az --delete --exclude-from=deploy/rsync-exclude ./ ${REMOTE}:${REMOTE_DIR}/"
  fi

  local extra=()
  $DO_SETUP && extra+=(--setup)
  $DO_SSL && extra+=(--ssl)
  $SKIP_DEPS && extra+=(--skip-deps)
  $SKIP_BUILD && extra+=(--skip-build)
  $SKIP_NGINX && extra+=(--skip-nginx)
  $WEB_ONLY && extra+=(--web-only)
  $API_ONLY && extra+=(--api-only)
  $DB_PUSH && extra+=(--db-push)
  $DRY_RUN && extra+=(--dry-run)

  log "Running deploy on $REMOTE"
  ssh -t "$REMOTE" "sudo env WEB_DOMAIN=$(printf '%q' "$WEB_DOMAIN") \
    API_DOMAIN=$(printf '%q' "$API_DOMAIN") \
    BACKEND_PORT=$(printf '%q' "$BACKEND_PORT") \
    WEB_ROOT=$(printf '%q' "$WEB_ROOT") \
    CERTBOT_EMAIL=$(printf '%q' "$CERTBOT_EMAIL") \
    bash $(printf '%q' "$REMOTE_DIR/deploy.sh") ${extra[*]:-}"
}

# ---------------------------------------------------------------------------
# Host packages
# ---------------------------------------------------------------------------
install_packages() {
  if need_cmd apt-get; then
    run "apt-get update -y"
    run "DEBIAN_FRONTEND=noninteractive apt-get install -y nginx curl ca-certificates gnupg rsync"
    if ! need_cmd node || [[ "$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
      log "Installing Node.js 20"
      run "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
      run "DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs"
    fi
    if ! need_cmd certbot; then
      run "DEBIAN_FRONTEND=noninteractive apt-get install -y certbot"
    fi
  elif need_cmd dnf; then
    run "dnf install -y nginx curl ca-certificates rsync"
    warn "Install Node.js 20 and certbot on this distro if they are missing"
  else
    die "Unsupported package manager. Install nginx, Node.js 20, PM2, and certbot manually."
  fi

  if ! need_cmd pm2; then
    run "npm install -g pm2"
  fi

  run "mkdir -p /var/www/letsencrypt $WEB_ROOT $UPLOADS_ROOT $PUBLIC_ROOT"
  run "systemctl enable nginx"
  run "systemctl start nginx"
  ensure_swap
  ok "Host packages installed"
}

# ---------------------------------------------------------------------------
# Nginx
# ---------------------------------------------------------------------------
render_file() {
  local src="$1"
  local dest="$2"
  if $DRY_RUN; then
    log "render $src -> $dest"
    return 0
  fi
  sed \
    -e "s|BACKEND_PORT|${BACKEND_PORT}|g" \
    -e "s|WEB_DOMAIN|${WEB_DOMAIN}|g" \
    -e "s|API_DOMAIN|${API_DOMAIN}|g" \
    -e "s|WEB_ROOT|${WEB_ROOT}|g" \
    -e "s|UPLOADS_ROOT|${UPLOADS_ROOT}|g" \
    -e "s|PUBLIC_ROOT|${PUBLIC_ROOT}|g" \
    "$src" > "$dest"
}

install_nginx() {
  $SKIP_NGINX && { log "Skipping nginx"; return 0; }
  need_cmd nginx || die "nginx is not installed. Re-run with --setup"

  run "mkdir -p /etc/nginx/snippets /etc/nginx/conf.d /var/www/letsencrypt $WEB_ROOT"

  render_file "$NGINX_SRC/conf.d/snap.conf" /etc/nginx/conf.d/snap-upstream.conf
  render_file "$NGINX_SRC/snippets/snap-proxy-params.conf" /etc/nginx/snippets/snap-proxy-params.conf
  render_file "$NGINX_SRC/snippets/snap-web-locations.conf" /etc/nginx/snippets/snap-web-locations.conf
  render_file "$NGINX_SRC/snippets/snap-api-locations.conf" /etc/nginx/snippets/snap-api-locations.conf

  local web_mode=http
  local api_mode=http
  if [[ -d "/etc/letsencrypt/live/${WEB_DOMAIN}" ]]; then
    web_mode=https
  fi
  if [[ -d "/etc/letsencrypt/live/${API_DOMAIN}" ]]; then
    api_mode=https
  fi

  local web_avail api_avail web_enabled api_enabled
  if [[ -d /etc/nginx/sites-available ]]; then
    web_avail=/etc/nginx/sites-available/snap-web
    api_avail=/etc/nginx/sites-available/snap-api
    web_enabled=/etc/nginx/sites-enabled/snap-web
    api_enabled=/etc/nginx/sites-enabled/snap-api
    run "rm -f /etc/nginx/sites-enabled/default"
  else
    web_avail=/etc/nginx/conf.d/snap-web.conf
    api_avail=/etc/nginx/conf.d/snap-api.conf
    web_enabled=""
    api_enabled=""
  fi

  render_file "$NGINX_SRC/sites/snap.${web_mode}.conf" "$web_avail"
  render_file "$NGINX_SRC/sites/api.${api_mode}.conf" "$api_avail"

  if [[ -n "$web_enabled" ]]; then
    run "ln -sfn $web_avail $web_enabled"
    run "ln -sfn $api_avail $api_enabled"
  fi

  if $DRY_RUN; then
    log "nginx -t && systemctl reload nginx"
    return 0
  fi
  nginx -t
  systemctl reload nginx
  ok "nginx reloaded (${WEB_DOMAIN}=${web_mode}, ${API_DOMAIN}=${api_mode})"
}

issue_certs() {
  $DO_SSL || return 0
  need_cmd certbot || die "certbot is not installed. Re-run with --setup"
  [[ -n "$CERTBOT_EMAIL" ]] || die "Set CERTBOT_EMAIL in deploy/deploy.env before --ssl"

  run "mkdir -p /var/www/letsencrypt"

  local domains=("$WEB_DOMAIN" "$API_DOMAIN")
  local d
  for d in "${domains[@]}"; do
    log "Requesting certificate for $d"
    run "certbot certonly --webroot -w /var/www/letsencrypt \
      --non-interactive --agree-tos --keep-until-expiring \
      -m $(printf '%q' "$CERTBOT_EMAIL") -d $(printf '%q' "$d")"
  done

  # Re-install site files now that live certs exist
  SKIP_NGINX=false
  install_nginx
}

# ---------------------------------------------------------------------------
# Backend + web
# ---------------------------------------------------------------------------
install_js_deps() {
  $SKIP_DEPS && { log "Skipping npm install"; return 0; }
  ensure_swap
  if ! $WEB_ONLY; then
    npm_install_in "$REPO_ROOT/appBackend"
  fi
  if ! $API_ONLY; then
    npm_install_in "$REPO_ROOT/AppWebVersion"
  fi
}

build_api() {
  $SKIP_BUILD && return 0
  $WEB_ONLY && return 0

  [[ -f "$REPO_ROOT/appBackend/.env" ]] || \
    die "Missing appBackend/.env — copy appBackend/.env.example on the server and fill production values"

  run "mkdir -p $UPLOADS_ROOT $PUBLIC_ROOT $REPO_ROOT/appBackend/logs"

  log "Generating Prisma client"
  as_app "cd $(printf '%q' "$REPO_ROOT/appBackend") && npx prisma generate"

  if $DB_PUSH; then
    warn "Running prisma db push against the configured database"
    as_app "cd $(printf '%q' "$REPO_ROOT/appBackend") && npx prisma db push"
  fi

  log "Compiling API (tsc)"
  as_app "cd $(printf '%q' "$REPO_ROOT/appBackend") && npx tsc"
  [[ -f "$REPO_ROOT/appBackend/dist/index.js" ]] || $DRY_RUN || die "API build did not produce dist/index.js"
  ok "API build complete"
}

build_web() {
  $SKIP_BUILD && return 0
  $API_ONLY && return 0

  local api_url="${REACT_APP_API_URL:-https://${WEB_DOMAIN}/api}"
  local image_host="${REACT_APP_IMAGE_HOST:-https://${WEB_DOMAIN}}"

  local heap
  heap="$(node_heap_mb)"
  log "Building web app (API=$api_url, heap=${heap}MB, no sourcemaps)"
  set +e
  as_app "cd $(printf '%q' "$REPO_ROOT/AppWebVersion") && \
    NODE_OPTIONS=--max-old-space-size=${heap} \
    GENERATE_SOURCEMAP=false \
    REACT_APP_API_URL=$(printf '%q' "$api_url") \
    REACT_APP_IMAGE_HOST=$(printf '%q' "$image_host") \
    npm run build"
  local rc=$?
  set -e
  if [[ $rc -eq 137 || $rc -eq 143 ]]; then
    die "Web build was killed (out of memory). Check free -h; re-run sudo ./deploy.sh --setup to create swap."
  fi
  [[ $rc -eq 0 ]] || die "Web build failed (exit $rc)"

  [[ -f "$REPO_ROOT/AppWebVersion/build/index.html" ]] || $DRY_RUN || die "Web build did not produce build/index.html"

  run "mkdir -p $WEB_ROOT"
  if $DRY_RUN; then
    log "rsync AppWebVersion/build/ -> $WEB_ROOT/"
  else
    rsync -a --delete "$REPO_ROOT/AppWebVersion/build/" "$WEB_ROOT/"
    if id www-data >/dev/null 2>&1; then
      chown -R www-data:www-data "$WEB_ROOT"
    elif id nginx >/dev/null 2>&1; then
      chown -R nginx:nginx "$WEB_ROOT"
    fi
  fi
  ok "Web published to $WEB_ROOT"
}

start_api() {
  $WEB_ONLY && return 0
  need_cmd pm2 || die "pm2 is not installed. Re-run with --setup"

  log "Starting API with PM2"
  as_app "mkdir -p $(printf '%q' "$REPO_ROOT/appBackend/logs")"
  as_app "cd $(printf '%q' "$REPO_ROOT/appBackend") && pm2 startOrReload ecosystem.config.cjs --update-env"
  as_app "pm2 save"
  if $DO_SETUP; then
    warn "Once, enable PM2 on boot as $APP_USER: pm2 startup && sudo env PATH=\$PATH pm2 startup systemd -u $APP_USER --hp \$HOME && pm2 save"
  fi
  ok "PM2 process snap-backend is up"
}

healthcheck() {
  $DRY_RUN && return 0
  $WEB_ONLY && return 0
  local url="http://127.0.0.1:${BACKEND_PORT}/api/health"
  log "Waiting for $url"
  local i
  for i in $(seq 1 20); do
    if curl -sf "$url" >/dev/null; then
      ok "API health check passed"
      return 0
    fi
    sleep 1
  done
  warn "API did not respond on $url — check: pm2 logs snap-backend"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  if [[ -n "$REMOTE" ]]; then
    deploy_remote
    return
  fi

  detect_app_user
  require_root_for_local

  [[ -d "$REPO_ROOT/appBackend" && -d "$REPO_ROOT/AppWebVersion" ]] || \
    die "This script must be run from the marketplus repo root (missing appBackend or AppWebVersion)"

  log "Repo: $REPO_ROOT"
  log "Web:  https://$WEB_DOMAIN  -> $WEB_ROOT"
  log "API:  https://$API_DOMAIN  -> 127.0.0.1:$BACKEND_PORT"
  log "User: $APP_USER"

  $DO_SETUP && install_packages
  need_cmd node || die "node is not on PATH. Re-run with --setup"
  need_cmd npm || die "npm is not on PATH. Re-run with --setup"

  install_js_deps
  build_api
  build_web
  start_api
  install_nginx
  issue_certs
  healthcheck

  local scheme=http
  if [[ -d "/etc/letsencrypt/live/${WEB_DOMAIN}" ]]; then
    scheme=https
  fi

  cat <<EOF

Deploy finished.

  Web     ${scheme}://$WEB_DOMAIN
  API     ${scheme}://$API_DOMAIN/api/health
  Static  $WEB_ROOT
  Uploads $UPLOADS_ROOT

  pm2 status
  pm2 logs snap-backend
  nginx -t && systemctl reload nginx

First server: sudo ./deploy.sh --setup && sudo ./deploy.sh --ssl
EOF
}

main
