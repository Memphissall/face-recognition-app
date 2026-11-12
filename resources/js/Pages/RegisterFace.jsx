import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import axios from 'axios';

export default function RegisterFace() {
    const webcamRef = useRef(null);

    const [formData, setFormData] = useState({
        registration_code: '',
        name: '',
        phone: '',
    });

    const [capturedImage, setCapturedImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isFaceInPosition, setIsFaceInPosition] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // 1. Load Model Deteksi Wajah
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                setIsModelLoaded(true);
            } catch (err) {
                console.error("Gagal memuat model deteksi wajah:", err);
            }
        };
        loadModels();
    }, []);

    // 2. Deteksi Wajah Real-Time di Dalam Area Oval
    useEffect(() => {
        let interval;
        if (isModelLoaded && !capturedImage) {
            interval = setInterval(async () => {
                if (
                    webcamRef.current &&
                    webcamRef.current.video &&
                    webcamRef.current.video.readyState === 4
                ) {
                    const video = webcamRef.current.video;
                    const videoWidth = video.videoWidth;
                    const videoHeight = video.videoHeight;

                    const detection = await faceapi.detectSingleFace(
                        video,
                        new faceapi.TinyFaceDetectorOptions()
                    );

                    if (detection) {
                        const { x, y, width, height } = detection.box;
                        
                        // Area Panduan Oval (di tengah)
                        const guideWidth = videoWidth * 0.45;
                        const guideHeight = videoHeight * 0.65;
                        const guideX = (videoWidth - guideWidth) / 2;
                        const guideY = (videoHeight - guideHeight) / 2;

                        const isInsideX = x >= guideX - 35 && (x + width) <= (guideX + guideWidth + 35);
                        const isInsideY = y >= guideY - 35 && (y + height) <= (guideY + guideHeight + 35);

                        setIsFaceInPosition(isInsideX && isInsideY);
                    } else {
                        setIsFaceInPosition(false);
                    }
                }
            }, 200);
        }

        return () => clearInterval(interval);
    }, [isModelLoaded, capturedImage]);

    // 3. Take Photo Snapshot
    const capturePhoto = useCallback(() => {
        if (!isFaceInPosition) {
            setMessage({ type: 'error', text: 'Posisikan wajah tepat di dalam area panduan oval!' });
            return;
        }

        const imageSrc = webcamRef.current.getScreenshot();
        setCapturedImage(imageSrc);

        fetch(imageSrc)
            .then((res) => res.blob())
            .then((blob) => {
                const file = new File([blob], `face_${Date.now()}.jpg`, { type: 'image/jpeg' });
                setImageFile(file);
            });
    }, [webcamRef, isFaceInPosition]);

    const resetPhoto = () => {
        setCapturedImage(null);
        setImageFile(null);
        setIsFaceInPosition(false);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!imageFile) {
            setMessage({ type: 'error', text: 'Harap ambil foto wajah terlebih dahulu!' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        const data = new FormData();
        data.append('registration_code', formData.registration_code);
        data.append('name', formData.name);
        data.append('phone', formData.phone);
        data.append('image', imageFile);

        try {
            const response = await axios.post('/api/v1/register-face', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setMessage({ type: 'success', text: response.data.message });
            setFormData({ registration_code: '', name: '', phone: '' });
            resetPhoto();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat pendaftaran.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 flex justify-center items-center">
            <Head title="Pendaftaran Wajah Baru" />

            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
                    Form Pendaftaran Wajah Baru
                </h2>

                {message.text && (
                    <div
                        className={`p-4 rounded-lg mb-6 ${
                            message.type === 'success'
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : 'bg-red-100 text-red-700 border border-red-300'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Kolom Kiri: Kamera & Panduan Wajah Bentuk Oval */}
                    <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg border">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Kamera Pendaftar
                        </label>
                        
                        <p className="text-xs text-gray-500 mb-3 text-center">
                            Posisikan wajah kamu di dalam area sketsa di bawah:
                        </p>

                        {!capturedImage ? (
                            <div className="relative w-full h-72 overflow-hidden rounded-lg border bg-black flex justify-center items-center">
                                {/* Badge Indikator Status ditaruh di Atas (TIDAK Menutupi Wajah) */}
                                <div className="absolute top-3 z-10">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider shadow-md transition-colors duration-300 ${
                                            isFaceInPosition ? 'bg-green-600' : 'bg-red-600'
                                        }`}
                                    >
                                        {isFaceInPosition ? '✓ Posisi Wajah Pas' : 'Arahkan Wajah ke Area Oval'}
                                    </span>
                                </div>

                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                />

                                {/* Sketsa Overlay Oval Bentuk Wajah (Tanpa Teks di Tengah) */}
                                <div
                                    className={`absolute transition-all duration-300 pointer-events-none border-4 border-dashed rounded-[50%/60%] ${
                                        isFaceInPosition
                                            ? 'border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                                            : 'border-red-500 bg-red-500/10'
                                    }`}
                                    style={{
                                        width: '48%',
                                        height: '75%',
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-72 overflow-hidden rounded-lg border bg-black">
                                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="mt-4 flex gap-3">
                            {!capturedImage ? (
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    disabled={!isFaceInPosition}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        isFaceInPosition
                                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    }`}
                                >
                                    📸 Ambil Foto Wajah
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={resetPhoto}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                                >
                                    🔄 Ulangi Foto
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Kolom Kanan: Form Data Diri */}
                    <form onSubmit={handleSubmit} className="flex flex-col justify-between">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    NIP / NIM / Kode Unik *
                                </label>
                                <input
                                    type="text"
                                    name="registration_code"
                                    value={formData.registration_code}
                                    onChange={handleChange}
                                    required
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Contoh: 202602013"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Lengkap *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Nama Lengkap"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nomor Telepon (Opsional)
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="0812xxxxxxxx"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !imageFile}
                            className={`w-full mt-6 py-3 px-4 rounded-lg text-white font-semibold shadow transition ${
                                loading || !imageFile
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {loading ? 'Meng-ekstrak Wajah & Menyimpan...' : 'Simpan Pendaftaran Wajah'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}