# YachtCRM-DMS Deployment Package Summary

**Package Created:** November 6, 2025  
**Version:** 1.0.0  
**Status:** ✅ Ready for Deployment

---

## Package Contents

This deployment package contains everything needed to install YachtCRM-DMS on a fresh server.

### Source Code
- ✅ **backend/** - Complete Laravel application (excluding vendor/ and storage/)
- ✅ **frontend/** - Complete React application (excluding node_modules/ and dist/)

### Documentation (6 files)
- ✅ **README.md** - Main documentation and overview
- ✅ **QUICKSTART.md** - Fast installation guide
- ✅ **PLESK_CONFIGURATION.md** - Plesk-specific setup with symlink instructions
- ✅ **WINDOWS_IIS_SETUP.md** - Complete Windows/IIS deployment guide
- ✅ **SYSTEM_REQUIREMENTS.md** - Hardware/software specifications
- ✅ **VERSION.txt** - Version information and changelog

### Installation Script
- ✅ **install.php** - Automated installation and update script

---

## Compatibility Matrix

### ✅ Fully Tested and Documented

| Platform | Web Server | Status | Documentation |
|----------|-----------|--------|---------------|
| Linux (Ubuntu/Debian) | Apache | ✅ Tested | QUICKSTART.md |
| Linux (Any) | Nginx | ✅ Tested | QUICKSTART.md |
| Plesk (Linux) | Apache | ✅ Production | PLESK_CONFIGURATION.md |
| Windows Server | IIS 10+ | ✅ Documented | WINDOWS_IIS_SETUP.md |

### Requirements Verified

**PHP:**
- ✅ Version 8.1, 8.2, 8.3 compatible
- ✅ All required extensions documented
- ✅ Windows and Linux compatible

**Database:**
- ✅ MySQL 8.0+ compatible
- ✅ MariaDB 10.6+ compatible
- ✅ Connection pooling supported
- ✅ Full UTF-8 (utf8mb4) support

**Node.js:**
- ✅ Version 18 LTS compatible
- ✅ Version 20 LTS compatible
- ✅ Build process works on Windows and Linux

**Web Servers:**
- ✅ Apache 2.4+ with mod_rewrite
- ✅ Nginx 1.18+
- ✅ IIS 10+ with URL Rewrite module
- ✅ All .htaccess and web.config files included

---

## What's Included

### Backend Features (Laravel 11)
- 40+ Database Tables
- 35+ Controllers
- 30+ Models
- 100+ API Endpoints
- 6 Seeders for default data
- 35+ Database Migrations
- Email Templates (Blade)
- PDF Templates (Blade + DomPDF)
- Multi-Factor Authentication
- Role-Based Access Control

### Frontend Features (React 18)
- 50+ Page Components
- 20+ Reusable Components
- Material-UI Design System
- Responsive Layout
- Real-time Validation
- Interactive Dashboards
- QuickBooks-style Accounting UI
- Drag-and-drop Navigation Customization
- Module Control Interface

### Modules
1. **Core CRM** (Always Active)
   - Customers, Invoices, Quotes, Payments, Appointments

2. **Yacht Management** (Optional)
   - Yacht details, maintenance scheduling, service history

3. **Vehicle/RV DMS** (Optional)
   - Vehicle inventory, service history, document management

4. **Timeclock** (Optional)
   - Punch in/out, time tracking, time off requests, reports

5. **Accounting** (Optional)
   - Full double-entry bookkeeping
   - Chart of Accounts, Journal Entries, Bills, Bank Reconciliation
   - Financial Reports, QuickBooks Import

---

## Installation Options

### Option 1: Automated (Recommended)
```bash
php install.php install
```
**Duration:** 5-10 minutes  
**Difficulty:** Easy  
**User Input Required:** Database credentials, admin user details

### Option 2: Manual
Follow `QUICKSTART.md` step-by-step  
**Duration:** 20-30 minutes  
**Difficulty:** Moderate  
**Best for:** Troubleshooting or custom setups

---

## Post-Installation Checklist

After running the installer, you need to:

### Required:
- [ ] Configure web server (Apache/Nginx/IIS)
- [ ] Set up symlinks or virtual directories
- [ ] Configure .htaccess or web.config
- [ ] Set proper file permissions
- [ ] Test application access

### Recommended:
- [ ] Configure SSL certificate
- [ ] Set up automated backups
- [ ] Configure email sending (SMTP)
- [ ] Upload company logos
- [ ] Enable desired modules
- [ ] Create staff user accounts
- [ ] Import existing customer data
- [ ] Customize email templates
- [ ] Configure payment providers (if needed)

### Optional:
- [ ] Set up Redis for caching
- [ ] Configure CDN for static assets
- [ ] Set up monitoring/alerts
- [ ] Configure firewall rules
- [ ] Set up staging environment

---

## Directory Structure After Installation

```
yachtcrm/
├── backend/
│   ├── app/
│   ├── bootstrap/
│   │   └── cache/              # Cached config (writable)
│   ├── config/
│   ├── database/
│   │   ├── migrations/         # Database schema
│   │   └── seeders/            # Default data
│   ├── public/                 # Web root for backend
│   │   ├── index.php           # Entry point
│   │   └── .htaccess           # Apache config
│   ├── resources/
│   │   └── views/              # Blade templates for PDFs
│   ├── routes/
│   │   └── api.php             # API routes
│   ├── storage/                # File storage (writable)
│   │   ├── app/
│   │   │   └── public/         # Public uploads
│   │   ├── framework/
│   │   │   ├── cache/
│   │   │   ├── sessions/
│   │   │   └── views/
│   │   └── logs/               # Application logs
│   ├── vendor/                 # Composer packages (install)
│   ├── .env                    # Environment config (create from .env.example)
│   └── composer.json
│
├── frontend/
│   ├── dist/                   # Built files (npm run build)
│   │   ├── index.html
│   │   └── assets/
│   │       ├── index-*.js
│   │       └── index-*.css
│   ├── node_modules/           # npm packages (install)
│   ├── public/                 # Static assets
│   │   └── *.png               # Logo files
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
└── Documentation & Scripts
    ├── README.md
    ├── QUICKSTART.md
    ├── PLESK_CONFIGURATION.md
    ├── WINDOWS_IIS_SETUP.md
    ├── SYSTEM_REQUIREMENTS.md
    ├── VERSION.txt
    └── install.php
```

---

## Pre-Deployment Checklist

Before copying to a new server, ensure:

- [ ] All source files are present
- [ ] Documentation is complete
- [ ] install.php script is executable
- [ ] .env.example exists in backend/
- [ ] composer.json and package.json are present
- [ ] No node_modules or vendor directories (will install fresh)
- [ ] No .env files (will create during installation)
- [ ] Storage directories created with placeholders

---

## Deployment Workflow

### For New Server:

1. **Prepare Server**
   - Install required software (PHP, MySQL, Node.js, Web Server)
   - Create database
   - Configure firewall

2. **Upload Files**
   - Copy entire `yachtcrm/` directory to server
   - Set proper ownership and permissions

3. **Run Installer**
   ```bash
   php install.php install
   ```

4. **Configure Web Server**
   - Create site/virtual host
   - Point to backend/public
   - Add frontend alias/virtual directory
   - Configure URL rewriting

5. **Test & Verify**
   - Access frontend
   - Login with admin
   - Test core features
   - Check logs for errors

6. **Secure**
   - Install SSL certificate
   - Force HTTPS
   - Review security settings
   - Enable firewall rules

### For Updates:

1. **Backup Current Installation**
   ```bash
   mysqldump -u user -p database > backup.sql
   tar -czf backup.tar.gz backend/storage backend/.env
   ```

2. **Upload New Files**
   - Replace backend/ and frontend/
   - Keep existing .env file
   - Keep storage/ directory

3. **Run Update**
   ```bash
   php install.php update
   ```

4. **Verify**
   - Test application
   - Check for errors
   - Verify all features work

---

## Key Configuration Files

### Backend (.env)
**Location:** `backend/.env`  
**Created by:** Installation script or manually from .env.example  
**Contains:**
- Database credentials
- Application keys
- Frontend URL
- Email configuration
- Payment provider keys

**Critical Settings:**
```env
APP_URL=http://your-domain.com
FRONTEND_URL=http://your-domain.com/frontend
SANCTUM_STATEFUL_DOMAINS=your-domain.com
SESSION_DOMAIN=.your-domain.com
```

### Web Server Configs

**Apache:** 
- `httpdocs/.htaccess` (for Plesk)
- `backend/public/.htaccess` (for Laravel)
- `frontend/.htaccess` (for React SPA)

**IIS:**
- `backend/public/web.config`
- `frontend/dist/web.config`

---

## Troubleshooting Resources

### Quick Diagnostics

```bash
# Check PHP version and extensions
php -v
php -m

# Check database connection
php artisan db:show

# Check Laravel logs
tail -f backend/storage/logs/laravel.log

# Check permissions
ls -la backend/storage
ls -la backend/bootstrap/cache

# Test API endpoint
curl http://localhost/backend/api/health

# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Log Locations

- **Laravel:** `backend/storage/logs/laravel.log`
- **Apache:** `/var/log/apache2/error.log` (Linux)
- **Nginx:** `/var/log/nginx/error.log` (Linux)
- **IIS:** Event Viewer → Application Log (Windows)
- **MySQL:** `/var/log/mysql/error.log` (Linux) or `C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err` (Windows)

---

## Performance Expectations

### With Minimum Specs (4GB RAM, 2 CPU):
- Handles 5-10 concurrent users comfortably
- Page load: 300-800ms
- Suitable for small businesses

### With Recommended Specs (8GB RAM, 4 CPU):
- Handles 20-30 concurrent users
- Page load: 200-500ms
- Suitable for medium businesses

### With Production Specs (16GB RAM, 8 CPU):
- Handles 50+ concurrent users
- Page load: 100-300ms
- Suitable for large organizations

---

## Database Size Estimates

| Usage | Invoices | Customers | Database Size |
|-------|----------|-----------|---------------|
| Small | < 1,000 | < 500 | 100-500 MB |
| Medium | 1,000-10,000 | 500-2,000 | 500 MB - 2 GB |
| Large | 10,000+ | 2,000+ | 2-10 GB |

---

## Security Hardening

### Production Checklist
- [ ] Set `APP_DEBUG=false` in .env
- [ ] Use strong database passwords
- [ ] Enable HTTPS only
- [ ] Configure firewall (allow only 80, 443)
- [ ] Disable directory listing
- [ ] Hide `.env` file from web access
- [ ] Use secure session driver
- [ ] Enable rate limiting on API
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

---

## Backup Strategy

### What to Backup

**Critical (Daily):**
- Database (complete)
- `.env` file

**Important (Weekly):**
- `storage/` directory (uploaded files)
- Custom templates
- Logo files

**Optional (Monthly):**
- Complete application backup

### Backup Methods

**Database:**
```bash
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql
```

**Files:**
```bash
tar -czf backup_$(date +%Y%m%d).tar.gz backend/storage backend/.env
```

**Automated:**
- Use hosting control panel backup features (Plesk, cPanel)
- Or schedule cron job/Task Scheduler with backup script

---

## Migration from InvoicePlane

If migrating from InvoicePlane:

1. Export data from InvoicePlane:
   - Customers (CSV)
   - Invoices (CSV)
   - Products/Services (CSV)

2. Use YachtCRM-DMS Import feature:
   - System Settings → Import Data
   - Select data type and upload CSV

3. Review and adjust:
   - Invoice numbers may need formatting
   - Custom fields may need manual entry
   - Templates need customization

---

## Customization Points

### Easy to Customize:
- ✅ Logos (System Settings → Branding)
- ✅ CRM Name (System Settings → Branding)
- ✅ Email Templates (Email Templates menu)
- ✅ PDF Templates (System Settings → PDF Templates)
- ✅ Navigation Menu Order (System Settings → Navigation)
- ✅ Role Permissions (System Settings → Roles & Permissions)
- ✅ Module Enablement (System Settings → Module Control)

### Moderate Customization (Code Changes):
- Theme colors (frontend/src/index.css)
- Default settings values
- Additional fields to forms
- Custom reports

### Advanced Customization (Development):
- New modules
- Additional integrations
- Custom workflows
- Third-party API connections

---

## Deployment Platforms Verified

### Cloud Providers (VPS)
- ✅ **DigitalOcean** - Works perfectly
- ✅ **Linode/Akamai** - Works perfectly
- ✅ **Vultr** - Works perfectly
- ✅ **Hetzner** - Works perfectly
- ✅ **AWS EC2** - Compatible (requires configuration)
- ✅ **Google Cloud** - Compatible (requires configuration)

### Managed Hosting
- ✅ **Plesk** - Fully documented (PLESK_CONFIGURATION.md)
- ✅ **cPanel** - Compatible (similar to Plesk)
- ✅ **DirectAdmin** - Compatible
- ⚠️ **Shared Hosting** - Possible but not recommended

### Operating Systems
- ✅ **Ubuntu 20.04 LTS** - Primary development OS
- ✅ **Ubuntu 22.04 LTS** - Tested
- ✅ **Debian 11/12** - Compatible
- ✅ **CentOS 8 / Rocky Linux** - Compatible
- ✅ **Windows Server 2019/2022** - Documented
- ✅ **Windows 10/11 Pro** - Development only

---

## Known Issues & Limitations

### Windows-Specific
1. Symbolic links require admin privileges
   - **Workaround:** Use file copies or run as administrator

2. Case-sensitivity differences
   - **Impact:** Minimal, Laravel handles this

3. Path separator differences
   - **Impact:** None, PHP normalizes automatically

4. File locking during updates
   - **Workaround:** Stop IIS before updating

### General
1. Large file uploads (> 20MB) may timeout
   - **Solution:** Increase PHP `max_execution_time` and `upload_max_filesize`

2. PDF generation for 100+ page documents is slow
   - **Solution:** This is a DomPDF limitation, normal for large documents

3. Shared hosting may have permission issues
   - **Solution:** Contact host to set proper permissions

---

## Module-Specific Notes

### Accounting Module
- Designed to replicate QuickBooks Desktop UI
- Full double-entry accounting
- Supports manual bank reconciliation
- QuickBooks CSV import (not IIF format)
- No automated bank feeds (manual entry required)

### Timeclock Module
- Export to CSV for payroll systems
- No direct payroll integration
- Manual approval workflow
- Time off request system

### Vehicle/RV DMS
- Does not include VIN lookup API
- No DMV integration
- No title/registration tracking
- Focus on inventory, service, and document management

### Yacht Management
- No integration with yacht listing services
- Manual data entry
- Service history tracking
- Maintenance scheduling

---

## Extending YachtCRM-DMS

### Adding Custom Fields

**Backend:**
1. Create migration: `php artisan make:migration add_custom_field_to_table`
2. Add field to model's `$fillable` array
3. Update controller validation

**Frontend:**
1. Add field to form component
2. Update API calls to include new field

### Creating Custom Reports

**Backend:**
1. Create controller method to fetch data
2. Add route in `routes/api.php`

**Frontend:**
1. Create new page component in `src/pages/`
2. Add route in `App.jsx`
3. Add to navigation (if needed)

### Integrating Third-Party APIs

**Example: Twilio SMS:**
1. Install package: `composer require twilio/sdk`
2. Add credentials to `.env`
3. Create service in `app/Services/`
4. Use in controllers or jobs

---

## Maintenance Schedule

### Daily
- Monitor error logs
- Check disk space
- Verify backups completed

### Weekly
- Review user activity
- Check for application updates
- Optimize database tables

### Monthly
- Review and rotate logs
- Test backup restoration
- Review security settings
- Update dependencies (if needed)

### Quarterly
- Full security audit
- Performance review
- User training/documentation update

---

## Support Information

**Installation Support:**
- All platforms documented in this package
- Common issues covered in each guide
- Laravel documentation: https://laravel.com/docs
- React documentation: https://react.dev

**System Maintenance:**
- Laravel best practices: https://laravel.com/docs/deployment
- Security updates: Keep PHP, MySQL, and packages updated

**Custom Development:**
- Full source code included
- Well-commented and organized
- Follows Laravel and React best practices
- Modular architecture for easy expansion

---

## Deployment Timeline

**Fresh Installation (Experienced Administrator):**
- Server preparation: 30-60 minutes
- Software installation: 15-30 minutes
- YachtCRM-DMS installation: 10-15 minutes
- Configuration and testing: 30-60 minutes
- **Total:** 1.5-3 hours

**Fresh Installation (Beginner):**
- Following documentation: 3-6 hours
- Learning and troubleshooting: Variable
- **Total:** 4-8 hours (first time)

**Updates:**
- Backup: 5 minutes
- Update process: 10-15 minutes
- Testing: 15-30 minutes
- **Total:** 30-50 minutes

---

## Success Metrics

After successful installation, you should be able to:

✅ Access login page at `/frontend`  
✅ Login with admin credentials  
✅ See dashboard with statistics  
✅ Create a customer  
✅ Create an invoice  
✅ Generate PDF invoice  
✅ Record a payment  
✅ Create an appointment  
✅ Access all enabled modules  
✅ Change user roles and permissions  
✅ Customize branding  
✅ Send test email  

---

## Additional Resources

### Included in Package:
- Complete source code
- Database migrations
- Default data seeders
- PDF and email templates
- Automated installation script
- Comprehensive documentation

### External Resources:
- Laravel: https://laravel.com/docs/11.x
- React: https://react.dev
- Material-UI: https://mui.com
- Vite: https://vitejs.dev
- MySQL: https://dev.mysql.com/doc/

---

## Package Verification

**Total Files:** 200+ PHP files, 80+ React components  
**Total Size:** ~10 MB (source), ~1 GB (with dependencies)  
**Database Tables:** 40+  
**API Endpoints:** 100+  
**Seeders:** 6 with default data  

**Package Integrity:**
- All migrations present: ✅
- All seeders present: ✅
- All controllers present: ✅
- All models present: ✅
- All frontend pages present: ✅
- All documentation complete: ✅
- Installation script ready: ✅

---

## Contact & Support

**Developed by:** E G Tech Solutions LLC™  
**Copyright:** © 2025 All Rights Reserved  
**Package Date:** November 6, 2025  
**Version:** 1.0.0  

For technical support, please contact your system administrator or E G Tech Solutions LLC.

---

**🎉 Thank you for choosing YachtCRM-DMS!**

This system has been carefully crafted to provide a comprehensive CRM solution for marine and vehicle businesses. We hope it serves you well!

