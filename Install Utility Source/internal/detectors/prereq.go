package detectors

import (
	"fmt"
	"path/filepath"
	"strings"

	"yachtcrm-installer/internal/powershell"
)

type Status string

const (
	StatusOK      Status = "OK"
	StatusMissing Status = "Missing"
	StatusError   Status = "Error"
)

type DetectionResult struct {
	Name    string
	Status  Status
	Details string
}

func CheckIISInstalled() DetectionResult {
	result := powershell.Run(`(Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole).State`)
	if result.Err != nil {
		return DetectionResult{
			Name:    "IIS Web Server Role",
			Status:  StatusError,
			Details: stderrOrError(result),
		}
	}
	if strings.Contains(strings.ToLower(result.Stdout), "enabled") {
		return DetectionResult{Name: "IIS Web Server Role", Status: StatusOK, Details: "IIS is enabled"}
	}
	return DetectionResult{Name: "IIS Web Server Role", Status: StatusMissing, Details: "IIS is not enabled"}
}

func CheckURLRewrite() DetectionResult {
	// URL Rewrite installs rewrite.dll under system32\inetsrv
	result := powershell.Run(`[IO.File]::Exists("$env:SystemRoot\System32\inetsrv\rewrite.dll")`)
	if result.Err != nil {
		return DetectionResult{Name: "IIS URL Rewrite Module", Status: StatusError, Details: stderrOrError(result)}
	}
	if strings.EqualFold(result.Stdout, "true") {
		return DetectionResult{Name: "IIS URL Rewrite Module", Status: StatusOK, Details: "rewrite.dll detected"}
	}
	return DetectionResult{Name: "IIS URL Rewrite Module", Status: StatusMissing, Details: "rewrite.dll not found"}
}

func CheckPHP() DetectionResult {
	result := powershell.Run(`(Get-Command php -ErrorAction SilentlyContinue).Source`)
	if result.Err != nil {
		return DetectionResult{Name: "PHP 8.x (NTS)", Status: StatusError, Details: stderrOrError(result)}
	}
	if result.Stdout == "" {
		return DetectionResult{Name: "PHP 8.x (NTS)", Status: StatusMissing, Details: "php not in PATH"}
	}
	version := powershell.Run(`php -v`)
	if version.Err != nil {
		return DetectionResult{Name: "PHP 8.x (NTS)", Status: StatusError, Details: stderrOrError(version)}
	}
	if strings.Contains(version.Stdout, " (NTS)") && strings.Contains(version.Stdout, "PHP 8.") {
		return DetectionResult{Name: "PHP 8.x (NTS)", Status: StatusOK, Details: firstLine(version.Stdout)}
	}
	return DetectionResult{Name: "PHP 8.x (NTS)", Status: StatusMissing, Details: "Found php but not NTS 8.x"}
}

func CheckComposer() DetectionResult {
	result := powershell.Run(`(Get-Command composer -ErrorAction SilentlyContinue).Source`)
	if result.Err != nil {
		return DetectionResult{Name: "Composer", Status: StatusError, Details: stderrOrError(result)}
	}
	if result.Stdout == "" {
		return DetectionResult{Name: "Composer", Status: StatusMissing, Details: "composer not in PATH"}
	}
	version := powershell.Run(`composer --version`)
	if version.Err != nil {
		return DetectionResult{Name: "Composer", Status: StatusError, Details: stderrOrError(version)}
	}
	return DetectionResult{Name: "Composer", Status: StatusOK, Details: firstLine(version.Stdout)}
}

func CheckNode() DetectionResult {
	result := powershell.Run(`(Get-Command node -ErrorAction SilentlyContinue).Source`)
	if result.Err != nil {
		return DetectionResult{Name: "Node.js 18/20 LTS", Status: StatusError, Details: stderrOrError(result)}
	}
	if result.Stdout == "" {
		return DetectionResult{Name: "Node.js 18/20 LTS", Status: StatusMissing, Details: "node not in PATH"}
	}
	version := powershell.Run(`node --version`)
	if version.Err != nil {
		return DetectionResult{Name: "Node.js 18/20 LTS", Status: StatusError, Details: stderrOrError(version)}
	}
	return DetectionResult{Name: "Node.js 18/20 LTS", Status: StatusOK, Details: version.Stdout}
}

func CheckNpm() DetectionResult {
	result := powershell.Run(`(Get-Command npm -ErrorAction SilentlyContinue).Source`)
	if result.Err != nil {
		return DetectionResult{Name: "npm", Status: StatusError, Details: stderrOrError(result)}
	}
	if result.Stdout == "" {
		return DetectionResult{Name: "npm", Status: StatusMissing, Details: "npm not in PATH"}
	}
	version := powershell.Run(`npm --version`)
	if version.Err != nil {
		return DetectionResult{Name: "npm", Status: StatusError, Details: stderrOrError(version)}
	}
	return DetectionResult{Name: "npm", Status: StatusOK, Details: version.Stdout}
}

func CheckMySQL() DetectionResult {
	result := powershell.Run(`(Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Select-Object -First 1).Status`)
	if result.Err != nil {
		return DetectionResult{Name: "MySQL/MariaDB", Status: StatusError, Details: stderrOrError(result)}
	}
	if strings.TrimSpace(result.Stdout) == "" {
		return DetectionResult{Name: "MySQL/MariaDB", Status: StatusMissing, Details: "MySQL service not found"}
	}
	return DetectionResult{Name: "MySQL/MariaDB", Status: StatusOK, Details: fmt.Sprintf("Service status: %s", result.Stdout)}
}

func CheckVcRuntime() DetectionResult {
	// Check Visual C++ redistributable install using registry location
	result := powershell.Run(`Get-ChildItem "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" -ErrorAction SilentlyContinue | Get-ItemProperty | Select-Object -ExpandProperty Installed`)
	if result.Err != nil {
		return DetectionResult{Name: "Visual C++ Redistributable", Status: StatusError, Details: stderrOrError(result)}
	}
	if strings.EqualFold(strings.TrimSpace(result.Stdout), "1") {
		return DetectionResult{Name: "Visual C++ Redistributable", Status: StatusOK, Details: "x64 runtime installed"}
	}
	return DetectionResult{Name: "Visual C++ Redistributable", Status: StatusMissing, Details: "Runtime not detected"}
}

func CheckPhpExtensions() DetectionResult {
	cmd := powershell.Run(`php -r "echo implode(',', get_loaded_extensions());"`)
	if cmd.Err != nil {
		return DetectionResult{Name: "Required PHP Extensions", Status: StatusError, Details: stderrOrError(cmd)}
	}
	extensions := strings.Split(cmd.Stdout, ",")
	required := []string{"curl", "fileinfo", "gd", "mbstring", "openssl", "pdo_mysql", "zip", "bcmath"}
	missing := []string{}
	extMap := make(map[string]bool)
	for _, ext := range extensions {
		extMap[strings.ToLower(strings.TrimSpace(ext))] = true
	}
	for _, ext := range required {
		if !extMap[ext] {
			missing = append(missing, ext)
		}
	}
	if len(missing) == 0 {
		return DetectionResult{Name: "Required PHP Extensions", Status: StatusOK, Details: "All required extensions loaded"}
	}
	return DetectionResult{Name: "Required PHP Extensions", Status: StatusMissing, Details: fmt.Sprintf("Missing: %s", strings.Join(missing, ", "))}
}

func AllDetections() []DetectionResult {
	checks := []func() DetectionResult{
		CheckIISInstalled,
		CheckURLRewrite,
		CheckVcRuntime,
		CheckPHP,
		CheckPhpExtensions,
		CheckComposer,
		CheckNode,
		CheckNpm,
		CheckMySQL,
	}

	results := make([]DetectionResult, 0, len(checks))
	for _, fn := range checks {
		results = append(results, fn())
	}
	return results
}

func stderrOrError(res powershell.Result) string {
	if strings.TrimSpace(res.Stderr) != "" {
		return res.Stderr
	}
	if res.Err != nil {
		return res.Err.Error()
	}
	return ""
}

func firstLine(val string) string {
	parts := strings.Split(strings.ReplaceAll(val, "\r\n", "\n"), "\n")
	if len(parts) > 0 {
		return strings.TrimSpace(parts[0])
	}
	return strings.TrimSpace(val)
}

func DefaultInstallPath() string {
	return filepath.Join(`C:\`, `inetpub`, `wwwroot`, `yachtcrm`)
}
