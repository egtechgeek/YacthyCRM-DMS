# Manual Frontend Build Guide

## When is this needed?

If the web installer shows "Node.js/npm not detected" or the frontend build step fails, you'll need to build the frontend manually via SSH.

**Why does this happen?**
- The web server user (www-data, apache, IIS_IUSRS) doesn't have Node.js in its PATH
- Common on shared hosting or Plesk environments
- Node.js is installed on the server but not accessible via web PHP

---

## Solution 1: Build via SSH (Recommended)

### Step 1: Connect via SSH

```bash
ssh your-username@your-server.com
```

### Step 2: Navigate to Frontend Directory

**Plesk:**
```bash
cd /var/www/vhosts/yourdomain.com/crm.subdomain.com/frontend
```

**cPanel:**
```bash
cd ~/public_html/yachtcrm/frontend
```

**Standard Linux:**
```bash
cd /var/www/html/yachtcrm/frontend
```

**Windows (PowerShell or CMD):**
```cmd
cd C:\inetpub\wwwroot\yachtcrm\frontend
```

### Step 3: Install npm Packages

```bash
npm install
```

This will download all React dependencies (~200MB).  
**Time:** 2-5 minutes depending on connection speed.

### Step 4: Build for Production

```bash
npm run build
```

This creates the `dist/` directory with optimized production files.  
**Time:** 1-2 minutes.

### Step 5: Verify Build

```bash
ls -la dist/
```

You should see:
- `index.html`
- `assets/` directory with `.js` and `.css` files

### Step 6: Test Application

Navigate to: `http://your-domain.com/frontend/`

You should now see the YachtCRM-DMS login page!

---

## Solution 2: Enable Node.js for Web Server (Advanced)

### For Linux/Apache

Add Node.js to the web server user's PATH:

**Option A: System-wide**
```bash
# Add to /etc/environment
echo 'PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin"' | sudo tee -a /etc/environment

# Restart Apache
sudo systemctl restart apache2
```

**Option B: Apache environment**
```bash
# Edit Apache config
sudo nano /etc/apache2/envvars

# Add this line:
export PATH="/usr/local/bin:$PATH"

# Restart Apache
sudo systemctl restart apache2
```

### For Plesk

Plesk isolates each domain, making this more complex. **Manual build via SSH is recommended.**

### For Windows/IIS

Add Node.js to System PATH (not just user PATH):

```powershell
# Run as Administrator
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\nodejs", "Machine")

# Restart IIS
iisreset
```

Then re-run the web installer.

---

## Solution 3: Pre-Build Before Upload (Easiest!)

If you have Node.js on your local computer:

### Step 1: Extract/Clone Locally

Extract the yachtcrm package on your local machine.

### Step 2: Build Locally

```bash
cd yachtcrm/frontend
npm install
npm run build
```

### Step 3: Upload to Server

Upload the **entire yachtcrm folder** (now with `frontend/dist/` already built) to your server.

### Step 4: Run Web Installer

The installer will detect the dist/ folder already exists and skip the build step!

---

## Troubleshooting

### "npm: command not found"

**Check if Node.js is installed:**
```bash
which node
which npm
node --version
npm --version
```

**If not installed:**

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/Rocky:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**Windows:**
- Download from: https://nodejs.org/
- Run installer
- Restart terminal/PowerShell

### "Permission denied" during npm install

```bash
# Set proper permissions
chmod -R 755 frontend/
chown -R your-user:your-group frontend/

# Try again
npm install
```

### Build fails with "out of memory"

Increase Node.js memory:

```bash
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

### "Module not found" errors during build

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

---

## Verification

After building, verify these files exist:

```
frontend/
├── dist/
│   ├── index.html                    ← Entry point
│   └── assets/
│       ├── index-[hash].js           ← React app (~900KB)
│       └── index-[hash].css          ← Styles
```

**Test in browser:**
- Navigate to: `http://your-domain.com/frontend/`
- Should see YachtCRM-DMS login page
- If blank page, check browser console for errors (F12)

---

## Alternative: Use Pre-Built Package

If building is consistently problematic, request a **pre-built package** that includes the `frontend/dist/` directory already compiled.

This eliminates the need for Node.js entirely on the server!

---

## FAQs

**Q: Do I need to rebuild after every update?**  
A: Yes, if the frontend code changes. Backend-only updates don't require rebuilding.

**Q: Can I build on a different machine?**  
A: Yes! Build on any machine with Node.js, then copy the `dist/` folder to the server.

**Q: How often does the frontend need rebuilding?**  
A: Only when:
- Initial installation
- Updating to a new version
- Customizing frontend code

**Q: Can I automate the build?**  
A: Yes, via deployment scripts or CI/CD pipelines (GitHub Actions, GitLab CI, etc.)

**Q: What if I don't have SSH access?**  
A: Options:
1. Build locally and upload dist/ folder
2. Ask hosting provider to enable Node.js for web server
3. Request pre-built package
4. Use VPS/hosting with SSH access

---

## Quick Reference

**Build Commands:**
```bash
cd frontend
npm install          # Install dependencies (first time only)
npm run build        # Build for production
```

**Development Mode (with hot reload):**
```bash
npm run dev          # Runs on http://localhost:5173
```

**Clean Build:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

---

**Need help? Check the output logs for specific error messages.**

