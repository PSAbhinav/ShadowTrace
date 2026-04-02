import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { checkIPReputation } from "../../src/lib/intel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account (Ensure path is correct)
const serviceAccountPath = path.join(__dirname, "../log-generator/serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ serviceAccountKey.json not found. Run log-generator first.");
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Initialize Firebase
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

/**
 * Threat Intelligence MCP Server (Phase 2)
 * Now using the real AbuseIPDB integration via shared utility (ESM).
 */

// Placeholder for future tool/agent interactions
console.log("🚀 Real-Time Threat Intelligence MCP active...");

// Example background check for demo visibility
(async () => {
    const testIp = "45.33.22.11";
    const rep = await checkIPReputation(testIp);
    console.log(`📡 Background Reputation Check [${testIp}]: Score ${rep.score} (${rep.provider})`);
})();

export { checkIPReputation };
