from fastapi import FastAPI, UploadFile, File, HTTPException
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

app = FastAPI(title="Face Recognition Engine API")

# Inisialisasi Model InsightFace (memuat model CPU 'buffalo_l')
# Saat pertama kali server dijalankan, InsightFace akan otomatis mengunduh file model buffalo_l.zip
print("Memuat model InsightFace...")
face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("Model InsightFace berhasil dimuat!")

def bytes_to_image(file_bytes: bytes):
    """Fungsi helper untuk mengonversi bytes foto menjadi format Matriks OpenCV (BGR)"""
    nparr = np.frombuffer(file_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

@app.get("/")
def index():
    return {
        "status": "online",
        "service": "Face Recognition Engine (FastAPI + InsightFace)"
    }

@app.post("/extract-feature")
async def extract_feature(file: UploadFile = File(...)):
    """
    Endpoint untuk meng-ekstrak 512 array float (embedding) dari foto wajah pendaftaran.
    Dipanggil oleh Controller Laravel.
    """
    contents = await file.read()
    img = bytes_to_image(contents)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Format file gambar tidak valid")
    
    # Deteksi wajah menggunakan InsightFace
    faces = face_app.get(img)
    
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="Wajah tidak terdeteksi pada foto. Pastikan posisi wajah jelas dan tidak terhalang.")
    if len(faces) > 1:
        raise HTTPException(status_code=400, detail="Terlalu banyak wajah terdeteksi (ada lebih dari 1 orang). Harap gunakan foto dengan 1 orang saja.")
    
    # Ambil array vektor 512 nilai float
    embedding = faces[0].embedding.tolist()
    
    return {
        "status": "success",
        "message": "Fitur wajah berhasil diekstraksi",
        "embedding": embedding
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)