# ShadowTrace Forensic Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Stable-green.svg)]()
[![Security: Live Sync](https://img.shields.io/badge/Security-Live_Sync-blue.svg)]()

**ShadowTrace** is a production-grade, 100% real-time forensic intelligence platform designed for autonomous identity protection and threat visualization. Built on a zero-mock architecture, ShadowTrace eliminates simulated data in favor of absolute forensic fidelity, sourcing every event, geolocation, and threat score from live telemetry.

![ShadowTrace Dashboard Preview](https://github.com/PSAbhinav/ShadowTrace/raw/main/public/preview.png)

## 🛡️ Core Philosophy: Zero-Mock Forensic Integrity

ShadowTrace is engineered for environments where "close enough" is not an option. Unlike traditional dashboards that rely on fallbacks or hardcoded samples, ShadowTrace enforces a strict **Zero-Mock Policy**:
- **Live Geolocation**: Real-time IP-to-Geo resolution for every authentication event.
- **Dynamic Risk Scoring**: Threat levels are calculated on-the-fly based on live login patterns and device metadata.
- **Biometric TOTP**: Integrated Time-based One-Time Passwords (TOTP) for secure system restoration.
- **Global Revocation**: Google-style "Sign Out Everywhere" functionality using Firebase Admin SDK to invalidate all active sessions instantly.

## 🚀 Advanced Features

### 📡 Real-Time Intelligence Feed
A reactive stream of security events powered by Firestore `onSnapshot`. Every login, anomaly, and system update is pushed to the UI with zero latency.

### 🌍 Neural Globe Visualization
Dynamic 3D visualization of global access patterns.
- **Blue Nodes**: Verified secure authentication events.
- **Red Arcs**: Active threat vectors and unauthorized access attempts.
- **Internal Command Nodes**: Precise identification of local network activity without mock fallbacks.

### 🆙 Dynamic "Push Update" System
ShadowTrace introduces a remote versioning protocol that allows administrators to push system-wide metadata updates (e.g., v1.1 → v1.2) without requiring code redeployment. This ensures all active nodes are synchronized with the latest security definitions in real-time.

### 🛡️ Guardian Shield
An autonomous protection layer that triggers once high-risk anomalies are detected. When active, it:
1. Revokes suspect session tokens.
2. Locks the local UI via a hardware-level abstraction.
3. Requires Multi-Factor Authentication (MFA) to restore system access.

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+, React, Tailwind CSS (Vanilla CSS for custom components)
- **Real-time Engine**: Firebase (Firestore, Authentication, Analytics)
- **Security**: TOTP (Time-based One-Time Password), Firebase Admin SDK
- **Visualization**: Recharts (Analytics), Three.js/React-Three-Globe (Neural Map)
- **Versioning**: Custom Reactive VersionSync Protocol

## 📦 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/PSAbhinav/ShadowTrace.git
   cd ShadowTrace
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file with your Firebase credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Launch the Engine**
   ```bash
   npm run dev
   ```

## 🔐 Administrative Controls

Admin features are accessible via the **Settings** panel:
- **Safety Testing Center**: Trigger simulated (but real-log) brute force attacks to test Guardian Shield responsiveness.
- **Push System Upgrade**: Increment the global protocol version and synchronize all connected clients instantly.
- **Identity Mesh**: Link and monitor multiple digital identities under a single forensic banner.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed with absolute forensic precision by ShadowTrace Engineering.*
