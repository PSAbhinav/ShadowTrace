"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Smartphone, CheckCircle2, Copy, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';

interface TotpSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    uid: string;
    email: string;
    onComplete: () => void;
}

type Step = 'GENERATING' | 'SCAN' | 'CONFIRM' | 'SUCCESS' | 'ERROR';

const TotpSetupModal: React.FC<TotpSetupModalProps> = ({ isOpen, onClose, uid, email, onComplete }) => {
    const [step, setStep] = useState<Step>('GENERATING');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [manualCode, setManualCode] = useState('');
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!isOpen || !uid || !email) return;

        const setup = async () => {
            try {
                const res = await fetch('/api/totp/setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid, email })
                });

                if (res.status === 409) {
                    // Already set up — skip directly
                    onComplete();
                    return;
                }

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Setup failed');
                }

                const { otpauth, secret } = await res.json();
                
                // Generate QR code image
                const dataUrl = await QRCode.toDataURL(otpauth, {
                    width: 220,
                    margin: 1,
                    color: { dark: '#0ea5e9', light: '#020617' }
                });
                setQrDataUrl(dataUrl);
                setManualCode(secret);
                setStep('SCAN');
            } catch (err: any) {
                console.error('[TOTP_SETUP_CLIENT_ERROR]', err);
                setError(err.message || 'Failed to generate setup code');
                setStep('ERROR');
            }
        };
        setup();
    }, [uid, email, onComplete]);

    const handleOtpInput = (value: string, index: number) => {
        if (!/^\d*$/.test(value)) return;
        const updated = [...otpCode];
        updated[index] = value.slice(-1);
        setOtpCode(updated);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
            setOtpCode(digits);
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otpCode.join('');
        if (code.length !== 6) { setError('Enter the full 6-digit code'); return; }
        
        setIsVerifying(true);
        setError('');

        try {
            const res = await fetch('/api/totp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, mode: 'setup' })
            });
            const data = await res.json();
            if (data.success) {
                // Mark locally that this user has TOTP configured
                localStorage.setItem('st_totp_configured', 'true');
                setStep('SUCCESS');
                setTimeout(onComplete, 2500);
            } else {
                setError(data.error || 'Invalid code. Try again.');
                setOtpCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch {
            setError('Verification failed. Check your connection.');
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <div className="relative bg-[#020617] border border-cyber-accent/30 p-8 rounded-2xl max-w-md w-full shadow-[0_0_60px_rgba(14,165,233,0.15)] overflow-hidden">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-accent to-transparent" />
                
                {/* Background glow */}
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyber-accent/5 rounded-full blur-3xl pointer-events-none" />

                {/* GENERATING */}
                {step === 'GENERATING' && (
                    <div className="flex flex-col items-center gap-6 py-8">
                        <div className="p-5 bg-cyber-accent/10 rounded-2xl border border-cyber-accent/20">
                            <Loader2 className="w-12 h-12 text-cyber-accent animate-spin" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Generating Security Key</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Initializing TOTP Protocol...</p>
                        </div>
                    </div>
                )}

                {/* SCAN QR */}
                {step === 'SCAN' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-cyber-accent/10 rounded-xl border border-cyber-accent/20">
                                <Smartphone className="w-6 h-6 text-cyber-accent" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Two-Factor Setup</h2>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Mandatory — Google Authenticator Required</p>
                            </div>
                        </div>

                        <div className="p-3 bg-[#020617] rounded-xl border border-cyber-accent/30 shadow-[0_0_20px_rgba(14,165,233,0.15)]">
                            {qrDataUrl && <img src={qrDataUrl} alt="TOTP QR Code" className="w-[200px] h-[200px]" />}
                        </div>

                        <div className="w-full space-y-2">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                                1. Open <span className="text-cyber-accent">Google Authenticator</span> → Add Account → Scan QR
                            </p>
                            <div className="flex items-center gap-2 p-3 bg-zinc-900/80 rounded-lg border border-white/5">
                                <code className="text-[9px] text-cyber-accent font-mono flex-1 truncate">{manualCode}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(manualCode)}
                                    className="p-1.5 hover:bg-white/5 rounded transition-colors"
                                    title="Copy manual code"
                                >
                                    <Copy className="w-3 h-3 text-zinc-400" />
                                </button>
                            </div>
                            <p className="text-[9px] text-zinc-600 text-center font-bold">Or enter the code manually in the app</p>
                        </div>

                        <button
                            onClick={() => setStep('CONFIRM')}
                            className="w-full py-3.5 bg-cyber-accent text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-all"
                        >
                            I've Scanned the QR Code →
                        </button>
                    </div>
                )}

                {/* CONFIRM CODE */}
                {step === 'CONFIRM' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                                <Shield className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">Confirm Setup</h2>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Enter the 6-digit code from your Authenticator</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {otpCode.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => { inputRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleOtpInput(e.target.value, i)}
                                    onKeyDown={e => handleKeyDown(e, i)}
                                    onPaste={handlePaste}
                                    className="w-12 h-14 text-center text-xl font-black text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:border-cyber-accent focus:ring-1 focus:ring-cyber-accent focus:outline-none transition-all"
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase">
                                <AlertTriangle className="w-3 h-3" />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || otpCode.join('').length !== 6}
                            className="w-full py-3.5 bg-cyber-accent text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Confirm & Activate MFA'}
                        </button>

                        <button
                            onClick={() => setStep('SCAN')}
                            className="text-[9px] text-zinc-500 hover:text-zinc-300 uppercase font-bold tracking-widest transition-colors flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> Back to QR Code
                        </button>
                    </div>
                )}

                {/* SUCCESS */}
                {step === 'SUCCESS' && (
                    <div className="flex flex-col items-center gap-6 py-6">
                        <div className="p-6 bg-green-500/20 rounded-full border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">MFA Activated</h2>
                            <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.3em] mt-1">Identity Protection Enabled • Entering Dashboard...</p>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 animate-[progress_2.5s_linear_forwards]" style={{ animation: 'width 2.5s linear forwards', width: '100%' }} />
                        </div>
                    </div>
                )}

                {/* ERROR */}
                {step === 'ERROR' && (
                    <div className="flex flex-col items-center gap-6 py-6">
                        <div className="p-5 bg-red-500/10 rounded-2xl border border-red-500/20">
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Setup Failed</h2>
                            <p className="text-[10px] text-red-400 font-bold mt-1">{error}</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                            Retry Setup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TotpSetupModal;
