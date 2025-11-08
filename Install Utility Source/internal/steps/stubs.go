package steps

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"yachtcrm-installer/internal/installer"
	"yachtcrm-installer/internal/powershell"
	"yachtcrm-installer/internal/prompts"
	"yachtcrm-installer/internal/templates"
)

type CheckPrerequisites struct{}

func (CheckPrerequisites) Name() string { return "Validate Local Prerequisites" }

func (s CheckPrerequisites) Run(ctx *installer.Context) error {
	if ctx.PrerequisitesDir == "" || !dirExists(ctx.PrerequisitesDir) {
		ctx.Logf("Prerequisites directory %s not found", ctx.PrerequisitesDir)
		path, err := prompts.AskString("Enter path to Prerequisites directory", true)
		if err != nil {
			return err
		}
		absPath, err := abs(path)
		if err != nil {
			return fmt.Errorf("resolve prerequisites directory: %w", err)
		}
		ctx.PrerequisitesDir = absPath
	}

	if !dirExists(ctx.PrerequisitesDir) {
		return fmt.Errorf("prerequisites directory not found at %s", ctx.PrerequisitesDir)
	}

	ctx.Logf("Using prerequisites directory %s", ctx.PrerequisitesDir)

	requiredFiles := map[string]*string{
		"Composer-Setup.exe":                 &ctx.ComposerInstallerPath,
		"mariadb-11.8.4-winx64.msi":          &ctx.MariaDBInstallerPath,
		"node-v22.21.1-win-x64.zip":          &ctx.NodeZipPath,
		"php-8.3.27-nts-Win32-vs16-x64.zip":  &ctx.PhpNtsZipPath,
		"php-8.3.27-Win32-vs16-x64.zip":      &ctx.PhpTsZipPath,
		"phpMyAdmin-5.2.3-all-languages.zip": &ctx.PhpMyAdminZipPath,
	}

	missing := []string{}
	for fileName, dest := range requiredFiles {
		fullPath := filepath.Join(ctx.PrerequisitesDir, fileName)
		if !fileExists(fullPath) {
			missing = append(missing, fileName)
			continue
		}
		*dest = fullPath
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing prerequisite files: %v", missing)
	}

	if ctx.CRMSourceDir == "" || !dirExists(ctx.CRMSourceDir) {
		ctx.Logf("CRM_Source directory %s not found", ctx.CRMSourceDir)
		path, err := prompts.AskString("Enter path to CRM_Source directory", true)
		if err != nil {
			return err
		}
		absPath, err := abs(path)
		if err != nil {
			return fmt.Errorf("resolve CRM_Source directory: %w", err)
		}
		ctx.CRMSourceDir = absPath
	}

	if !dirExists(ctx.CRMSourceDir) {
		return fmt.Errorf("CRM_Source directory not found at %s", ctx.CRMSourceDir)
	}

	ctx.Logf("Using CRM_Source directory %s", ctx.CRMSourceDir)

	if ctx.DownloadsDir != "" {
		if err := ensureDir(ctx.DownloadsDir); err != nil {
			return fmt.Errorf("prepare downloads directory: %w", err)
		}
	} else {
		exePath, err := os.Executable()
		if err != nil {
			return fmt.Errorf("determine executable: %w", err)
		}
		exeDir := filepath.Dir(exePath)
		ctx.DownloadsDir = filepath.Join(exeDir, "downloads")
		if err := ensureDir(ctx.DownloadsDir); err != nil {
			return fmt.Errorf("prepare downloads directory: %w", err)
		}
	}
	ctx.Logf("Downloads directory available at %s", ctx.DownloadsDir)

	return nil
}

type InstallIISFeatures struct{}

func (InstallIISFeatures) Name() string { return "Install IIS Features" }

func (s InstallIISFeatures) Run(ctx *installer.Context) error {
	features := []string{
		"IIS-WebServerRole",
		"IIS-WebServer",
		"IIS-CommonHttpFeatures",
		"IIS-HttpErrors",
		"IIS-ApplicationDevelopment",
		"IIS-NetFxExtensibility45",
		"IIS-HealthAndDiagnostics",
		"IIS-HttpLogging",
		"IIS-Security",
		"IIS-RequestFiltering",
		"IIS-Performance",
		"IIS-WebServerManagementTools",
		"IIS-ManagementConsole",
		"IIS-CGI",
		"IIS-ISAPIExtensions",
		"IIS-ISAPIFilter",
	}

	enableScript := strings.Builder{}
	enableScript.WriteString("$features = @(\n")
	for _, f := range features {
		enableScript.WriteString(fmt.Sprintf("    \"%s\"\n", f))
	}
	enableScript.WriteString(")\nforeach ($feature in $features) {\n")
	enableScript.WriteString("    $state = (Get-WindowsOptionalFeature -Online -FeatureName $feature).State\n")
	enableScript.WriteString("    if ($state -ne 'Enabled') {\n")
	enableScript.WriteString("        Enable-WindowsOptionalFeature -Online -FeatureName $feature -NoRestart | Out-Null\n")
	enableScript.WriteString("    }\n")
	enableScript.WriteString("}\n")

	result := powershell.Run(enableScript.String())
	if result.Err != nil {
		return fmt.Errorf("enable IIS features: %w (stderr: %s)", result.Err, result.Stderr)
	}
	ctx.Logf("IIS core features ensured")

	rewriteCheck := powershell.Run(`[IO.File]::Exists("$env:SystemRoot\System32\inetsrv\rewrite.dll")`)
	rewriteInstalled := rewriteCheck.Err == nil && strings.EqualFold(rewriteCheck.Stdout, "true")

	if rewriteInstalled {
		ctx.Logf("URL Rewrite already installed")
		return nil
	}

	const rewriteURL = "https://download.microsoft.com/download/1/2/7/12743496-1E04-4B0B-B9F4-651F5B8C0082/rewrite_amd64_en-US.msi"
	rewritePath := filepath.Join(ctx.DownloadsDir, "rewrite_amd64_en-US.msi")

	if !fileExists(rewritePath) {
		ctx.Logf("Downloading IIS URL Rewrite installer...")
		if err := downloadFile(rewriteURL, rewritePath); err != nil {
			return fmt.Errorf("download URL Rewrite: %w", err)
		}
	} else {
		ctx.Logf("Using cached URL Rewrite installer %s", rewritePath)
	}

	escaped := strings.ReplaceAll(rewritePath, "'", "''")
	installRewrite := fmt.Sprintf("Start-Process msiexec.exe -ArgumentList '/i','%s','/quiet','/norestart' -Wait", escaped)
	result = powershell.Run(installRewrite)
	if result.Err != nil {
		return fmt.Errorf("install URL Rewrite: %w (stderr: %s)", result.Err, result.Stderr)
	}

	ctx.Logf("IIS URL Rewrite installed successfully")
	return nil
}

type InstallPHP struct{}

func (InstallPHP) Name() string { return "Install PHP 8.3" }

func (s InstallPHP) Run(ctx *installer.Context) error {
	if ctx.PhpNtsZipPath == "" {
		return fmt.Errorf("PHP NTS zip not located")
	}

	ctx.Logf("Installing PHP from %s", ctx.PhpNtsZipPath)
	tempDir := filepath.Join(ctx.DownloadsDir, "php-nts-extracted")
	if err := extractZip(ctx.PhpNtsZipPath, tempDir); err != nil {
		return fmt.Errorf("extract PHP archive: %w", err)
	}

	entries, err := os.ReadDir(tempDir)
	if err != nil {
		return fmt.Errorf("read extracted PHP directory: %w", err)
	}

	srcRoot := tempDir
	if len(entries) == 1 && entries[0].IsDir() {
		srcRoot = filepath.Join(tempDir, entries[0].Name())
	}

	if err := os.RemoveAll(ctx.PhpInstallDir); err != nil {
		return fmt.Errorf("remove existing PHP directory: %w", err)
	}
	if err := copyDir(srcRoot, ctx.PhpInstallDir); err != nil {
		return fmt.Errorf("copy PHP files: %w", err)
	}

	iniProduction := filepath.Join(ctx.PhpInstallDir, "php.ini-production")
	iniDevelopment := filepath.Join(ctx.PhpInstallDir, "php.ini-development")
	if fileExists(iniProduction) {
		if err := copyFile(iniProduction, ctx.PhpIniPath); err != nil {
			return fmt.Errorf("create php.ini: %w", err)
		}
	} else if fileExists(iniDevelopment) {
		if err := copyFile(iniDevelopment, ctx.PhpIniPath); err != nil {
			return fmt.Errorf("create php.ini: %w", err)
		}
	} else {
		return fmt.Errorf("php.ini-production not found in %s", ctx.PhpInstallDir)
	}

	iniContents, err := os.ReadFile(ctx.PhpIniPath)
	if err != nil {
		return fmt.Errorf("read php.ini: %w", err)
	}
	ini := string(iniContents)

	for _, ext := range []string{"curl", "fileinfo", "gd", "mbstring", "openssl", "pdo_mysql", "zip", "bcmath"} {
		with, replaced := replaceFirst(ini, ";extension="+ext, "extension="+ext)
		if replaced {
			ini = with
		} else if !strings.Contains(ini, "extension="+ext) {
			ini += "\nextension=" + ext
		}
	}

	ini = setIniValue(ini, "memory_limit", "256M")
	ini = setIniValue(ini, "max_execution_time", "300")
	ini = setIniValue(ini, "upload_max_filesize", "20M")
	ini = setIniValue(ini, "post_max_size", "20M")
	ini = setIniValue(ini, "max_input_vars", "3000")

	if err := os.WriteFile(ctx.PhpIniPath, []byte(ini), 0o644); err != nil {
		return fmt.Errorf("write php.ini: %w", err)
	}

	// Ensure PHP directory on PATH.
	escaped := strings.ReplaceAll(ctx.PhpInstallDir, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, "'", "''")
	ps := fmt.Sprintf(`$path = [Environment]::GetEnvironmentVariable('Path','Machine'); if (-not $path.Split(';') -contains '%s') { [Environment]::SetEnvironmentVariable('Path',$path+';%s','Machine') }`, ctx.PhpInstallDir, ctx.PhpInstallDir)
	result := powershell.Run(ps)
	if result.Err != nil {
		ctx.Logf("Warning: failed to append PHP to PATH automatically: %v", result.Err)
	}

	ctx.PhpExePath = filepath.Join(ctx.PhpInstallDir, "php.exe")
	if !fileExists(ctx.PhpExePath) {
		return fmt.Errorf("php.exe not found at %s", ctx.PhpExePath)
	}

	versionResult := powershell.Run(fmt.Sprintf(`"%s" -v`, ctx.PhpExePath))
	if versionResult.Err != nil {
		ctx.Logf("Warning: php.exe -v failed: %v", versionResult.Err)
	} else {
		ctx.Logf("PHP installed: %s", versionResult.Stdout)
	}

	return nil
}

type InstallComposer struct{}

func (InstallComposer) Name() string { return "Install Composer" }

func (s InstallComposer) Run(ctx *installer.Context) error {
	destPhar := filepath.Join(ctx.PhpInstallDir, "composer.phar")
	if !fileExists(destPhar) {
		ctx.Logf("Downloading composer.phar...")
		if err := downloadFile("https://getcomposer.org/composer-stable.phar", destPhar); err != nil {
			return fmt.Errorf("download composer.phar: %w", err)
		}
	} else {
		ctx.Logf("composer.phar already present at %s", destPhar)
	}

	wrapper := filepath.Join(ctx.PhpInstallDir, "composer.bat")
	wrapperContents := fmt.Sprintf("@\"%s\" \"%%~dp0composer.phar\" %%*\r\n", ctx.PhpExePath)
	if err := os.WriteFile(wrapper, []byte(wrapperContents), 0o755); err != nil {
		return fmt.Errorf("write composer wrapper: %w", err)
	}

	ctx.ComposerPath = wrapper
	ctx.Logf("Composer available via %s", wrapper)
	return nil
}

type InstallMariaDB struct{}

func (InstallMariaDB) Name() string { return "Install MariaDB" }

func (s InstallMariaDB) Run(ctx *installer.Context) error {
	if ctx.MariaDBInstallerPath == "" {
		return fmt.Errorf("MariaDB installer not located")
	}

	serviceCheck := powershell.Run(`Get-Service -Name "MariaDB*" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Name`)
	if serviceCheck.Err == nil && strings.TrimSpace(serviceCheck.Stdout) != "" {
		ctx.Logf("MariaDB service %s already present", strings.TrimSpace(serviceCheck.Stdout))
	} else {
		ctx.Logf("Installing MariaDB using %s", ctx.MariaDBInstallerPath)
		escaped := strings.ReplaceAll(ctx.MariaDBInstallerPath, "'", "''")
		password := strings.ReplaceAll(ctx.RootMariaDBPassword, "'", "''")
		script := fmt.Sprintf(`$args = @('/i','%s','/qn','/norestart','SERVICENAME=MariaDB','ADDLOCAL=ALL','ENABLETCPIP=1','TCPPORT=3306','ALLOWREMOTEROOTACCESS=1','PASSWORD=%s'); Start-Process msiexec.exe -ArgumentList $args -Wait`, escaped, password)
		result := powershell.Run(script)
		if result.Err != nil {
			return fmt.Errorf("install MariaDB: %w (stderr: %s)", result.Err, result.Stderr)
		}
		ctx.Logf("MariaDB installed successfully")
	}

	binDir, err := findMariaDBBinDir()
	if err != nil {
		return fmt.Errorf("locate MariaDB bin directory: %w", err)
	}
	ctx.MariaDBBinDir = binDir
	ctx.Logf("MariaDB binaries located at %s", binDir)

	// Ensure service startup type is automatic
	powershell.Run(`Get-Service -Name "MariaDB*" -ErrorAction SilentlyContinue | ForEach-Object { Set-Service -Name $_.Name -StartupType Automatic }`)

	return nil
}

type ConfigureMariaDB struct{}

func (ConfigureMariaDB) Name() string { return "Configure MariaDB" }

func (s ConfigureMariaDB) Run(ctx *installer.Context) error {
	if ctx.MariaDBBinDir == "" {
		return fmt.Errorf("MariaDB bin directory not known; ensure Install MariaDB step ran")
	}

	configPath, err := findMariaDBConfig(ctx.MariaDBBinDir)
	if err != nil {
		ctx.Logf("Warning: %v", err)
	} else {
		contents, readErr := os.ReadFile(configPath)
		if readErr == nil {
			ini := string(contents)
			ini = setIniValue(ini, "innodb_buffer_pool_size", "1G")
			ini = setIniValue(ini, "max_connections", "150")
			ini = setIniValue(ini, "query_cache_size", "64M")
			ini = setIniValue(ini, "innodb_log_file_size", "256M")
			if writeErr := os.WriteFile(configPath, []byte(ini), 0o644); writeErr != nil {
				ctx.Logf("Warning: unable to update %s: %v", configPath, writeErr)
			} else {
				ctx.Logf("Updated MariaDB configuration at %s", configPath)
				powershell.Run(`Get-Service -Name "MariaDB*" -ErrorAction SilentlyContinue | ForEach-Object { Restart-Service -Name $_.Name -Force }`)
			}
		} else {
			ctx.Logf("Warning: unable to read %s: %v", configPath, readErr)
		}
	}

	mysqlExe := filepath.Join(ctx.MariaDBBinDir, "mysql.exe")
	if !fileExists(mysqlExe) {
		return fmt.Errorf("mysql.exe not found at %s", mysqlExe)
	}

	db := ctx.DatabaseName
	user := ctx.DatabaseUser
	userPwd := ctx.DatabaseUserPassword

	sql := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nCREATE USER IF NOT EXISTS '%s'@'localhost' IDENTIFIED BY '%s';\nGRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'localhost';\nFLUSH PRIVILEGES;", db, user, userPwd, db, user)

	script := fmt.Sprintf(`$sql = @'
%s
'@
& '%s' -u root --password='%s' -e $sql`, sql, mysqlExe, escapeSingleQuotes(ctx.RootMariaDBPassword))
	result := powershell.Run(script)
	if result.Err != nil {
		return fmt.Errorf("configure database: %w (stderr: %s)", result.Err, result.Stderr)
	}

	ctx.Logf("Database %s and user %s configured", db, user)
	return nil
}

type InstallPhpMyAdmin struct{}

func (InstallPhpMyAdmin) Name() string { return "Install phpMyAdmin" }

func (s InstallPhpMyAdmin) Run(ctx *installer.Context) error {
	if ctx.PhpMyAdminZipPath == "" {
		return fmt.Errorf("phpMyAdmin zip not located")
	}

	ctx.Logf("Installing phpMyAdmin to %s", ctx.PhpMyAdminDir)
	tempDir := filepath.Join(ctx.DownloadsDir, "phpmyadmin-extracted")
	if err := extractZip(ctx.PhpMyAdminZipPath, tempDir); err != nil {
		return fmt.Errorf("extract phpMyAdmin: %w", err)
	}

	entries, err := os.ReadDir(tempDir)
	if err != nil {
		return fmt.Errorf("read extracted phpMyAdmin directory: %w", err)
	}

	srcRoot := tempDir
	if len(entries) == 1 && entries[0].IsDir() {
		srcRoot = filepath.Join(tempDir, entries[0].Name())
	}

	if err := os.RemoveAll(ctx.PhpMyAdminDir); err != nil {
		return fmt.Errorf("remove existing phpMyAdmin directory: %w", err)
	}
	if err := copyDir(srcRoot, ctx.PhpMyAdminDir); err != nil {
		return fmt.Errorf("copy phpMyAdmin files: %w", err)
	}

	sampleCfg := filepath.Join(ctx.PhpMyAdminDir, "config.sample.inc.php")
	destCfg := filepath.Join(ctx.PhpMyAdminDir, "config.inc.php")
	if !fileExists(sampleCfg) {
		return fmt.Errorf("config.sample.inc.php not found in phpMyAdmin directory")
	}
	if err := copyFile(sampleCfg, destCfg); err != nil {
		return fmt.Errorf("create config.inc.php: %w", err)
	}

	cfgBytes, err := os.ReadFile(destCfg)
	if err != nil {
		return fmt.Errorf("read config.inc.php: %w", err)
	}
	cfg := string(cfgBytes)
	blowfish := randomString(32)
	cfg = strings.Replace(cfg, "$cfg['blowfish_secret'] = '';", fmt.Sprintf("$cfg['blowfish_secret'] = '%s';", blowfish), 1)
	cfg += "\n$cfg['Servers'][1]['auth_type'] = 'cookie';\n$cfg['Servers'][1]['host'] = '127.0.0.1';\n$cfg['Servers'][1]['AllowNoPassword'] = false;\n"
	if err := os.WriteFile(destCfg, []byte(cfg), 0o644); err != nil {
		return fmt.Errorf("write config.inc.php: %w", err)
	}

	ctx.Logf("phpMyAdmin deployed; accessible via IIS once site is configured")
	return nil
}

type InstallNode struct{}

func (InstallNode) Name() string { return "Install Node.js" }

func (s InstallNode) Run(ctx *installer.Context) error {
	if ctx.NodeZipPath == "" {
		return fmt.Errorf("Node.js zip not located")
	}

	ctx.Logf("Installing Node.js from %s", ctx.NodeZipPath)
	tempDir := filepath.Join(ctx.DownloadsDir, "node-extracted")
	if err := extractZip(ctx.NodeZipPath, tempDir); err != nil {
		return fmt.Errorf("extract Node.js archive: %w", err)
	}

	entries, err := os.ReadDir(tempDir)
	if err != nil {
		return fmt.Errorf("read extracted Node.js directory: %w", err)
	}

	srcRoot := tempDir
	if len(entries) == 1 && entries[0].IsDir() {
		srcRoot = filepath.Join(tempDir, entries[0].Name())
	}

	if err := os.RemoveAll(ctx.NodeInstallDir); err != nil {
		return fmt.Errorf("remove existing Node.js directory: %w", err)
	}
	if err := copyDir(srcRoot, ctx.NodeInstallDir); err != nil {
		return fmt.Errorf("copy Node.js files: %w", err)
	}

	ctx.NodeBinDir = ctx.NodeInstallDir
	nodeExe := filepath.Join(ctx.NodeBinDir, "node.exe")
	npmCmd := filepath.Join(ctx.NodeBinDir, "npm.cmd")
	if !fileExists(nodeExe) {
		return fmt.Errorf("node.exe not found at %s", nodeExe)
	}
	if !fileExists(npmCmd) {
		return fmt.Errorf("npm.cmd not found at %s", npmCmd)
	}

	ps := fmt.Sprintf(`[Environment]::SetEnvironmentVariable('Path',[Environment]::GetEnvironmentVariable('Path','Machine')+';%s','Machine')`, ctx.NodeBinDir)
	result := powershell.Run(ps)
	if result.Err != nil {
		ctx.Logf("Warning: failed to add Node.js to PATH automatically: %v", result.Err)
	}

	version := powershell.Run(fmt.Sprintf(`"%s" -v`, nodeExe))
	if version.Err == nil {
		ctx.Logf("Node.js installed: %s", version.Stdout)
	}

	return nil
}

type DeployYachtCRM-DMS struct{}

func (DeployYachtCRM-DMS) Name() string { return "Deploy YachtCRM-DMS Files" }

func (s DeployYachtCRM-DMS) Run(ctx *installer.Context) error {
	if ctx.CRMSourceDir == "" {
		return fmt.Errorf("CRM source directory not set")
	}

	ctx.Logf("Deploying YachtCRM-DMS from %s to %s", ctx.CRMSourceDir, ctx.RuntimeDir)
	if err := os.RemoveAll(ctx.RuntimeDir); err != nil {
		return fmt.Errorf("clear runtime directory: %w", err)
	}
	if err := ensureDir(ctx.RuntimeDir); err != nil {
		return fmt.Errorf("create runtime directory: %w", err)
	}
	if err := copyDir(ctx.CRMSourceDir, ctx.RuntimeDir); err != nil {
		return fmt.Errorf("copy CRM source: %w", err)
	}

	// Replace legacy storage symlink with actual directory copy.
	storageSrc := filepath.Join(ctx.RuntimeDir, "backend", "storage", "app", "public")
	storageDest := filepath.Join(ctx.RuntimeDir, "backend", "public", "storage")
	if err := os.RemoveAll(storageDest); err != nil {
		return fmt.Errorf("remove existing storage link: %w", err)
	}
	if dirExists(storageSrc) {
		if err := copyDir(storageSrc, storageDest); err != nil {
			return fmt.Errorf("copy storage public files: %w", err)
		}
	} else {
		if err := ensureDir(storageDest); err != nil {
			return fmt.Errorf("create storage dir: %w", err)
		}
	}

	// Remove legacy httpdocs symlinks copied from Linux deployment.
	httpDocs := filepath.Join(ctx.RuntimeDir, "httpdocs")
	if err := os.RemoveAll(httpDocs); err != nil {
		return fmt.Errorf("remove httpdocs symlink directory: %w", err)
	}

	// Remove node_modules to reduce deployment size (frontend bundle already built).
	nodeModules := filepath.Join(ctx.RuntimeDir, "frontend", "node_modules")
	_ = os.RemoveAll(nodeModules)

	ctx.Logf("YachtCRM-DMS files deployed to %s", ctx.RuntimeDir)
	return nil
}

type ConfigureIIS struct{}

func (ConfigureIIS) Name() string { return "Configure IIS" }

func (s ConfigureIIS) Run(ctx *installer.Context) error {
	backendPath := filepath.Join(ctx.RuntimeDir, "backend", "public")
	frontendPath := filepath.Join(ctx.RuntimeDir, "frontend", "dist")
	if !dirExists(backendPath) {
		return fmt.Errorf("backend public directory not found at %s", backendPath)
	}
	if !dirExists(frontendPath) {
		return fmt.Errorf("frontend dist directory not found at %s", frontendPath)
	}

	poolName := "YachtCRM-DMS"
	siteName := "YachtCRM-DMS"
	phpCgi := filepath.Join(ctx.PhpInstallDir, "php-cgi.exe")
	if !fileExists(phpCgi) {
		return fmt.Errorf("php-cgi.exe not found at %s", phpCgi)
	}

	script := fmt.Sprintf(`Import-Module WebAdministration
$pool = '%s'
if (-not (Test-Path IIS:\AppPools\$pool)) { New-WebAppPool -Name $pool | Out-Null }
Set-ItemProperty IIS:\AppPools\$pool managedRuntimeVersion ""
Set-ItemProperty IIS:\AppPools\$pool managedPipelineMode "Integrated"
Set-ItemProperty IIS:\AppPools\$pool enable32BitAppOnWin64 0
$site = '%s'
$physical = '%s'
if (Get-Website $site -ErrorAction SilentlyContinue) {
    Set-ItemProperty IIS:\Sites\$site physicalPath $physical
    Set-ItemProperty IIS:\Sites\$site applicationPool $pool
} else {
    New-Website -Name $site -Port 80 -PhysicalPath $physical -ApplicationPool $pool | Out-Null
}
$frontendPath = '%s'
if (Get-WebVirtualDirectory -Site $site -Name 'frontend' -ErrorAction SilentlyContinue) {
    Remove-WebVirtualDirectory -Site $site -Name 'frontend'
}
New-WebVirtualDirectory -Site $site -Name 'frontend' -PhysicalPath $frontendPath | Out-Null
$appcmd = Join-Path $env:windir 'system32\\inetsrv\\appcmd.exe'
& $appcmd set config -section:system.webServer/handlers /-"[name='PHP_via_FastCGI']" 2>$null
& $appcmd set config -section:system.webServer/fastCgi /-"[fullPath='%s']" 2>$null
& $appcmd set config -section:system.webServer/fastCgi /+"[fullPath='%s']" /commit:apphost | Out-Null
& $appcmd set config -section:system.webServer/handlers /+"[name='PHP_via_FastCGI',path='*.php',verb='GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS',modules='FastCgiModule',scriptProcessor='%s',resourceType='Either',requireAccess='Script']" /commit:apphost | Out-Null
`, poolName, siteName, backendPath, frontendPath, phpCgi, phpCgi, phpCgi)

	result := powershell.Run(script)
	if result.Err != nil {
		return fmt.Errorf("configure IIS: %w (stderr: %s)", result.Err, result.Stderr)
	}

	// Write web.config files based on templates.
	backendConfigPath := filepath.Join(backendPath, "web.config")
	if err := os.WriteFile(backendConfigPath, []byte(templates.BackendWebConfig), 0o644); err != nil {
		return fmt.Errorf("write backend web.config: %w", err)
	}
	frontendConfigPath := filepath.Join(frontendPath, "web.config")
	if err := os.WriteFile(frontendConfigPath, []byte(templates.FrontendWebConfig), 0o644); err != nil {
		return fmt.Errorf("write frontend web.config: %w", err)
	}

	// Ensure IIS user has write permissions to storage directories.
	storageDirs := []string{
		filepath.Join(ctx.RuntimeDir, "backend", "storage"),
		filepath.Join(ctx.RuntimeDir, "backend", "bootstrap", "cache"),
		filepath.Join(ctx.RuntimeDir, "backend", "storage", "app", "public"),
	}
	for _, dir := range storageDirs {
		if dirExists(dir) {
			cmd := fmt.Sprintf(`icacls "%s" /grant "IIS_IUSRS:(OI)(CI)F" /T`, dir)
			result := powershell.Run(cmd)
			if result.Err != nil {
				ctx.Logf("Warning: failed to set IIS permissions on %s: %v", dir, result.Err)
			}
		}
	}

	ctx.Logf("IIS configured for YachtCRM-DMS")
	return nil
}

type ConfigureEnv struct{}

func (ConfigureEnv) Name() string { return "Configure .env" }

func (s ConfigureEnv) Run(ctx *installer.Context) error {
	examplePath := filepath.Join(ctx.RuntimeDir, "backend", ".env.example")
	envPath := filepath.Join(ctx.RuntimeDir, "backend", ".env")

	data, err := os.ReadFile(examplePath)
	if err != nil {
		return fmt.Errorf("read .env.example: %w", err)
	}

	envLines := strings.Split(string(data), "\n")
	envMap := make(map[string]string)
	order := []string{}
	for _, line := range envLines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := parts[0]
			envMap[key] = parts[1]
			order = append(order, key)
		}
	}

	appURL, err := prompts.AskStringDefault("Application URL", "http://localhost", true)
	if err != nil {
		return err
	}
	frontendURL, err := prompts.AskStringDefault("Frontend URL", "http://localhost/frontend", true)
	if err != nil {
		return err
	}
	dbHost, err := prompts.AskStringDefault("Database host", "127.0.0.1", true)
	if err != nil {
		return err
	}
	dbPort, err := prompts.AskStringDefault("Database port", "3306", true)
	if err != nil {
		return err
	}
	sanctum, err := prompts.AskStringDefault("SANCTUM_STATEFUL_DOMAINS", "localhost,127.0.0.1", true)
	if err != nil {
		return err
	}
	sessionDomain, err := prompts.AskStringDefault("SESSION_DOMAIN", "localhost", true)
	if err != nil {
		return err
	}

	envMap["APP_URL"] = appURL
	envMap["FRONTEND_URL"] = frontendURL
	envMap["DB_HOST"] = dbHost
	envMap["DB_PORT"] = dbPort
	envMap["DB_DATABASE"] = ctx.DatabaseName
	envMap["DB_USERNAME"] = ctx.DatabaseUser
	envMap["DB_PASSWORD"] = ctx.DatabaseUserPassword
	envMap["SANCTUM_STATEFUL_DOMAINS"] = sanctum
	envMap["SESSION_DOMAIN"] = sessionDomain

	builder := &strings.Builder{}
	for _, key := range order {
		if val, ok := envMap[key]; ok {
			builder.WriteString(fmt.Sprintf("%s=%s\n", key, val))
			delete(envMap, key)
		}
	}
	for key, val := range envMap {
		builder.WriteString(fmt.Sprintf("%s=%s\n", key, val))
	}

	if err := os.WriteFile(envPath, []byte(builder.String()), 0o644); err != nil {
		return fmt.Errorf("write .env: %w", err)
	}

	artisanCmd := fmt.Sprintf(`Set-Location '%s'; & '%s' artisan key:generate --force`, filepath.Join(ctx.RuntimeDir, "backend"), ctx.PhpExePath)
	result := powershell.Run(artisanCmd)
	if result.Err != nil {
		ctx.Logf("Warning: artisan key:generate failed: %v", result.Err)
	} else {
		ctx.Logf("Application key generated")
	}

	return nil
}

type SeedDatabase struct{}

func (SeedDatabase) Name() string { return "Seed Database" }

func (s SeedDatabase) Run(ctx *installer.Context) error {
	if ctx.MariaDBBinDir == "" {
		return fmt.Errorf("MariaDB bin directory not known")
	}
	if ctx.SqlDumpPath == "" || !fileExists(ctx.SqlDumpPath) {
		return fmt.Errorf("SQL dump not found at %s", ctx.SqlDumpPath)
	}

	mysqlExe := filepath.Join(ctx.MariaDBBinDir, "mysql.exe")
	if !fileExists(mysqlExe) {
		return fmt.Errorf("mysql.exe not found at %s", mysqlExe)
	}

	ctx.Logf("Importing SQL dump %s", ctx.SqlDumpPath)
	dump, err := os.Open(ctx.SqlDumpPath)
	if err != nil {
		return fmt.Errorf("open SQL dump: %w", err)
	}
	defer dump.Close()

	cmd := exec.Command(mysqlExe, "-u", "root", fmt.Sprintf("--password=%s", ctx.RootMariaDBPassword), ctx.DatabaseName)
	cmd.Stdin = dump
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("mysql import failed: %w (stderr: %s)", err, stderr.String())
	}

	ctx.Logf("Database seeded successfully")
	return nil
}

type CreateAdminUser struct{}

func (CreateAdminUser) Name() string { return "Create Admin User" }

func (s CreateAdminUser) Run(ctx *installer.Context) error {
	if ctx.MariaDBBinDir == "" {
		return fmt.Errorf("MariaDB bin directory not known")
	}
	mysqlExe := filepath.Join(ctx.MariaDBBinDir, "mysql.exe")
	if !fileExists(mysqlExe) {
		return fmt.Errorf("mysql.exe not found at %s", mysqlExe)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(ctx.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash admin password: %w", err)
	}

	name := escapeSQLString(ctx.AdminName)
	email := escapeSQLString(ctx.AdminEmail)
	password := escapeSQLString(string(hash))

	sql := fmt.Sprintf("INSERT INTO users (name,email,password,email_verified_at,remember_token,created_at,updated_at) VALUES ('%s','%s','%s',NOW(),NULL,NOW(),NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), updated_at=NOW();", name, email, password)

	cmd := exec.Command(mysqlExe, "-u", "root", fmt.Sprintf("--password=%s", ctx.RootMariaDBPassword), ctx.DatabaseName, "-e", sql)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("insert admin user failed: %w (stderr: %s)", err, stderr.String())
	}

	ctx.Logf("Admin user %s created/updated", ctx.AdminEmail)
	return nil
}

type ConfigureFirewall struct{}

func (ConfigureFirewall) Name() string { return "Configure Firewall" }

func (s ConfigureFirewall) Run(ctx *installer.Context) error {
	ctx.Logf("[TODO] add Windows firewall rules for HTTP/HTTPS")
	return nil
}
