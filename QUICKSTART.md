# YachtCRM-DMS Quick Start Guide

Get YachtCRM-DMS up and running in minutes!

---

## For Linux (Ubuntu/Debian)

### Prerequisites
```bash
sudo apt update
sudo apt install -y php8.2 php8.2-cli php8.2-common php8.2-mysql php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip php8.2-gd php8.2-bcmath
sudo apt install -y mysql-server nginx composer nodejs npm
```

### Installation
```bash
# 1. Clone or extract files
cd /var/www/html
# (extract yachtcrm-deploy.zip here)

# 2. Run installer
cd yachtcrm
php install.php install

# 3. Configure Nginx (example)
sudo nano /etc/nginx/sites-available/yachtcrm

# Add this configuration:
server {
    listen 80;
    server_name crm.yourdomain.com;
    root /var/www/html/yachtcrm/backend/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /frontend {
        alias /var/www/html/yachtcrm/frontend/dist;
        try_files $uri $uri/ /frontend/index.html;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
    }
}

# 4. Enable site and restart
sudo ln -s /etc/nginx/sites-available/yachtcrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 5. Access application
# Navigate to: http://crm.yourdomain.com/frontend
```

---

## For Plesk Hosting

### Installation
```bash
# 1. Upload files to domain directory
# /var/www/vhosts/yourdomain.com/crm.subdomain.com/

# 2. Create symlinks (CRITICAL!)
cd /var/www/vhosts/yourdomain.com/crm.subdomain.com/httpdocs
ln -s ../backend/public backend
ln -s ../frontend/dist frontend

# 3. Run installer
cd /var/www/vhosts/yourdomain.com/crm.subdomain.com
php install.php install

# 4. Configure .htaccess in httpdocs (see PLESK_CONFIGURATION.md)

# 5. Set permissions
chmod -R 775 backend/storage
chmod -R 775 backend/bootstrap/cache

# 6. Access application
# Navigate to: https://crm.yourdomain.com/frontend
```

**⚠️ Important:** See `PLESK_CONFIGURATION.md` for complete Plesk setup including .htaccess configuration.

---

## For Windows/IIS

### Installation

```powershell
# 1. Install prerequisites
# - IIS with URL Rewrite module
# - PHP 8.2 (Non-Thread Safe)
# - MySQL 8.0
# - Node.js 20 LTS
# - Composer

# 2. Extract files
# Extract to: C:\inetpub\wwwroot\yachtcrm\

# 3. Run installer
cd C:\inetpub\wwwroot\yachtcrm
php install.php install

# 4. Create IIS site
# - Site name: YachtCRM-DMS
# - Physical path: C:\inetpub\wwwroot\yachtcrm\backend\public
# - Binding: Port 80, host: crm.yourdomain.com

# 5. Add virtual directory
# - Alias: frontend
# - Physical path: C:\inetpub\wwwroot\yachtcrm\frontend\dist

# 6. Set permissions
icacls "C:\inetpub\wwwroot\yachtcrm\backend\storage" /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls "C:\inetpub\wwwroot\yachtcrm\backend\bootstrap\cache" /grant "IIS_IUSRS:(OI)(CI)F" /T

# 7. Configure web.config files (see WINDOWS_IIS_SETUP.md)

# 8. Access application
# Navigate to: http://crm.yourdomain.com/frontend
```

**⚠️ Important:** See `WINDOWS_IIS_SETUP.md` for complete IIS configuration including web.config files.

---

## Installation Script Options

### Fresh Install
```bash
php install.php install
```
Performs complete setup including:
- Environment configuration
- Dependency installation
- Database migrations
- Default data seeding
- Admin user creation
- Frontend building

### Update Existing Installation
```bash
php install.php update
```
Updates existing installation:
- Backs up database
- Installs new dependencies
- Runs new migrations
- Rebuilds frontend
- Clears and optimizes caches

### Reconfigure Settings
```bash
php install.php configure
```
Re-runs configuration wizard to update `.env` file.

---

## Manual Installation (Alternative)

If you prefer manual installation or the automated script fails:

### Backend Setup

```bash
cd backend

# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your database credentials
nano .env

# 3. Install dependencies
composer install --no-dev --optimize-autoloader

# 4. Generate app key
php artisan key:generate

# 5. Run migrations
php artisan migrate --force

# 6. Seed database
php artisan db:seed --class=PaymentMethodSeeder --force
php artisan db:seed --class=PartCategorySeeder --force
php artisan db:seed --class=PartVendorSeeder --force
php artisan db:seed --class=ModuleSeeder --force
php artisan db:seed --class=ChartOfAccountsSeeder --force
php artisan db:seed --class=RolePermissionsSeeder --force

# 7. Create admin user
php artisan tinker
>>> \App\Models\User::create(['name'=>'Admin','email'=>'admin@example.com','password'=>bcrypt('password123'),'role'=>'admin']);
>>> exit

# 8. Setup storage
php artisan storage:link
```

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Build for production
npm run build
```

---

## First Login

1. Navigate to: `http://your-domain.com/frontend`
2. Login with admin credentials
3. You'll be prompted to set up 2FA (optional, can skip)
4. Access Dashboard

---

## Default Data

After installation, the system includes:

- **Payment Methods:** Cash, Check, Credit Card, Debit Card, Bank Transfer
- **Part Categories:** Engine, Hull, Electrical, Plumbing, Rigging, Electronics, Safety, Interior, Exterior
- **Part Vendors:** Port Supply, West Marine, Defender, Fisheries Supply, McMaster-Carr, Grainger
- **Modules:** Yacht Management (enabled), DMS (disabled), Timeclock (disabled), Accounting (disabled)
- **Chart of Accounts:** Standard accounting structure with 30+ accounts
- **Role Permissions:** Pre-configured for all 5 roles

---

## Common Commands

### Laravel (Backend)

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# Seed database
php artisan db:seed

# Create user
php artisan tinker
>>> \App\Models\User::create([...]);

# Check routes
php artisan route:list

# Check database connection
php artisan db:show
```

### Frontend

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Environment Variables Reference

### Essential Variables

```env
# Application
APP_NAME="YachtCRM-DMS"
APP_ENV=production
APP_DEBUG=false
APP_URL=http://your-domain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yachtcrm
DB_USERNAME=your_user
DB_PASSWORD=your_password

# Frontend
FRONTEND_URL=http://your-domain.com/frontend

# Session/Auth
SESSION_DRIVER=database
CACHE_DRIVER=database
SANCTUM_STATEFUL_DOMAINS=your-domain.com
SESSION_DOMAIN=.your-domain.com
```

### Optional Variables

```env
# Email (for notifications and 2FA)
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"

# Payment Providers (optional)
STRIPE_KEY=your_stripe_key
STRIPE_SECRET=your_stripe_secret

SQUARE_APPLICATION_ID=your_square_app_id
SQUARE_ACCESS_TOKEN=your_square_token
SQUARE_LOCATION_ID=your_location_id
SQUARE_ENVIRONMENT=production
```

---

## Performance Tips

### Production Optimization

```bash
# 1. Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 2. Enable OpCache (php.ini)
opcache.enable=1
opcache.memory_consumption=256
opcache.validate_timestamps=0

# 3. Use Redis for caching (optional)
CACHE_DRIVER=redis
SESSION_DRIVER=redis

# 4. Optimize Composer autoloader
composer install --optimize-autoloader --no-dev

# 5. Enable GZIP compression (web server level)
```

### Database Optimization

```sql
-- Add indexes for frequently queried columns
ALTER TABLE invoices ADD INDEX idx_customer_status (customer_id, status);
ALTER TABLE payments ADD INDEX idx_invoice_date (invoice_id, payment_date);

-- Optimize tables
OPTIMIZE TABLE invoices, customers, yachts, payments;
```

---

## Maintenance

### Daily
- Monitor error logs: `backend/storage/logs/laravel.log`
- Check disk space: `df -h`

### Weekly
- Review database size and optimize if needed
- Check for application updates

### Monthly
- Review and rotate logs
- Test backups
- Review user accounts and permissions

---

## Backup Strategy

### Automated Backup Script

```bash
#!/bin/bash
# Save as: backup.sh

BACKUP_DIR="/backups/yachtcrm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u user -ppassword yachtcrm > $BACKUP_DIR/db_$DATE.sql

# Backup storage and env
tar -czf $BACKUP_DIR/files_$DATE.tar.gz backend/storage backend/.env

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Schedule with cron:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## Verification Checklist

After installation, verify:

- [ ] Can access frontend login page
- [ ] Can login with admin credentials
- [ ] Dashboard loads correctly
- [ ] Can create a customer
- [ ] Can create an invoice
- [ ] PDF downloads work
- [ ] All modules accessible (if enabled)
- [ ] Email system working (send test)
- [ ] File uploads work
- [ ] Permissions properly restrict access

---

## Next Steps After Installation

1. **Branding:**
   - Upload company logo
   - Customize CRM name

2. **Users:**
   - Create staff users
   - Assign appropriate roles

3. **Configuration:**
   - Enable modules you need
   - Configure email templates
   - Set up payment providers (if using)

4. **Data:**
   - Import existing customers (CSV)
   - Set up parts and services
   - Configure chart of accounts (if using accounting)

5. **Security:**
   - Enable 2FA for admin users
   - Configure SSL certificate
   - Review role permissions

6. **Testing:**
   - Create test invoice
   - Process test payment
   - Generate test reports
   - Send test email

---

## Getting Support

**Before requesting support, please:**

1. Check the documentation in this package
2. Review Laravel logs: `backend/storage/logs/laravel.log`
3. Check browser console for JavaScript errors (F12)
4. Verify system requirements are met
5. Try clearing caches: `php artisan cache:clear`

**System Information to Provide:**
- Operating System and version
- PHP version: `php --version`
- MySQL version: `mysql --version`
- Web server: Apache/Nginx/IIS version
- Error messages from logs
- Steps to reproduce the issue

---

**Welcome to YachtCRM-DMS! 🚢**

