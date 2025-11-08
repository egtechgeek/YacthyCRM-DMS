<?php

namespace App\Console\Commands;

use App\Http\Controllers\QuickBooksImportController;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class ImportQuickBooksPayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'quickbooks:import-payments {source : Absolute path to the QuickBooks payments CSV file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import customer payments from a QuickBooks CSV export';

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

        $response = $controller->importPayments($request);

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

        $this->info($payload['message'] ?? 'Payments import complete');
        $this->line('Created payments: ' . ($payload['created'] ?? 0));
        $this->line('Skipped rows: ' . ($payload['skipped'] ?? 0));

        if (!empty($payload['errors'])) {
            $this->warn('Notable warnings:');
            foreach ($payload['errors'] as $error) {
                $this->line('- ' . $error);
            }
        }

        return self::SUCCESS;
    }
}

