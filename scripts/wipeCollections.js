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

async function wipe() {
    console.log("🧹 Wiping Stale Logs & Alerts...");
    
    async function deleteCollection(collectionPath, batchSize) {
        const collectionRef = db.collection(collectionPath);
        const query = collectionRef.limit(batchSize);

        return new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, resolve).catch(reject);
        });
    }

    async function deleteQueryBatch(db, query, resolve) {
        const snapshot = await query.get();
        const batchSize = snapshot.size;
        if (batchSize === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        process.nextTick(() => {
            deleteQueryBatch(db, query, resolve);
        });
    }

    await deleteCollection("logs", 50);
    await deleteCollection("alerts", 50);
    await deleteCollection("incidents", 50);
    
    console.log("✨ Collections Purged. System ready for Identity Guardian v3.");
    process.exit(0);
}

wipe();
