<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\FaceDescriptor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class FaceRegistrationController extends Controller
{
    // URL Engine Python (Uvicorn / FastAPI)
    private string $pythonEngineUrl = 'http://127.0.0.1:5000';

    public function registerPersonWithFace(Request $request)
    {
        // 1. Validasi Input
        $request->validate([
            'registration_code' => 'required|string|unique:people,registration_code',
            'name'              => 'required|string',
            'phone'             => 'nullable|string',
            'image'             => 'required|image|mimes:jpeg,png,jpg|max:5048',
        ]);

        try {
            DB::beginTransaction();

            // 2. Simpan Foto Ke Storage Laravel (public/faces)
            $imagePath = $request->file('image')->store('faces', 'public');
            $fullImagePath = storage_path('app/public/' . $imagePath);

            // 3. Tembak Engine Python untuk Ekstraksi Vektor Wajah
            $response = Http::attach(
                'file',
                file_get_contents($fullImagePath),
                $request->file('image')->getClientOriginalName()
            )->post("{$this->pythonEngineUrl}/extract-feature");

            // Jika Python gagal menemukan wajah atau service Python mati
            if ($response->failed()) {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Gagal memproses wajah: ' . ($response->json('detail') ?? 'Service AI Python tidak merespon/wajah tidak terdeteksi.')
                ], 400);
            }

            $embedding = $response->json('embedding');

            // 4. Simpan Data Diri ke Tabel `people`
            $person = Person::create([
                'registration_code' => $request->registration_code,
                'name'              => $request->name,
                'phone'             => $request->phone ?? null,
            ]);

            // 5. Simpan Matriks Vektor Wajah ke Tabel `face_descriptors`
            FaceDescriptor::create([
                'person_id'  => $person->id,
                'image_path' => $imagePath,
                'descriptor' => $embedding, // Menyimpan array 512 float ke JSON MySQL
                'is_active'  => true,
            ]);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Pendaftaran wajah berhasil disimpan.',
                'data'    => $person->load('descriptors')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan server: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Endpoint untuk mengambil seluruh daftar vektor wajah aktif 
     * (Digunakan oleh Python saat pertama kali booting/sinkronisasi)
     */
    public function getActiveDescriptors()
    {
        $descriptors = FaceDescriptor::where('is_active', true)
            ->with('person:id,registration_code,name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $descriptors
        ]);
    }
}