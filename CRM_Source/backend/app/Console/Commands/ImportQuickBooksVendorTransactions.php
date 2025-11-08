<?php

namespace App\Console\Commands;

use App\Http\Controllers\QuickBooksImportController;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class ImportQuickBooksVendorTransactions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'quickbooks:import-vendor-transactions {source : Absolute path to the QuickBooks Vendor Transactions CSV file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import vendor bills, payments, and expenses from a QuickBooks Vendor Transactions CSV export';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = (string) $this->argument('source');

        if ($path === '' || !is_readable($path)) {
            $this->error('The provided CSV path is not readable: ' . $path);
            return self::FAILURE;
        }

        $uploadedFile = new UploadedFile($path, basename($path), 'text/csv', null, true);

        $request = Request::create('/', 'POST', [], [], ['file' => $uploadedFile]);
        app()->instance('request', $request);

        /** @var QuickBooksImportController $controller */
        $controller = app(QuickBooksImportController::class);

        $response = $controller->importVendorTransactions($request);

        $payload = $response->getData(true);

        if ($response->getStatusCode() >= 400) {
            $this->error($payload['message'] ?? 'Import failed.');
            if (!empty($payload['error'])) {
                $this->error($payload['error']);
            }
            if (!empty($payload['errors'])) {
                foreach ($payload['errors'] as $error) {
                    $this->line('- ' . $error);
                }
            }

            return self::FAILURE;
        }

        $this->info($payload['message'] ?? 'Vendor transactions import complete');
        $this->line('Bills created   : ' . ($payload['bills_created'] ?? 0));
        $this->line('Bills updated   : ' . ($payload['bills_updated'] ?? 0));
        $this->line('Expenses created: ' . ($payload['expenses_created'] ?? 0));
        $this->line('Payments created: ' . ($payload['payments_created'] ?? 0));
        $this->line('Rows skipped    : ' . ($payload['skipped'] ?? 0));

        if (!empty($payload['errors'])) {
            $this->warn('Warnings:');
            foreach ($payload['errors'] as $error) {
                $this->line('- ' . $error);
            }
        }

        return self::SUCCESS;
    }
}


