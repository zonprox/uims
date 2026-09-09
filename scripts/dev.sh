#!/usr/bin/env bash
# ==============================================================================
# UIMS — Enterprise Dev Stack Management Script (2026 Standards)
# Controls: start, stop, restart, status, logs, url
# Managed services:
#   - Infrastructure (PostgreSQL 17, Redis 8, Meilisearch, SeaweedFS via Docker)
#   - NestJS API Backend (Port 3002)
#   - Vite React Frontend with HTTPS & HMR (Port 5679)
#   - Cloudflare Quick Tunnel (Public HTTPS URL)
# ==============================================================================

set -euo pipefail

# ── Paths & Setup ─────────────────────────────────────────────────────────────
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "${SCRIPT_PATH}")"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

PID_DIR="${PROJECT_ROOT}/.pids"
LOG_DIR="${PROJECT_ROOT}/logs"
mkdir -p "${PID_DIR}" "${LOG_DIR}"

API_PID_FILE="${PID_DIR}/api.pid"
WEB_PID_FILE="${PID_DIR}/web.pid"
TUNNEL_PID_FILE="${PID_DIR}/tunnel.pid"
TUNNEL_URL_FILE="${PID_DIR}/tunnel.url"

API_LOG_FILE="${LOG_DIR}/api.log"
WEB_LOG_FILE="${LOG_DIR}/web.log"
TUNNEL_LOG_FILE="${LOG_DIR}/cloudflared.log"

# Load .env if present
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -v '^\s*#' "${PROJECT_ROOT}/.env" | grep -v '^\s*$') || true
  set +a
fi

API_PORT="${APP_PORT:-3002}"
WEB_PORT="${WEB_PORT:-5679}"
POSTGRES_PORT="${DATABASE_PORT:-5433}"
REDIS_PORT="${REDIS_PORT:-6381}"

# ── Color Output ──────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_RESET="\033[0m"
  C_BOLD="\033[1m"
  C_DIM="\033[2m"
  C_GREEN="\033[32m"
  C_YELLOW="\033[33m"
  C_BLUE="\033[34m"
  C_MAGENTA="\033[35m"
  C_CYAN="\033[36m"
  C_RED="\033[31m"
else
  C_RESET=""
  C_BOLD=""
  C_DIM=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
  C_MAGENTA=""
  C_CYAN=""
  C_RED=""
fi

log_info()    { printf "%b[INFO]%b  %s\n" "${C_CYAN}" "${C_RESET}" "$*"; }
log_success() { printf "%b[OK]%b    %s\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "$*"; }
log_warn()    { printf "%b[WARN]%b  %s\n" "${C_YELLOW}" "${C_RESET}" "$*"; }
log_error()   { printf "%b[ERROR]%b %s\n" "${C_RED}${C_BOLD}" "${C_RESET}" "$*" >&2; }
log_step()    { printf "\n%b==>%b %b%s%b\n" "${C_BLUE}${C_BOLD}" "${C_RESET}" "${C_BOLD}" "$*" "${C_RESET}"; }

# ── Process & Port Helpers ────────────────────────────────────────────────────
is_pid_alive() {
  local pid="${1:-}"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
    return 0
  fi
  return 1
}

get_pid_from_file() {
  local file="${1:-}"
  if [[ -f "${file}" ]]; then
    local pid
    pid="$(cat "${file}" 2>/dev/null | tr -d '[:space:]')"
    if is_pid_alive "${pid}"; then
      echo "${pid}"
      return 0
    fi
  fi
  return 1
}

is_port_listening() {
  local port="${1:-}"
  if (echo > "/dev/tcp/127.0.0.1/${port}") 2>/dev/null; then
    return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    if ss -tulpn 2>/dev/null | grep -q ":${port} "; then
      return 0
    fi
  fi
  return 1
}

get_pids_on_port() {
  local port="${1:-}"
  if command -v ss >/dev/null 2>&1; then
    ss -tulpn 2>/dev/null | grep ":${port} " | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -t -i ":${port}" 2>/dev/null || true
  fi
}

kill_service() {
  local name="${1}"
  local pid_file="${2}"
  local port="${3:-}"

  local pid=""
  if [[ -f "${pid_file}" ]]; then
    pid="$(cat "${pid_file}" 2>/dev/null | tr -d '[:space:]')"
    rm -f "${pid_file}"
  fi

  if is_pid_alive "${pid}"; then
    log_info "Stopping ${name} (PID: ${pid})..."
    kill -15 "${pid}" 2>/dev/null || true
    local count=0
    while is_pid_alive "${pid}" && [[ ${count} -lt 10 ]]; do
      sleep 0.5
      ((count++)) || true
    done
    if is_pid_alive "${pid}"; then
      log_warn "Force killing ${name} (PID: ${pid})..."
      kill -9 "${pid}" 2>/dev/null || true
    fi
    log_success "${name} stopped."
  fi

  # Double-check port if provided
  if [[ -n "${port}" ]]; then
    local orphan_pids
    orphan_pids="$(get_pids_on_port "${port}")"
    if [[ -n "${orphan_pids}" ]]; then
      log_warn "Found lingering process(es) on port ${port}: ${orphan_pids}. Cleaning up..."
      for opid in ${orphan_pids}; do
        kill -9 "${opid}" 2>/dev/null || true
      done
    fi
  fi
}

# ── Health & Readiness ────────────────────────────────────────────────────────
wait_for_port() {
  local port="${1}"
  local desc="${2}"
  local max_seconds="${3:-20}"
  local elapsed=0

  printf "   Waiting for %s on port %s..." "${desc}" "${port}"
  while [[ ${elapsed} -lt ${max_seconds} ]]; do
    if is_port_listening "${port}"; then
      printf " %b[Ready]%b\n" "${C_GREEN}" "${C_RESET}"
      return 0
    fi
    sleep 0.5
    elapsed=$((elapsed + 1))
    printf "."
  done
  printf " %b[Timeout]%b\n" "${C_RED}" "${C_RESET}"
  return 1
}

wait_for_api_health() {
  local port="${1}"
  local max_seconds="${2:-30}"
  local elapsed=0

  printf "   Verifying API health (http://127.0.0.1:%s/api/v1/health)..." "${port}"
  while [[ ${elapsed} -lt $((max_seconds * 2)) ]]; do
    local res
    res="$(curl -s -m 2 "http://127.0.0.1:${port}/api/v1/health" 2>/dev/null || true)"
    if echo "${res}" | grep -q '"status":"ok"'; then
      printf " %b[Healthy]%b\n" "${C_GREEN}" "${C_RESET}"
      return 0
    fi
    sleep 0.5
    ((elapsed++)) || true
    printf "."
  done
  printf " %b[Degraded/Timeout]%b\n" "${C_YELLOW}" "${C_RESET}"
  return 0 # Do not fail hard, let logs be inspected
}

extract_tunnel_url() {
  if [[ -f "${TUNNEL_LOG_FILE}" ]]; then
    local url
    url="$(grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' "${TUNNEL_LOG_FILE}" | tail -n 1 || true)"
    if [[ -n "${url}" ]]; then
      echo "${url}" > "${TUNNEL_URL_FILE}"
      echo "${url}"
      return 0
    fi
  fi
  if [[ -f "${TUNNEL_URL_FILE}" ]]; then
    cat "${TUNNEL_URL_FILE}" 2>/dev/null
    return 0
  fi
  return 1
}

# ── Infrastructure Check / Start ──────────────────────────────────────────────
ensure_docker_infrastructure() {
  log_step "Step 1/4: Checking Backing Infrastructure (Docker)"
  
  if ! command -v docker >/dev/null 2>&1; then
    log_warn "Docker command not found. Assuming external PostgreSQL/Redis."
    return 0
  fi

  local need_compose=false

  # Check Postgres
  if ! is_port_listening "${POSTGRES_PORT}"; then
    log_info "PostgreSQL port ${POSTGRES_PORT} not responding."
    need_compose=true
  fi

  # Check Redis
  if ! is_port_listening "${REDIS_PORT}"; then
    log_info "Redis port ${REDIS_PORT} not responding."
    need_compose=true
  fi

  if [[ "${need_compose}" == "true" ]]; then
    log_info "Starting backing containers via Docker Compose..."
    docker compose up -d postgres redis meilisearch seaweedfs-master seaweedfs-volume seaweedfs-filer
    wait_for_port "${POSTGRES_PORT}" "PostgreSQL 17" 20
    wait_for_port "${REDIS_PORT}" "Redis 8" 15
  else
    log_success "PostgreSQL (${POSTGRES_PORT}) & Redis (${REDIS_PORT}) are active and listening."
  fi
}

# ── Service Start Logic ───────────────────────────────────────────────────────
start_api() {
  log_step "Step 2/4: Starting NestJS Backend API"

  local existing_pid=""
  if existing_pid="$(get_pid_from_file "${API_PID_FILE}")"; then
    log_info "API is already running (PID: ${existing_pid}, Port: ${API_PORT})"
    return 0
  fi

  # Clean up orphan on port if any
  if is_port_listening "${API_PORT}"; then
    log_warn "Port ${API_PORT} is currently in use without PID file. Clearing..."
    local orphan_pids
    orphan_pids="$(get_pids_on_port "${API_PORT}")"
    for opid in ${orphan_pids}; do
      kill -9 "${opid}" 2>/dev/null || true
    done
    sleep 1
  fi

  # Ensure build exists
  if [[ ! -f "${PROJECT_ROOT}/apps/api/dist/main.js" ]]; then
    log_info "Building API..."
    pnpm --filter @uims/api build
  fi

  log_info "Launching API on port ${API_PORT} (logging to ${API_LOG_FILE})..."
  setsid -f bash -c 'echo $$ > "'"${API_PID_FILE}"'"; export PORT="'"${API_PORT}"'"; export NODE_ENV="'"${NODE_ENV:-development}"'"; exec node "'"${PROJECT_ROOT}/apps/api/dist/main.js"'"' < /dev/null >> "${API_LOG_FILE}" 2>&1
  local api_pid=""
  for _ in {1..20}; do
    if api_pid="$(get_pid_from_file "${API_PID_FILE}")"; then break; fi
    sleep 0.1
  done

  wait_for_port "${API_PORT}" "API Server" 15
  wait_for_api_health "${API_PORT}" 20
  log_success "API server online (PID: ${api_pid:-unknown}, Port: ${API_PORT})"
}

start_web() {
  log_step "Step 3/4: Starting Vite Web Dev Server (HTTPS + HMR)"

  local existing_pid=""
  if existing_pid="$(get_pid_from_file "${WEB_PID_FILE}")"; then
    log_info "Web is already running (PID: ${existing_pid}, Port: ${WEB_PORT})"
    return 0
  fi

  # Clean up orphan on port if any
  if is_port_listening "${WEB_PORT}"; then
    log_warn "Port ${WEB_PORT} is currently in use without PID file. Clearing..."
    local orphan_pids
    orphan_pids="$(get_pids_on_port "${WEB_PORT}")"
    for opid in ${orphan_pids}; do
      kill -9 "${opid}" 2>/dev/null || true
    done
    sleep 1
  fi

  log_info "Launching Vite dev server on port ${WEB_PORT} (logging to ${WEB_LOG_FILE})..."
  setsid -f bash -c 'echo $$ > "'"${WEB_PID_FILE}"'"; export WEB_PORT="'"${WEB_PORT}"'"; export APP_PORT="'"${API_PORT}"'"; cd "'"${PROJECT_ROOT}/apps/web"'"; exec "'"${PROJECT_ROOT}/apps/web/node_modules/.bin/vite"'"' < /dev/null >> "${WEB_LOG_FILE}" 2>&1
  local web_pid=""
  for _ in {1..20}; do
    if web_pid="$(get_pid_from_file "${WEB_PID_FILE}")"; then break; fi
    sleep 0.1
  done

  wait_for_port "${WEB_PORT}" "Vite Web Server" 15
  log_success "Web dev server online (PID: ${web_pid:-unknown}, Port: ${WEB_PORT})"
}

start_tunnel() {
  log_step "Step 4/4: Launching Cloudflare Quick Tunnel"

  if ! command -v cloudflared >/dev/null 2>&1; then
    log_warn "cloudflared binary not found. Skipping public tunnel."
    return 0
  fi

  local existing_pid=""
  if existing_pid="$(get_pid_from_file "${TUNNEL_PID_FILE}")"; then
    local current_url
    current_url="$(extract_tunnel_url || true)"
    log_info "Cloudflare tunnel already running (PID: ${existing_pid}, URL: ${current_url:-pending})"
    return 0
  fi

  # Truncate or initialize tunnel log for clean URL capture
  : > "${TUNNEL_LOG_FILE}"
  rm -f "${TUNNEL_URL_FILE}"

  log_info "Starting Cloudflare quick tunnel to https://localhost:${WEB_PORT}..."
  setsid -f bash -c 'echo $$ > "'"${TUNNEL_PID_FILE}"'"; exec cloudflared tunnel --url "https://localhost:'"${WEB_PORT}"'" --no-tls-verify' < /dev/null >> "${TUNNEL_LOG_FILE}" 2>&1
  local tunnel_pid=""
  for _ in {1..20}; do
    if tunnel_pid="$(get_pid_from_file "${TUNNEL_PID_FILE}")"; then break; fi
    sleep 0.1
  done

  # Wait for URL to appear in log
  printf "   Acquiring public .trycloudflare.com URL..."
  local count=0
  local tunnel_url=""
  while [[ ${count} -lt 25 ]]; do
    tunnel_url="$(extract_tunnel_url || true)"
    if [[ -n "${tunnel_url}" ]]; then
      printf " %b[Connected]%b\n" "${C_GREEN}" "${C_RESET}"
      break
    fi
    sleep 0.6
    ((count++)) || true
    printf "."
  done

  if [[ -z "${tunnel_url}" ]]; then
    printf " %b[Pending]%b\n" "${C_YELLOW}" "${C_RESET}"
    log_warn "Tunnel started (PID: ${tunnel_pid}), URL capture pending. Check with: ./scripts/dev.sh url"
  else
    log_success "Cloudflare Tunnel active: ${C_BOLD}${C_GREEN}${tunnel_url}${C_RESET}"
  fi
}

# ── Summary Banner ────────────────────────────────────────────────────────────
print_summary() {
  local tunnel_url
  tunnel_url="$(extract_tunnel_url || echo "N/A")"

  printf "\n"
  printf "%b========================================================================%b\n" "${C_CYAN}${C_BOLD}" "${C_RESET}"
  printf "%b  UIMS ENTERPRISE SYSTEM STACK — OPERATIONAL (2026)%b\n" "${C_GREEN}${C_BOLD}" "${C_RESET}"
  printf "%b========================================================================%b\n" "${C_CYAN}${C_BOLD}" "${C_RESET}"
  printf "  • %bFrontend (Local HTTPS):%b    https://localhost:%s\n" "${C_BOLD}" "${C_RESET}" "${WEB_PORT}"
  printf "  • %bBackend API (REST):%b        http://localhost:%s/api/v1\n" "${C_BOLD}" "${C_RESET}" "${API_PORT}"
  printf "  • %bAPI Swagger Docs:%b          http://localhost:%s/api/v1/docs\n" "${C_BOLD}" "${C_RESET}" "${API_PORT}"
  printf "  • %bHealth Check:%b              http://localhost:%s/api/v1/health\n" "${C_BOLD}" "${C_RESET}" "${API_PORT}"
  printf "  • %bDatabase (Postgres 17):%b    localhost:%s (DB: uims_db)\n" "${C_BOLD}" "${C_RESET}" "${POSTGRES_PORT}"
  printf "  • %bRedis Cache (Redis 8):%b     localhost:%s\n" "${C_BOLD}" "${C_RESET}" "${REDIS_PORT}"
  printf "  ──────────────────────────────────────────────────────────────────────\n"
  if [[ "${tunnel_url}" != "N/A" ]]; then
    printf "  • %bPUBLIC CLOUDFLARE URL:%b     %b%s%b\n" "${C_BOLD}${C_MAGENTA}" "${C_RESET}" "${C_BOLD}${C_GREEN}" "${tunnel_url}" "${C_RESET}"
  else
    printf "  • %bPUBLIC CLOUDFLARE URL:%b     %b(run './scripts/dev.sh url' to refresh)%b\n" "${C_BOLD}${C_MAGENTA}" "${C_RESET}" "${C_DIM}" "${C_RESET}"
  fi
  printf "%b========================================================================%b\n" "${C_CYAN}${C_BOLD}" "${C_RESET}"
  printf "  Logs:    %b./scripts/dev.sh logs [api|web|tunnel|all]%b\n" "${C_CYAN}" "${C_RESET}"
  printf "  Status:  %b./scripts/dev.sh status%b\n" "${C_CYAN}" "${C_RESET}"
  printf "  Stop:    %b./scripts/dev.sh stop [--all]%b\n" "${C_CYAN}" "${C_RESET}"
  printf "  Restart: %b./scripts/dev.sh restart%b\n\n" "${C_CYAN}" "${C_RESET}"
}

# ── Command Implementations ───────────────────────────────────────────────────
cmd_start() {
  log_info "Starting UIMS stack in background (Enterprise Best Practice 2026)..."
  ensure_docker_infrastructure
  start_api
  start_web
  start_tunnel
  print_summary
}

cmd_stop() {
  local stop_all="${1:-false}"
  log_info "Stopping UIMS services..."
  
  kill_service "Cloudflare Tunnel" "${TUNNEL_PID_FILE}" ""
  kill_service "Vite Web Dev Server" "${WEB_PID_FILE}" "${WEB_PORT}"
  kill_service "NestJS API Backend" "${API_PID_FILE}" "${API_PORT}"
  rm -f "${TUNNEL_URL_FILE}"

  if [[ "${stop_all}" == "--all" || "${stop_all}" == "-a" ]]; then
    log_info "Stopping Docker backing containers (--all specified)..."
    docker compose down 2>/dev/null || true
    log_success "Docker backing containers stopped."
  fi

  log_success "UIMS application stack shutdown complete."
}

cmd_restart() {
  log_info "Restarting UIMS stack..."
  cmd_stop
  sleep 1.5
  cmd_start
}

cmd_status() {
  printf "\n%bUIMS Service Status Overview%b\n" "${C_BOLD}${C_CYAN}" "${C_RESET}"
  printf "%b----------------------------------------------------------------------%b\n" "${C_DIM}" "${C_RESET}"

  # 1. Postgres
  printf "  %-22s " "PostgreSQL 17 (Docker):"
  if is_port_listening "${POSTGRES_PORT}"; then
    printf "%bRUNNING%b (Port: %s)\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "${POSTGRES_PORT}"
  else
    printf "%bSTOPPED%b (Port: %s)\n" "${C_RED}${C_BOLD}" "${C_RESET}" "${POSTGRES_PORT}"
  fi

  # 2. Redis
  printf "  %-22s " "Redis 8 (Docker):"
  if is_port_listening "${REDIS_PORT}"; then
    printf "%bRUNNING%b (Port: %s)\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "${REDIS_PORT}"
  else
    printf "%bSTOPPED%b (Port: %s)\n" "${C_RED}${C_BOLD}" "${C_RESET}" "${REDIS_PORT}"
  fi

  # 3. API
  local api_pid
  api_pid="$(get_pid_from_file "${API_PID_FILE}" || true)"
  printf "  %-22s " "NestJS API (Port ${API_PORT}):"
  if [[ -n "${api_pid}" ]]; then
    local health="unknown"
    local res
    res="$(curl -s -m 2 "http://127.0.0.1:${API_PORT}/api/v1/health" 2>/dev/null || true)"
    if echo "${res}" | grep -q '"status":"ok"'; then
      health="healthy"
    fi
    printf "%bRUNNING%b (PID: %s, Health: %s)\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "${api_pid}" "${health}"
  else
    if is_port_listening "${API_PORT}"; then
      printf "%bPORT BUSY%b (Port %s has unmanaged listener)\n" "${C_YELLOW}${C_BOLD}" "${C_RESET}" "${API_PORT}"
    else
      printf "%bSTOPPED%b\n" "${C_DIM}" "${C_RESET}"
    fi
  fi

  # 4. Web
  local web_pid
  web_pid="$(get_pid_from_file "${WEB_PID_FILE}" || true)"
  printf "  %-22s " "Vite Web (Port ${WEB_PORT}):"
  if [[ -n "${web_pid}" ]]; then
    printf "%bRUNNING%b (PID: %s, HTTPS: yes)\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "${web_pid}"
  else
    if is_port_listening "${WEB_PORT}"; then
      printf "%bPORT BUSY%b (Port %s has unmanaged listener)\n" "${C_YELLOW}${C_BOLD}" "${C_RESET}" "${WEB_PORT}"
    else
      printf "%bSTOPPED%b\n" "${C_DIM}" "${C_RESET}"
    fi
  fi

  # 5. Tunnel
  local tunnel_pid
  tunnel_pid="$(get_pid_from_file "${TUNNEL_PID_FILE}" || true)"
  printf "  %-22s " "Cloudflare Tunnel:"
  if [[ -n "${tunnel_pid}" ]]; then
    local url
    url="$(extract_tunnel_url || echo "pending")"
    printf "%bRUNNING%b (PID: %s)\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "${tunnel_pid}"
    printf "  %-22s %b%s%b\n" "Public URL:" "${C_BOLD}${C_MAGENTA}" "${url}" "${C_RESET}"
  else
    printf "%bSTOPPED%b\n" "${C_DIM}" "${C_RESET}"
  fi

  printf "%b----------------------------------------------------------------------%b\n\n" "${C_DIM}" "${C_RESET}"
}

cmd_logs() {
  local target="${1:-all}"
  case "${target}" in
    api)
      log_info "Streaming API logs (${API_LOG_FILE}). Press Ctrl+C to exit."
      touch "${API_LOG_FILE}"
      exec tail -n 100 -f "${API_LOG_FILE}"
      ;;
    web)
      log_info "Streaming Web logs (${WEB_LOG_FILE}). Press Ctrl+C to exit."
      touch "${WEB_LOG_FILE}"
      exec tail -n 100 -f "${WEB_LOG_FILE}"
      ;;
    tunnel|cloudflared)
      log_info "Streaming Cloudflare Tunnel logs (${TUNNEL_LOG_FILE}). Press Ctrl+C to exit."
      touch "${TUNNEL_LOG_FILE}"
      exec tail -n 100 -f "${TUNNEL_LOG_FILE}"
      ;;
    all|*)
      log_info "Streaming all service logs. Press Ctrl+C to exit."
      touch "${API_LOG_FILE}" "${WEB_LOG_FILE}" "${TUNNEL_LOG_FILE}"
      exec tail -n 30 -f "${API_LOG_FILE}" "${WEB_LOG_FILE}" "${TUNNEL_LOG_FILE}"
      ;;
  esac
}

cmd_url() {
  local tunnel_url
  tunnel_url="$(extract_tunnel_url || true)"
  if [[ -n "${tunnel_url}" ]]; then
    printf "%bPublic Cloudflare Tunnel URL:%b %s\n" "${C_GREEN}${C_BOLD}" "${C_RESET}" "${tunnel_url}"
    printf "%bLocal Web URL:%b               https://localhost:%s\n" "${C_CYAN}" "${C_RESET}" "${WEB_PORT}"
    printf "%bLocal API URL:%b               http://localhost:%s/api/v1\n" "${C_CYAN}" "${C_RESET}" "${API_PORT}"
  else
    log_warn "Tunnel URL not yet available or tunnel is not running."
    log_info "Check tunnel logs with: ./scripts/dev.sh logs tunnel"
    return 1
  fi
}

# ── Main Entrypoint ───────────────────────────────────────────────────────────
show_help() {
  cat << EOF
UIMS Stack Management CLI (Best Practice 2026)

Usage:
  ./scripts/dev.sh [command] [options]
  or ./dev.sh [command] [options]
  or pnpm run stack:[command]

Commands:
  start          Start backing containers, API, Web, and Cloudflare tunnel in background
  stop           Stop API, Web, and Cloudflare tunnel (pass --all to also stop Docker)
  restart        Restart all running services
  status         Show live health status, PIDs, ports, and public URL
  logs [service] Follow logs (api | web | tunnel | all) [default: all]
  url            Display active Cloudflare tunnel URL and local service URLs
  help           Display this help message

Options:
  --all, -a      (For 'stop') Also stop PostgreSQL, Redis, and backing Docker containers

Examples:
  ./scripts/dev.sh start
  ./scripts/dev.sh status
  ./scripts/dev.sh logs api
  ./scripts/dev.sh stop --all
EOF
}

ACTION="${1:-help}"
shift || true

case "${ACTION}" in
  start)
    cmd_start "$@"
    ;;
  stop|kill|down)
    cmd_stop "$@"
    ;;
  restart)
    cmd_restart "$@"
    ;;
  status|ps)
    cmd_status "$@"
    ;;
  logs|log)
    cmd_logs "$@"
    ;;
  url|tunnel)
    cmd_url "$@"
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    log_error "Unknown command: ${ACTION}"
    show_help
    exit 1
    ;;
esac
