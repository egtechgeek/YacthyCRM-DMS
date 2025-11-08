package main

import (
	"log"

	"yachtcrm-installer/internal/installer"
	"yachtcrm-installer/internal/steps"
)

func main() {
	ctx := &installer.Context{}
	runner := installer.NewRunner(steps.All())

	if err := runner.Run(ctx); err != nil {
		log.Fatalf("Installation failed: %v", err)
	}
}
