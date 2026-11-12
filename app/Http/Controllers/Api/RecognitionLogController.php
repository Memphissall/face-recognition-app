<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecognitionLog;
use Illuminate\Http\Request;

class RecognitionLogController extends Controller
{
    public function storeLog(Request $request)
    {
        // Validasi payload dari Python Engine
        $request->validate([
            'person_id'        => 'nullable|exists:people,id',
            'captured_image'   => 'required|string', // Path atau URL snapshot deteksi
            'confidence_score' => 'nullable|numeric',
            'status'           => 'required|in:recognized,unknown',
            'detected_at'      => 'required|date',
        ]);

        $log = RecognitionLog::create([
            'person_id'        => $request->person_id,
            'captured_image'   => $request->captured_image,
            'confidence_score' => $request->confidence_score,
            'status'           => $request->status,
            'detected_at'      => $request->detected_at,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Log deteksi wajah berhasil dicatat.',
            'log_id'  => $log->id
        ], 201);
    }

    /**
     * Endpoint untuk menampilkan riwayat log di Dashboard React
     */
    public function index()
    {
        $logs = RecognitionLog::with('person:id,registration_code,name')
            ->latest()
            ->paginate(15);

        return response()->json($logs);
    }
}