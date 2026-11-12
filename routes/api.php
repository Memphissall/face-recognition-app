<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FaceRegistrationController;
use App\Http\Controllers\Api\RecognitionLogController;

Route::prefix('v1')->group(function () {
    // Registrasi Wajah
    Route::post('/register-face', [FaceRegistrationController::class, 'registerPersonWithFace']);
    
    // Sinkronisasi Vektor untuk Python
    Route::get('/active-descriptors', [FaceRegistrationController::class, 'getActiveDescriptors']);

    // Log Deteksi Kamera
    Route::post('/recognition-log', [RecognitionLogController::class, 'storeLog']);
    Route::get('/recognition-logs', [RecognitionLogController::class, 'index']);
});