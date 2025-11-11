# YachtCRM-DMS New Installation Guide

Follow these steps to deploy a fresh instance of YachtCRM-DMS.

## 1. Requirements
- PHP 8.2 with required extensions (`bcmath`, `ctype`, `gd`, `json`, `mbstring`, `openssl`, `pdo`, `tokenizer`, `xml`).
- Composer 2.7+.
- Node.js 20 LTS + npm 10.
- MariaDB/MySQL 10.6 or later.
- Redis (optional, recommended for queues + caching).

## 2. File Deployment
1. Extract the distribution package to your target directory.
2. Copy the contents of the `crm_source` folder into the destination (it already excludes `dist` and `node_modules`).
3. Ensure the web root points to `frontend/dist` (SPA) and the API points to `backend/public`.

## 3. Environment Configuration
1. Duplicate `backend/.env.example` -> `backend/.env` and set the following:
   - `APP_NAME`, `APP_URL`
   - Database credentials (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`)
   - Queue/broadcast credentials as needed
   - Mail driver settings
2. Run `php artisan key:generate` from the `backend/` directory.

For the frontend, create `frontend/.env` and define at minimum:
```
VITE_API_BASE_URL=https://your-domain.com/backend/api
```

## 4. Install Dependencies
```bash
cd backend
composer install --no-dev --prefer-dist

cd ../frontend
npm ci
npm run build
```

## 5. Database Initialization
1. Create an empty database.
2. Import the schema:
```bash
mysql -u <user> -p<password> <database> < sql/yachtcrm_schema_new_install.sql
```
3. (Optional) Seed demo data if available: `php artisan db:seed`.

## 6. Storage & Symlinks
From `backend/` run:
```bash
php artisan storage:link
```
Ensure the `storage/` and `bootstrap/cache/` directories are writable by the web server.
If deploying behind a shared hosting environment, recreate any public storage symlinks manually:
- Link `backend/storage/app/public` to `backend/public/storage` if direct shell access is unavailable.

## 7. Scheduler & Queue
- Configure a cron entry for Laravel scheduler:
  `* * * * * php /path/to/backend/artisan schedule:run >> /dev/null 2>&1`
- Start queue workers (if used) with `php artisan queue:work` or a supervisor service.

## 8. Final Verification
- Access the frontend application and ensure the login page loads with branding placeholders.
- Log in with the initial admin credentials (or create via `php artisan tinker`).
- Update branding, company profile, and system settings as needed.

