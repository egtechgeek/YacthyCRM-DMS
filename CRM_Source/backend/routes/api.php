<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Branding settings (public - for login page and header)
Route::get('/branding', [\App\Http\Controllers\SettingsController::class, 'getBranding']);

// Module settings (public - for navigation)
Route::get('/modules', [\App\Http\Controllers\ModuleController::class, 'index']);

// MFA routes (public for login verification)
Route::post('/mfa/verify-totp-login', [\App\Http\Controllers\MfaController::class, 'verifyLoginTotp']);
Route::post('/mfa/send-email-code', [\App\Http\Controllers\MfaController::class, 'sendEmailCode']);
Route::post('/mfa/verify-email-code', [\App\Http\Controllers\MfaController::class, 'verifyEmailCode']);
Route::post('/mfa/verify-recovery-code', [\App\Http\Controllers\MfaController::class, 'verifyRecoveryCode']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Dashboard
    Route::get('/dashboard/stats', [\App\Http\Controllers\DashboardController::class, 'stats']);
    
    // MFA management routes
    Route::prefix('mfa')->group(function () {
        Route::get('/status', [\App\Http\Controllers\MfaController::class, 'getMfaStatus']);
        Route::post('/setup-totp', [\App\Http\Controllers\MfaController::class, 'setupTotp']);
        Route::post('/verify-totp', [\App\Http\Controllers\MfaController::class, 'verifyTotp']);
        Route::post('/enable-email', [\App\Http\Controllers\MfaController::class, 'enableEmail2fa']);
        Route::post('/disable', [\App\Http\Controllers\MfaController::class, 'disableMfa']);
        Route::post('/regenerate-recovery-codes', [\App\Http\Controllers\MfaController::class, 'regenerateRecoveryCodes']);
    });

    // User management (admin/staff only)
    Route::apiResource('users', \App\Http\Controllers\UserController::class);

    // Customer management
    Route::apiResource('customers', \App\Http\Controllers\CustomerController::class);

    // Yacht management
    Route::apiResource('yachts', \App\Http\Controllers\YachtController::class);

    // Vehicle/RV DMS management
    Route::apiResource('vehicles', \App\Http\Controllers\VehicleController::class);
    Route::apiResource('vehicle-service', \App\Http\Controllers\VehicleServiceController::class);
    Route::apiResource('vehicle-documents', \App\Http\Controllers\VehicleDocumentController::class);

    // Inventory management
    Route::apiResource('parts', \App\Http\Controllers\PartController::class);
    Route::apiResource('services', \App\Http\Controllers\ServiceController::class);
    Route::apiResource('part-categories', \App\Http\Controllers\PartCategoryController::class);

    // Quote management
    Route::apiResource('quotes', \App\Http\Controllers\QuoteController::class);
    Route::get('/quotes/{id}/download-pdf', [\App\Http\Controllers\QuoteController::class, 'downloadPdf']);
    Route::post('/quotes/{id}/convert-to-invoice', [\App\Http\Controllers\QuoteController::class, 'convertToInvoice']);

    // Invoice management
    Route::apiResource('invoices', \App\Http\Controllers\InvoiceController::class);
    Route::get('/invoices/{id}/view', [\App\Http\Controllers\InvoiceController::class, 'view']);
    Route::get('/invoices/{id}/download-pdf', [\App\Http\Controllers\InvoiceController::class, 'downloadPdf']);

    // Payment management
    Route::apiResource('payments', \App\Http\Controllers\PaymentController::class);
    Route::post('/payments/virtual-terminal', [\App\Http\Controllers\VirtualTerminalController::class, 'process']);
    Route::get('/payment-methods', [\App\Http\Controllers\PaymentController::class, 'paymentMethods']);

    // Stripe integration
    Route::post('/stripe/create-payment-intent', [\App\Http\Controllers\StripeController::class, 'createPaymentIntent']);

    // Square integration
    Route::post('/square/create-payment', [\App\Http\Controllers\SquareController::class, 'createPayment']);

    // Email functionality
    Route::get('/email-log', [\App\Http\Controllers\EmailController::class, 'emailLog']);
    Route::post('/emails/send-invoice', [\App\Http\Controllers\EmailController::class, 'sendInvoice']);
    Route::post('/emails/send-invitation', [\App\Http\Controllers\EmailController::class, 'sendInvitation']);
    
    // Email Templates
    Route::get('/email-templates', [\App\Http\Controllers\EmailController::class, 'getTemplates']);
    Route::put('/email-templates/{id}', [\App\Http\Controllers\EmailController::class, 'updateTemplate']);

    // System Settings (Admin only)
    Route::get('/settings', [\App\Http\Controllers\SettingsController::class, 'index']);
    Route::post('/settings', [\App\Http\Controllers\SettingsController::class, 'update']);
    Route::post('/branding', [\App\Http\Controllers\SettingsController::class, 'updateBranding']);
    Route::delete('/branding/logo', [\App\Http\Controllers\SettingsController::class, 'deleteLogo']);
    
    // Module Control (Admin only)
    Route::post('/modules', [\App\Http\Controllers\ModuleController::class, 'update']);
    
    // Navigation Order
    Route::get('/navigation/order', [\App\Http\Controllers\NavigationController::class, 'index']);
    Route::get('/navigation/order/{role}', [\App\Http\Controllers\NavigationController::class, 'getForRole']);
    Route::post('/navigation/order', [\App\Http\Controllers\NavigationController::class, 'updateOrder']);
    
    // Timeclock
    Route::post('/timeclock/clock-in', [\App\Http\Controllers\TimeclockController::class, 'clockIn']);
    Route::post('/timeclock/clock-out', [\App\Http\Controllers\TimeclockController::class, 'clockOut']);
    Route::get('/timeclock/current', [\App\Http\Controllers\TimeclockController::class, 'getCurrentEntry']);
    Route::get('/timeclock/entries', [\App\Http\Controllers\TimeclockController::class, 'index']);
    Route::post('/timeclock/entries/{id}/approve', [\App\Http\Controllers\TimeclockController::class, 'approveEntry']);
    Route::get('/timeclock/export/csv', [\App\Http\Controllers\TimeclockController::class, 'exportCSV']);
    Route::get('/timeclock/export/pdf', [\App\Http\Controllers\TimeclockController::class, 'exportPDF']);
    Route::get('/timeclock/time-off', [\App\Http\Controllers\TimeclockController::class, 'getTimeOffRequests']);
    Route::post('/timeclock/time-off', [\App\Http\Controllers\TimeclockController::class, 'createTimeOffRequest']);
    Route::post('/timeclock/time-off/{id}/review', [\App\Http\Controllers\TimeclockController::class, 'reviewTimeOffRequest']);
    
    // Work Orders
    Route::get('/work-orders', [\App\Http\Controllers\WorkOrderController::class, 'index']);
    Route::get('/work-orders/display-board', [\App\Http\Controllers\WorkOrderController::class, 'displayBoard']);
    Route::get('/work-orders/{id}', [\App\Http\Controllers\WorkOrderController::class, 'show']);
    Route::post('/work-orders', [\App\Http\Controllers\WorkOrderController::class, 'store']);
    Route::put('/work-orders/{id}', [\App\Http\Controllers\WorkOrderController::class, 'update']);
    Route::delete('/work-orders/{id}', [\App\Http\Controllers\WorkOrderController::class, 'destroy']);
    Route::post('/work-orders/{id}/status', [\App\Http\Controllers\WorkOrderController::class, 'updateStatus']);
    Route::post('/work-orders/{id}/convert-to-invoice', [\App\Http\Controllers\WorkOrderController::class, 'convertToInvoice']);
    
    // Customer Assets
    Route::get('/customer/assets', [\App\Http\Controllers\CustomerAssetController::class, 'index']);
    
    // Accounting - Chart of Accounts
    Route::apiResource('accounting/chart-of-accounts', \App\Http\Controllers\ChartOfAccountsController::class);
    Route::post('/accounting/chart-of-accounts/recalculate', [\App\Http\Controllers\ChartOfAccountsController::class, 'recalculateBalances']);
    
    // Accounting - Journal Entries
    Route::apiResource('accounting/journal-entries', \App\Http\Controllers\JournalEntryController::class);
    Route::post('/accounting/journal-entries/{id}/post', [\App\Http\Controllers\JournalEntryController::class, 'post']);
    Route::post('/accounting/journal-entries/{id}/void', [\App\Http\Controllers\JournalEntryController::class, 'void']);
    
    // Accounting - Bank Accounts
    Route::apiResource('accounting/bank-accounts', \App\Http\Controllers\BankAccountController::class);
    
    // Accounting - Vendors
    Route::apiResource('accounting/vendors', \App\Http\Controllers\VendorController::class);
    
    // Accounting - Bills
    Route::apiResource('accounting/bills', \App\Http\Controllers\BillController::class);
    
    // Accounting - Bill Payments
    Route::apiResource('accounting/bill-payments', \App\Http\Controllers\BillPaymentController::class);
    
    // Accounting - Bank Transactions
    Route::apiResource('accounting/bank-transactions', \App\Http\Controllers\BankTransactionController::class);
    Route::post('/accounting/bank-transactions/reconcile', [\App\Http\Controllers\BankTransactionController::class, 'reconcile']);
    Route::post('/accounting/bank-transactions/unreconcile', [\App\Http\Controllers\BankTransactionController::class, 'unreconcile']);
    
    // Accounting - Bank Reconciliation
    Route::get('/accounting/reconciliation/{bankAccountId}', [\App\Http\Controllers\BankReconciliationController::class, 'getReconciliationData']);
    Route::post('/accounting/reconciliation/{bankAccountId}/finish', [\App\Http\Controllers\BankReconciliationController::class, 'finishReconciliation']);
    
    // Accounting - Reports
    Route::get('/accounting/reports/profit-loss', [\App\Http\Controllers\AccountingReportController::class, 'profitAndLoss']);
    Route::get('/accounting/reports/balance-sheet', [\App\Http\Controllers\AccountingReportController::class, 'balanceSheet']);
    Route::get('/accounting/reports/trial-balance', [\App\Http\Controllers\AccountingReportController::class, 'trialBalance']);
    Route::get('/accounting/reports/ar-aging', [\App\Http\Controllers\AccountingReportController::class, 'accountsReceivableAging']);
    Route::get('/accounting/reports/ap-aging', [\App\Http\Controllers\AccountingReportController::class, 'accountsPayableAging']);
    Route::get('/accounting/reports/tax-summary', [\App\Http\Controllers\AccountingReportController::class, 'taxSummary']);
    Route::get('/accounting/summary', [\App\Http\Controllers\AccountingReportController::class, 'summary']);
    
    // Accounting - QuickBooks Import
    Route::post('/accounting/import/chart-of-accounts', [\App\Http\Controllers\QuickBooksImportController::class, 'importChartOfAccounts']);
    Route::post('/accounting/import/customers', [\App\Http\Controllers\QuickBooksImportController::class, 'importCustomers']);
    Route::post('/accounting/import/vendors', [\App\Http\Controllers\QuickBooksImportController::class, 'importVendors']);
    Route::post('/accounting/import/items', [\App\Http\Controllers\QuickBooksImportController::class, 'importItems']);
    Route::post('/accounting/import/bills', [\App\Http\Controllers\QuickBooksImportController::class, 'importBills']);
    Route::post('/accounting/import/invoices', [\App\Http\Controllers\QuickBooksImportController::class, 'importInvoices']);
    Route::post('/accounting/import/estimates', [\App\Http\Controllers\QuickBooksImportController::class, 'importEstimates']);
    Route::post('/accounting/import/payments', [\App\Http\Controllers\QuickBooksImportController::class, 'importPayments']);
    Route::post('/accounting/import/vendor-transactions', [\App\Http\Controllers\QuickBooksImportController::class, 'importVendorTransactions']);
    Route::post('/accounting/import/general-ledger', [\App\Http\Controllers\QuickBooksImportController::class, 'importGeneralLedger']);
    
    // Role & Permissions Management (Admin only)
    Route::get('/roles', [\App\Http\Controllers\RoleController::class, 'index']);
    Route::get('/roles/{roleId}/permissions', [\App\Http\Controllers\RoleController::class, 'getPermissions']);
    Route::get('/roles/permissions-matrix', [\App\Http\Controllers\RoleController::class, 'getPermissionsMatrix']);
    Route::post('/roles/permissions', [\App\Http\Controllers\RoleController::class, 'updatePermissions']);
    Route::post('/roles/permissions/bulk', [\App\Http\Controllers\RoleController::class, 'bulkUpdatePermissions']);
    
    // User role management (Admin only)
    Route::post('/users/{id}/disable-mfa', [\App\Http\Controllers\UserController::class, 'disableMfa']);
    
    // Template Management (Admin only)
    Route::get('/templates', [\App\Http\Controllers\TemplateController::class, 'index']);
    Route::post('/templates', [\App\Http\Controllers\TemplateController::class, 'store']);
    Route::post('/templates/{type}/reset', [\App\Http\Controllers\TemplateController::class, 'reset']);

    // Export (Admin only)
    Route::get('/export', [\App\Http\Controllers\ExportController::class, 'export']);

    // Import (Admin only)
    Route::post('/import/csv', [\App\Http\Controllers\ImportController::class, 'importCSV']);
    Route::post('/import/json', [\App\Http\Controllers\ImportController::class, 'importJSON']);

    // Appointment management
    Route::apiResource('appointments', \App\Http\Controllers\AppointmentController::class);

    // Maintenance management
    Route::get('/maintenance/schedules', [\App\Http\Controllers\MaintenanceController::class, 'schedules']);
    Route::post('/maintenance/schedules', [\App\Http\Controllers\MaintenanceController::class, 'createSchedule']);
    Route::get('/maintenance/history', [\App\Http\Controllers\MaintenanceController::class, 'history']);
    Route::post('/maintenance/generate-appointments', [\App\Http\Controllers\MaintenanceController::class, 'generateAppointments']);
    Route::post('/maintenance/record-completion', [\App\Http\Controllers\MaintenanceController::class, 'recordCompletion']);
});

// Webhook routes (no auth required)
Route::post('/webhooks/stripe', [\App\Http\Controllers\StripeController::class, 'webhook']);
Route::post('/webhooks/square', [\App\Http\Controllers\SquareController::class, 'webhook']);
