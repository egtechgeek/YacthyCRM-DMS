package powershell

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

type Result struct {
	Stdout string
	Stderr string
	Err    error
}

func Run(command string) Result {
	// We wrap the command so that multi-line scripts are supported.
	script := fmt.Sprintf("& { %s }", command)
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	return Result{
		Stdout: strings.TrimSpace(stdout.String()),
		Stderr: strings.TrimSpace(stderr.String()),
		Err:    err,
	}
}
