<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\VehicleDocument;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class VehicleDocumentController extends Controller
{
    /**
     * Get documents for a vehicle
     */
    public function index(Request $request)
    {
        $query = VehicleDocument::with('vehicle');

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        $documents = $query->orderBy('created_at', 'desc')->get();

        return response()->json($documents, 200);
    }

    /**
     * Upload a new document
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'document_type' => ['required', 'in:title,registration,inspection,insurance,bill_of_sale,other'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // 5MB max
            'expiration_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $originalFilename = $file->getClientOriginalName();
        $filename = time() . '_' . $originalFilename;
        $path = $file->storeAs('vehicle_documents', $filename, 'public');

        $document = VehicleDocument::create([
            'vehicle_id' => $request->vehicle_id,
            'document_type' => $request->document_type,
            'file_path' => $path,
            'original_filename' => $originalFilename,
            'expiration_date' => $request->expiration_date,
            'notes' => $request->notes,
        ]);

        return response()->json($document->load('vehicle'), 201);
    }

    /**
     * Delete a document
     */
    public function destroy(Request $request, $id)
    {
        $document = VehicleDocument::findOrFail($id);
        
        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully'], 200);
    }
}
