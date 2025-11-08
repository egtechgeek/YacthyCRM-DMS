# YachtCRM-DMS Upgrade Guide

This guide covers upgrading an existing YachtCRM-DMS deployment to the November 2025 release.

## 1. Pre-Upgrade Checklist
- Review release notes and verify system requirements (PHP 8.2+, Node 20+, MariaDB/MySQL 10.6+).
- Notify users of scheduled maintenance and place the application in maintenance mode: `php artisan down`.
- Back up the application files and database before making changes.

## 2. Update Source Code
1. Sync your deployment with the distribution package or pull the latest release tag.
2. Install PHP dependencies: `composer install --no-dev --prefer-dist`.
3. Install JavaScript dependencies inside `frontend/`: `npm ci`.

## 3. Database Schema Updates
The release introduces new accounting, vehicle, and branding tables. Apply the schema patch:

```bash
mysql -u <user> -p<password> <database> < sql/yachtcrm_schema_upgrade.sql
```

- The script is idempotent (`IF NOT EXISTS` guards) and can be safely re-run.
- After applying, run `php artisan migrate` if you maintain custom migrations.

## 4. Build Frontend Assets
Generate a fresh production bundle:

```bash
cd frontend
npm run build
```

Deploy the contents of `frontend/dist` to your web root or CDN as required.

## 5. Cache & Queue Refresh
- Clear and rebuild configuration caches: `php artisan config:clear && php artisan config:cache`.
- Clear compiled views and route caches: `php artisan view:clear && php artisan route:clear`.
- Restart queue workers (if any): `php artisan queue:restart`.

## 6. Storage Symlink & Permissions
If the storage symlink was removed during deployment, recreate it:

```bash
php artisan storage:link
```

Ensure `storage/` and `bootstrap/cache/` directories remain writable by the web server user.

## 7. Post-Upgrade Verification
- Log in as an administrator and confirm branding assets render correctly.
- Verify accounting reports, vehicle management, and navigation configuration features.
- Bring the application back online: `php artisan up`.

## 8. Rollback Strategy
If issues arise:
- Restore code and database from the backups made in step 1.
- Revert any environment variable changes.
- Collect logs from `storage/logs/` for troubleshooting.

