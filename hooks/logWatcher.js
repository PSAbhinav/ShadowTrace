import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runAgentOrchestration } from "../agents/coreAgents.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "../mcp/log-generator/serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

import { getFirestore } from "firebase-admin/firestore";

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = getFirestore("guardian-db");

/**
 * Event-Driven Hook: Log Watcher (Guardian v1.0)
 * Enhances standard logs with identity metadata for the Guardian Dashboard.
 */
let isQuotaExhausted = false;

function startWatcher() {
    console.log("🪝 ShadowTrace Guardian Hook: Attempting Connection...");
    
    const unsubscribe = db.collection("logs").onSnapshot(async (snapshot) => {
        isQuotaExhausted = false; // Reset if we successfully get a snapshot
        
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
                const rawLog = change.doc.data();
                const logId = change.doc.id;

                try {
                    if (!rawLog.ip || !rawLog.accountId) return;

                    const blockRef = db.collection("blockedIPs").doc(rawLog.ip);
                    const blockSnap = await blockRef.get();
                    if (blockSnap.exists) return;

                    const accRef = db.collection("accounts").doc(rawLog.accountId);
                    const accSnap = await accRef.get();
                    const isLocked = accSnap.exists && accSnap.data().status === 'LOCKED';

                    const existingAlerts = await db.collection("alerts")
                        .where("accountId", "==", rawLog.accountId)
                        .where("ip", "==", rawLog.ip)
                        .where("status", "==", "OPEN")
                        .limit(1)
                        .get();

                    if (!existingAlerts.empty && !isLocked) return;

                    const results = await runAgentOrchestration(rawLog);
                    
                    if (isLocked) {
                        results.threat.detected = true;
                        results.threat.level = "High";
                        results.threat.type = "IDENTITY HIJACK (LOCKED ACCOUNT)";
                        results.analyst.explanation = `CRITICAL: Access attempt on LOCKED account ${rawLog.accountId}.`;
                    }

                    if (results.threat.detected) {
                        console.log(`⚠️ THREAT DETECTED: [${results.threat.level}] ${results.threat.type}`);
                        await db.collection("alerts").add({
                            ...results,
                            status: "OPEN",
                            accountId: rawLog.accountId,
                            location: rawLog.location || null,
                            createdAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (error) {
                    if (error.code === 8 || error.message.includes("Quota exceeded")) {
                        handleQuotaError();
                        unsubscribe();
                    } else {
                        console.error("❌ Hook Processing Error:", error.message);
                    }
                }
            }
        });
    }, (error) => {
        if (error.code === 8 || error.message.includes("Quota exceeded")) {
            handleQuotaError();
        } else {
            console.error("❌ Firestore Subscription Error:", error);
        }
    });

    return unsubscribe;
}

function handleQuotaError() {
    if (isQuotaExhausted) return;
    isQuotaExhausted = true;
    console.warn("\n🛑 RESOURCE_EXHAUSTED: Firestore Quota Hit.");
    console.warn("⏳ Entering 5-minute backoff period to conserve kernel resources...\n");
    
    setTimeout(() => {
        isQuotaExhausted = false;
        startWatcher();
    }, 5 * 60 * 1000); // 5 minutes
}

startWatcher();

console.log("🪝 ShadowTrace Guardian Hook Active (v1.0 - Identity Focused)...");