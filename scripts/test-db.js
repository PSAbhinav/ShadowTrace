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

async function testConnection() {
    console.log("🔍 DIAGNOSING FIRESTORE CONNECTION...");
    try {
        const snap = await db.collection("accounts").limit(1).get();
        console.log("✅ CONNECTION SUCCESS!");
        console.log(`📡 Collection 'accounts' exists. Found ${snap.size} documents.`);
    } catch (error) {
        console.error("❌ CONNECTION FAILED:");
        console.error(error.message);
        if (error.code === 5) {
            console.error("💡 SUGGESTION: The the database '(default)' does not exist. Please go to the the Firebase Console and 'Create Database' for this project.");
        }
    }
    process.exit();
}

testConnection();
