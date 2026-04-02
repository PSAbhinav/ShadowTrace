// src/app/api/totp/verify/route.ts
// Verifies a TOTP code — handles both initial setup confirmation and shield restoration
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const speakeasy = require('speakeasy') as typeof import('speakeasy');

export async function POST(req: NextRequest) {
    try {
        const { email, code, mode } = await req.json();
        // mode: 'setup' (confirms initial setup) | 'restore' (gates identity restoration)

        if (!email || !code) {
            return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
        }

        const userDoc = await adminDb.collection('accounts').doc(email).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const data = userDoc.data()!;
        const totpSecret: string = data.totpSecret;

        if (!totpSecret) {
            return NextResponse.json({ error: 'TOTP not configured. Complete setup first.' }, { status: 403 });
        }

        // Verify with 2 window (±60 seconds) to allow for clock drift
        const isValid = speakeasy.totp.verify({
            secret: totpSecret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Invalid or expired code. Try again.' }, { status: 401 });
        }

        // --- NEW: AUDIT LOGGING ---
        // Log successful identity verification to the 'alerts' collection
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            await adminDb.collection('alerts').add({
                accountId: data.id, // Use the internal ID to match Dashboard filter
                email: email,
                ip: ip.split(',')[0],
                endpoint: '/api/totp/verify',
                status: 'AUTHORIZED',
                threat: {
                    detected: false,
                    type: 'IDENTITY_SUCCESS',
                    level: 'Low',
                    score: 0,
                    intel: {}
                },
                analyst: {
                    explanation: 'Multi-factor authentication handshake successful. Identity verified.',
                    reasoning: 'TOTP 6-digit challenge matched the server-side secret record.'
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (logErr) {
            console.error('[AUDIT_LOG_FAILURE]', logErr);
        }
        // --- END AUDIT LOGGING ---

        if (mode === 'setup') {
            // Mark TOTP as fully configured
            await adminDb.collection('accounts').doc(email).update({
                totpSetupComplete: true,
                totpConfiguredAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        if (mode === 'restore') {
            // Lift the safety shield in Firestore — ALL devices unlock simultaneously via onSnapshot
            await adminDb.collection('settings').doc('security_status').set({
                shieldActive: false,
                restoredAt: admin.firestore.FieldValue.serverTimestamp(),
                restoredBy: email
            }, { merge: true });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[TOTP_VERIFY]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
