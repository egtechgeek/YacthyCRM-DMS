# QuickBooks Import Fix – File & Schema Checklist

Use this reference when applying the same QuickBooks import fixes to another YachtCRM-DMS instance. It lists every file created or modified, along with the relevant database considerations.

## Backend

- `app/Support/QuickBooksCsvParser.php` *(new)* – shared CSV parser that normalises QuickBooks Desktop exports.
- `app/Http/Controllers/QuickBooksImportController.php` *(replaced)* – complete rewrite to use the parser, hydrate accounts/customers/vendors properly, and add invoice/estimate imports.
- `routes/api.php` *(updated)* – registered new endpoints:
  - `POST /api/accounting/import/invoices`
  - `POST /api/accounting/import/estimates`
  - retained/updated existing import routes to point at the new controller logic.

## Frontend

- `frontend/src/pages/accounting/QuickBooksImport.jsx` *(updated)* – surface new import types (Invoices/Estimates), refresh column guidance, and adjust instructions. Rebuild the bundle after syncing this change.

## Documentation

- `docs/quickbooks-import.md` *(new)* – functional notes covering parser behaviour, field mappings, and workflow.
- `docs/quickbooks-import-change-log.md` *(this file)* – deployment checklist for other instances.

## Database Schema

- **No migrations or schema changes** were required. The importer operates on existing tables:
  - `chart_of_accounts`
  - `customers`
  - `vendors`
  - `parts`
  - `services`
  - `invoices` / `invoice_items`
  - `quotes` / `quote_items`

Ensure these tables exist (they are part of the standard YachtCRM-DMS schema). No additional columns were added.

## Deployment Steps (summary)

1. Copy/replace the backend files listed above.
2. Update `routes/api.php` with the new import routes.
3. Sync the frontend component update and run `npm run build` in the deployed frontend directory.
4. Copy the documentation files if desired.
5. Optionally clear/rebuild caches (`php artisan config:clear`, `php artisan route:cache`, etc.).

With these changes applied, the target instance will match the QuickBooks import behaviour deployed here.

