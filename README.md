# 🌱 SoilSense

**A Cloud-Based Image Processing System for Soil Fertility Assessment Using Fuzzy Logic Algorithm**

> SoilSense is a preliminary soil assessment and decision-support system for farmers in **Roxas, Oriental Mindoro, Philippines**. It uses smartphone soil images, optional ESP32 soil sensors, cloud processing, and fuzzy logic to provide rapid soil fertility classification and crop/fertilizer recommendations.

> ⚠️ **SoilSense does not replace laboratory soil analysis.** All results are preliminary and should be validated by a qualified agricultural extension officer.

---

## System Architecture

```
Smartphone (React Web App)
    ↓
Node.js + Express Backend (port 3001)
    ↓
Firebase Firestore + Cloud Storage
    ↓
Python Image Processing Service (port 5001)  ←→  Python Fuzzy Logic Engine (port 5002)
    ↓
Soil Fertility Classification + Rootcrop Recommendations
```

---

## Technology Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Frontend           | React, Vite, Tailwind CSS           |
| Backend API        | Node.js, Express                    |
| Database           | Firebase Firestore                  |
| Image Storage      | Firebase Cloud Storage              |
| Authentication     | JWT (custom) + Firebase Admin SDK   |
| Image Processing   | Python, OpenCV, Flask (port 5001)   |
| Fuzzy Logic Engine | Python, NumPy, Flask (port 5002)    |
| Hardware Sensor    | ESP32, Arduino IDE                  |
| Maps               | React-Leaflet, OpenStreetMap        |
| Charts             | Recharts                            |
| PDF Reports        | jsPDF, jsPDF-AutoTable              |

---

## Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- **Firebase project** with Firestore, Storage, and Auth enabled
- (Optional) **ESP32 development board** with soil sensors

---

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore**, **Storage**, and **Authentication** (Email/Password)
3. Generate a **Service Account Key**: Project Settings → Service Accounts → Generate new private key
4. Copy key values into `backend/.env`
5. Copy web app config into `frontend/.env`

### 2. Backend Setup

Open a PowerShell terminal and run each line separately:
```powershell
cd C:\Users\Ryan\Desktop\SOILSENSE\backend
# Edit .env — fill in FIREBASE_* and JWT_SECRET
npm install
npm run dev               # Starts on http://localhost:3001
```

### 3. Frontend Setup

Open a second PowerShell terminal:
```powershell
cd C:\Users\Ryan\Desktop\SOILSENSE\frontend
# Edit .env — fill in VITE_FIREBASE_* values
npm install
npm run dev               # Starts on http://localhost:5173
```

### 4. Image Processing Service

Open a third PowerShell terminal:
```powershell
cd C:\Users\Ryan\Desktop\SOILSENSE\image-processing
pip install -r requirements.txt
python api/app.py         # Starts on http://localhost:5001
```

### 5. Fuzzy Logic Engine

Open a fourth PowerShell terminal:
```powershell
cd C:\Users\Ryan\Desktop\SOILSENSE\fuzzy-engine
pip install -r requirements.txt
python api/app.py         # Starts on http://localhost:5002
```

### 6. Seed Demo Data

After backend is running with real Firebase credentials:
```powershell
cd C:\Users\Ryan\Desktop\SOILSENSE\database\seed
node seed.js
```

The seed script adds sample soil, crop, and recommendation data, but does not
create login accounts. Users sign in through Firebase Authentication. Public
registration creates farmer accounts; assign staff roles from the admin user
management page. To clean up accounts seeded by an older version, sign in as
the configured admin, open **Manage Users**, and delete the seeded demo entries;
their Firebase Authentication accounts are removed when present.

### 7. ESP32 Firmware (Optional)

1. Install **Arduino IDE** with ESP32 board support
2. Install the **ArduinoJson** library
3. Open `esp32/soilsense_sensor/soilsense_sensor.ino`
4. Update Wi-Fi credentials and API URL in the configuration section
5. Upload to your ESP32 board

## Install SoilSense on a Mobile Device

SoilSense is a Progressive Web App (PWA). Deploy the built frontend to an HTTPS
host to make installation available; browser installation is not available from
a public HTTP site.

- **Android:** Open the deployed site in Chrome or Edge, then tap **Install app**
  in the SoilSense prompt or choose **Install app** from the browser menu.
- **iPhone or iPad:** Open the site in Safari, tap **Share**, choose **Add to
  Home Screen**, then tap **Add**.

For a production frontend build, run `npm run build` from `frontend/` and deploy
the generated `frontend/dist/` directory. The backend and other services still
need to be deployed separately for login and soil assessments to work.

### Deploying the Frontend to Vercel

Import the repository into Vercel and keep the project root directory set to
`./` (the repository root). The root `vercel.json` installs frontend
dependencies, builds the Vite app, serves `frontend/dist/`, and routes React
page URLs back to the app so direct links and refreshes work. Requests under
`/api/*` are proxied to the Render backend before the frontend fallback.

In the Vercel project settings, add the frontend variables from
`frontend/.env.example` with **Config** visibility, not **Secret**. Vite
embeds variables prefixed with `VITE_` in browser assets, so they must not
contain private credentials. Keep `VITE_API_BASE_URL` set to `/api`; Vercel
proxies those requests to the Render backend. Redeploy after changing
environment variables. Deploying the frontend alone does not deploy the
backend or its Firebase Admin credentials.

### Deploying the Backend to Render

1. In Render, create a new **Blueprint** from this repository and select the
   `main` branch. The root `render.yaml` defines the Node API service and its
   `/api/health` health check.
2. Enter the requested environment values in Render. Use the Firebase Admin
   service-account `project_id`, `client_email`, and `private_key`, plus a
   strong random `JWT_SECRET`, an `ESP32_DEVICE_API_KEY`, and `ADMIN_UID`.
   Find the admin account's **User UID** in Firebase Console → Authentication →
   Users and assign that exact value to `ADMIN_UID`. Keep secrets in Render
   only; never commit them or paste them into chat. If the service account key
   was shared or exposed, revoke it and generate a replacement before
   deployment.
3. Wait for Render to finish deploying. Open
   `https://<your-render-service>.onrender.com/api/health`; it should return a
   JSON response with `"status": "running"`.
4. Confirm Vercel's `VITE_API_BASE_URL` is `/api` with **Config** visibility.
   The root `vercel.json` proxies API requests to the Render URL. The
   `render.yaml` CORS setting allows the production Vercel domain shown above.
   If either domain changes, update the proxy destination and
   `ALLOWED_ORIGINS` respectively.
5. Redeploy the Vercel frontend to activate the API proxy.
   The backend's Python image-processing and fuzzy-engine services must also
   be deployed and configured separately for soil assessments to run.

---

## Project Structure

```
SOILSENSE/
├── frontend/                    # React web application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── assessment/      # Assessment wizard components
│   │   │   ├── charts/          # Chart components
│   │   │   ├── common/          # Shared (badges, spinner, route guard)
│   │   │   └── layout/          # App shell (Navbar, Sidebar, AppLayout)
│   │   ├── context/             # React context (AuthContext)
│   │   ├── hooks/               # Custom hooks (GPS, sensor polling)
│   │   ├── pages/               # Page components
│   │   ├── services/            # API call functions
│   │   └── utils/               # Utility functions (PDF report generator)
│
├── backend/                     # Node.js + Express API server
│   └── src/
│       ├── controllers/         # Request handlers
│       ├── firebase/            # Firebase Admin SDK init
│       ├── middleware/          # Auth, role, upload, validate
│       ├── routes/              # Express route definitions
│       ├── services/            # Business logic (assessment orchestrator)
│       └── utils/               # Error handler, ID generator
│
├── image-processing/            # Python image analysis microservice
│   ├── preprocessing/           # Image decode, resize, quality check
│   ├── feature_extraction/      # Color (RGB/HSV/LAB) + texture features
│   └── api/                     # Flask API endpoint (port 5001)
│
├── fuzzy-engine/                # Python fuzzy logic microservice
│   ├── engine/                  # Mamdani inference, rootcrop scoring
│   ├── confidence/              # Confidence score calculator
│   └── api/                     # Flask API endpoint (port 5002)
│
├── esp32/
│   └── soilsense_sensor/        # Arduino firmware for ESP32
│
├── database/
│   └── seed/                    # Firestore seed script
│
└── documentation/               # Design docs (see below)
```

---

## API Endpoints

| Method | Endpoint                          | Auth    | Description                    |
|--------|-----------------------------------|---------|--------------------------------|
| POST   | /api/auth/register                | Public  | Register new user              |
| POST   | /api/auth/login                   | Public  | Login, get JWT token           |
| GET    | /api/auth/me                      | JWT     | Get current user profile       |
| POST   | /api/assessments/analyze          | JWT     | Submit new soil assessment     |
| GET    | /api/assessments                  | JWT     | List assessments               |
| GET    | /api/assessments/:id              | JWT     | Get single assessment          |
| POST   | /api/assessments/:id/lab-result   | JWT     | Enter lab validation result    |
| POST   | /api/sensors/reading              | API Key | ESP32 sends sensor reading     |
| GET    | /api/sensors/latest/:deviceId     | JWT     | Get latest sensor reading      |
| GET    | /api/analytics/summary            | JWT     | Dashboard summary              |
| GET    | /api/analytics/accuracy           | JWT     | Classification accuracy        |
| GET    | /api/analytics/processing-times   | JWT     | Processing performance data    |
| GET    | /api/health                       | Public  | Server health check            |

---

## Key Features

- ✅ Smartphone soil image capture (camera + file upload)
- ✅ Digital image processing (color features: RGB/HSV/LAB, texture features)
- ✅ Optional ESP32 soil sensor integration (pH + moisture)
- ✅ GPS location tracking
- ✅ Mamdani fuzzy logic inference engine
- ✅ Soil fertility classification (Poor / Moderate / Fertile) with score (0–100)
- ✅ Assessment confidence scoring with explanation
- ✅ Rootcrop suitability ranking (Best / Second Best / Not Suitable)
- ✅ Fertilizer recommendations
- ✅ Assessment history with filtering
- ✅ Interactive map (Leaflet/OpenStreetMap)
- ✅ Laboratory validation module
- ✅ Research analytics dashboard with accuracy metrics
- ✅ PDF report generation
- ✅ Role-based access (Farmer / Extension Worker / Admin)
- ✅ Beginner-friendly mobile-responsive UI

---

## System Limitations

- Soil image color is influenced by lighting conditions, camera settings, and soil moisture
- Image-based features are indirect indicators only — not direct nutrient measurements
- Without pH and moisture sensor data, assessment confidence is limited
- Fuzzy rules and crop requirements are demo data — verify with qualified agricultural personnel before production use
- Laboratory soil analysis remains the gold standard for detailed nutrient determination
- All recommendations should be validated by a qualified agricultural extension officer

---

## License

This project is a research prototype developed for academic purposes.
All demo agricultural data is labeled as such and must be replaced with
officially verified data before operational deployment.

---

*SoilSense — Roxas, Oriental Mindoro, Philippines*
