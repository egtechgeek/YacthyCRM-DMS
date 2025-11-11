#requires -RunAsAdministrator
<#
.SYNOPSIS
    Interactive, automated installer for YachtCRM-DMS on Windows.

.DESCRIPTION
    This script provisions the Windows prerequisites and deploys YachtCRM-DMS using
    the distribution contained in this repository. It follows the requirements and
    workflow captured in `CRM_Source/docs/new-install.md` and the top-level `README.md`.

    The script performs the following major tasks:
        1. Validates execution context and prerequisite archives.
        2. Installs and configures PHP 8.3 (NTS) for IIS FastCGI.
        3. Installs Composer, Node.js, and MariaDB using the staged installers.
        4. Extracts phpMyAdmin under IIS for administration.
        5. Deploys YachtCRM-DMS backend and frontend sources.
        6. Generates environment files, installs dependencies, builds assets.
        7. Imports the sanitized schema and finalizes Laravel storage links.
        8. (Optional) Registers Windows scheduled task for the Laravel scheduler.

.NOTES
    Run this script from an elevated PowerShell session.
    Example:
        Set-ExecutionPolicy Bypass -Scope Process -Force
        .\install.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipMariaDb,
    [switch]$SkipPhpMyAdmin,
    [switch]$SkipSchedulerTask,
    [switch]$NonInteractive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    Write-Host ''
    Write-Host ('=' * 80)
    Write-Host $Message -ForegroundColor Cyan
    Write-Host ('=' * 80)
}

function Write-SubStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    Write-Host ('[*] ' + $Message) -ForegroundColor Yellow
}

function Write-Success {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    Write-Host ('[OK] ' + $Message) -ForegroundColor Green
}

function Write-WarningMessage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )
    Write-Warning $Message
}

function Confirm-RunAsAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
        throw 'This script must be executed from an elevated PowerShell session (Run as administrator).'
    }
}

function Resolve-RepositoryRoot {
    $scriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
    return (Split-Path -Path $scriptDirectory -Parent)
}

function Read-UserInput {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [string]$Default,
        [switch]$AsSecureString,
        [switch]$AllowEmpty
    )

    if ($NonInteractive.IsPresent) {
        if (-not $Default -and -not $AllowEmpty) {
            throw "NonInteractive mode requires a default value for '$Prompt'."
        }
        if ($AsSecureString) {
            return $Default
        }
        return $Default
    }

    if ($AsSecureString) {
        $secure = Read-Host -Prompt "$Prompt`n> (input hidden)" -AsSecureString
        if (-not $secure -and -not $AllowEmpty) {
            throw "A value for '$Prompt' is required."
        }
        return (New-Object System.Net.NetworkCredential('', $secure)).Password
    }

    if ($Default) {
        $response = Read-Host -Prompt "$Prompt`n> [$Default]"
        if ([string]::IsNullOrWhiteSpace($response)) {
            return $Default
        }
        return $response
    }

    $value = Read-Host -Prompt "$Prompt`n>"
    if ([string]::IsNullOrWhiteSpace($value) -and -not $AllowEmpty) {
        throw "A value for '$Prompt' is required."
    }
    return $value
}

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [switch]$IgnoreExitCode,
        [string]$InputFilePath
    )

    Write-SubStep ("Executing: {0} {1}" -f $FilePath, ($Arguments -join ' '))
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $FilePath
    if ($Arguments) {
        $processInfo.Arguments = ($Arguments -join ' ')
    }
    if ($WorkingDirectory) {
        $processInfo.WorkingDirectory = $WorkingDirectory
    }
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    if ($InputFilePath) {
        $processInfo.RedirectStandardInput = $true
    }
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $null = $process.Start()
    if ($InputFilePath) {
        $inputContent = Get-Content -LiteralPath $InputFilePath -Raw
        $process.StandardInput.Write($inputContent)
        $process.StandardInput.Close()
    }
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($stdout) { Write-Verbose $stdout }
    if ($stderr) { Write-Verbose $stderr }

    if (-not $IgnoreExitCode -and $process.ExitCode -ne 0) {
        throw "Command '$FilePath' exited with code $($process.ExitCode).`nSTDOUT: $stdout`nSTDERR: $stderr"
    }
    return $process.ExitCode
}

function New-ItemIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [string]$ItemType = 'Directory'
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        if ($ItemType -eq 'Directory') {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
        } elseif ($ItemType -eq 'File') {
            New-Item -ItemType File -Path $Path -Force | Out-Null
        } else {
            throw "Unsupported item type '$ItemType'."
        }
    }
}

function Set-PathEnvironmentVariable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathToAdd
    )

    $current = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $paths = $current -split ';' | Where-Object { $_ -and $_.Trim() -ne '' }
    if ($paths -notcontains $PathToAdd) {
        Write-SubStep "Adding '$PathToAdd' to system PATH."
        $updated = ($paths + $PathToAdd) -join ';'
        [Environment]::SetEnvironmentVariable('Path', $updated, 'Machine')
    }

    $processPaths = $env:Path -split ';'
    if ($processPaths -notcontains $PathToAdd) {
        $env:Path = "$PathToAdd;$env:Path"
    }
}

function Update-IniKeyValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $content = Get-Content -LiteralPath $FilePath -Raw
    $escapedKey = [Regex]::Escape($Key)
    $pattern = "^\s*;?\s*$escapedKey\s*=.*$"
    if ($content -match $pattern) {
        $content = [Regex]::Replace($content, $pattern, "$Key = $Value", 'Multiline')
    } else {
        if ($content.Length -gt 0 -and -not $content.EndsWith([Environment]::NewLine)) {
            $content += [Environment]::NewLine
        }
        $content += "$Key = $Value" + [Environment]::NewLine
    }
    Set-Content -LiteralPath $FilePath -Value $content -Encoding Ascii
}

function Enable-PhpExtension {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$ExtensionName
    )

    $content = Get-Content -LiteralPath $FilePath -Raw
    $escaped = [Regex]::Escape("extension=$ExtensionName")
    $pattern = "^\s*;?\s*$escaped\s*$"
    if ($content -match $pattern) {
        $content = [Regex]::Replace($content, $pattern, "extension=$ExtensionName", 'Multiline')
    } else {
        if ($content.Length -gt 0 -and -not $content.EndsWith([Environment]::NewLine)) {
            $content += [Environment]::NewLine
        }
        $content += "extension=$ExtensionName" + [Environment]::NewLine
    }
    Set-Content -LiteralPath $FilePath -Value $content -Encoding Ascii
}

function Update-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [hashtable]$KeyPairs
    )

    $lines = @()
    if (Test-Path -LiteralPath $FilePath) {
        $lines = Get-Content -LiteralPath $FilePath
    }

    foreach ($key in $KeyPairs.Keys) {
        $value = $KeyPairs[$key]
        $updated = $false
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^\s*#") { continue }
            if ($lines[$i] -match "^\s*$($key)\s*=") {
                $lines[$i] = "$key=$value"
                $updated = $true
                break
            }
        }
        if (-not $updated) {
            $lines += "$key=$value"
        }
    }

    Set-Content -LiteralPath $FilePath -Value $lines -Encoding Ascii
}

function Install-PHP {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArchivePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetRoot
    )

    Write-Section 'Installing PHP 8.3 (NTS)'
    New-ItemIfMissing -Path $TargetRoot -ItemType Directory
    $expectedFolderName = 'php-8.3.27-nts-Win32-vs16-x64'
    $phpTarget = Join-Path -Path $TargetRoot -ChildPath $expectedFolderName

    if (-not (Test-Path -LiteralPath $phpTarget)) {
        Expand-Archive -LiteralPath $ArchivePath -DestinationPath $TargetRoot -Force
        if (-not (Test-Path -LiteralPath $phpTarget)) {
            $firstExtracted = Get-ChildItem -LiteralPath $TargetRoot -Directory | Where-Object { $_.Name -like 'php*' } | Select-Object -First 1
            if (-not $firstExtracted) {
                throw "PHP archive was extracted but target directory '$expectedFolderName' could not be located."
            }
            $phpTarget = $firstExtracted.FullName
        } else {
            Write-Success "Extracted PHP to '$phpTarget'."
        }
    } else {
        Write-WarningMessage "PHP destination '$phpTarget' already exists. Skipping extraction."
    }

    $phpIni = Join-Path -Path $phpTarget -ChildPath 'php.ini'
    if (-not (Test-Path -LiteralPath $phpIni)) {
        Copy-Item -LiteralPath (Join-Path $phpTarget 'php.ini-development') -Destination $phpIni -Force
    }

    Update-IniKeyValue -FilePath $phpIni -Key 'extension_dir' -Value (Join-Path $phpTarget 'ext')
    Update-IniKeyValue -FilePath $phpIni -Key 'upload_max_filesize' -Value '64M'
    Update-IniKeyValue -FilePath $phpIni -Key 'post_max_size' -Value '64M'
    Update-IniKeyValue -FilePath $phpIni -Key 'max_execution_time' -Value '120'
    Update-IniKeyValue -FilePath $phpIni -Key 'memory_limit' -Value '512M'
    Update-IniKeyValue -FilePath $phpIni -Key 'cgi.fix_pathinfo' -Value '1'
    Update-IniKeyValue -FilePath $phpIni -Key 'date.timezone' -Value ([TimeZoneInfo]::Local.Id)

    $requiredExtensions = @(
        'bcmath',
        'ctype',
        'fileinfo',
        'gd',
        'intl',
        'mbstring',
        'openssl',
        'pdo_mysql',
        'tokenizer',
        'xml',
        'curl'
    )
    foreach ($extension in $requiredExtensions) {
        Enable-PhpExtension -FilePath $phpIni -ExtensionName $extension
    }

    Set-PathEnvironmentVariable -PathToAdd $phpTarget
    [Environment]::SetEnvironmentVariable('PHPRC', $phpTarget, 'Machine')

    $fastCgiModule = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
    if (Test-Path -LiteralPath $fastCgiModule) {
        $phpExe = Join-Path $phpTarget 'php-cgi.exe'
        $arguments = @(
            'set', 'config', '-section:system.webServer/fastCgi',
            "/+[fullPath='$phpExe', monitorChangesTo='$phpIni']"
        )
        try {
            Invoke-ExternalCommand -FilePath $fastCgiModule -Arguments $arguments -IgnoreExitCode
        } catch {
            Write-WarningMessage "FastCGI registration skipped or already present: $_"
        }
    } else {
        Write-WarningMessage 'IIS appcmd.exe not found. FastCGI mapping must be configured manually.'
    }

    Invoke-ExternalCommand -FilePath (Join-Path $phpTarget 'php.exe') -Arguments @('-v') -IgnoreExitCode
    Write-Success 'PHP installation completed.'
    return $phpTarget
}

function Install-Composer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$InstallerPath
    )

    Write-Section 'Installing Composer'
    if (-not (Test-Path -LiteralPath $InstallerPath)) {
        throw "Composer installer not found at '$InstallerPath'."
    }

    Invoke-ExternalCommand -FilePath $InstallerPath -Arguments @('/VERYSILENT', '/NORESTART')
    $candidatePaths = @(
        'C:\ProgramData\ComposerSetup\bin\composer.exe',
        'C:\Program Files\Composer\composer.exe',
        'C:\Program Files\ComposerSetup\bin\composer.exe'
    )
    $composerExe = $candidatePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $composerExe) {
        Write-WarningMessage 'Composer executable not located in the default installation path. Ensure composer is accessible via PATH.'
        return $null
    }

    $composerDir = Split-Path $composerExe -Parent
    Set-PathEnvironmentVariable -PathToAdd $composerDir
    Invoke-ExternalCommand -FilePath $composerExe -Arguments @('--version') -IgnoreExitCode
    Write-Success 'Composer installation completed.'
    return $composerExe
}

function Install-Node {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArchivePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetRoot
    )

    Write-Section 'Installing Node.js'
    New-ItemIfMissing -Path $TargetRoot -ItemType Directory
    $nodeTarget = Join-Path -Path $TargetRoot -ChildPath 'node-v22.21.1-win-x64'
    if (-not (Test-Path -LiteralPath $nodeTarget)) {
        Expand-Archive -LiteralPath $ArchivePath -DestinationPath $TargetRoot -Force
        Write-Success "Extracted Node.js to '$nodeTarget'."
    } else {
        Write-WarningMessage "Node.js destination '$nodeTarget' already exists. Skipping extraction."
    }

    $nodeBin = $nodeTarget
    Set-PathEnvironmentVariable -PathToAdd $nodeBin
    $nodeExe = Join-Path $nodeBin 'node.exe'
    $npmCmd = Join-Path $nodeBin 'npm.cmd'
    Invoke-ExternalCommand -FilePath $nodeExe -Arguments @('--version') -IgnoreExitCode
    Invoke-ExternalCommand -FilePath $npmCmd -Arguments @('--version') -IgnoreExitCode
    Write-Success 'Node.js installation completed.'
    return @{
        NodeDir = $nodeBin
        NodeExe = $nodeExe
        NpmCmd  = $npmCmd
        NpxCmd  = Join-Path $nodeBin 'npx.cmd'
    }
}

function Install-MariaDb {
    param(
        [Parameter(Mandatory = $true)]
        [string]$MsiPath,
        [Parameter(Mandatory = $true)]
        [SecureString]$RootPassword,
        [string]$ServiceName = 'MariaDB',
        [int]$Port = 3306
    )

    Write-Section 'Installing MariaDB'
    if (-not (Test-Path -LiteralPath $MsiPath)) {
        throw "MariaDB installer not found at '$MsiPath'."
    }

    $plainRootPassword = (New-Object System.Net.NetworkCredential('', $RootPassword)).Password

    $arguments = @(
        '/i', "`"$MsiPath`"",
        '/qn', '/norestart',
        "SERVICENAME=$ServiceName",
        "PORT=$Port",
        "PASSWORD=$plainRootPassword",
        "ENABLE_TCPIP=1",
        "DBROOTPASS=$plainRootPassword",
        "ADDLOCAL=All"
    )
    Invoke-ExternalCommand -FilePath 'msiexec.exe' -Arguments $arguments

    Start-Sleep -Seconds 5
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -ne 'Running') {
        Start-Service -Name $ServiceName
    }

    $possibleDirs = @(
        (Join-Path $env:ProgramFiles 'MariaDB 11.8\bin'),
        (Join-Path $env:ProgramFiles 'MariaDB 10.6\bin'),
        (Join-Path $env:ProgramFiles 'MariaDB 11.9\bin'),
        (Join-Path ${env:ProgramFiles(x86)} 'MariaDB 11.8\bin')
    ) + (Get-ChildItem -Path $env:ProgramFiles -Directory -Filter 'MariaDB *' -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName 'bin' })
    $mysqlBin = $possibleDirs | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $mysqlBin) {
        Write-WarningMessage 'MariaDB bin directory not found in default locations. Provide mysql.exe path manually when prompted.'
        return $null
    }
    Set-PathEnvironmentVariable -PathToAdd $mysqlBin
    Write-Success 'MariaDB installation completed.'
    return $mysqlBin
}

function Install-PhpMyAdmin {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArchivePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    Write-Section 'Deploying phpMyAdmin'
    New-ItemIfMissing -Path (Split-Path $TargetPath -Parent) -ItemType Directory
    if (Test-Path -LiteralPath $TargetPath) {
        Write-WarningMessage "phpMyAdmin target '$TargetPath' already exists. Skipping extraction."
        return
    }
    Expand-Archive -LiteralPath $ArchivePath -DestinationPath (Split-Path $TargetPath -Parent) -Force
    $extracted = Join-Path (Split-Path $TargetPath -Parent) 'phpMyAdmin-5.2.3-all-languages'
    if (Test-Path -LiteralPath $extracted) {
        Rename-Item -LiteralPath $extracted -NewName (Split-Path $TargetPath -Leaf) -Force
    }
    Write-Success "phpMyAdmin deployed to '$TargetPath'."
}

function Copy-YachtCrmFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceRoot,
        [Parameter(Mandatory = $true)]
        [string]$DestinationRoot
    )

    Write-Section 'Deploying YachtCRM-DMS Files'
    if (-not (Test-Path -LiteralPath $SourceRoot)) {
        throw "CRM source directory not found at '$SourceRoot'."
    }
    New-ItemIfMissing -Path $DestinationRoot -ItemType Directory

    Write-SubStep "Copying files from '$SourceRoot' to '$DestinationRoot'."
    robocopy $SourceRoot $DestinationRoot /MIR /XD '.git' 'node_modules' 'vendor' 'dist' | Out-Null
    Write-Success 'YachtCRM-DMS files copied.'
}

function Set-EnvFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackendPath,
        [Parameter(Mandatory = $true)]
        [string]$FrontendPath,
        [Parameter(Mandatory = $true)]
        [string]$AppName,
        [Parameter(Mandatory = $true)]
        [string]$AppUrl,
        [Parameter(Mandatory = $true)]
        [hashtable]$DatabaseSettings
    )

    Write-Section 'Configuring Environment Files'
    $envExample = Join-Path $BackendPath '.env.example'
    $envPath = Join-Path $BackendPath '.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        Copy-Item -LiteralPath $envExample -Destination $envPath -Force
    }

    $envValues = @{
        'APP_NAME'    = "`"$AppName`""
        'APP_URL'     = $AppUrl
        'DB_CONNECTION' = 'mysql'
        'DB_HOST'     = $DatabaseSettings.DBHost
        'DB_PORT'     = $DatabaseSettings.DBPort
        'DB_DATABASE' = $DatabaseSettings.DBName
        'DB_USERNAME' = $DatabaseSettings.DBUser
        'DB_PASSWORD' = $DatabaseSettings.DBPassword
    }
    Update-EnvFile -FilePath $envPath -KeyPairs $envValues

    $frontendEnv = Join-Path $FrontendPath '.env'
    $frontendValues = @{
        'VITE_API_BASE_URL' = "$AppUrl/backend/api"
    }
    Update-EnvFile -FilePath $frontendEnv -KeyPairs $frontendValues
    Write-Success 'Environment files configured.'
}

function Install-BackendDependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackendPath,
        [Parameter(Mandatory = $true)]
        [string]$ComposerPath,
        [Parameter(Mandatory = $true)]
        [string]$PhpPath
    )

    Write-Section 'Installing Backend Dependencies'
    Invoke-ExternalCommand -FilePath $ComposerPath -Arguments @('install', '--no-dev', '--prefer-dist', '--optimize-autoloader') -WorkingDirectory $BackendPath
    Invoke-ExternalCommand -FilePath $PhpPath -Arguments @('artisan', 'key:generate', '--force') -WorkingDirectory $BackendPath
    Invoke-ExternalCommand -FilePath $PhpPath -Arguments @('artisan', 'storage:link') -WorkingDirectory $BackendPath -IgnoreExitCode
    Write-Success 'Backend configured.'
}

function Install-FrontendDependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FrontendPath,
        [Parameter(Mandatory = $true)]
        [string]$NpmPath
    )

    Write-Section 'Installing Frontend Dependencies'
    Invoke-ExternalCommand -FilePath $NpmPath -Arguments @('ci') -WorkingDirectory $FrontendPath
    Invoke-ExternalCommand -FilePath $NpmPath -Arguments @('run', 'build') -WorkingDirectory $FrontendPath
    Write-Success 'Frontend build completed.'
}

function Import-DatabaseSchema {
    param(
        [Parameter(Mandatory = $true)]
        [string]$MysqlExe,
        [Parameter(Mandatory = $true)]
        [string]$SchemaPath,
        [Parameter(Mandatory = $true)]
        [hashtable]$DatabaseSettings
    )

    Write-Section 'Importing Database Schema'
    if (-not (Test-Path -LiteralPath $SchemaPath)) {
        throw "Schema file not found at '$SchemaPath'."
    }

    if (-not (Test-Path -LiteralPath $MysqlExe)) {
        throw "mysql.exe not found at '$MysqlExe'. Ensure MariaDB bin directory is provided."
    }

    $tempSql = [System.IO.Path]::GetTempFileName()
    try {
        $header = "CREATE DATABASE IF NOT EXISTS `$($DatabaseSettings.DBName)` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        $header += [Environment]::NewLine + "USE `$($DatabaseSettings.DBName)`;" + [Environment]::NewLine
        Set-Content -LiteralPath $tempSql -Value $header -Encoding Ascii
        Add-Content -LiteralPath $tempSql -Value (Get-Content -LiteralPath $SchemaPath -Raw)

        $arguments = @(
            "-h", $DatabaseSettings.DBHost,
            "-P", $DatabaseSettings.DBPort,
            "-u", $DatabaseSettings.DBUser,
            "-p$($DatabaseSettings.DBPassword)"
        )
        Invoke-ExternalCommand -FilePath $MysqlExe -Arguments $arguments -InputFilePath $tempSql
        Write-Success 'Database schema imported.'
    } finally {
        Remove-Item -LiteralPath $tempSql -ErrorAction SilentlyContinue
    }
}

function Register-SchedulerTask {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TaskName,
        [Parameter(Mandatory = $true)]
        [string]$PhpExecutable,
        [Parameter(Mandatory = $true)]
        [string]$BackendPath
    )

    Write-Section 'Configuring Laravel Scheduler (Windows Task)'
    $command = "`"$PhpExecutable`" `"$BackendPath\artisan`" schedule:run"
    $existing = schtasks /Query /TN $TaskName /FO LIST /V 2>$null
    if ($LASTEXITCODE -eq 0 -and $existing) {
        Write-WarningMessage "Scheduler task '$TaskName' already exists. Skipping creation."
        return
    }

    $arguments = @(
        '/Create',
        '/SC', 'MINUTE',
        '/MO', '1',
        '/TN', "`"$TaskName`"",
        '/TR', "`"$command`"",
        '/RU', 'SYSTEM',
        '/RL', 'HIGHEST'
    )
    Invoke-ExternalCommand -FilePath 'schtasks.exe' -Arguments $arguments
    Write-Success "Created Windows Task '$TaskName' to run every minute."
}

# --- Main execution flow ---

Confirm-RunAsAdministrator

$repoRoot = Resolve-RepositoryRoot
$prereqRoot = Join-Path $repoRoot 'Install Packages\Windows\Prerequisites'
$crmSourceRoot = Join-Path $repoRoot 'CRM_Source'

$phpArchive = Join-Path $prereqRoot 'php-8.3.27-nts-Win32-vs16-x64.zip'
$composerInstaller = Join-Path $prereqRoot 'Composer-Setup.exe'
$mariaDbMsi = Join-Path $prereqRoot 'mariadb-11.8.4-winx64.msi'
$nodeArchive = Join-Path $prereqRoot 'node-v22.21.1-win-x64.zip'
$phpMyAdminArchive = Join-Path $prereqRoot 'phpMyAdmin-5.2.3-all-languages.zip'
$schemaPath = Join-Path $crmSourceRoot 'sql\yachtcrm_schema_new_install.sql'

foreach ($path in @($phpArchive, $composerInstaller, $nodeArchive)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required prerequisite '$path' is missing."
    }
}
if (-not $SkipMariaDb.IsPresent -and -not (Test-Path -LiteralPath $mariaDbMsi)) {
    throw "MariaDB installer missing at '$mariaDbMsi'. Supply the MSI or rerun with -SkipMariaDb."
}
if (-not $SkipPhpMyAdmin.IsPresent -and -not (Test-Path -LiteralPath $phpMyAdminArchive)) {
    Write-WarningMessage "phpMyAdmin archive not found. The phpMyAdmin step will be skipped."
    $SkipPhpMyAdmin = $true
}

$toolsRootDefault = 'C:\Tools\YachtCRM'
$installRootDefault = 'C:\inetpub\wwwroot\YachtCRM-DMS'
$appUrlDefault = 'https://your-domain.com'
$dbHostDefault = '127.0.0.1'
$dbPortDefault = '3306'
$dbNameDefault = 'yachtcrm'
$dbUserDefault = 'yachtcrm'

$toolsRoot = Read-UserInput -Prompt 'Enter the tooling install directory for PHP/Node (will be created if needed)' -Default $toolsRootDefault
$installRoot = Read-UserInput -Prompt 'Enter the target directory where YachtCRM-DMS should be deployed' -Default $installRootDefault
$appName = Read-UserInput -Prompt 'Enter the application display name' -Default 'YachtCRM-DMS'
$appUrl = Read-UserInput -Prompt 'Enter the public application URL (without trailing slash)' -Default $appUrlDefault

$dbHost = Read-UserInput -Prompt 'Database host' -Default $dbHostDefault
$dbPort = Read-UserInput -Prompt 'Database port' -Default $dbPortDefault
$dbName = Read-UserInput -Prompt 'Database name (will be created if needed)' -Default $dbNameDefault
$dbUser = Read-UserInput -Prompt 'Database username' -Default $dbUserDefault
$dbPassword = Read-UserInput -Prompt 'Database user password' -AsSecureString
$dbRootPassword = $null

if (-not $SkipMariaDb.IsPresent) {
    $dbRootPassword = Read-UserInput -Prompt 'MariaDB root password to configure (will be set during install)' -AsSecureString
    if (-not $dbRootPassword) {
        throw 'MariaDB root password is required unless -SkipMariaDb is specified.'
    }
}
if (-not $dbPassword) {
    $dbPassword = $dbRootPassword
}

$databaseSettings = @{
    DBHost     = $dbHost
    DBPort     = $dbPort
    DBName     = $dbName
    DBUser     = $dbUser
    DBPassword = $dbPassword
}

$phpDir = Install-PHP -ArchivePath $phpArchive -TargetRoot $toolsRoot
$phpExePath = Join-Path $phpDir 'php.exe'
$composerPath = Install-Composer -InstallerPath $composerInstaller
if (-not $composerPath) {
    throw 'Composer installation did not return a valid executable path. Ensure Composer is installed and reachable.'
}
$nodeInfo = Install-Node -ArchivePath $nodeArchive -TargetRoot $toolsRoot
$npmPath = $nodeInfo.NpmCmd

$mysqlBinPath = $null
if (-not $SkipMariaDb.IsPresent) {
    $rootPasswordSecure = ConvertTo-SecureString $dbRootPassword -AsPlainText -Force
    $mysqlBinPath = Install-MariaDb -MsiPath $mariaDbMsi -RootPassword $rootPasswordSecure
} else {
    $mysqlBinPath = Read-UserInput -Prompt 'Enter the path to the MariaDB/MySQL bin directory (contains mysql.exe)' -Default 'C:\Program Files\MariaDB 11.8\bin'
}
if (-not $mysqlBinPath) {
    $mysqlBinPath = 'C:\Program Files\MariaDB 11.8\bin'
}
$mysqlExePath = Join-Path $mysqlBinPath 'mysql.exe'

if (-not $SkipPhpMyAdmin.IsPresent) {
    $phpMyAdminTarget = Join-Path $installRoot 'phpMyAdmin'
    Install-PhpMyAdmin -ArchivePath $phpMyAdminArchive -TargetPath $phpMyAdminTarget
}

Copy-YachtCrmFiles -SourceRoot $crmSourceRoot -DestinationRoot $installRoot

$backendPath = Join-Path $installRoot 'backend'
$frontendPath = Join-Path $installRoot 'frontend'
Set-EnvFiles -BackendPath $backendPath -FrontendPath $frontendPath -AppName $appName -AppUrl $appUrl -DatabaseSettings $databaseSettings

Install-BackendDependencies -BackendPath $backendPath -ComposerPath $composerPath -PhpPath $phpExePath
Install-FrontendDependencies -FrontendPath $frontendPath -NpmPath $npmPath

if ((-not $SkipMariaDb.IsPresent) -and (Test-Path -LiteralPath $schemaPath)) {
    Import-DatabaseSchema -MysqlExe $mysqlExePath -SchemaPath $schemaPath -DatabaseSettings $databaseSettings
} elseif (-not (Test-Path -LiteralPath $schemaPath)) {
    Write-WarningMessage "Schema file not found at '$schemaPath'. Database import skipped."
} else {
    Write-WarningMessage 'MariaDB installation skipped; ensure the schema is imported manually.'
}

if (-not $SkipSchedulerTask.IsPresent) {
    Register-SchedulerTask -TaskName 'YachtCRM Artisan Scheduler' -PhpExecutable $phpExePath -BackendPath $backendPath
} else {
    Write-WarningMessage 'Scheduler task registration skipped.'
}

Write-Section 'Installation Complete'
Write-Host 'Next Steps:' -ForegroundColor Cyan
Write-Host "- Confirm IIS site points front-end root to 'frontend\dist' and backend API to 'backend\public'." -ForegroundColor Gray
Write-Host "- Restart IIS: iisreset" -ForegroundColor Gray
Write-Host "- Verify the application loads at: $appUrl" -ForegroundColor Gray
Write-Host "- Configure queue workers if using Laravel queues (php artisan queue:work)." -ForegroundColor Gray
Write-Success 'YachtCRM-DMS installation workflow finished.'

