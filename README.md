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
Firebase Firestore (assessment data + compressed soil photos)
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
| Image Storage      | Compressed JPEG stored in Firestore |
| Authentication     | JWT (custom) + Firebase Admin SDK   |
| Image Processing   | Python, OpenCV, Flask (port 5001)   |
| Fuzzy Logic Engine | Python, NumPy, Flask (port 5002)    |
| Hardware Sensor    | ESP32, Arduino IDE                  |
| Maps               | React-Leaflet, OpenStreetMap        |
| Charts             | Recharts                            |
| PDF Reports        | jsPDF, jsPDF-AutoTable              |

---

## Prerequisites

- **Node.js** v18.17+
- **Python** 3.10+
- **Firebase project** with Firestore and Authentication enabled
- (Optional) **ESP32 development board** with soil sensors

---

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore** and **Authentication** (Email/Password)
3. Generate a **Service Account Key**: Project Settings → Service Accounts → Generate new private key
4. Copy key values into `backend/.env`
5. Copy web app config into `frontend/.env`

Soil photos are resized and compressed to at most 450 KiB before being saved
inside the Firestore assessment document. Cloud Storage is not required.

For assessment-specific fertilizer guidance, create a Gemini API key in
[Google AI Studio](https://aistudio.google.com/apikey) and set `GEMINI_API_KEY`
in `backend/.env` for local development or in the **SoilSense API** Render
service environment. The API calls Gemini after the fuzzy assessment and saves
the response with the assessment in Firestore. Keep this key server-side; never
add it to `frontend/.env`, Vercel variables, or ESP32 firmware. `GEMINI_MODEL`
defaults to `gemini-3.8-flash` and can be changed if needed.
Restrict the key to the Gemini API in Google AI Studio/Cloud Console and check
that the project has the required API access and quota.

Gemini provides cautious decision-support guidance from the assessment; it
cannot determine soil N-P-K or prescribe validated application rates without
laboratory results. Verify fertilizer and lime decisions with a soil test and
local agricultural extension guidance.

### 2. Backend Setup

Open a PowerShell terminal and run each line separately:
```powershell
cd C:\Users\Ryan\Desktop\SOILSENSE\backend
# Edit .env — fill in FIREBASE_*, JWT_SECRET, and GEMINI_API_KEY
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
management page. **Manage Users** can create Firebase-backed accounts, activate
or deactivate accounts, and permanently delete accounts. Deactivated accounts
are blocked from API access and Firebase sign-in. To clean up accounts seeded
by an older version, sign in as the configured admin, open **Manage Users**,
and delete the seeded demo entries; their Firebase Authentication accounts
are removed when present.

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
   `main` branch. The root `render.yaml` defines the Node API, image-processing,
   and fuzzy-engine services. Each service has its own health check.
2. Enter the requested environment values in Render. For the Node API, use the
   Firebase Admin service-account `project_id`, `client_email`, and
   `private_key`, plus a strong random `JWT_SECRET`, an `ESP32_DEVICE_API_KEY`,
   `GEMINI_API_KEY`, and `ADMIN_UID`. Set the Gemini key only on the SoilSense
   API service; it is not needed by the image-processing or fuzzy-engine services.
   Find the admin account's **User UID** in Firebase Console → Authentication →
   Users and assign that exact value to `ADMIN_UID`. Keep secrets in Render
   only; never commit them or paste them into chat. If the service account key
   was shared or exposed, revoke it and generate a replacement before
   deployment.
3. Set `IMAGE_PROCESSING_URL` and `FUZZY_ENGINE_URL` on the Node API to the
   HTTPS URLs Render assigns to `soilsense-image-processing` and
   `soilsense-fuzzy-engine`. Generate a strong random service key, for example
   with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
   and set the same value as `SERVICE_API_KEY` on all three services. Do not
   use a `VITE_` variable for this secret. The Python inference endpoints
   require this key; their `/health` endpoints remain available for Render's
   health checks.
4. Wait for all three Render services to finish deploying. Open
   `https://<your-render-service>.onrender.com/api/health`; it should return a
   JSON response with `"status": "running"`.
   Then open `https://<your-image-service>.onrender.com/health` and
   `https://<your-fuzzy-service>.onrender.com/health`; both should return
   `"status": "running"`. Finally check
   `https://<your-render-service>.onrender.com/api/health/services` and confirm
   both Python services report `"online"`.
5. Confirm Vercel's `VITE_API_BASE_URL` is `/api` with **Config** visibility.
   The root `vercel.json` proxies API requests to the Render URL. The
   `render.yaml` CORS setting allows the production Vercel domain shown above.
   If either domain changes, update the proxy destination and
   `ALLOWED_ORIGINS` respectively.
6. Redeploy the Vercel frontend to activate the API proxy. Free Render
   services can sleep while idle; the first assessment after a period of
   inactivity may take longer while the services start.

If `/api/health/services` reports a service as misconfigured, compare the
service identity returned by its `/health` endpoint with the expected service.
In Render, verify that the image-processing service uses root directory
`image-processing` and the fuzzy-engine service uses `fuzzy-engine`, then
redeploy each service. Verify each `/health` response reports the matching
service identity. The backend ignores localhost service URLs in production
and uses the Render URLs above when no valid service URL is set.

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
- ✅ Assessment map with GPS pins, fertility filters, score summaries, and barangay snapshots (Leaflet/OpenStreetMap; latest 100 records)
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
