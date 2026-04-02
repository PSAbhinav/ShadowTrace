import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

async function diagnose() {
    console.log("🔍 FINALIZING GUARDIAN-DB CONNECTION...");
    try {
        const accounts = await db.collection("accounts").get();
        const logs = await db.collection("logs").limit(5).get();
        const alerts = await db.collection("alerts").limit(5).get();

        console.log("✅ CLOUD STATUS: ONLINE");
        console.log(`👤 Identities Found: ${accounts.size}`);
        console.log(`📡 Ingestion Log Stream: ${logs.size} docs`);
        console.log(`⚠️ Active Threats (Alerts): ${alerts.size} docs`);

        if (accounts.size === 0) {
            console.log("⏳ SEEDING IDENTITIES (Gmail, Outlook, Yahoo)...");
            const batch = db.batch();
            const seeding = [
                { id: "abhin@gmail.com", email: "abhin@gmail.com", provider: "GMAIL", status: "SAFE", lastRiskScore: 12 },
                { id: "shadow@outlook.com", email: "shadow@outlook.com", provider: "OUTLOOK", status: "SAFE", lastRiskScore: 45 },
                { id: "trace@yahoo.com", email: "trace@yahoo.com", provider: "YAHOO", status: "SAFE", lastRiskScore: 5 }
            ];
            seeding.forEach(acc => {
                const ref = db.collection("accounts").doc(acc.id);
                batch.set(ref, { ...acc, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            });
            await batch.commit();
            console.log("✅ SEEDING COMPLETE.");
        }
    } catch (error) {
        console.error("❌ CLOUD ERROR:", error.message);
    }
    process.exit();
}

diagnose();
