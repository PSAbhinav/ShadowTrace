import { NextRequest, NextResponse } from 'next/server';
import { admin, getAdminApp } from '@/lib/firebase-admin';

/**
 * ShadowTrace Session Revocation API
 * Implements "Sign Out Everywhere" by invalidating all refresh tokens for the user.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Extract Bearer Token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
        }
        
        const idToken = authHeader.split('Bearer ')[1];

        // 2. Initialize Admin SDK
        const app = getAdminApp();
        const auth = admin.auth(app as admin.app.App);

        // 3. Verify current token to identify the user
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (!uid) {
            return NextResponse.json({ error: 'Invalid identification signature' }, { status: 403 });
        }

        // 4. Revoke ALL refresh tokens for the UID
        // This forces all devices to re-authenticate on their next request
        await auth.revokeRefreshTokens(uid);
        
        // 5. Log the security event
        console.log(`[SECURITY] Global session revocation triggered for UID: ${uid}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Global session revocation successful. All devices signed out.',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[REVOKE_SESSIONS_EXCEPTION]', error);
        
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Identity session expired' }, { status: 401 });
        }
        
        return NextResponse.json({ 
            error: 'Failed to revoke global sessions. Please contact ShadowTrace support.',
            details: error.message 
        }, { status: 500 });
    }
}
