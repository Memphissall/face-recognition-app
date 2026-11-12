import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import requests
import datetime
import time

# 1. Konfigurasi Endpoint API Laravel
LARAVEL_API_BASE = "http://127.0.0.1:8000/api/v1"

print("Memuat Model AI InsightFace Scanner...")
face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("Model Scanner Siap!")

# 2. Ambil Data Vektor Wajah Terdaftar dari Database Laravel
def load_known_faces():
    try:
        res = requests.get(f"{LARAVEL_API_BASE}/active-descriptors")
        if res.status_code == 200:
            data = res.json().get('data', [])
            known_faces = []
            for item in data:
                person = item.get('person', {})
                known_faces.append({
                    'person_id': item['person_id'],
                    'name': person.get('name', 'Unknown'),
                    'registration_code': person.get('registration_code', ''),
                    'embedding': np.array(item['descriptor'], dtype=np.float32)
                })
            print(f"Berhasil memuat {len(known_faces)} sampel wajah dari MySQL.")
            return known_faces
    except Exception as e:
        print(f"Gagal mengambil data dari Laravel API: {e}")
    return []

# Load data awal
known_faces = load_known_faces()

# Cooldown Log agar 1 orang tidak mengirim log berulang-ulang dalam rentang waktu singkat (misal 10 detik)
last_logged_time = {} 
COOLDOWN_SECONDS = 10

def send_log_to_laravel(person_id, status, confidence, captured_frame):
    """Fungsi mengirim Log Deteksi ke Laravel API"""
    try:
        # Simpan snapshot sementara
        timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"scan_{timestamp_str}.jpg"
        
        # Kirim data ke API
        payload = {
            'person_id': person_id,
            'captured_image': filename,
            'confidence_score': round(confidence, 4),
            'status': status,
            'detected_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        res = requests.post(f"{LARAVEL_API_BASE}/recognition-log", json=payload)
        if res.status_code == 201:
            print(f"[LOG TERSIMPAN] {status.upper()} - Person ID: {person_id} ({confidence*100:.1f}%)")
    except Exception as e:
        print(f"Gagal mengirim log ke Laravel: {e}")

# 3. Jalankan Loop Kamera Scanner
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) # 0 = Webcam Utama
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not cap.isOpened():
    print("Error: Kamera tidak dapat dibuka!")
    exit()

print("\n--- SCANNER CAMERA RUNNING (Tekan 'q' untuk keluar) ---")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Deteksi Wajah di Frame Kamera
    faces = face_app.get(frame)

    for face in faces:
        bbox = face.bbox.astype(int)
        target_embedding = face.embedding
        
        name = "Unknown"
        person_id = None
        max_sim = 0.0
        
        # Bandingkan dengan seluruh sampel wajah di Database
        for known in known_faces:
            known_vec = known['embedding']
            # Cosine Similarity
            sim = np.dot(target_embedding, known_vec) / (np.linalg.norm(target_embedding) * np.linalg.norm(known_vec))
            
            if sim > max_sim:
                max_sim = float(sim)
                if sim > 0.45: # Threshold kemiripan (> 45%)
                    name = known['name']
                    person_id = known['person_id']

        # Tentukan Warna Bounding Box (Hijau = Recognized, Merah = Unknown)
        color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
        
        # Gambar Bounding Box di Layar Kamera
        cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 2)
        
        # Gambar Label Nama & Percentage
        label = f"{name} ({max_sim*100:.0f}%)"
        cv2.putText(frame, label, (bbox[0], bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Kirim Log ke Laravel jika melepasi Cooldown
        current_time = time.time()
        track_key = person_id if person_id else "unknown"
        
        if track_key not in last_logged_time or (current_time - last_logged_time[track_key]) > COOLDOWN_SECONDS:
            status = 'recognized' if name != "Unknown" else 'unknown'
            send_log_to_laravel(person_id, status, max_sim, frame)
            last_logged_time[track_key] = current_time

    # Tampilkan Jendela Kamera
    cv2.imshow("Face Recognition Scanner - Realtime", frame)

    # Tekan tombol 'q' di keyboard untuk keluar
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()