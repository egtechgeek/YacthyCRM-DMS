package steps

import "yachtcrm-installer/internal/installer"

func All() []installer.Step {
	return []installer.Step{
		CollectInputs{},
		CheckPrerequisites{},
		InstallIISFeatures{},
		InstallPHP{},
		InstallComposer{},
		InstallMariaDB{},
		ConfigureMariaDB{},
		InstallPhpMyAdmin{},
		InstallNode{},
		DeployYachtCRM-DMS{},
		ConfigureIIS{},
		ConfigureEnv{},
		SeedDatabase{},
		CreateAdminUser{},
		ConfigureFirewall{},
	}
}
