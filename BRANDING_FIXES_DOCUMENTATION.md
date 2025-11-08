# YachtCRM-DMS Branding Issues & Fixes Documentation

This document details the issues encountered with branding/logo uploads and how they were resolved.

---

## Issue 1: Missing Laravel Filesystem Configuration

### Problem
When attempting to upload logos, the system threw an error:
```
Disk [public] does not have a configured driver.
```

### Root Cause
The `config/filesystems.php` file was **completely missing** from the Laravel installation. This critical configuration file defines storage disks (local, public, s3, etc.) that Laravel uses for file uploads.

### Solution
Created `/backend/config/filesystems.php` with the following content:

```php
<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
```

**After creating the file, run:**
```bash
cd /path/to/backend
php artisan config:clear
php artisan config:cache
```

---

## Issue 2: Missing Fillable Fields in Setting Model

### Problem
Branding settings were being submitted but not saved to the database (silent failure). Form submissions would complete without error, but no data was persisted.

### Root Cause
The `Setting` model (`app/Models/Setting.php`) did not include the branding columns in its `$fillable` array. Laravel's mass assignment protection was silently rejecting the `crm_name`, `logo_login`, `logo_header`, and `logo_invoice` fields.

### Solution
Updated `/backend/app/Models/Setting.php`:

**BEFORE:**
```php
protected $fillable = [
    'key',
    'value',
    'type',
    'description',
];
```

**AFTER:**
```php
protected $fillable = [
    'key',
    'value',
    'type',
    'description',
    'crm_name',
    'logo_login',
    'logo_header',
    'logo_invoice',
];
```

**After making this change, run:**
```bash
cd /path/to/backend
php artisan config:clear
php artisan cache:clear
```

---

## Issue 3: Incorrect getBranding Method

### Problem
The `getBranding()` method in `SettingsController` had incorrect SQL queries that were all looking for the same key and wrong column names.

### Root Cause
Copy-paste error in the controller resulted in all queries using `where('key', 'crm_name')` for every field.

### Solution
Updated `/backend/app/Http/Controllers/SettingsController.php`:

**BEFORE:**
```php
public function getBranding()
{
    $branding = [
        'crm_name' => DB::table('settings')->where('key', 'crm_name')->value('crm_name') ?? 'Captain Ellenbogen Yacht Management CRM',
        'logo_login' => DB::table('settings')->where('key', 'crm_name')->value('logo_login'),
        'logo_header' => DB::table('settings')->where('key', 'crm_name')->value('logo_header'),
        'logo_invoice' => DB::table('settings')->where('key', 'crm_name')->value('logo_invoice'),
    ];

    return response()->json($branding, 200);
}
```

**AFTER:**
```php
public function getBranding()
{
    $setting = Setting::where('key', 'crm_name')->first();
    
    $branding = [
        'crm_name' => $setting->crm_name ?? 'Captain Ellenbogen Yacht Management CRM',
        'logo_login' => $setting->logo_login ?? null,
        'logo_header' => $setting->logo_header ?? null,
        'logo_invoice' => $setting->logo_invoice ?? null,
    ];

    return response()->json($branding, 200);
}
```

**After making this change, run:**
```bash
cd /path/to/backend
php artisan config:clear
php artisan cache:clear
```

---

## Issue 4: Hardcoded Branding in Frontend Components

### Problem
Even after fixing the backend, branding changes didn't appear because:
1. CRM name was hardcoded in multiple components
2. Logos were using static files from the public directory
3. No API calls were being made to fetch dynamic branding

### Root Cause
Frontend was originally developed with placeholder branding and was never updated to use the API.

### Solution

#### A. Update Login Component (`frontend/src/components/auth/Login.jsx`)

**Add imports:**
```jsx
import { useState, useEffect } from 'react'  // Add useEffect
import axios from 'axios'  // Add axios
```

**Add state and API fetch:**
```jsx
const Login = () => {
  // ... existing state ...
  const [branding, setBranding] = useState({
    crm_name: 'CRM',
    logo_login: null,
  })

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://your-domain.com/backend'
        const response = await axios.get(`${apiBaseUrl}/api/branding`)
        setBranding(response.data)
      } catch (err) {
        console.error('Failed to fetch branding:', err)
      }
    }
    fetchBranding()
  }, [])
```

**Update logo and title:**
```jsx
<img 
  src={branding.logo_login ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://your-domain.com/backend'}/storage/${branding.logo_login}` : `${import.meta.env.BASE_URL}logo_without_contact.png`}
  alt={`${branding.crm_name} Logo`} 
  style={{ height: '160px', maxWidth: '100%', objectFit: 'contain' }}
/>

<Typography component="h1" variant="h4" align="center" gutterBottom>
  {branding.crm_name}
</Typography>
```

#### B. Update Header Component (`frontend/src/components/Header.jsx`)

**Add imports:**
```jsx
import { useState, useEffect } from 'react'  // Add these
import axios from 'axios'  // Add axios
```

**Add state and API fetch:**
```jsx
const Header = () => {
  // ... existing code ...
  const [branding, setBranding] = useState({
    crm_name: 'CRM',
    logo_header: null,
  })

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://your-domain.com/backend'
        const response = await axios.get(`${apiBaseUrl}/api/branding`)
        setBranding(response.data)
      } catch (err) {
        console.error('Failed to fetch branding:', err)
      }
    }
    fetchBranding()
  }, [])
```

**Update logo:**
```jsx
<img 
  src={branding.logo_header ? `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://your-domain.com/backend'}/storage/${branding.logo_header}` : `${import.meta.env.BASE_URL}logo_without_contact.png`}
  alt={`${branding.crm_name} Logo`} 
  style={{ 
    height: 'auto', 
    width: '100%', 
    maxHeight: '60px',
    objectFit: 'contain'
  }}
/>
```

#### C. Update Dashboard (Optional)

In `frontend/src/pages/Dashboard.jsx`, replace any hardcoded CRM name with your desired name or fetch from branding API.

#### D. Rebuild Frontend

After making frontend changes:
```bash
cd /path/to/frontend
rm -rf dist/
npm run build
```

---

## Issue 5: File Upload Size Limits (413 Error)

### Problem
Received "413 Payload Too Large" error when uploading logos larger than 2MB.

### Root Cause
PHP default settings restrict uploads to 2MB, and nginx/Apache also have body size limits.

### Solution

#### A. PHP Upload Limits

Create `/httpdocs/.user.ini` with:
```ini
upload_max_filesize = 20M
post_max_size = 25M
memory_limit = 256M
max_execution_time = 300
max_input_time = 300
```

**Note:** Changes may take 5 minutes to take effect, or restart PHP-FPM.

#### B. Nginx Body Size Limit (Plesk)

**Option 1: Via Plesk Panel (Recommended)**
1. Log into Plesk
2. Go to **Domains** → **your-domain.com**
3. Click **Apache & nginx Settings**
4. In **Additional nginx directives**, add:
   ```
   client_max_body_size 25M;
   ```
5. Click **OK**

**Option 2: Via Configuration File**
Create `/var/www/vhosts/your-domain.com/conf/vhost_nginx.conf`:
```
client_max_body_size 25M;
```

Then reload nginx:
```bash
systemctl reload nginx
# or
service nginx reload
```

---

## Manual Branding Setup (Workaround)

If the web interface still fails, you can set branding manually via database:

### 1. Copy logo files to storage:
```bash
cp /path/to/login-logo.jpg /path/to/backend/storage/app/public/logos/
cp /path/to/header-logo.png /path/to/backend/storage/app/public/logos/
```

### 2. Update database:
```bash
mysql -u your_db_user -p your_db_name -e "
UPDATE settings 
SET crm_name = 'Your CRM Name', 
    logo_login = 'logos/login-logo.jpg', 
    logo_header = 'logos/header-logo.png', 
    logo_invoice = 'logos/header-logo.png' 
WHERE \`key\` = 'crm_name';
"
```

### 3. Clear Laravel cache:
```bash
cd /path/to/backend
php artisan config:clear
php artisan cache:clear
```

### 4. Verify via API:
```bash
curl https://your-domain.com/backend/api/branding
```

Expected output:
```json
{
  "crm_name": "Your CRM Name",
  "logo_login": "logos/login-logo.jpg",
  "logo_header": "logos/header-logo.png",
  "logo_invoice": "logos/header-logo.png"
}
```

---

## Verification Checklist

Use this checklist to verify all fixes are in place:

### Backend Checks:
- [ ] `config/filesystems.php` exists and contains public disk configuration
- [ ] `app/Models/Setting.php` has all branding columns in `$fillable` array
- [ ] `app/Http/Controllers/SettingsController.php` getBranding method is correct
- [ ] Storage symlink exists: `public/storage -> storage/app/public`
- [ ] Logos directory exists: `storage/app/public/logos/`
- [ ] Directory permissions: `storage/` and `bootstrap/cache/` are writable (775)
- [ ] `.user.ini` or `php.ini` has increased upload limits
- [ ] Nginx has `client_max_body_size` configured
- [ ] Laravel caches cleared: `config:clear`, `cache:clear`, `route:clear`

### Frontend Checks:
- [ ] `Login.jsx` fetches branding from API and displays dynamic logo/name
- [ ] `Header.jsx` fetches branding from API and displays dynamic logo
- [ ] Frontend rebuilt: `npm run build` executed successfully
- [ ] New bundle deployed (check `dist/index.html` for latest JS file)
- [ ] Browser hard refresh performed (Ctrl+F5)

### API Test:
```bash
curl https://your-domain.com/backend/api/branding
```
Should return JSON with crm_name and logo paths.

### Storage Test:
```bash
curl -I https://your-domain.com/backend/storage/logos/your-logo.png
```
Should return HTTP 200.

---

## Common Pitfalls

1. **Forgetting to rebuild frontend** after code changes
2. **Browser caching** - always hard refresh (Ctrl+F5)
3. **Not clearing Laravel caches** after config changes
4. **File permissions** - web server needs write access to `storage/`
5. **Wrong storage URL** - ensure `APP_URL` in `.env` is correct
6. **Nginx not reloaded** after configuration changes
7. **Database record not created** - check if settings record exists with `key = 'crm_name'`

---

## Testing After Fixes

1. **Test API endpoint:**
   ```bash
   curl https://your-domain.com/backend/api/branding
   ```

2. **Test file upload manually:**
   ```bash
   # Upload a test image
   curl -X POST https://your-domain.com/backend/api/branding \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "logo_login=@/path/to/image.jpg" \
     -F "crm_name=Test CRM"
   ```

3. **Check Laravel logs:**
   ```bash
   tail -f /path/to/backend/storage/logs/laravel.log
   ```

4. **Visual test:**
   - Log out completely
   - Clear browser cache (Ctrl+Shift+Delete)
   - Visit login page
   - Verify logo and CRM name appear correctly

---

## Quick Reference Commands

```bash
# Clear all Laravel caches
cd /path/to/backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Recache for production
php artisan config:cache
php artisan route:cache

# Rebuild frontend
cd /path/to/frontend
rm -rf dist/
npm run build

# Check storage symlink
ls -la /path/to/backend/public/storage

# Recreate storage symlink if needed
cd /path/to/backend
php artisan storage:link

# Fix storage permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache  # Adjust user as needed

# Test branding API
curl https://your-domain.com/backend/api/branding

# View Laravel logs
tail -50 /path/to/backend/storage/logs/laravel-$(date +%Y-%m-%d).log
```

---

## Summary

The branding issues stemmed from three main problems:

1. **Missing filesystem configuration** - Laravel couldn't handle file uploads
2. **Incomplete model configuration** - Mass assignment protection blocked updates
3. **Hardcoded frontend values** - UI never fetched dynamic branding from API

All three must be fixed for branding to work properly. The fixes are straightforward but require:
- Backend file/code changes
- Frontend code changes and rebuild
- Cache clearing
- Possibly server configuration (upload limits)

Once fixed, the branding system works dynamically and updates will reflect immediately after a browser refresh.

