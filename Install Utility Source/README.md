## YachtCRM-DMS Windows Installer Utility

This Go-based command-line installer guides Windows users through deploying YachtCRM-DMS with IIS, following the requirements captured in:

- `WINDOWS_IIS_SETUP.md`
- `SYSTEM_REQUIREMENTS.md`
- `INSTALLATION_GUIDE.md`

### Current Workflow (WIP)

1. Collect runtime and database credentials from the operator.
2. Validate the staged prerequisites and download missing components.
3. Install IIS roles and required Windows features.
4. Install PHP 8.3 (NTS), configure `php.ini`, and register FastCGI.
5. Install Composer 2.5+.
6. Install MariaDB with the supplied root password and apply recommended settings.
7. Install phpMyAdmin globally under IIS.
8. Install Node.js + npm from the staged archive.
9. Deploy YachtCRM-DMS files from `CRM_Source`, replacing Linux symlinks for Windows compatibility.
10. Configure IIS application pools, sites, and rewrite rules.
11. Generate `.env` from `backend/.env.example` using prompted values.
12. Import the sanitized SQL dump and create the initial admin user.
13. Apply Windows firewall rules for HTTP/HTTPS.

Each step is implemented as a discrete Go struct and executed sequentially. The current code contains scaffolding with TODOs that will be fleshed out to perform the actual automation.

### Project Layout

```
Install Utility Source/
├── cmd/
│   └── installer/
│       └── main.go         # CLI entrypoint
├── internal/
│   ├── installer/          # shared context, step runner, logging
│   ├── prompts/            # console prompt helpers
│   ├── steps/              # individual installation steps (WIP)
│   ├── powershell/         # wrappers for executing PowerShell scripts
│   ├── detectors/          # prerequisite detection logic (to be reused)
│   └── templates/          # embedded config/templates (web.config, env)
└── README.md
```

### Running the Installer (developer preview)

```
go run ./cmd/installer
```

The current implementation is a scaffold; steps log `[TODO]` messages until their automation logic is completed.

### Next Tasks

- Implement each step’s concrete automation (PowerShell invocations, file operations, SQL import).
- Reuse detector logic to validate prerequisites and the local environment.
- Sanitize and bundle the production SQL dump for database seeding.
- Add progress reporting and error recovery across steps.
- Provide packaging tooling to combine the compiled installer with `CRM_Source/` and `Prerequisites/` for distribution.


