import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "../mcp/log-generator/serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

const mockAccounts = [
    { email: "abhin@gmail.com", provider: "GMAIL", status: "SAFE", lastRiskScore: 12 },
    { email: "shadow@outlook.com", provider: "OUTLOOK", status: "WARNING", lastRiskScore: 54 },
    { email: "trace@yahoo.com", provider: "YAHOO", status: "SAFE", lastRiskScore: 5 }
];

async function seed() {
    console.log("🌱 Seeding Mock Identities...");
    for (const acc of mockAccounts) {
        const docRef = db.collection("accounts").doc(acc.email);
        await docRef.set({
            ...acc,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Added: ${acc.email}`);
    }
    process.exit(0);
}

seed();
