# YachtCRM-DMS - Deployment Package

**Version:** 1.0.0  
**Release Date:** November 2025  
**License:** Proprietary

---

## What is YachtCRM-DMS?

YachtCRM-DMS is a comprehensive Customer Relationship Management system designed for yacht dealerships, marinas, and marine service businesses. It includes modules for:

- **Customer Management** - Track customers, contacts, and relationships
- **Yacht Management** - Detailed yacht records, specifications, and history
- **Vehicle/RV DMS** - Dealer Management System for vehicles and RVs
- **Invoicing & Quotes** - Professional PDF invoices and estimates
- **Payment Processing** - Integrated Stripe and Square virtual terminal
- **Parts Inventory** - Track parts, pricing, and stock levels
- **Service Management** - Service catalog and history
- **Appointments & Calendar** - Schedule and manage appointments
- **Maintenance Scheduling** - Automated maintenance reminders
- **Timeclock** - Employee time tracking with reports
- **Accounting Module** - Full double-entry bookkeeping system
  - Chart of Accounts
  - Journal Entries
  - Accounts Payable (Bills & Vendors)
  - Bank Accounts & Reconciliation
  - Financial Reports (P&L, Balance Sheet, Trial Balance, Aging)
  - QuickBooks Import
- **Role-Based Access Control** - Granular permissions for Admin, Office Staff, Accountant, Employee, and Customer roles
- **Multi-Factor Authentication** - TOTP and email-based 2FA
- **Email Templates** - Customizable email communications
- **Reports & Analytics** - Comprehensive business insights
- **System Settings** - Customizable branding, modules, and navigation

---

## Quick Start

### 🌐 Web Installer (No SSH Required!) ⭐ RECOMMENDED

**Perfect for users without terminal access!**

1. **Upload** the entire `yachtcrm/` folder to your server using:
   - FTP/SFTP (FileZilla, WinSCP, etc.)
   - Web hosting File Manager (Plesk, cPanel, etc.)

2. **Open your browser** and navigate to:
   ```
   http://your-domain.com/installer/
   ```

3. **Follow the wizard** - it handles everything automatically!
   - Requirements check ✓
   - Database setup ✓
   - Dependency installation ✓
   - Frontend building ✓
   - Admin user creation ✓

4. **Delete installer folder** after completion (for security)

**No SSH, No Terminal, No Problem!** 🎉

### 💻 CLI Installer (For Advanced Users with SSH)

**For Linux/Plesk:**
```bash
cd /var/www/vhosts/yourdomain.com/yachtcrm
php install.php install
```

**For Windows:**
```cmd
cd C:\inetpub\wwwroot\yachtcrm
php install.php install
```

---

## Package Contents

```
yachtcrm/
├── backend/                    # Laravel API backend
│   ├── app/                   # Application logic
│   ├── config/                # Configuration files
│   ├── database/              # Migrations and seeders
│   ├── routes/                # API routes
│   ├── resources/             # Blade templates (for PDFs)
│   ├── .env.example           # Environment template
│   └── composer.json          # PHP dependencies
│
├── frontend/                   # React frontend
│   ├── src/                   # React components
│   ├── public/                # Static assets
│   ├── package.json           # JavaScript dependencies
│   └── vite.config.js         # Build configuration
│
├── install.php                 # Automated installation script
│
├── README.md                   # This file
├── PLESK_CONFIGURATION.md     # Plesk hosting setup guide
├── WINDOWS_IIS_SETUP.md       # Windows/IIS setup guide
├── SYSTEM_REQUIREMENTS.md     # Hardware and software requirements
└── QUICKSTART.md              # Quick start guide
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| **README.md** | Overview and quick start |
| **QUICKSTART.md** | Step-by-step installation guide |
| **PLESK_CONFIGURATION.md** | Plesk-specific configuration (symlinks, .htaccess) |
| **WINDOWS_IIS_SETUP.md** | Windows Server and IIS deployment |
| **SYSTEM_REQUIREMENTS.md** | Hardware specs, software requirements, performance |

---

## System Requirements

### Minimum
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **PHP:** 8.1+
- **MySQL:** 8.0+ or MariaDB 10.6+
- **Node.js:** 18 LTS (for building)

### Recommended
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 40 GB SSD
- **PHP:** 8.2
- **MySQL:** 8.0+
- **Node.js:** 20 LTS

See `SYSTEM_REQUIREMENTS.md` for detailed specifications.

---

## Supported Platforms

### Operating Systems
- ✅ Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+, Rocky Linux, AlmaLinux)
- ✅ Windows Server (2019, 2022)
- ✅ Windows 10/11 Pro (for development)
- ✅ macOS (for development)

### Web Servers
- ✅ Apache 2.4+ (Recommended for Linux)
- ✅ Nginx 1.18+
- ✅ IIS 10+ (Windows)

### Hosting Environments
- ✅ Plesk (with specific configuration - see PLESK_CONFIGURATION.md)
- ✅ cPanel
- ✅ DirectAdmin
- ✅ VPS/Dedicated Server
- ✅ Cloud (AWS, DigitalOcean, Linode, Vultr, etc.)
- ⚠️ Shared Hosting (not recommended, but possible with modifications)

---

## Installation Methods

### Method 1: Web Installer (No SSH) - ⭐ Recommended

**Access:** `http://your-domain.com/installer/`

**Perfect for:**
- ✅ Users without SSH/terminal access
- ✅ Shared hosting (cPanel, Plesk)
- ✅ Non-technical administrators
- ✅ Quick visual installation

**Features:**
- Beautiful web interface
- Step-by-step wizard
- Real-time progress updates
- Automatic dependency installation
- Error messages with helpful guidance
- Handles everything automatically

**See:** `installer/README.md` or `INSTALLATION_GUIDE.md`

### Method 2: CLI Installer (SSH Required)

```bash
php install.php install
```

**Perfect for:**
- ✅ Advanced users with SSH access
- ✅ VPS/Dedicated servers
- ✅ Automated/scripted deployments
- ✅ Update functionality

**Features:**
- Fast command-line interface
- Scriptable and automatable
- Update command: `php install.php update`
- Reconfigure command: `php install.php configure`

### Method 3: Manual Installation

See `QUICKSTART.md` for step-by-step manual installation (for troubleshooting or custom setups).

---

## Post-Installation

### 1. Access the Application

**Default URLs:**
- Frontend: `http://your-domain.com/frontend`
- Backend API: `http://your-domain.com/backend/api`

### 2. Login

Use the admin credentials you created during installation.

### 3. Initial Configuration

1. **System Settings** → **Branding**
   - Upload your logo
   - Set CRM name

2. **System Settings** → **Module Control**
   - Enable/disable modules (Yachts, DMS, Timeclock, Accounting)

3. **System Settings** → **Payment Providers**
   - Configure Stripe and/or Square (if using payments)

4. **System Settings** → **Roles & Permissions**
   - Review and customize role permissions

5. **Email Templates**
   - Customize email templates for your business

---

## Updating YachtCRM-DMS

### Automated Update

```bash
# Linux/Mac
php install.php update

# Windows
php install.php update
```

### Manual Update

1. Backup database and files
2. Replace files (excluding `.env` and `storage/`)
3. Install dependencies: `composer install --no-dev`
4. Run migrations: `php artisan migrate --force`
5. Clear caches: `php artisan cache:clear && php artisan config:clear`
6. Rebuild frontend: `cd frontend && npm install && npm run build`

---

## Modules Overview

### Core Modules (Always Active)
- Customer Management
- Users & Roles
- Invoicing & Quotes
- Payments
- Parts & Services
- Appointments
- Email System
- Reports

### Optional Modules (Enable in System Settings)
- **Yacht Management** - Track yachts, maintenance, specifications
- **Vehicle/RV DMS** - Full dealer management system for vehicles
- **Timeclock** - Employee time tracking and payroll reports
- **Accounting** - Double-entry bookkeeping, P&L, reconciliation

---

## Technical Stack

**Backend:**
- Laravel 11
- PHP 8.2
- MySQL 8.0
- Sanctum (API authentication)
- DomPDF (PDF generation)
- Google2FA (2FA)

**Frontend:**
- React 18
- Material-UI (MUI)
- React Query
- React Router
- Vite (build tool)

---

## Security Features

- ✅ Role-based access control (RBAC)
- ✅ Multi-factor authentication (TOTP + Email)
- ✅ Password hashing (bcrypt)
- ✅ CSRF protection
- ✅ SQL injection prevention (Eloquent ORM)
- ✅ XSS protection
- ✅ Session security
- ✅ API token authentication (Sanctum)
- ✅ Secure password reset
- ✅ Recovery codes for 2FA

---

## Support & Troubleshooting

### Common Issues

**Installation fails:**
- Check `backend/storage/logs/laravel.log`
- Verify system requirements
- Ensure all PHP extensions are installed

**Frontend doesn't load:**
- Clear browser cache (Ctrl+Shift+R)
- Check `frontend/dist/` exists
- Verify web server configuration

**Database connection error:**
- Verify `.env` database credentials
- Check MySQL service is running
- Test connection manually

**API 500 errors:**
- Check Laravel log
- Clear caches: `php artisan cache:clear`
- Verify file permissions on `storage/` directory

### Getting Help

1. Check the documentation in this package
2. Review Laravel documentation: https://laravel.com/docs
3. Review React documentation: https://react.dev

---

## License

This software is proprietary. All rights reserved.

**Copyright © 2025 E G Tech Solutions LLC**

Unauthorized copying, distribution, or modification of this software is strictly prohibited.

---

## Credits

**Developed by:** E G Tech Solutions LLC  
**Website:** [Your website]  
**Support:** [Your support email]

**Built with:**
- Laravel Framework
- React
- Material-UI
- And many other open-source libraries (see composer.json and package.json)

---

## Changelog

### Version 1.0.0 (November 2025)
- Initial release
- Complete yacht and vehicle management
- Full accounting module
- Timeclock system
- Payment processing integration
- Multi-factor authentication
- Role-based permissions
- QuickBooks import
- PDF invoice generation
- Email automation
- Customizable branding
- Module control system
- And much more...

---

## File Structure Reference

```
YachtCRM-DMS/
├── backend/
│   ├── app/
│   │   ├── Http/Controllers/   # API endpoints
│   │   ├── Models/             # Database models
│   │   ├── Services/           # Business logic
│   │   └── Middleware/         # Request filtering
│   ├── config/                 # App configuration
│   ├── database/
│   │   ├── migrations/         # Database schema
│   │   └── seeders/            # Default data
│   ├── resources/
│   │   └── views/              # PDF templates
│   ├── routes/
│   │   ├── api.php             # API routes
│   │   └── web.php             # Web routes
│   ├── storage/                # File storage (user-writable)
│   ├── .env                    # Environment config (create from .env.example)
│   └── composer.json           # PHP dependencies
│
└── frontend/
    ├── src/
    │   ├── components/         # Reusable React components
    │   ├── pages/              # Page components
    │   ├── contexts/           # React contexts
    │   └── services/           # API services
    ├── public/                 # Static assets
    ├── dist/                   # Built files (generated)
    ├── package.json            # JavaScript dependencies
    └── vite.config.js          # Build configuration
```

---

**For detailed installation instructions, see QUICKSTART.md**

