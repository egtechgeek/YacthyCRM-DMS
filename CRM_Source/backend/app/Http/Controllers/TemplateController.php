<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;

class TemplateController extends Controller
{
    /**
     * Get all templates
     */
    public function index()
    {
        $invoiceTemplate = $this->getTemplate('invoice');
        $quoteTemplate = $this->getTemplate('quote');

        return response()->json([
            'invoice' => $invoiceTemplate,
            'quote' => $quoteTemplate,
        ], 200);
    }

    /**
     * Save a template
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => ['required', 'in:invoice,quote'],
            'content' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $type = $request->type;
        $content = $request->content;

        // Determine file path
        $directory = $type === 'invoice' ? 'invoices' : 'quotes';
        $filePath = resource_path("views/{$directory}/show.blade.php");

        try {
            // Create backup of current template
            if (File::exists($filePath)) {
                $backupPath = resource_path("views/{$directory}/show.backup." . time() . ".blade.php");
                File::copy($filePath, $backupPath);

                // Keep only last 5 backups
                $this->cleanupBackups($directory);
            }

            // Save new template
            File::put($filePath, $content);

            return response()->json([
                'message' => 'Template saved successfully',
                'type' => $type
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset template to default
     */
    public function reset($type)
    {
        if (!in_array($type, ['invoice', 'quote'])) {
            return response()->json(['message' => 'Invalid template type'], 422);
        }

        $directory = $type === 'invoice' ? 'invoices' : 'quotes';
        $filePath = resource_path("views/{$directory}/show.blade.php");
        $defaultTemplate = $this->getDefaultTemplate($type);

        try {
            // Create backup before reset
            if (File::exists($filePath)) {
                $backupPath = resource_path("views/{$directory}/show.backup." . time() . ".blade.php");
                File::copy($filePath, $backupPath);
            }

            // Write default template
            File::put($filePath, $defaultTemplate);

            return response()->json([
                'message' => 'Template reset to default successfully',
                'type' => $type
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to reset template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get template content
     */
    private function getTemplate($type)
    {
        $directory = $type === 'invoice' ? 'invoices' : 'quotes';
        $filePath = resource_path("views/{$directory}/show.blade.php");

        if (File::exists($filePath)) {
            return File::get($filePath);
        }

        // Return default template if file doesn't exist
        return $this->getDefaultTemplate($type);
    }

    /**
     * Get default template
     */
    private function getDefaultTemplate($type)
    {
        if ($type === 'invoice') {
            return $this->getDefaultInvoiceTemplate();
        } else {
            return $this->getDefaultQuoteTemplate();
        }
    }

    /**
     * Clean up old backups (keep only last 5)
     */
    private function cleanupBackups($directory)
    {
        $backupDir = resource_path("views/{$directory}");
        $backups = glob($backupDir . '/show.backup.*.blade.php');

        if (count($backups) > 5) {
            // Sort by modification time (oldest first)
            usort($backups, function($a, $b) {
                return filemtime($a) - filemtime($b);
            });

            // Delete oldest backups, keep only 5 newest
            $toDelete = array_slice($backups, 0, count($backups) - 5);
            foreach ($toDelete as $backup) {
                File::delete($backup);
            }
        }
    }

    /**
     * Default Invoice Template
     */
    private function getDefaultInvoiceTemplate()
    {
        // Return the current template content as default
        return File::get(resource_path('views/invoices/show.blade.php'));
    }

    /**
     * Default Quote Template
     */
    private function getDefaultQuoteTemplate()
    {
        // Return the current template content as default
        return File::get(resource_path('views/quotes/show.blade.php'));
    }
}

