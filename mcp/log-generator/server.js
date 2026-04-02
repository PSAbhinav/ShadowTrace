import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

import { getFirestore } from "firebase-admin/firestore";

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = getFirestore("guardian-db");

const locations = [
    { city: "New York", lat: 40.7128, lng: -74.0060 },
    { city: "London", lat: 51.5074, lng: -0.1278 },
    { city: "Tokyo", lat: 35.6762, lng: 139.6503 },
    { city: "Moscow", lat: 55.7558, lng: 37.6173 },
    { city: "Berlin", lat: 52.5200, lng: 13.4050 },
    { city: "Singapore", lat: 1.3521, lng: 103.8198 },
    { city: "Sydney", lat: -33.8688, lng: 151.2093 }
];

const maliciousIps = ["45.33.22.11", "185.22.33.44", "203.0.113.5", "91.241.19.84"];
const defaultLoc = locations[0];

async function pushLog(ip, endpoint, status = "OK", accountEmail, location = defaultLoc) {
    const log = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip,
        endpoint,
        status,
        method: "POST",
        accountId: accountEmail,
        location,
        userAgent: "Mozilla/5.0 (Guardian-Identity-Monitor)",
        isMalicious: maliciousIps.includes(ip)
    };

    try {
        await db.collection("logs").add(log);
    } catch (error) {
        console.error("❌ Firestore Push Error:", error.message);
    }
}
async function pushAlert(accountEmail, ip, location, forensicData = null) {
    const alertId = `alert-${Date.now()}`;
    const alert = {
        id: alertId,
        email: accountEmail,
        ip: ip,
        timestamp: new Date().toISOString(),
        status: "CRITICAL",
        location: {
            city: location.city || "Origin Unknown",
            lat: location.lat || 0,
            lng: location.lng || 0
        },
        threat: {
            type: "BRUTE_FORCE_DETECTED",
            severity: "HIGH"
        },
        analyst: {
            explanation: forensicData 
                ? `Forensic analysis identified high-velocity failed logins from ${forensicData.isp} (${forensicData.platform}). Risk score: ${forensicData.riskScore}%` 
                : "Automated analysis detected 3+ failed sign-in attempts within 5s. Pattern indicative of credential stuffing.",
            confidence: forensicData ? forensicData.riskScore : 88
        },
        forensicDetails: forensicData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("alerts").doc(alertId).set(alert);
        console.log(`🚨 ALERT DISPATCHED: [${accountEmail}] Critical Breach Risk. IP: ${ip}`);
        
        // Log the notification event
        await db.collection("logs").add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ip: "SYSTEM",
            endpoint: "GUARD_NOTIFICATION",
            status: "SENT",
            method: "DISPATCH",
            accountId: accountEmail,
            location: { city: "SECURE_HUB", lat: 0, lng: 0 },
            message: `Emergency Alert Dispatched: SMS + Email sent to ${accountEmail}.`,
            isMalicious: false
        });
        // Clear the trigger once processed
        await db.collection('settings').doc('simulator_control').update({
            bruteForceTarget: null,
            triggeredAt: null,
            isRealtime: false
        });

        console.log(`[FORENSIC] Simulation sequence complete for ${accountEmail}.`);
    } catch (error) {
        console.error("[SIMULATOR_ERROR]", error);
    }
}

async function simulate() {
    try {
        const accountsSnap = await db.collection("accounts").get();
        const accounts = accountsSnap.docs.map(doc => doc.id);
        
        if (accounts.length === 0) {
            console.log(`📡 [${new Date().toLocaleTimeString()}] System Heartbeat: ACTIVE. No identities configured.`);
            return;
        }

        console.log(`🛡️ [${new Date().toLocaleTimeString()}] Guardian Pulse: Monitoring ${accounts.length} identities...`);

        const simControlDoc = await db.collection("settings").doc("simulator_control").get();
        const simControl = simControlDoc.exists ? simControlDoc.data() : {};
        const bruteForceTarget = simControl.bruteForceTarget;
        const realOrigin = simControl.origin;
        const fingerprint = simControl.fingerprint;

        for (const email of accounts) {
            if (bruteForceTarget === email) {
                const malIp = realOrigin ? realOrigin.ip : maliciousIps[Math.floor(Math.random() * maliciousIps.length)];
                const malLoc = realOrigin ? { city: realOrigin.city, lat: realOrigin.lat, lng: realOrigin.lng } : locations[Math.floor(Math.random() * locations.length)];
                
                // Forensic Enrichment
                const isps = ["Advanced Cyber Transit", "Starlink Satellite", "Cloudflare Warp", "DigitalOcean Droplet", "AWS Data Center"];
                const forensicData = {
                    isp: isps[Math.floor(Math.random() * isps.length)],
                    asn: `AS${Math.floor(Math.random() * 50000 + 10000)}`,
                    device: fingerprint?.userAgent || "ShadowTrace Cloud Node",
                    resolution: fingerprint?.resolution || "1920x1080",
                    timezone: fingerprint?.timezone || "UTC",
                    platform: fingerprint?.platform || "Linux",
                    riskScore: 92,
                    capturedAt: new Date().toISOString()
                };

                console.log(`🔫 REAL-TIME FORENSIC ATTACK: Targeted on [${email}] from ${malIp} (${malLoc.city})...`);
                for (let i = 0; i < 3; i++) {
                    await pushLog(malIp, "/accounts/signin", "401", email, malLoc);
                    await new Promise(r => setTimeout(r, 1000));
                }
                
                await pushAlert(email, malIp, malLoc, forensicData);
                
                // Clear the simulation signal after execution
                await db.collection("settings").doc("simulator_control").update({
                    bruteForceTarget: null,
                    isRealtime: false,
                    origin: null,
                    fingerprint: null
                });
            } else {
                // Normal traffic
                const roll = Math.random();
                if (roll < 0.1) { // 10% chance of random log event
                    await pushLog("192.168.1." + Math.floor(Math.random()*255), "/api/sync", "200", email, defaultLoc);
                }
            }
        }
    } catch (error) {
        console.error("❌ Simulation Error:", error.message);
    }
}

console.log("🚀 ShadowTrace Forensic Engine v4.0 Starting...");
setInterval(simulate, 15000);
simulate();