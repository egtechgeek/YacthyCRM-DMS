package steps

import (
	"fmt"
	"os"
	"path/filepath"

	"yachtcrm-installer/internal/installer"
	"yachtcrm-installer/internal/prompts"
)

type CollectInputs struct{}

func (CollectInputs) Name() string { return "Collect Inputs" }

func (CollectInputs) Run(ctx *installer.Context) error {
	runtimeDir, err := prompts.AskString("Enter the YachtCRM-DMS runtime directory", true)
	if err != nil {
		return err
	}
	runtimeDir = filepath.Clean(runtimeDir)
	if !filepath.IsAbs(runtimeDir) {
		cwd, _ := os.Getwd()
		runtimeDir = filepath.Join(cwd, runtimeDir)
	}
	ctx.RuntimeDir = runtimeDir

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("determine executable path: %w", err)
	}
	exeDir := filepath.Dir(exePath)

	if ctx.PrerequisitesDir == "" {
		ctx.PrerequisitesDir = filepath.Join(exeDir, "Prerequisites")
	}
	ctx.PrerequisitesDir = filepath.Clean(ctx.PrerequisitesDir)

	if ctx.CRMSourceDir == "" {
		ctx.CRMSourceDir = filepath.Join(exeDir, "CRM_Source")
	}
	ctx.CRMSourceDir = filepath.Clean(ctx.CRMSourceDir)

	downloadsDir := filepath.Join(exeDir, "downloads")
	ctx.DownloadsDir = downloadsDir

	phpDir, err := prompts.AskStringDefault("Enter PHP installation directory", "C:\\PHP", true)
	if err != nil {
		return err
	}
	phpDir, err = abs(phpDir)
	if err != nil {
		return fmt.Errorf("resolve PHP directory: %w", err)
	}
	ctx.PhpInstallDir = phpDir
	ctx.PhpIniPath = filepath.Join(ctx.PhpInstallDir, "php.ini")
	ctx.PhpExePath = filepath.Join(ctx.PhpInstallDir, "php.exe")

	nodeDir, err := prompts.AskStringDefault("Enter Node.js installation directory", "C:\\nodejs", true)
	if err != nil {
		return err
	}
	nodeDir, err = abs(nodeDir)
	if err != nil {
		return fmt.Errorf("resolve Node.js directory: %w", err)
	}
	ctx.NodeInstallDir = nodeDir
	ctx.NodeBinDir = nodeDir

	pmaDir, err := prompts.AskStringDefault("Enter phpMyAdmin installation directory", "C:\\inetpub\\wwwroot\\phpMyAdmin", true)
	if err != nil {
		return err
	}
	pmaDir, err = abs(pmaDir)
	if err != nil {
		return fmt.Errorf("resolve phpMyAdmin directory: %w", err)
	}
	ctx.PhpMyAdminDir = pmaDir

	sqlPath, err := prompts.AskString("Enter path to sanitized YachtCRM-DMS SQL dump", true)
	if err != nil {
		return err
	}
	sqlPath, err = abs(sqlPath)
	if err != nil {
		return fmt.Errorf("resolve SQL dump path: %w", err)
	}
	ctx.SqlDumpPath = sqlPath

	rootPwd, err := prompts.AskPassword("Enter MariaDB root password to configure")
	if err != nil {
		return err
	}
	ctx.RootMariaDBPassword = rootPwd

	dbName, err := prompts.AskString("Enter YachtCRM-DMS database name", true)
	if err != nil {
		return err
	}
	ctx.DatabaseName = dbName

	dbUser, err := prompts.AskString("Enter YachtCRM-DMS database username", true)
	if err != nil {
		return err
	}
	ctx.DatabaseUser = dbUser

	dbUserPwd, err := prompts.AskPassword("Enter password for YachtCRM-DMS database user")
	if err != nil {
		return err
	}
	ctx.DatabaseUserPassword = dbUserPwd

	adminName, err := prompts.AskString("Enter name for initial YachtCRM-DMS admin user", true)
	if err != nil {
		return err
	}
	ctx.AdminName = adminName

	adminEmail, err := prompts.AskString("Enter email for initial YachtCRM-DMS admin user", true)
	if err != nil {
		return err
	}
	ctx.AdminEmail = adminEmail

	adminPass, err := prompts.AskPassword("Enter password for initial YachtCRM-DMS admin user")
	if err != nil {
		return err
	}
	ctx.AdminPassword = adminPass

	ctx.Logf("Runtime directory set to %s", ctx.RuntimeDir)
	ctx.Logf("Prerequisites directory defaulting to %s", ctx.PrerequisitesDir)
	ctx.Logf("CRM_Source directory defaulting to %s", ctx.CRMSourceDir)
	ctx.Logf("Downloads directory set to %s", ctx.DownloadsDir)
	ctx.Logf("PHP will be installed to %s", ctx.PhpInstallDir)
	ctx.Logf("Node.js will be installed to %s", ctx.NodeInstallDir)
	ctx.Logf("phpMyAdmin will be installed to %s", ctx.PhpMyAdminDir)
	ctx.Logf("SQL dump located at %s", ctx.SqlDumpPath)
	ctx.Logf("MariaDB database %s with user %s will be created", ctx.DatabaseName, ctx.DatabaseUser)
	ctx.Logf("Admin user %s <%s> will be provisioned", ctx.AdminName, ctx.AdminEmail)

	return nil
}

func (CollectInputs) String() string {
	return fmt.Sprintf("CollectInputs step")
}
