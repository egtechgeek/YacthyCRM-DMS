# YachtCRM-DMS Installation Guide

## Two Installation Methods

YachtCRM-DMS provides **two ways** to install: Web-based (no SSH) or Command-line (SSH required).

---

## Method 1: Web Installer (Recommended)

### ✅ No SSH/Terminal Access Required!

Perfect for:
- Users without SSH access
- Shared hosting environments
- Non-technical administrators
- Quick and easy setup

### Steps:

#### 1. Upload Files

**Using FTP/SFTP:**
- Connect to your server using FileZilla, WinSCP, or similar
- Upload the entire `yachtcrm/` directory to your web root
- Typical locations:
  - **Plesk:** `/var/www/vhosts/yourdomain.com/subdomain.yourdomain.com/`
  - **cPanel:** `public_html/`
  - **Windows:** `C:\inetpub\wwwroot\`

**Using File Manager (Plesk/cPanel):**
- Login to your hosting control panel
- Navigate to File Manager
- Upload the `yachtcrm` folder (or zip and extract)

#### 2. Access Web Installer

Open your web browser and navigate to:
```
http://your-domain.com/installer/
```

If uploaded to a subdirectory:
```
http://your-domain.com/path/to/yachtcrm/installer/
```

#### 3. Follow the Wizard

**Step 1: Welcome**
- Review what the installer will do
- Click "Start Installation"

**Step 2: Requirements Check**
- Automatic check of PHP version, extensions, and tools
- Green checkmarks = ready to proceed
- Red X's = missing requirements (contact hosting support)

**Step 3: Database Configuration**
- Enter database credentials:
  - **Host:** Usually `localhost` or `127.0.0.1`
  - **Port:** Usually `3306`
  - **Database Name:** Create in your hosting panel first, or installer will create it
  - **Username:** Database user with full privileges
  - **Password:** Database password
- Click "Test Connection & Continue"

**Step 4: Application Configuration**
- **App Name:** `YachtCRM-DMS` (or your business name)
- **App URL:** Auto-detected (e.g., `http://crm.yourdomain.com`)
- **Environment:** Production (for live sites)
- **Email From:** `noreply@yourdomain.com`

**Step 5: Installing Dependencies**
- Automatic installation (5-10 minutes)
- Creates .env file
- Generates encryption key
- Installs Composer packages (Laravel dependencies)
- Installs npm packages (React dependencies)
- Builds frontend application
- Shows real-time progress

**Step 6: Database Setup**
- Creates all database tables (40+ tables)
- Seeds default data (payment methods, categories, modules, permissions)
- Configures storage directories

**Step 7: Create Admin User**
- Enter your admin credentials:
  - Name, Email, Password
- This will be your login to access YachtCRM-DMS

**Step 8: Completion**
- Summary of installation
- Links to access your CRM
- Important next steps

#### 4. Delete Installer (Security!)

**Via File Manager / FTP:**
- Delete the `installer/` directory

**Via SSH (if available):**
```bash
rm -rf /path/to/yachtcrm/installer/
```

⚠️ **Important:** The installer can modify your database and configuration. Always delete it after installation!

#### 5. Access YachtCRM-DMS

Navigate to:
```
http://your-domain.com/frontend/
```

Login with the admin credentials you created.

---

## Method 2: CLI Installer

### ✅ Requires SSH/Terminal Access

Perfect for:
- Experienced administrators
- VPS/Dedicated servers
- Automated deployments
- Troubleshooting

### Steps:

#### 1. Upload Files (SSH)

```bash
# Via wget (if you have a URL)
wget https://your-server.com/yachtcrm-deploy.zip
unzip yachtcrm-deploy.zip
cd yachtcrm

# Or via rsync, scp, etc.
```

#### 2. Run CLI Installer

```bash
php install.php install
```

#### 3. Answer Prompts

The script will interactively ask for:
- Application name and URL
- Database credentials
- Email settings
- Admin user details

#### 4. Wait for Completion

The script will automatically:
- Install dependencies
- Build frontend
- Setup database
- Create admin user

**Duration:** 5-10 minutes

---

## Comparison

| Feature | Web Installer | CLI Installer |
|---------|---------------|---------------|
| SSH Required | ❌ No | ✅ Yes |
| User Interface | Browser-based | Terminal/Command-line |
| Progress Display | Real-time visual | Text output |
| Best For | Shared hosting, beginners | VPS, advanced users |
| Speed | Medium | Fast |
| Troubleshooting | Shows detailed errors | Shows command output |
| Automation | Interactive only | Can be scripted |
| Updates | Not supported | ✅ `php install.php update` |

---

## Post-Installation

### Required: Web Server Configuration

**Both installation methods** require web server configuration afterwards:

**For Apache/Nginx (Linux):**
- See `QUICKSTART.md` for virtual host examples
- Configure .htaccess files (already included)

**For Plesk:**
- **Critical:** Create symlinks in httpdocs/
- See `PLESK_CONFIGURATION.md` for detailed steps

**For Windows/IIS:**
- Create IIS site pointing to `backend/public`
- Add virtual directory for frontend
- See `WINDOWS_IIS_SETUP.md` for complete guide

### Recommended: Initial Configuration

1. **Login to YachtCRM-DMS** (`/frontend/`)
2. **System Settings → Branding:**
   - Upload company logo
   - Set CRM name
3. **System Settings → Module Control:**
   - Enable modules you need (Yachts, DMS, Timeclock, Accounting)
4. **Create staff users**
5. **Import data** (if migrating from another system)

---

## Troubleshooting Installation

### Web Installer Issues

**"Page not found" or 404:**
- Verify installer directory exists and is accessible
- Check web server is running
- Verify file permissions

**"Requirements not met":**
- Contact hosting provider to install missing PHP extensions
- Verify PHP version is 8.1+
- Check Composer and Node.js are installed

**"Database connection failed":**
- Verify database exists (create it in hosting panel)
- Check credentials are correct
- Ensure database user has full privileges
- Try `127.0.0.1` instead of `localhost` (or vice versa)

**"Installation hangs" or times out:**
- Increase PHP `max_execution_time` (in php.ini or hosting panel)
- Increase PHP `memory_limit` to 256M or higher
- Some shared hosts limit execution time - may need CLI installer

**"Composer/npm not found":**
- These tools must be installed on the server
- Check with hosting provider
- May need to use CLI installer or install manually

### CLI Installer Issues

**"Command not found" (composer, npm, php):**
- Add to system PATH
- Or use full paths: `/usr/bin/php`, `/usr/local/bin/composer`

**"Permission denied":**
- Check directory ownership
- May need: `chmod -R 775 yachtcrm/`
- Or run with appropriate user

---

## Manual Installation (If Installers Fail)

If both installers fail, you can install manually. See `QUICKSTART.md` for complete step-by-step manual installation.

---

## Getting Help

**Before requesting support:**
1. Check the error messages displayed
2. Review the appropriate guide (PLESK_CONFIGURATION.md, WINDOWS_IIS_SETUP.md, etc.)
3. Check PHP error logs
4. Verify system requirements are met

**Include when asking for help:**
- Installation method used (web or CLI)
- Error message (exact text or screenshot)
- Server OS and web server (Apache/Nginx/IIS)
- PHP version: `php --version`
- Step where installation failed

---

**Ready to install? Start with the web installer for the easiest experience!**

Access: `http://your-domain.com/installer/`

