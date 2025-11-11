#!/usr/bin/env bash

set -euo pipefail

SCRIPT_VERSION="1.2.0"

if [[ ${EUID} -ne 0 ]]; then
  echo "This installer must be run as root (use sudo)." >&2
  exit 1
fi

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly GITHUB_OWNER="egtechgeek"
readonly GITHUB_REPO="YacthyCRM-DMS"
readonly INSTALL_ROOT_TARGET="/opt/YacthyCRM-DMS"
TEMP_WORKDIR=""
SOURCE_ROOT=""
MODE=""
declare -a NEW_MIGRATIONS=()
BACKEND_ENV_FILE=""
MIGRATIONS_REQUIRED=false

cleanup() {
  if [[ -n "${TEMP_WORKDIR}" && -d "${TEMP_WORKDIR}" ]]; then
    rm -rf "${TEMP_WORKDIR}"
  fi
}

trap cleanup EXIT

LOG_INFO() { printf "\033[1;32m[INFO]\033[0m %s\n" "$*"; }
LOG_WARN() { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
LOG_ERROR() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*"; }

select_operation_mode() {
  LOG_INFO "Select operation mode:"
  echo "  1) New Installation"
  echo "  2) Upgrade Existing Installation"
  while true; do
    read -rp "Enter choice [1-2]: " choice
    case "${choice}" in
      1)
        MODE="install"
        break
        ;;
      2)
        MODE="upgrade"
        break
        ;;
      *)
        echo "Invalid selection. Please choose 1 or 2."
        ;;
    esac
  done
  LOG_INFO "Mode selected: ${MODE^}"
}

get_latest_release_url() {
  local api_url="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest"
  local fallback="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/archive/refs/heads/main.tar.gz"

  LOG_INFO "Resolving latest release for ${GITHUB_OWNER}/${GITHUB_REPO}..."
  if latest_json=$(curl -fsSL "${api_url}"); then
    local tarball_url
    tarball_url=$(echo "${latest_json}" | jq -r '.tarball_url // empty')
    if [[ -n "${tarball_url}" && "${tarball_url}" != "null" ]]; then
      LOG_INFO "Latest release tarball: ${tarball_url}"
      echo "${tarball_url}"
      return
    fi
    LOG_WARN "Latest release response missing tarball_url; falling back to main branch snapshot."
  else
    LOG_WARN "Unable to query GitHub releases API; falling back to main branch snapshot."
  fi

  echo "${fallback}"
}

prompt_with_default() {
  local prompt="$1"
  local default_value="$2"
  local result

  if [[ -n "${default_value}" ]]; then
    read -rp "${prompt} [${default_value}]: " result
    echo "${result:-${default_value}}"
  else
    while true; do
      read -rp "${prompt}: " result
      if [[ -n "${result}" ]]; then
        echo "${result}"
        break
      fi
    done
  fi
}

prompt_secret() {
  local prompt="$1"
  local default_value="${2-}"
  local allow_empty="${3-}"
  local result

  while true; do
    if [[ -n "${default_value}" ]]; then
      read -srp "${prompt} [hidden, press enter for default]: " result
      echo
      result="${result:-${default_value}}"
    else
      read -srp "${prompt}: " result
      echo
    fi

    if [[ -n "${result}" || "${allow_empty}" == "true" ]]; then
      echo "${result}"
      break
    fi
  done
}

ensure_command() {
  local cmd="$1"
  local package_hint="${2-}"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    LOG_ERROR "Required command '${cmd}' is not available${package_hint:+ (install ${package_hint})}."
    exit 1
  fi
}

run_apt_update() {
  if [[ "${APT_UPDATED:-0}" -eq 0 ]]; then
    LOG_INFO "Updating apt package index..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    APT_UPDATED=1
  fi
}

add_php_repo_if_needed() {
  if ! apt-cache policy | grep -q "ondrej/php"; then
    LOG_INFO "Adding Ondřej Surý PHP repository..."
    run_apt_update
    apt-get install -y software-properties-common ca-certificates apt-transport-https lsb-release
    add-apt-repository -y ppa:ondrej/php
  fi
}

install_php_stack() {
  local required_version="8.3"
  if php -v 2>/dev/null | grep -q "PHP ${required_version}"; then
    LOG_INFO "PHP ${required_version} detected; ensuring required extensions are present..."
  else
    LOG_INFO "Installing PHP ${required_version} runtime and extensions..."
    add_php_repo_if_needed
  fi

  run_apt_update

  apt-get install -y \
    "php${required_version}" \
    "php${required_version}-cli" \
    "php${required_version}-fpm" \
    "php${required_version}-common" \
    "php${required_version}-mysql" \
    "php${required_version}-xml" \
    "php${required_version}-curl" \
    "php${required_version}-mbstring" \
    "php${required_version}-zip" \
    "php${required_version}-gd" \
    "php${required_version}-bcmath" \
    "php${required_version}-intl" \
    "php${required_version}-redis"

  if update-alternatives --list php >/dev/null 2>&1; then
    update-alternatives --set php "/usr/bin/php${required_version}"
  fi
  if update-alternatives --list phar >/dev/null 2>&1; then
    update-alternatives --set phar "/usr/bin/phar${required_version}"
  fi
  if update-alternatives --list phar.phar >/dev/null 2>&1; then
    update-alternatives --set phar.phar "/usr/bin/phar.phar${required_version}"
  fi

  systemctl enable "php${required_version}-fpm"
  systemctl restart "php${required_version}-fpm"
}

install_composer() {
  if command -v composer >/dev/null 2>&1; then
    LOG_INFO "Composer already installed ($(composer --version))."
    return
  fi

  LOG_INFO "Installing Composer globally..."
  ensure_command php "php8.3-cli"
  local installer="/tmp/composer-setup.php"
  php -r "copy('https://getcomposer.org/installer', '${installer}');"
  php "${installer}" --install-dir=/usr/local/bin --filename=composer
  rm -f "${installer}"
}

install_nodesource_repo() {
  if [[ ! -f /etc/apt/sources.list.d/nodesource.list ]] || ! grep -q "22.x" /etc/apt/sources.list.d/nodesource.list 2>/dev/null; then
    LOG_INFO "Configuring NodeSource repository for Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1 && node --version | grep -q "^v22\\."; then
    LOG_INFO "Node.js $(node --version) already meets requirement."
    return
  fi

  install_nodesource_repo
  run_apt_update

  LOG_INFO "Installing Node.js 22..."
  apt-get install -y nodejs
}

install_redis() {
  if systemctl is-active --quiet redis-server; then
    LOG_INFO "Redis server already installed and running."
    return
  fi

  run_apt_update
  LOG_INFO "Installing Redis server..."
  apt-get install -y redis-server
  systemctl enable redis-server
  systemctl restart redis-server
}

install_mariadb() {
  if dpkg -s mariadb-server >/dev/null 2>&1; then
    LOG_INFO "MariaDB server already installed."
    systemctl enable mariadb
    systemctl restart mariadb
    return
  fi

  run_apt_update
  LOG_INFO "Installing MariaDB server..."
  apt-get install -y mariadb-server
  systemctl enable mariadb
  systemctl restart mariadb
}

install_nginx() {
  if dpkg -s nginx >/dev/null 2>&1; then
    LOG_INFO "nginx already installed."
  else
    run_apt_update
    LOG_INFO "Installing nginx..."
    apt-get install -y nginx
  fi
  systemctl enable nginx
  systemctl restart nginx
}

install_build_tools() {
  run_apt_update
  LOG_INFO "Installing supporting build tools..."
  apt-get install -y git unzip curl rsync acl jq python3 tar
}

escape_for_single_quotes() {
  python3 - "$1" <<'PY'
import sys
val = sys.argv[1]
val = val.replace("\\", "\\\\").replace("'", "\\'")
print(val)
PY
}

escape_for_backticks() {
  python3 - "$1" <<'PY'
import sys
val = sys.argv[1]
print(val.replace("`", "``"))
PY
}

collect_install_inputs() {
  LOG_INFO "Collecting installation parameters..."
  local default_archive_url
  default_archive_url=$(get_latest_release_url)
  CRM_SOURCE_URL=$(prompt_with_default "GitHub archive URL for YachtCRM-DMS source" "${default_archive_url}")
  INSTALL_ROOT="${INSTALL_ROOT_TARGET}"
  LOG_INFO "Installation directory fixed to ${INSTALL_ROOT_TARGET}"
  APP_NAME=$(prompt_with_default "Application display name" "YachtCRM-DMS")
  APP_URL=$(prompt_with_default "Public application URL (no trailing slash)" "https://crm.example.com")
  SERVER_NAME=$(prompt_with_default "nginx server_name value" "$(echo "${APP_URL}" | awk -F[/:] '{print $4}')")

  DB_ROOT_PASSWORD=$(prompt_secret "MariaDB root password to set (new or existing)")
  DB_NAME=$(prompt_with_default "MariaDB database name" "yachtcrm")
  DB_USER=$(prompt_with_default "MariaDB application user" "yachtcrm")
  DB_PASSWORD=$(prompt_secret "MariaDB application user password")
  DB_HOST=$(prompt_with_default "Database host" "127.0.0.1")
  DB_PORT=$(prompt_with_default "Database port" "3306")

  MAIL_MAILER=$(prompt_with_default "Mail mailer" "smtp")
  MAIL_HOST=$(prompt_with_default "Mail host" "smtp.example.com")
  MAIL_PORT=$(prompt_with_default "Mail port" "587")
  MAIL_USERNAME=$(prompt_with_default "Mail username" "mailer@example.com")
  MAIL_PASSWORD=$(prompt_secret "Mail password" "" "true")
  MAIL_ENCRYPTION=$(prompt_with_default "Mail encryption" "tls")
  MAIL_FROM_ADDRESS=$(prompt_with_default "Mail from address" "noreply@example.com")
  MAIL_FROM_NAME=$(prompt_with_default "Mail from name" "${APP_NAME}")

  QUEUE_CONNECTION=$(prompt_with_default "Queue connection driver" "redis")
  CACHE_DRIVER=$(prompt_with_default "Cache driver" "redis")
  SESSION_DRIVER=$(prompt_with_default "Session driver" "redis")
  REDIS_HOST=$(prompt_with_default "Redis host" "127.0.0.1")
  REDIS_PASSWORD_INPUT=$(prompt_secret "Redis password (leave blank if none)" "" "true")
  REDIS_PORT=$(prompt_with_default "Redis port" "6379")

  ADMIN_NAME=$(prompt_with_default "Initial admin name" "System Administrator")
  ADMIN_EMAIL=$(prompt_with_default "Initial admin email" "admin@example.com")
  ADMIN_PASSWORD=$(prompt_secret "Initial admin password")

  VITE_API_BASE_URL="${APP_URL%/}/backend/api"
}

collect_upgrade_inputs() {
  LOG_INFO "Collecting upgrade parameters..."
  local default_archive_url
  default_archive_url=$(get_latest_release_url)
  CRM_SOURCE_URL=$(prompt_with_default "GitHub archive URL for YachtCRM-DMS source" "${default_archive_url}")
  INSTALL_ROOT="${INSTALL_ROOT_TARGET}"
  LOG_INFO "Upgrade will target ${INSTALL_ROOT_TARGET}"

  if [[ ! -d "${INSTALL_ROOT}/backend" || ! -d "${INSTALL_ROOT}/frontend" ]]; then
    LOG_ERROR "The provided installation directory does not look like a YachtCRM-DMS deployment."
    exit 1
  fi

  BACKEND_ENV_FILE="${INSTALL_ROOT}/backend/.env"
  if [[ ! -f "${BACKEND_ENV_FILE}" ]]; then
    LOG_ERROR "Missing backend .env file at ${BACKEND_ENV_FILE}. Aborting upgrade."
    exit 1
  fi

  VITE_API_BASE_URL="$(grep -E '^VITE_API_BASE_URL=' "${INSTALL_ROOT}/frontend/.env" 2>/dev/null | cut -d'=' -f2- || true)"
}

verify_prerequisites() {
  LOG_INFO "Verifying existing prerequisites..."
  local required_commands=(
    "php:php8.3-cli"
    "composer:composer"
    "node:nodejs"
    "npm:nodejs"
    "mysql:mariadb-server"
    "redis-cli:redis-tools"
    "nginx:nginx"
    "jq:jq"
    "tar:tar"
    "curl:curl"
  )

  for entry in "${required_commands[@]}"; do
    IFS=":" read -r cmd pkg <<<"${entry}"
    if ! command -v "${cmd}" >/dev/null 2>&1; then
      LOG_ERROR "Missing prerequisite '${cmd}'. Please install package '${pkg}' and retry."
      exit 1
    fi
  done

  if ! php -v 2>/dev/null | grep -q "PHP 8.3"; then
    LOG_ERROR "Detected PHP version is not 8.3+. Please upgrade PHP before proceeding."
    exit 1
  fi

  if ! node --version 2>/dev/null | grep -q "^v22\\."; then
    LOG_ERROR "Detected Node.js version is not v22. Please upgrade Node.js before proceeding."
    exit 1
  fi

  LOG_INFO "All required prerequisites detected."
}
ensure_directory() {
  local path="$1"
  mkdir -p "${path}"
}

copy_crm_source() {
  if [[ -z "${SOURCE_ROOT}" ]]; then
    LOG_ERROR "Internal error: SOURCE_ROOT not set. Did download_crm_source run?"
    exit 1
  fi

  LOG_INFO "Deploying YachtCRM-DMS source to ${INSTALL_ROOT}..."
  ensure_directory "${INSTALL_ROOT}"
  rsync -a --delete "${SOURCE_ROOT}/" "${INSTALL_ROOT}/"
}

download_crm_source() {
  LOG_INFO "Downloading YachtCRM-DMS source from ${CRM_SOURCE_URL}..."
  TEMP_WORKDIR=$(mktemp -d)
  local archive_path="${TEMP_WORKDIR}/crm_source.tar.gz"

  if ! curl -fL "${CRM_SOURCE_URL}" -o "${archive_path}"; then
    LOG_ERROR "Failed to download source archive from ${CRM_SOURCE_URL}"
    exit 1
  fi

  tar -xzf "${archive_path}" -C "${TEMP_WORKDIR}"

  local extracted_dir
  extracted_dir=$(find "${TEMP_WORKDIR}" -mindepth 1 -maxdepth 1 -type d | head -n1)

  if [[ -z "${extracted_dir}" ]]; then
    LOG_ERROR "Failed to extract archive from ${CRM_SOURCE_URL}"
    exit 1
  fi

  if [[ -d "${extracted_dir}/CRM_Source" ]]; then
    SOURCE_ROOT="${extracted_dir}/CRM_Source"
  elif [[ -d "${extracted_dir}/backend" && -d "${extracted_dir}/frontend" ]]; then
    SOURCE_ROOT="${extracted_dir}"
  else
    LOG_ERROR "Downloaded archive does not contain a CRM_Source directory."
    exit 1
  fi

  LOG_INFO "Source downloaded and extracted to ${SOURCE_ROOT}"
}

detect_new_migrations() {
  NEW_MIGRATIONS=()
  MIGRATIONS_REQUIRED=false

  local existing_dir="${INSTALL_ROOT}/backend/database/migrations"
  local source_dir="${SOURCE_ROOT}/backend/database/migrations"

  if [[ ! -d "${existing_dir}" ]]; then
    LOG_WARN "Existing migrations directory missing; will run migrations after upgrade."
    MIGRATIONS_REQUIRED=true
    return
  fi

  if [[ ! -d "${source_dir}" ]]; then
    LOG_WARN "Source release missing migrations directory; skipping migration comparison."
    return
  fi

  mapfile -t existing_files < <(find "${existing_dir}" -maxdepth 1 -type f -name "*.php" -printf '%f\n' | LC_ALL=C sort)
  mapfile -t source_files < <(find "${source_dir}" -maxdepth 1 -type f -name "*.php" -printf '%f\n' | LC_ALL=C sort)

  if [[ ${#source_files[@]} -eq 0 ]]; then
    LOG_WARN "Source release contains no migrations; skipping migration comparison."
    return
  fi

  if [[ ${#existing_files[@]} -eq 0 ]]; then
    LOG_INFO "No existing migration files found; migrations will be applied."
    NEW_MIGRATIONS=("${source_files[@]}")
    MIGRATIONS_REQUIRED=true
    return
  fi

  local diff_output
  diff_output=$(comm -13 <(printf '%s\n' "${existing_files[@]}") <(printf '%s\n' "${source_files[@]}") || true)

  if [[ -n "${diff_output}" ]]; then
    mapfile -t NEW_MIGRATIONS <<<"${diff_output}"
    MIGRATIONS_REQUIRED=true
    LOG_INFO "Detected ${#NEW_MIGRATIONS[@]} new migration(s) to apply."
  else
    LOG_INFO "No new migrations detected."
  fi
}

set_permissions() {
  LOG_INFO "Setting directory permissions..."
  chown -R www-data:www-data "${INSTALL_ROOT}/backend/storage" "${INSTALL_ROOT}/backend/bootstrap/cache"
  find "${INSTALL_ROOT}/backend/storage" -type d -exec chmod 775 {} +
  find "${INSTALL_ROOT}/backend/bootstrap/cache" -type d -exec chmod 775 {} +
  find "${INSTALL_ROOT}/backend/storage" -type f -exec chmod 664 {} +
  find "${INSTALL_ROOT}/backend/bootstrap/cache" -type f -exec chmod 664 {} +
}

sync_release_to_install() {
  LOG_INFO "Syncing release files into ${INSTALL_ROOT}..."
  ensure_directory "${INSTALL_ROOT}"
  rsync -a --delete \
    --exclude 'backend/.env' \
    --exclude 'backend/storage/' \
    --exclude 'backend/bootstrap/cache/' \
    --exclude 'frontend/.env' \
    --exclude 'frontend/node_modules/' \
    --exclude 'frontend/dist/' \
    "${SOURCE_ROOT}/" "${INSTALL_ROOT}/"

  LOG_INFO "Release sync complete."
}

set_env_var() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  python3 - "$env_file" "$key" "$value" <<'PY'
import sys, json, pathlib
path, key, value = sys.argv[1:]
lines = pathlib.Path(path).read_text().splitlines()
pref = key + "="
encoded = f"{key}={json.dumps(value)}"
for idx, line in enumerate(lines):
    if line.startswith(pref):
        lines[idx] = encoded
        pathlib.Path(path).write_text("\n".join(lines) + "\n")
        break
else:
    lines.append(encoded)
    pathlib.Path(path).write_text("\n".join(lines) + "\n")
PY
}

set_env_var_literal() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  python3 - "$env_file" "$key" "$value" <<'PY'
import sys, pathlib
path, key, value = sys.argv[1:]
lines = pathlib.Path(path).read_text().splitlines()
pref = key + "="
encoded = f"{key}={value}"
for idx, line in enumerate(lines):
    if line.startswith(pref):
        lines[idx] = encoded
        pathlib.Path(path).write_text("\n".join(lines) + "\n")
        break
else:
    lines.append(encoded)
    pathlib.Path(path).write_text("\n".join(lines) + "\n")
PY
}

read_env_value() {
  local env_file="$1"
  local key="$2"
  python3 - "$env_file" "$key" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
if not path.exists():
    sys.exit(0)

for raw in path.read_text().splitlines():
    if not raw or raw.lstrip().startswith("#"):
        continue
    if "=" not in raw:
        continue
    k, v = raw.split("=", 1)
    if k.strip() != key:
        continue
    v = v.strip()
    if v and ((v[0] == v[-1]) and v[0] in {'"', "'"}):
        v = v[1:-1]
    print(v)
    break
PY
}

configure_backend_env() {
  local backend_dir="${INSTALL_ROOT}/backend"
  local env_file="${backend_dir}/.env"

  LOG_INFO "Configuring backend environment file..."
  if [[ ! -f "${env_file}" ]]; then
    cp "${backend_dir}/.env.example" "${env_file}"
  fi

  set_env_var "${env_file}" "APP_NAME" "${APP_NAME}"
  set_env_var "${env_file}" "APP_URL" "${APP_URL%/}"
  set_env_var_literal "${env_file}" "APP_ENV" "production"
  set_env_var_literal "${env_file}" "APP_DEBUG" "false"

  set_env_var "${env_file}" "DB_HOST" "${DB_HOST}"
  set_env_var "${env_file}" "DB_PORT" "${DB_PORT}"
  set_env_var "${env_file}" "DB_DATABASE" "${DB_NAME}"
  set_env_var "${env_file}" "DB_USERNAME" "${DB_USER}"
  set_env_var "${env_file}" "DB_PASSWORD" "${DB_PASSWORD}"

  set_env_var "${env_file}" "CACHE_DRIVER" "${CACHE_DRIVER}"
  set_env_var "${env_file}" "SESSION_DRIVER" "${SESSION_DRIVER}"
  set_env_var "${env_file}" "QUEUE_CONNECTION" "${QUEUE_CONNECTION}"

  set_env_var "${env_file}" "REDIS_HOST" "${REDIS_HOST}"
  set_env_var "${env_file}" "REDIS_PASSWORD" "${REDIS_PASSWORD_INPUT}"
  set_env_var "${env_file}" "REDIS_PORT" "${REDIS_PORT}"

  set_env_var "${env_file}" "MAIL_MAILER" "${MAIL_MAILER}"
  set_env_var "${env_file}" "MAIL_HOST" "${MAIL_HOST}"
  set_env_var "${env_file}" "MAIL_PORT" "${MAIL_PORT}"
  set_env_var "${env_file}" "MAIL_USERNAME" "${MAIL_USERNAME}"
  set_env_var "${env_file}" "MAIL_PASSWORD" "${MAIL_PASSWORD}"
  set_env_var "${env_file}" "MAIL_ENCRYPTION" "${MAIL_ENCRYPTION}"
  set_env_var "${env_file}" "MAIL_FROM_ADDRESS" "${MAIL_FROM_ADDRESS}"
  set_env_var "${env_file}" "MAIL_FROM_NAME" "${MAIL_FROM_NAME}"
}

configure_frontend_env() {
  local frontend_dir="${INSTALL_ROOT}/frontend"
  local env_file="${frontend_dir}/.env"

  LOG_INFO "Configuring frontend environment file..."
  cat > "${env_file}" <<EOF
VITE_API_BASE_URL=${VITE_API_BASE_URL}
EOF
}

load_existing_env_values() {
  DB_HOST=$(read_env_value "${BACKEND_ENV_FILE}" "DB_HOST")
  DB_PORT=$(read_env_value "${BACKEND_ENV_FILE}" "DB_PORT")
  DB_NAME=$(read_env_value "${BACKEND_ENV_FILE}" "DB_DATABASE")
  DB_USER=$(read_env_value "${BACKEND_ENV_FILE}" "DB_USERNAME")
  DB_PASSWORD=$(read_env_value "${BACKEND_ENV_FILE}" "DB_PASSWORD")
  CACHE_DRIVER=$(read_env_value "${BACKEND_ENV_FILE}" "CACHE_DRIVER")
  SESSION_DRIVER=$(read_env_value "${BACKEND_ENV_FILE}" "SESSION_DRIVER")
  QUEUE_CONNECTION=$(read_env_value "${BACKEND_ENV_FILE}" "QUEUE_CONNECTION")
  REDIS_HOST=$(read_env_value "${BACKEND_ENV_FILE}" "REDIS_HOST")
  REDIS_PASSWORD_INPUT=$(read_env_value "${BACKEND_ENV_FILE}" "REDIS_PASSWORD")
  REDIS_PORT=$(read_env_value "${BACKEND_ENV_FILE}" "REDIS_PORT")

  DB_PORT=${DB_PORT:-3306}
  REDIS_HOST=${REDIS_HOST:-127.0.0.1}
  REDIS_PORT=${REDIS_PORT:-6379}
}

provision_database() {
  LOG_INFO "Configuring MariaDB database and user..."

  local db_name_backtick
  local db_user_sql
  local db_password_sql
  local db_root_password_sql

  db_name_backtick=$(escape_for_backticks "${DB_NAME}")
  db_user_sql=$(escape_for_single_quotes "${DB_USER}")
  db_password_sql=$(escape_for_single_quotes "${DB_PASSWORD}")
  db_root_password_sql=$(escape_for_single_quotes "${DB_ROOT_PASSWORD}")

  if mysql -uroot -p"${DB_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; then
    LOG_INFO "Provided MariaDB root password is already valid."
  else
    LOG_INFO "Setting MariaDB root password..."
    mysql --protocol=socket -uroot <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${db_root_password_sql}';
FLUSH PRIVILEGES;
SQL
  fi

  mysql -uroot -p"${DB_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${db_name_backtick}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${db_user_sql}'@'%' IDENTIFIED BY '${db_password_sql}';
GRANT ALL PRIVILEGES ON \`${db_name_backtick}\`.* TO '${db_user_sql}'@'%';
FLUSH PRIVILEGES;
SQL
}

import_schema_and_seed() {
  local backend_dir="${INSTALL_ROOT}/backend"
  local sql_file="${INSTALL_ROOT}/sql/yachtcrm_schema_new_install.sql"

  if [[ ! -f "${sql_file}" ]]; then
    LOG_ERROR "Schema file not found at ${sql_file}"
    exit 1
  fi

  LOG_INFO "Importing schema dump into ${DB_NAME}..."
  mysql -u root -p"${DB_ROOT_PASSWORD}" "${DB_NAME}" < "${sql_file}"

  LOG_INFO "Running Laravel migrations..."
  pushd "${backend_dir}" >/dev/null
  php artisan migrate --force
  LOG_INFO "Seeding database..."
  php artisan db:seed --force
  popd >/dev/null
}

install_backend_dependencies_install() {
  local backend_dir="${INSTALL_ROOT}/backend"
  LOG_INFO "Installing backend Composer dependencies..."
  pushd "${backend_dir}" >/dev/null
  export COMPOSER_ALLOW_SUPERUSER=1
  composer install --no-dev --prefer-dist
  php artisan key:generate --force
  php artisan config:cache
  php artisan route:cache
  php artisan storage:link
  popd >/dev/null
}

install_frontend_dependencies() {
  local frontend_dir="${INSTALL_ROOT}/frontend"

  LOG_INFO "Installing frontend dependencies and building assets..."
  pushd "${frontend_dir}" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
  popd >/dev/null
}

install_backend_dependencies_upgrade() {
  local backend_dir="${INSTALL_ROOT}/backend"
  LOG_INFO "Updating backend Composer dependencies..."
  pushd "${backend_dir}" >/dev/null
  export COMPOSER_ALLOW_SUPERUSER=1
  composer install --no-dev --prefer-dist
  php artisan optimize:clear
  php artisan config:cache
  php artisan route:cache
  php artisan storage:link
  popd >/dev/null
}

apply_migrations_if_needed() {
  if [[ "${MIGRATIONS_REQUIRED}" != true ]]; then
    LOG_INFO "No pending migrations detected; skipping migrate step."
    return
  fi

  local backend_dir="${INSTALL_ROOT}/backend"
  if [[ ${#NEW_MIGRATIONS[@]} -gt 0 ]]; then
    LOG_INFO "Migrations to be applied:"
    printf '  - %s\n' "${NEW_MIGRATIONS[@]}"
  fi

  LOG_INFO "Running database migrations..."
  pushd "${backend_dir}" >/dev/null
  php artisan migrate --force
  popd >/dev/null
}

run_install_flow() {
  LOG_INFO "Starting prerequisite installation..."

  install_build_tools
  install_php_stack
  install_composer
  install_node
  install_redis
  install_mariadb
  install_nginx
  LOG_INFO "Prerequisites installed successfully."

  collect_install_inputs
  download_crm_source
  copy_crm_source
  set_permissions
  configure_backend_env
  configure_frontend_env
  install_backend_dependencies_install
  install_frontend_dependencies
  provision_database
  import_schema_and_seed
  create_admin_user
  configure_nginx
  verify_services
  print_summary_install
}

run_upgrade_flow() {
  LOG_INFO "Verifying existing prerequisites..."
  verify_prerequisites
  collect_upgrade_inputs
  load_existing_env_values
  download_crm_source
  detect_new_migrations
  sync_release_to_install
  install_backend_dependencies_upgrade
  install_frontend_dependencies
  apply_migrations_if_needed
  set_permissions
  verify_services
  print_summary_upgrade
}

create_admin_user() {
  local backend_dir="${INSTALL_ROOT}/backend"
  LOG_INFO "Creating initial admin user (idempotent)..."
  pushd "${backend_dir}" >/dev/null
  ADMIN_NAME="${ADMIN_NAME}" ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASSWORD}" php -r "require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$kernel = \$app->make(Illuminate\\Contracts\\Console\\Kernel::class);
\$kernel->bootstrap();
\$userClass = config('auth.providers.users.model');
\$name = getenv('ADMIN_NAME');
\$email = getenv('ADMIN_EMAIL');
\$password = getenv('ADMIN_PASSWORD');
if (!\$userClass::where('email', \$email)->exists()) {
    \$userClass::create([
        'name' => \$name,
        'email' => \$email,
        'password' => bcrypt(\$password),
        'email_verified_at' => now(),
    ]);
}"
  popd >/dev/null
}

configure_nginx() {
  local backend_public="${INSTALL_ROOT}/backend/public"
  local frontend_dist="${INSTALL_ROOT}/frontend/dist"
  local server_conf="/etc/nginx/sites-available/yachtcrm-dms.conf"

  LOG_INFO "Configuring nginx virtual host..."
  cat > "${server_conf}" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${backend_public};
    index index.php index.html;

    access_log /var/log/nginx/yachtcrm-dms.access.log;
    error_log /var/log/nginx/yachtcrm-dms.error.log;

    client_max_body_size 64M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location /frontend/ {
        alias ${frontend_dist}/;
        try_files \$uri \$uri/ /frontend/index.html;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }

    location ~* \.(?:css|js|png|jpg|jpeg|gif|ico|svg|webp)$ {
        try_files \$uri \$uri/ /frontend/index.html;
    }
}
EOF

  ln -sf "${server_conf}" /etc/nginx/sites-enabled/yachtcrm-dms.conf
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
  systemctl reload nginx
}

verify_services() {
  LOG_INFO "Verifying service status..."
  for service in nginx "php8.3-fpm" mariadb redis-server; do
    if systemctl is-active --quiet "${service}"; then
      LOG_INFO "Service ${service} is active."
    else
      LOG_WARN "Service ${service} is not active. Check logs via 'journalctl -u ${service}'."
    fi
  done

  if command -v mysql >/dev/null 2>&1; then
    local mysql_cmd=(mysql -u "${DB_USER}" -h "${DB_HOST}" -P "${DB_PORT}" -e "SELECT 1")
    if [[ -n "${DB_PASSWORD}" ]]; then
      mysql_cmd+=(-p"${DB_PASSWORD}")
    fi
    if "${mysql_cmd[@]}" >/dev/null 2>&1; then
      LOG_INFO "Verified database connection for user ${DB_USER}."
    else
      LOG_WARN "Unable to verify database credentials for ${DB_USER}. Please test manually."
    fi
  fi

  if command -v redis-cli >/dev/null 2>&1; then
    if [[ -n "${REDIS_PASSWORD_INPUT}" ]]; then
      if redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD_INPUT}" ping >/dev/null 2>&1; then
        LOG_INFO "Redis ping successful."
      else
        LOG_WARN "Redis ping failed. Verify Redis configuration."
      fi
    else
      if redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping >/dev/null 2>&1; then
        LOG_INFO "Redis ping successful."
      else
        LOG_WARN "Redis ping failed. Verify Redis configuration."
      fi
    fi
  fi
}

print_summary_install() {
  cat <<EOF

========================================
YachtCRM-DMS Installation Complete
========================================
App URL:          ${APP_URL%/}/frontend/
Admin Credentials:
  Email:          ${ADMIN_EMAIL}
  Password:       (hidden)

Database:
  Host:           ${DB_HOST}
  Database:       ${DB_NAME}
  User:           ${DB_USER}

Redis:
  Host:           ${REDIS_HOST}
  Port:           ${REDIS_PORT}

Next Steps:
  - Consider running 'mysql_secure_installation' for additional hardening.
  - Configure SSL (e.g., with Let's Encrypt) and update nginx accordingly.
  - Verify cron job: */5 * * * * www-data php ${INSTALL_ROOT}/backend/artisan schedule:run >> /var/log/cron.log 2>&1
  - Monitor Redis and queue workers: php artisan queue:work

Thank you for choosing YachtCRM-DMS!
EOF
}

print_summary_upgrade() {
  local env_app_url env_db_host env_db_name env_db_user
  env_app_url=$(read_env_value "${BACKEND_ENV_FILE}" "APP_URL")
  env_db_host=$(read_env_value "${BACKEND_ENV_FILE}" "DB_HOST")
  env_db_name=$(read_env_value "${BACKEND_ENV_FILE}" "DB_DATABASE")
  env_db_user=$(read_env_value "${BACKEND_ENV_FILE}" "DB_USERNAME")

  cat <<EOF

========================================
YachtCRM-DMS Upgrade Complete
========================================
App URL:          ${env_app_url%/}/frontend/

Database:
  Host:           ${env_db_host}
  Database:       ${env_db_name}
  User:           ${env_db_user}

Migrations Applied:
$(if [[ ${#NEW_MIGRATIONS[@]} -gt 0 ]]; then printf '  - %s\n' "${NEW_MIGRATIONS[@]}"; else echo "  - None detected"; fi)

Next Steps:
  - Confirm application functionality and branding assets.
  - Review release notes for manual steps.
  - Restart background workers if applicable: php artisan queue:restart

Thank you for keeping YachtCRM-DMS up to date!
EOF
}

main() {
  LOG_INFO "YachtCRM-DMS Linux Installer v${SCRIPT_VERSION}"
  select_operation_mode

  if [[ "${MODE}" == "install" ]]; then
    run_install_flow
  else
    run_upgrade_flow
  fi
}

main "$@"

