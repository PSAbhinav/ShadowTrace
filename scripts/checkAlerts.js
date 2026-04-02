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

async function check() {
    console.log("🕵️ Checking Guardian Alerts...");
    
    const alertsSnap = await db.collection("alerts").where("status", "==", "OPEN").get();
    console.log(`📡 Open Alerts Found: ${alertsSnap.size}`);
    
    alertsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- Alert [${doc.id}]: Identity: ${data.accountId}, IP: ${data.ip}, Type: ${data.threat?.type}`);
    });

    const logsSnap = await db.collection("logs").orderBy("timestamp", "desc").limit(5).get();
    console.log(`\n📝 Recent Logs: ${logsSnap.size}`);
    logsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- Log [${doc.id}]: Account: ${data.accountId}, IP: ${data.ip}, Malicious: ${data.isMalicious}`);
    });

    process.exit(0);
}

check();
