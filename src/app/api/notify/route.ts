// src/app/api/notify/route.ts
// Sends real SMS via Twilio and real email via Resend on shield activation
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { Resend } from 'resend';

const twilioClient = process.env.TWILIO_ACCOUNT_SID
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export async function POST(req: NextRequest) {
    try {
        const { email, phone, alertType, ip, location, timestamp } = await req.json();

        const alertTime = timestamp ? new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const locationStr = location?.city ? `${location.city} (${ip})` : ip || 'Unknown Origin';

        const results: Record<string, any> = {};

        // --- REAL EMAIL via Resend ---
        // NOTE: 'from' uses onboarding@resend.dev (Resend default sender, no domain verification needed)
        // Once you verify shadowtrace.app in Resend → Domains, change to: security@shadowtrace.app
        if (resend && email) {
            try {
                const emailResult = await resend.emails.send({
                    from: 'ShadowTrace Guardian <onboarding@resend.dev>',
                    to: [email],
                    subject: `🚨 CRITICAL: Safety Shield Activated — ${alertType}`,
                    html: `
                        <div style="background:#020617;color:#fff;padding:40px;font-family:monospace;border:1px solid #0ea5e9;">
                            <div style="border-bottom:1px solid #0ea5e9;padding-bottom:20px;margin-bottom:20px;">
                                <h1 style="color:#0ea5e9;font-size:28px;margin:0;letter-spacing:0.1em;">⚡ SHADOWTRACE SAFETY GUARDIAN</h1>
                                <p style="color:#71717a;font-size:11px;margin:4px 0 0;letter-spacing:0.3em;text-transform:uppercase;">Identity Security Alert — v5.0.0</p>
                            </div>
                            
                            <div style="background:#0f172a;border:1px solid #f43f5e;padding:24px;border-radius:8px;margin-bottom:24px;">
                                <p style="color:#f43f5e;font-size:12px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 16px;">🔴 CRITICAL SECURITY EVENT</p>
                                <table style="width:100%;border-collapse:collapse;">
                                    <tr><td style="color:#71717a;padding:6px 0;font-size:11px;width:160px;">THREAT TYPE</td><td style="color:#fff;font-size:12px;font-weight:bold;">${alertType}</td></tr>
                                    <tr><td style="color:#71717a;padding:6px 0;font-size:11px;">ORIGIN IP</td><td style="color:#f43f5e;font-size:12px;font-family:monospace;">${locationStr}</td></tr>
                                    <tr><td style="color:#71717a;padding:6px 0;font-size:11px;">DETECTED AT (IST)</td><td style="color:#fff;font-size:12px;">${alertTime}</td></tr>
                                    <tr><td style="color:#71717a;padding:6px 0;font-size:11px;">SHIELD STATUS</td><td style="color:#ef4444;font-size:12px;font-weight:bold;">🔒 LOCKED — ACCESS SUSPENDED</td></tr>
                                </table>
                            </div>
                            
                            <div style="background:#0c1a0e;border:1px solid #22c55e;padding:20px;border-radius:8px;margin-bottom:24px;">
                                <p style="color:#22c55e;font-size:11px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">TO RESTORE ACCESS</p>
                                <p style="color:#a1a1aa;font-size:12px;margin:0;">Open ShadowTrace → Click "Restore Identity" → Enter your Google Authenticator 6-digit code.</p>
                            </div>
                            
                            <p style="color:#3f3f46;font-size:10px;text-align:center;margin-top:32px;">This is an automated security alert from ShadowTrace. Do not reply to this email.</p>
                        </div>
                    `
                });
                results.email = { success: true, id: emailResult.data?.id };
            } catch (emailErr: any) {
                results.email = { success: false, error: emailErr.message };
            }
        } else {
            results.email = { success: false, error: 'Resend not configured or no email provided' };
        }

        // --- REAL SMS via Twilio ---
        if (twilioClient && phone && process.env.TWILIO_PHONE_NUMBER) {
            try {
                const smsResult = await twilioClient.messages.create({
                    body: `🚨 SHADOWTRACE ALERT: Safety Shield activated. Threat: ${alertType} from ${locationStr} at ${alertTime} IST. Open app to restore access using your Authenticator code.`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phone
                });
                results.sms = { success: true, sid: smsResult.sid };
            } catch (smsErr: any) {
                results.sms = { success: false, error: smsErr.message };
            }
        } else {
            results.sms = { success: false, error: 'Twilio not configured or no phone provided' };
        }

        console.log('[NOTIFY]', JSON.stringify(results));
        return NextResponse.json({ success: true, results });
    } catch (err: any) {
        console.error('[NOTIFY_ERROR]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
