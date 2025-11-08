<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Customer;
use App\Models\EmailLog;
use App\Models\EmailTemplate;
use App\Services\EmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmailController extends Controller
{
    protected $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    /**
     * Send invoice email
     */
    public function sendInvoice(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'invoice_id' => ['required', 'exists:invoices,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $invoice = Invoice::with(['customer'])->findOrFail($request->invoice_id);

        try {
            $this->emailService->sendInvoiceEmail($invoice);
            return response()->json(['message' => 'Invoice email sent successfully'], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send email',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get email log
     */
    public function emailLog(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = EmailLog::query();

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by recipient
        if ($request->has('recipient_email')) {
            $query->where('recipient_email', 'like', '%' . $request->recipient_email . '%');
        }

        $logs = $query->orderBy('sent_at', 'desc')->paginate(50);

        return response()->json($logs, 200);
    }

    /**
     * Send customer invitation
     */
    public function sendInvitation(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => ['required', 'exists:customers,id'],
            'password' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $customer = Customer::findOrFail($request->customer_id);

        try {
            $this->emailService->sendCustomerInvitation($customer, $request->password);
            return response()->json(['message' => 'Invitation email sent successfully'], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send invitation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all email templates
     */
    public function getTemplates(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $templates = EmailTemplate::all();
        return response()->json(['data' => $templates], 200);
    }

    /**
     * Update email template
     */
    public function updateTemplate(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'subject' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $template = EmailTemplate::findOrFail($id);
        $template->update($request->only(['subject', 'body', 'active']));

        return response()->json([
            'message' => 'Template updated successfully',
            'data' => $template
        ], 200);
    }
}

