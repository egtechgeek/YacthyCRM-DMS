<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\User;
use App\Models\Customer;
use App\Models\EmailTemplate;
use App\Models\EmailLog;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class EmailService
{
    /**
     * Send invoice email
     */
    public function sendInvoiceEmail(Invoice $invoice)
    {
        $template = EmailTemplate::where('type', 'invoice')->where('active', true)->first();
        
        $subject = $template ? $template->subject : 'Invoice #' . $invoice->invoice_number;
        $body = $template ? $this->replacePlaceholders($template->body, $invoice) : 'Please find your invoice attached.';

        try {
            Mail::send('emails.invoice', [
                'invoice' => $invoice,
                'body' => $body,
            ], function ($message) use ($invoice, $subject) {
                $message->to($invoice->customer->email, $invoice->customer->name)
                        ->subject($subject)
                        ->attachData($this->generateInvoicePdf($invoice), 'invoice_' . $invoice->invoice_number . '.pdf', [
                            'mime' => 'application/pdf',
                        ]);
            });

            EmailLog::create([
                'recipient_email' => $invoice->customer->email,
                'subject' => $subject,
                'type' => 'invoice',
                'status' => 'sent',
                'invoice_id' => $invoice->id,
                'sent_at' => now(),
            ]);

            $invoice->update(['status' => 'sent']);

            return true;
        } catch (\Exception $e) {
            EmailLog::create([
                'recipient_email' => $invoice->customer->email,
                'subject' => $subject,
                'type' => 'invoice',
                'status' => 'failed',
                'invoice_id' => $invoice->id,
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Send customer invitation
     */
    public function sendCustomerInvitation(Customer $customer, $password)
    {
        $template = EmailTemplate::where('type', 'invitation')->where('active', true)->first();
        
        $subject = $template ? $template->subject : 'Welcome to Captain Ellenbogen Yacht Management CRM';
        $body = $template ? $this->replaceInvitationPlaceholders($template->body, $customer, $password) : 'Welcome!';

        try {
            Mail::send('emails.invitation', [
                'customer' => $customer,
                'password' => $password,
                'body' => $body,
            ], function ($message) use ($customer, $subject) {
                $message->to($customer->email, $customer->name)
                        ->subject($subject);
            });

            EmailLog::create([
                'recipient_email' => $customer->email,
                'subject' => $subject,
                'type' => 'invitation',
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            return true;
        } catch (\Exception $e) {
            EmailLog::create([
                'recipient_email' => $customer->email,
                'subject' => $subject,
                'type' => 'invitation',
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Send maintenance reminder
     */
    public function sendMaintenanceReminder($maintenanceSchedule, $customer)
    {
        $template = EmailTemplate::where('type', 'reminder')->where('active', true)->first();
        
        $subject = $template ? $template->subject : 'Maintenance Reminder';
        $body = $template ? $this->replaceReminderPlaceholders($template->body, $maintenanceSchedule, $customer) : 'Maintenance reminder';

        try {
            Mail::send('emails.reminder', [
                'maintenanceSchedule' => $maintenanceSchedule,
                'customer' => $customer,
                'body' => $body,
            ], function ($message) use ($customer, $subject) {
                $message->to($customer->email, $customer->name)
                        ->subject($subject);
            });

            EmailLog::create([
                'recipient_email' => $customer->email,
                'subject' => $subject,
                'type' => 'reminder',
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            return true;
        } catch (\Exception $e) {
            EmailLog::create([
                'recipient_email' => $customer->email,
                'subject' => $subject,
                'type' => 'reminder',
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    protected function replacePlaceholders($body, Invoice $invoice)
    {
        $replacements = [
            '{invoice_number}' => $invoice->invoice_number,
            '{customer_name}' => $invoice->customer->name,
            '{total}' => number_format($invoice->total, 2),
            '{due_date}' => $invoice->due_date->format('F j, Y'),
            '{balance}' => number_format($invoice->balance, 2),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }

    protected function replaceInvitationPlaceholders($body, Customer $customer, $password)
    {
        $replacements = [
            '{customer_name}' => $customer->name,
            '{email}' => $customer->email,
            '{password}' => $password,
            '{login_url}' => config('app.frontend_url', 'http://localhost:3000') . '/login',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }

    protected function replaceReminderPlaceholders($body, $maintenanceSchedule, $customer)
    {
        $replacements = [
            '{customer_name}' => $customer->name,
            '{task_name}' => $maintenanceSchedule->task_name,
            '{next_due_date}' => $maintenanceSchedule->next_due_date->format('F j, Y'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }

    protected function generateInvoicePdf(Invoice $invoice)
    {
        $invoice->load(['customer', 'yacht', 'vehicle', 'items.part', 'items.service']);
        
        $pdf = Pdf::loadView('invoices.show', [
            'invoice' => $invoice,
            'branding' => \App\Support\Branding::get(),
        ]);
        
        return $pdf->output();
    }
}

