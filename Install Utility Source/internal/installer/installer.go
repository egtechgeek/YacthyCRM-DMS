package installer

import (
	"fmt"
)

// Context stores user-provided configuration and derived state that the
// installer steps can share.
type Context struct {
	RuntimeDir            string
	PrerequisitesDir      string
	CRMSourceDir          string
	DownloadsDir          string
	RootMariaDBPassword   string
	DatabaseName          string
	DatabaseUser          string
	DatabaseUserPassword  string
	SqlDumpPath           string
	AdminName             string
	AdminEmail            string
	AdminPassword         string
	PhpInstallDir         string
	PhpIniPath            string
	PhpExePath            string
	ComposerPath          string
	NodeInstallDir        string
	NodeBinDir            string
	PhpMyAdminDir         string
	ComposerInstallerPath string
	MariaDBInstallerPath  string
	NodeZipPath           string
	PhpNtsZipPath         string
	PhpTsZipPath          string
	PhpMyAdminZipPath     string
	MariaDBBinDir         string
	Logs                  []string
}

// Step defines a single installer operation.
type Step interface {
	Name() string
	Run(*Context) error
}

// Runner executes each step sequentially, collecting output and halting on
// the first failure.
type Runner struct {
	steps []Step
}

func NewRunner(steps []Step) *Runner {
	return &Runner{steps: steps}
}

func (r *Runner) Run(ctx *Context) error {
	for _, step := range r.steps {
		ctx.Logf("Starting step: %s", step.Name())
		if err := step.Run(ctx); err != nil {
			return fmt.Errorf("%s failed: %w", step.Name(), err)
		}
		ctx.Logf("Completed step: %s", step.Name())
	}
	return nil
}

func (c *Context) Logf(format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	c.Logs = append(c.Logs, msg)
	fmt.Println(msg)
}
