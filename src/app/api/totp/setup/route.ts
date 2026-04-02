// src/app/api/totp/setup/route.ts
// Generates a new TOTP secret for a user and saves it to Firestore (Admin SDK)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const speakeasy = require('speakeasy') as typeof import('speakeasy');

export async function POST(req: NextRequest) {
    try {
        const { uid, email } = await req.json();
        if (!uid || !email) {
            return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
        }

        // Check if user already has TOTP set up
        let userDoc;
        try {
            userDoc = await adminDb.collection('accounts').doc(email).get();
        } catch (dbErr: any) {
            return NextResponse.json({ error: `Database error` }, { status: 500 });
        }

        if (userDoc.exists && userDoc.data()?.totpSetupComplete) {
            return NextResponse.json({ error: 'TOTP already configured' }, { status: 409 });
        }

        // Generate new TOTP secret
        const secretObj = speakeasy.generateSecret({
            name: `ShadowTrace:${email}`,
            length: 20
        });

        const otpauth = secretObj.otpauth_url!;
        const base32Secret = secretObj.base32;

        // Store secret in Firestore (server-side only, never sent to client after this)
        await adminDb.collection('accounts').doc(email).set({
            totpSecret: base32Secret,
            totpSetupComplete: false,
            email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Return the OTP Auth URL (for QR code) and the raw secret (for manual entry)
        return NextResponse.json({ otpauth, secret: base32Secret });
    } catch (err: any) {
        console.error('[TOTP_SETUP]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
