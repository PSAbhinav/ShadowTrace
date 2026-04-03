# ShadowTrace v1.3.0

![ShadowTrace Banner](https://img.shields.io/badge/Security-Hardened-emerald?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)

**ShadowTrace** is a premium, real-time security forensics platform designed to provide deep-signal intelligence and autonomous threat protection. From live geolocation tracking to global session management, ShadowTrace is built for high-stakes security monitoring.

## 🛡️ Core Security Features

- **Global Session Revocation**: One-click "Sign Out Everywhere" functionality that invalidates all active refresh tokens via the Firebase Admin SDK.
- **Dynamic TOTP / MFA**: Robust Multi-Factor Authentication support for mandatory identity verification.
- **Live Forensic Globe**: A dynamic 3D intelligence theater showing real-time sign-in locations and signal arcs.
- **High-Density Analytics**: Compact, data-dense dashboards providing a "Bird's Eye" view of security posture and signal anomalies.
- **Forensic Node Drill-down**: Detailed audit logs for every security event with risk-based scoring and trace explanations.

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth)
- **Backend/Admin**: [Firebase Admin SDK](https://firebase.google.com/docs/admin)
- **Visuals**: [React Globe.gl](https://github.com/vasturiano/react-globe.gl), [Three.js](https://threejs.org/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Vanilla CSS + Tailwind-inspired utility layers.

## ⚙️ Setup & Installation

### 1. Prerequisite Environments
Create a `.env.local` file with the following:

```env
# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Required for Global Revocation)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

## 📈 Dashboard Overview

ShadowTrace uses a **"Safety Mesh"** architecture to score incoming signals.
- **Risk 0-30%**: Healthy status.
- **Risk 30-70%**: Signal Anomaly (Pattern Watch).
- **Risk 70-100%**: Forensic Trace Required (Critical Alert).

## 🔒 Security Policy

ShadowTrace is designed with **Privacy-First Forensics**. We use `freeipapi.com` for HTTPS-compliant geolocation resolution without storing sensitive personal identification data locally.

---
**ShadowTrace** | *Standardizing Forensic Intelligence.*
