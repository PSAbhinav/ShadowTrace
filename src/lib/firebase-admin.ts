// src/lib/firebase-admin.ts
// Singleton Firebase Admin SDK initialization.
// Import from this file in ALL server-side API routes.
// Global singleton to persist across HMR (Hot Module Replacement)

import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Define the database ID formally
const DATABASE_ID = 'guardian-db';

// Global singleton to prevent multiple initialization errors during Hot Module Replacement (HMR)
// @ts-ignore
let adminApp = global._adminApp || null;
// @ts-ignore
let adminDb: Firestore = global._adminDb || null;

export function getAdminApp() {
    if (admin.apps.length > 0) return admin.apps[0];

    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountStr) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing from environment variables.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountStr);
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
    } catch (err: any) {
        throw new Error(`Failed to initialize Firebase Admin: ${err.message}`);
    }
}

// Initialize only if not already done
if (!adminDb) {
    const app = getAdminApp();
    if (app) {
        // Correct v13 pattern: getFirestore(app, databaseId)
        adminDb = getFirestore(app, DATABASE_ID);
        
        try {
            // General settings
            adminDb.settings({ 
                ignoreUndefinedProperties: true 
            });
            // @ts-ignore
            global._adminDb = adminDb;
        } catch (settingsError) {
            console.warn('[FIREBASE_ADMIN] Firestore settings already applied, skipping.');
        }
    }
}

export { adminDb, admin };
export default admin;
