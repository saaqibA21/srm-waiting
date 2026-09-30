# 🏥 SRM Medical OPD Dashboard

A full-stack hospital OPD token management system with live queue tracking, OCR-based handwritten vitals capture, and a REST API for hospital integrations.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12 ✅ (already installed)
- Node.js 20 ✅ (already installed)
- Tesseract OCR — **install separately** (see below)

### Install Tesseract OCR (one-time)
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki  
→ Default install path: `C:\Program Files\Tesseract-OCR\tesseract.exe`  
→ After install, Tesseract works automatically.

---

## ▶️ Running the App

**Terminal 1 — Backend:**
```powershell
.\start-backend.ps1
```
Or manually:
```powershell
C:\Users\SAAQIB\AppData\Local\Programs\Python\Python312\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```powershell
.\start-frontend.ps1
```
Or manually:
```powershell
cd frontend
npm run dev
```

**Then open:** http://localhost:3000

---

## 📱 Dashboard Pages

| Page | URL | Purpose |
|---|---|---|
| **Queue Dashboard** | `/` | Live token counter, queue status, hourly chart |
| **Token Desk** | `/token` | Generate tokens — enter UHID + assign doctor |
| **Vitals Capture** | `/vitals` | Camera → OCR → auto-fill vitals form |
| **Patient History** | `/history` | Search patient records, visits, vitals |

---

## 🔌 Hospital REST API (GET endpoints)

Base URL: `http://localhost:8000`

| Endpoint | Description |
|---|---|
| `GET /api/patients` | All patients (filter: `?date=2026-09-23&doctor_id=1`) |
| `GET /api/patients/{uhid}` | Patient profile + visit history |
| `GET /api/patients/{uhid}/vitals` | All vitals records for a patient |
| `GET /api/tokens/today` | Today's full token log with timestamps |
| `GET /api/stats` | Daily stats (total, waiting, done, avg wait time) |
| `GET /doctors/` | List all doctors |
| `GET /token/queue` | Live queue for today |
| `GET /token/counter` | Current token number + waiting count |

**API Docs (Swagger):** http://localhost:8000/docs

---

## 🔄 Token Flow

```
Receptionist: Enter UHID + Select Doctor → Generate Token
       ↓
Token # auto-increments per day (resets at midnight)
       ↓
Patient waits (status: WAITING 🔵)
       ↓
Click "Next Patient" → status: CALLED 🟡 → called_at recorded
       ↓
Nurse captures vitals image → OCR auto-fills form → Save
       ↓
Visit complete → status: DONE 🟢 → completed_at recorded
```

---

## 📋 Vitals OCR

The OCR engine reads handwritten vitals slips and auto-extracts:
- **BP** (systolic/diastolic): `BP: 120/80`
- **Pulse**: `Pulse: 72 bpm`
- **Temperature**: `Temp: 98.6`
- **SpO2**: `SpO2: 98%`
- **Weight**: `Wt: 65 kg`
- **Height**: `Ht: 170 cm`
- **Chief Complaint**: `CC: Fever and cough`

All fields are fully editable after OCR before saving.

---

## 🗃️ Database

- **File:** `backend/hospital.db` (SQLite)
- **Tables:** patients, doctors, tokens, vitals
- All records are date + time stamped
- Token numbers reset daily at midnight

---

## 🏥 Pre-seeded Doctors

| ID | Doctor Number | Name | Department |
|---|---|---|---|
| 1 | DR-001 | Dr. Ananya Sharma | General Medicine |
| 2 | DR-002 | Dr. Rajesh Kumar | Cardiology |
| 3 | DR-003 | Dr. Priya Mehta | Pediatrics |
| 4 | DR-004 | Dr. Suresh Patel | Orthopedics |
| 5 | DR-005 | Dr. Lakshmi Nair | Gynecology |

---

## 📁 Project Structure

```
srm_medical_waiting/
├── start-backend.ps1       ← Run this first
├── start-frontend.ps1      ← Run this second
├── backend/
│   ├── main.py             ← FastAPI app entry point
│   ├── database.py         ← SQLite + SQLAlchemy setup
│   ├── models.py           ← ORM models
│   ├── schemas.py          ← Pydantic schemas
│   ├── ocr_engine.py       ← Tesseract + OpenCV OCR
│   ├── websocket_manager.py← Real-time WS broadcasts
│   ├── seed.py             ← Seeds doctors into DB
│   ├── hospital.db         ← SQLite database (auto-created)
│   ├── uploads/            ← Captured vitals images
│   └── routers/
│       ├── token_router.py
│       ├── vitals_router.py
│       ├── doctor_router.py
│       ├── patient_router.py
│       └── api_router.py
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/index.js
        ├── pages/
        │   ├── QueueDashboard.jsx
        │   ├── TokenDesk.jsx
        │   ├── VitalsCapture.jsx
        │   └── PatientHistory.jsx
        └── components/
            ├── TokenCounter.jsx
            └── CameraCapture.jsx
```
