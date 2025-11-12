# YachtCRM-DMS on Windows Server with IIS

This guide covers deploying YachtCRM-DMS on Windows Server using IIS (Internet Information Services).

---

## Prerequisites

### Required Software

1. **Windows Server 2019 or 2022** (or Windows 10/11 Pro for development)
2. **IIS 10+** with the following features:
   - IIS Management Console
   - World Wide Web Services
   - Application Development Features:
     - CGI
     - ISAPI Extensions
     - ISAPI Filters
   - URL Rewrite Module 2.1+ ⚠️ **Must be installed separately**

3. **PHP 8.1 or 8.2**
   - Download from: https://windows.php.net/download/
   - Use **Non-Thread Safe (NTS)** version
   - Install as FastCGI via Web Platform Installer OR manually

4. **MySQL 8.0+ or MariaDB 10.6+**
   - MySQL Community Server: https://dev.mysql.com/downloads/mysql/
   - OR MariaDB: https://mariadb.org/download/

5. **Node.js 18 LTS or 20 LTS**
   - Download from: https://nodejs.org/

6. **Composer**
   - Download from: https://getcomposer.org/download/

7. **Visual C++ Redistributable**
   - Required for PHP: https://aka.ms/vs/17/release/vc_redist.x64.exe

---

## Installation Steps

### 1. Install IIS and URL Rewrite

**Enable IIS:**
```powershell
# Run PowerShell as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationDevelopment
Enable-WindowsOptionalFeature -Online -FeatureName IIS-NetFxExtensibility45
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HealthAndDiagnostics
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Security
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
Enable-WindowsOptionalFeature -Online -FeatureName IIS-Performance
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerManagementTools
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementConsole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CGI
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ISAPIExtensions
Enable-WindowsOptionalFeature -Online -FeatureName IIS-ISAPIFilter
```

**Install URL Rewrite Module:**
- Download: https://www.iis.net/downloads/microsoft/url-rewrite
- Run installer
- Restart IIS: `iisreset`

### 2. Install PHP

**Using Web Platform Installer (Recommended):**
1. Download Web PI: https://www.microsoft.com/web/downloads/platform.aspx
2. Install PHP 8.2 (Non-Thread Safe)
3. It will automatically configure IIS FastCGI

**Manual Installation:**
1. Download PHP 8.2 NTS: https://windows.php.net/download/
2. Extract to `C:\PHP`
3. Copy `php.ini-production` to `php.ini`
4. Configure `php.ini`:
   ```ini
   extension_dir = "ext"
   extension=curl
   extension=fileinfo
   extension=gd
   extension=mbstring
   extension=openssl
   extension=pdo_mysql
   extension=zip
   extension=bcmath
   
   memory_limit = 256M
   upload_max_filesize = 20M
   post_max_size = 20M
   max_execution_time = 300
   ```

5. Add PHP to System PATH:
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\PHP", "Machine")
   ```

6. Configure IIS FastCGI:
   ```powershell
   # Add FastCGI application
   & $env:windir\system32\inetsrv\appcmd.exe set config -section:system.webServer/fastCgi /+"[fullPath='C:\PHP\php-cgi.exe']"
   
   # Add handler mapping
   & $env:windir\system32\inetsrv\appcmd.exe set config -section:system.webServer/handlers /+"[name='PHP_via_FastCGI',path='*.php',verb='GET,HEAD,POST',modules='FastCgiModule',scriptProcessor='C:\PHP\php-cgi.exe',resourceType='Either']"
   ```

### 3. Install MySQL/MariaDB

1. Download MySQL Installer: https://dev.mysql.com/downloads/installer/
2. Choose "Custom" installation
3. Select: MySQL Server, MySQL Workbench
4. Set root password during installation
5. Create database for YachtCRM-DMS:

```sql
CREATE DATABASE yachtcrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'yachtcrm_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON yachtcrm.* TO 'yachtcrm_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Install Node.js and Composer

**Node.js:**
- Download and run installer from https://nodejs.org/
- Verify: `node --version` and `npm --version`

**Composer:**
- Download and run installer from https://getcomposer.org/
- Verify: `composer --version`

---

## Deploy YachtCRM-DMS

### 1. Copy Files

Extract YachtCRM-DMS to:
```
C:\inetpub\wwwroot\yachtcrm\
├── backend\
├── frontend\
└── install.php
```

### 2. Run Installation Script

```powershell
cd C:\inetpub\wwwroot\yachtcrm
php install.php install
```

Follow the prompts to configure database, admin user, etc.

### 3. Create IIS Site

**Using IIS Manager:**

1. Open IIS Manager (Start → inetmgr)

2. **Create Application Pool:**
   - Right-click "Application Pools" → Add
   - Name: `YachtCRM-DMS`
   - .NET CLR version: No Managed Code
   - Managed pipeline mode: Integrated
   - Click OK
   - Select the pool → Advanced Settings:
     - Enable 32-bit Applications: False
     - Identity: ApplicationPoolIdentity

3. **Create Website:**
   - Right-click "Sites" → Add Website
   - Site name: `YachtCRM-DMS`
   - Application pool: `YachtCRM-DMS`
   - Physical path: `C:\inetpub\wwwroot\yachtcrm\backend\public`
   - Binding: 
     - Type: http
     - Port: 80
     - Host name: crm.yourdomain.com (or localhost for testing)

4. **Add Virtual Directory for Frontend:**
   - Right-click site → Add Virtual Directory
   - Alias: `frontend`
   - Physical path: `C:\inetpub\wwwroot\yachtcrm\frontend\dist`

### 4. Configure web.config for Backend

Create `C:\inetpub\wwwroot\yachtcrm\backend\public\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Imported Rule 1" stopProcessing="true">
          <match url="^(.*)/$" ignoreCase="false" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" ignoreCase="false" negate="true" />
          </conditions>
          <action type="Redirect" redirectType="Permanent" url="/{R:1}" />
        </rule>
        <rule name="Imported Rule 2" stopProcessing="true">
          <match url="^" ignoreCase="false" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" ignoreCase="false" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsFile" ignoreCase="false" negate="true" />
          </conditions>
          <action type="Rewrite" url="index.php" />
        </rule>
      </rules>
    </rewrite>
    <handlers>
      <remove name="PHP_via_FastCGI" />
      <add name="PHP_via_FastCGI" path="*.php" verb="GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS" modules="FastCgiModule" scriptProcessor="C:\PHP\php-cgi.exe" resourceType="Either" requireAccess="Script" />
    </handlers>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

### 5. Configure web.config for Frontend

Create `C:\inetpub\wwwroot\yachtcrm\frontend\dist\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Router" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/frontend/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="Cache-Control" value="no-cache, no-store, must-revalidate" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### 6. Set Permissions

**Grant IIS user write access to storage:**

```powershell
# Grant permissions to IIS_IUSRS
icacls "C:\inetpub\wwwroot\yachtcrm\backend\storage" /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls "C:\inetpub\wwwroot\yachtcrm\backend\bootstrap\cache" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

### 7. Configure .env

Edit `C:\inetpub\wwwroot\yachtcrm\backend\.env`:

```env
APP_URL=http://localhost
FRONTEND_URL=http://localhost/frontend

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yachtcrm
DB_USERNAME=yachtcrm_user
DB_PASSWORD=your_password

SESSION_DRIVER=database
CACHE_DRIVER=database

SANCTUM_STATEFUL_DOMAINS=localhost,crm.yourdomain.com
SESSION_DOMAIN=localhost
```

### 8. Test Installation

1. Open browser
2. Navigate to: `http://localhost/frontend`
3. Should see YachtCRM-DMS login page
4. Login with admin credentials

---

## Troubleshooting Windows/IIS

### Issue: "HTTP Error 500.0 - Internal Server Error"
**Solution:**
- Check Event Viewer (Windows Logs → Application)
- Verify PHP is installed correctly: `php --version`
- Check FastCGI configuration in IIS
- Review `backend\storage\logs\laravel.log`

### Issue: "HTTP Error 403.14 - Forbidden"
**Solution:**
- Ensure Default Document is enabled
- Add `index.php` to default documents list:
  - IIS Manager → Site → Default Document → Add → `index.php`

### Issue: "PHP extensions not loading"
**Solution:**
- Verify `php.ini` has correct `extension_dir` path
- Check extensions are uncommented (remove `;` prefix)
- Restart IIS: `iisreset`

### Issue: "Database connection failed"
**Solution:**
- Verify MySQL service is running:
  ```powershell
  Get-Service -Name "MySQL*"
  ```
- Test connection:
  ```cmd
  mysql -u yachtcrm_user -p -h 127.0.0.1
  ```
- Check firewall allows localhost connections

### Issue: "Frontend shows blank page"
**Solution:**
- Check browser console for errors (F12)
- Verify `frontend/dist/index.html` exists
- Check web.config in frontend/dist
- Ensure static file handler is enabled in IIS

### Issue: "API requests fail with 404"
**Solution:**
- Verify URL Rewrite module is installed
- Check web.config in `backend/public`
- Ensure "api" route group exists in `backend/routes/api.php`
- Test: `http://localhost/backend/api/health` (should return 404 or redirect)

### Issue: "CORS errors in browser console"
**Solution:**
- Update `.env`:
  ```env
  SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,crm.yourdomain.com
  SESSION_DOMAIN=localhost
  ```
- Clear config cache: `php artisan config:clear`
- Restart IIS

---

## Performance Tuning for Windows

### IIS Configuration

**Enable Output Caching:**
```powershell
# For static files
Import-Module WebAdministration
Set-WebConfigurationProperty -Filter "system.webServer/caching" -PSPath "IIS:\Sites\YachtCRM-DMS" -Name "enabled" -Value $true
```

**Application Pool Settings:**
- Recycling: Every 1740 minutes (29 hours)
- Idle Timeout: 20 minutes
- Maximum Worker Processes: 1 (or number of CPU cores for high traffic)

### PHP Configuration

**Enable OpCache in php.ini:**
```ini
[opcache]
opcache.enable=1
opcache.enable_cli=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.save_comments=1
opcache.fast_shutdown=1
```

### MySQL Tuning

Edit `my.ini` (usually in `C:\ProgramData\MySQL\MySQL Server 8.0\`):

```ini
[mysqld]
innodb_buffer_pool_size=1G
max_connections=150
query_cache_size=64M
innodb_log_file_size=256M
```

Restart MySQL service after changes.

---

## SSL/HTTPS Setup

### Option 1: Self-Signed Certificate (Development)

```powershell
# Create self-signed certificate
New-SelfSignedCertificate -DnsName "localhost", "crm.yourdomain.com" -CertStoreLocation "cert:\LocalMachine\My"

# Bind to IIS site
$cert = Get-ChildItem cert:\LocalMachine\My | Where-Object {$_.Subject -like "*localhost*"} | Select-Object -First 1
New-WebBinding -Name "YachtCRM-DMS" -Protocol https -Port 443
$binding = Get-WebBinding -Name "YachtCRM-DMS" -Protocol https
$binding.AddSslCertificate($cert.Thumbprint, "my")
```

### Option 2: Let's Encrypt (Production)

1. Install win-acme: https://github.com/win-acme/win-acme
2. Run: `wacs.exe --target manual --host crm.yourdomain.com --siteid 1`
3. Follow prompts to validate domain and install certificate

### Option 3: Commercial SSL Certificate

1. Purchase certificate from DigiCert, Sectigo, etc.
2. Generate CSR in IIS:
   - IIS Manager → Server → Server Certificates → Create Certificate Request
3. Submit CSR to certificate authority
4. Install certificate in IIS when received

**After SSL setup, update .env:**
```env
APP_URL=https://crm.yourdomain.com
FRONTEND_URL=https://crm.yourdomain.com/frontend
```

---

## Scheduled Tasks (Laravel Scheduler)

**Create scheduled task for Laravel:**

1. Open Task Scheduler
2. Create Basic Task:
   - Name: `YachtCRM-DMS Scheduler`
   - Trigger: Daily at midnight
   - Action: Start a program
   - Program: `C:\PHP\php.exe`
   - Arguments: `artisan schedule:run`
   - Start in: `C:\inetpub\wwwroot\yachtcrm\backend`

3. Edit task:
   - Triggers → New → Repeat task every: 1 minute for indefinitely
   - Settings → "If task is already running: Do not start a new instance"

---

## File Permissions

Windows doesn't use Unix-style permissions, but you need to grant write access:

**Storage Directories:**
```powershell
icacls "C:\inetpub\wwwroot\yachtcrm\backend\storage" /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls "C:\inetpub\wwwroot\yachtcrm\backend\bootstrap\cache" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

**Upload Directories:**
```powershell
icacls "C:\inetpub\wwwroot\yachtcrm\backend\storage\app\public" /grant "IIS_IUSRS:(OI)(CI)F" /T
```

---

## Windows-Specific Considerations

### Path Separators
- YachtCRM-DMS code uses `/` (forward slashes)
- PHP will automatically handle path conversion on Windows
- No code changes needed

### Line Endings
- Ensure Git is configured to handle line endings:
  ```cmd
  git config --global core.autocrlf true
  ```

### File Locking
- Windows locks files being accessed
- May need to stop IIS before updating files:
  ```powershell
  iisreset /stop
  # Update files
  iisreset /start
  ```

### Case Sensitivity
- Windows is case-insensitive for filenames
- Laravel is case-sensitive for class names
- Be careful with imports and namespaces

---

## Firewall Configuration

**Allow IIS through Windows Firewall:**

```powershell
New-NetFirewallRule -DisplayName "IIS HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "IIS HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

---

## Backup on Windows

### Automated Backup Script

Create `backup.bat`:

```batch
@echo off
SET BACKUP_DIR=C:\Backups\YachtCRM-DMS
SET DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%

mkdir "%BACKUP_DIR%\%DATE%"

REM Backup database
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u yachtcrm_user -pyour_password yachtcrm > "%BACKUP_DIR%\%DATE%\database.sql"

REM Backup files
xcopy "C:\inetpub\wwwroot\yachtcrm\backend\storage" "%BACKUP_DIR%\%DATE%\storage\" /E /I /H
xcopy "C:\inetpub\wwwroot\yachtcrm\backend\.env" "%BACKUP_DIR%\%DATE%\.env*"

echo Backup completed: %BACKUP_DIR%\%DATE%
```

**Schedule with Task Scheduler:**
- Run daily at 2 AM
- Set to run whether user is logged in or not
- Run with highest privileges

---

## Monitoring

### Event Viewer

Monitor these logs:
- Application Log (for PHP errors)
- System Log (for IIS issues)
- Custom view for IIS logs

### Performance Monitor

Track:
- % Processor Time
- Available Memory
- MySQL\Queries/sec (if MySQL exposes this)
- ASP.NET Apps\Requests/Sec

### IIS Logs

Located at: `C:\inetpub\logs\LogFiles\`

Configure extended logging:
- W3C Fields: All fields
- Log file rollover: Daily

---

## Production Deployment Checklist

- [ ] IIS installed with URL Rewrite module
- [ ] PHP 8.2 configured with FastCGI
- [ ] All required PHP extensions enabled
- [ ] MySQL/MariaDB installed and running
- [ ] Database created with proper user
- [ ] Node.js and Composer installed
- [ ] YachtCRM-DMS files deployed
- [ ] Installation script run successfully
- [ ] Web.config files in place
- [ ] File permissions granted to IIS_IUSRS
- [ ] SSL certificate installed (production)
- [ ] Scheduled task for Laravel scheduler
- [ ] Firewall rules configured
- [ ] Backups scheduled
- [ ] .env file configured correctly
- [ ] Application tested and accessible

---

## Updating YachtCRM-DMS on Windows

```powershell
# Stop IIS
iisreset /stop

# Navigate to installation
cd C:\inetpub\wwwroot\yachtcrm

# Run update script
php install.php update

# Restart IIS
iisreset /start
```

---

## Alternative: Using XAMPP on Windows

If you prefer XAMPP over IIS:

1. Install XAMPP with PHP 8.2
2. Copy YachtCRM-DMS to `C:\xampp\htdocs\yachtcrm\`
3. Configure Apache virtual hosts (see PLESK_CONFIGURATION.md for .htaccess examples)
4. Much simpler than IIS, works almost identically to Linux

---

## Support & Resources

- **IIS Documentation:** https://docs.microsoft.com/en-us/iis/
- **PHP on Windows:** https://windows.php.net/
- **Laravel Deployment:** https://laravel.com/docs/deployment
- **URL Rewrite:** https://www.iis.net/downloads/microsoft/url-rewrite

---

## Known Limitations on Windows

1. **Symbolic links** require administrator privileges
   - Solution: Copy files instead or run as administrator

2. **Case-sensitive routes** may behave differently
   - Solution: Always use lowercase route names

3. **File locking** can prevent updates while IIS is running
   - Solution: Stop IIS before updating

4. **Performance** is generally 10-20% slower than Linux
   - Solution: Use more RAM and enable OpCache

5. **Cron jobs** don't exist on Windows
   - Solution: Use Task Scheduler (as documented above)

