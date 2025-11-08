# Plesk-Specific Configuration Guide

This document outlines the server-side configuration steps required when deploying YachtCRM-DMS on a Plesk-managed server.

## Overview

YachtCRM-DMS is a Laravel (backend) + React (frontend) application that requires specific directory structure and web server configuration when deployed on Plesk.

---

## Directory Structure

```
/var/www/vhosts/yourdomain.com/
├── crm.subdomain.com/                    # Domain root (created by Plesk)
│   ├── httpdocs/                          # Public web root (Plesk default)
│   ├── backend/                           # Laravel application
│   │   ├── app/
│   │   ├── public/                        # Laravel public directory
│   │   └── ...
│   └── frontend/                          # React application
│       ├── dist/                          # Built React files
│       └── ...
```

---

## Critical Configuration Steps

### 1. Symlink Setup (Most Important!)

Plesk expects the web root to be at `httpdocs/`, but we have separate backend and frontend applications.

**Create symlinks to serve both applications:**

```bash
cd /var/www/vhosts/yourdomain.com/crm.subdomain.com/httpdocs

# Create symlink to backend public directory
ln -s ../backend/public backend

# Create symlink to frontend dist directory
ln -s ../frontend/dist frontend
```

**Result:**
- `http://crm.yourdomain.com/backend/` → Laravel API
- `http://crm.yourdomain.com/frontend/` → React app

### 2. .htaccess in httpdocs/

Create or update `/var/www/vhosts/yourdomain.com/crm.subdomain.com/httpdocs/.htaccess`:

```apache
Options +FollowSymLinks
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Backend API requests go to Laravel
    RewriteCond %{REQUEST_URI} ^/backend/
    RewriteRule ^backend/(.*)$ /backend/index.php [L,QSA]
    
    # Serve static files from frontend directly (no PHP processing)
    RewriteCond %{REQUEST_URI} ^/frontend/
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    
    # Frontend SPA - send to index.html if file doesn't exist
    RewriteCond %{REQUEST_URI} ^/frontend/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^frontend/(.*)$ /frontend/index.html [L]
    
    # Default redirect to frontend
    RewriteCond %{REQUEST_URI} !^/(frontend|backend)/
    RewriteRule ^(.*)$ /frontend/ [L,R=302]
</IfModule>

# Disable PHP execution in frontend directory
<FilesMatch "\.html$">
    SetHandler None
</FilesMatch>
```

### 3. Backend .htaccess

The backend/public/.htaccess should be the standard Laravel .htaccess (already included).

### 4. Frontend .htaccess

Create or update `/var/www/vhosts/yourdomain.com/crm.subdomain.com/frontend/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /frontend/
    
    # Don't rewrite files or directories that exist
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # Rewrite everything else to index.html (for React Router)
    RewriteRule . /frontend/index.html [L]
</IfModule>

# Disable caching for JS and CSS files to ensure updates are loaded
<IfModule mod_headers.c>
    <FilesMatch "\.(js|css|html)$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires 0
    </FilesMatch>
</IfModule>
```

---

## Permissions

Set proper permissions for Laravel storage and cache:

```bash
cd /var/www/vhosts/yourdomain.com/crm.subdomain.com/backend

chmod -R 775 storage
chmod -R 775 bootstrap/cache

# If using a specific web user (common in Plesk)
chown -R username:psaserv storage
chown -R username:psaserv bootstrap/cache
```

Replace `username` with your domain's system user (usually visible in Plesk).

---

## PHP Configuration in Plesk

### Required PHP Extensions:
- ✅ OpenSSL
- ✅ PDO
- ✅ Mbstring
- ✅ Tokenizer
- ✅ XML
- ✅ Ctype
- ✅ JSON
- ✅ BCMath
- ✅ Fileinfo
- ✅ GD (for image manipulation)
- ✅ Zip

**How to enable in Plesk:**
1. Go to Domains → your domain → PHP Settings
2. Ensure all required extensions are checked
3. Set PHP version to 8.1 or higher

### PHP Settings:
```ini
memory_limit = 256M
max_execution_time = 300
upload_max_filesize = 20M
post_max_size = 20M
```

---

## Environment Variables

Create `/backend/.env` from `/backend/.env.example` and configure:

```env
APP_NAME="YachtCRM-DMS"
APP_ENV=production
APP_KEY=base64:... # Generate with: php artisan key:generate
APP_DEBUG=false
APP_URL=http://crm.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

# Session and cache (use database for Plesk compatibility)
SESSION_DRIVER=database
CACHE_DRIVER=database

# Frontend URL (important for CORS)
FRONTEND_URL=http://crm.yourdomain.com/frontend

# Sanctum configuration
SANCTUM_STATEFUL_DOMAINS=crm.yourdomain.com
SESSION_DOMAIN=.yourdomain.com
```

---

## Database Setup in Plesk

1. **Create Database:**
   - Plesk → Databases → Add Database
   - Name: `yachtcrm` (or your choice)
   - User: Create new user with full privileges

2. **Update .env** with database credentials

3. **Run migrations** (see INSTALLATION.md)

---

## Node.js Configuration

**Plesk Node.js Manager:**
1. Go to Domains → your domain → Node.js
2. Enable Node.js
3. Set Node.js version: 18.x or higher
4. Set application root: `/httpdocs/frontend`
5. Set application startup file: `server.js` (if using Node server, optional)

**For static build (recommended):**
- No need to run Node.js as a service
- Just build once: `npm run build`
- Serve the `dist/` folder via Apache

---

## SSL/HTTPS Setup

**Let's Encrypt in Plesk:**
1. Go to Domains → your domain → SSL/TLS Certificates
2. Click "Install" on Let's Encrypt
3. Select "Secure the domain and www"
4. Enable "Redirect from HTTP to HTTPS"

**Update .env after SSL:**
```env
APP_URL=https://crm.yourdomain.com
FRONTEND_URL=https://crm.yourdomain.com/frontend
```

---

## Cron Jobs (Laravel Scheduler)

**Add in Plesk → Scheduled Tasks:**

```
* * * * * cd /var/www/vhosts/yourdomain.com/crm.subdomain.com/backend && php artisan schedule:run >> /dev/null 2>&1
```

This runs Laravel's task scheduler every minute.

---

## File Upload Storage

**Create storage link:**

```bash
cd /var/www/vhosts/yourdomain.com/crm.subdomain.com/backend
php artisan storage:link
```

This creates a symlink from `public/storage` to `storage/app/public`.

---

## Common Plesk Issues & Solutions

### Issue: "500 Internal Server Error"
**Solution:**
- Check `backend/storage/logs/laravel.log`
- Verify permissions on `storage/` and `bootstrap/cache/`
- Clear caches: `php artisan cache:clear && php artisan config:clear && php artisan route:clear`

### Issue: "Frontend shows 404 on reload"
**Solution:**
- Verify `.htaccess` in both `httpdocs/` and `frontend/`
- Ensure mod_rewrite is enabled (Plesk → Apache settings)

### Issue: "API requests fail with CORS error"
**Solution:**
- Update `SANCTUM_STATEFUL_DOMAINS` in `.env`
- Verify `SESSION_DOMAIN` matches your domain
- Clear backend cache

### Issue: "Database migrations fail"
**Solution:**
- Verify database credentials in `.env`
- Check database user has CREATE, ALTER, DROP privileges
- Use `--force` flag: `php artisan migrate --force`

### Issue: "npm commands not found"
**Solution:**
- SSH into server
- Enable Node.js for the domain in Plesk
- Or install Node.js globally via command line

---

## Security Recommendations

1. **Disable directory listing** (add to .htaccess):
   ```apache
   Options -Indexes
   ```

2. **Hide Laravel version:**
   - Set `APP_DEBUG=false` in production

3. **Use HTTPS only:**
   - Force HTTPS in Plesk settings
   - Update all URLs in `.env`

4. **Restrict backend access** (optional):
   ```apache
   <Directory "/var/www/vhosts/yourdomain.com/crm.subdomain.com/backend">
       Require all denied
   </Directory>
   ```

5. **Enable mod_security** in Plesk (carefully - may block legitimate requests)

---

## Backup Strategy

**Plesk Backup Manager:**
1. Go to Tools & Settings → Backup Manager
2. Schedule automatic backups
3. Include:
   - All files
   - Databases
   - Configuration

**Manual backup commands:**
```bash
# Backup database
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql

# Backup files
tar -czf crm_backup_$(date +%Y%m%d).tar.gz /var/www/vhosts/yourdomain.com/crm.subdomain.com/
```

---

## Updating the Application

1. **Backup first!**
2. Replace files in `backend/` and `frontend/`
3. Run migrations: `php artisan migrate --force`
4. Clear caches: `php artisan cache:clear && php artisan route:clear && php artisan config:clear`
5. Rebuild frontend: `cd frontend && npm install && npm run build`
6. Test thoroughly

---

## Troubleshooting Checklist

- [ ] Symlinks created from httpdocs/ to backend/public and frontend/dist
- [ ] .htaccess files in place (httpdocs, frontend)
- [ ] Storage permissions (775)
- [ ] .env configured correctly
- [ ] Database created and credentials correct
- [ ] PHP extensions enabled
- [ ] Node.js installed (for building frontend)
- [ ] Caches cleared
- [ ] Migrations run
- [ ] Seeders run (for default data)

---

## Support

For Plesk-specific issues, consult:
- Plesk documentation: https://docs.plesk.com/
- Laravel deployment: https://laravel.com/docs/deployment
- React deployment: https://vitejs.dev/guide/static-deploy.html

