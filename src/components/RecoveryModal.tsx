"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Shield, Loader2, CheckCircle2, X, AlertTriangle, Smartphone } from 'lucide-react';

interface RecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    email?: string;
    uid?: string;
}

type Step = 'INPUT' | 'VERIFYING' | 'SUCCESS' | 'FAILED';

const RecoveryModal: React.FC<RecoveryModalProps> = ({ isOpen, onClose, onSuccess, email, uid }) => {
    const [step, setStep] = useState<Step>('INPUT');
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [attemptCount, setAttemptCount] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Auto-dismiss on SUCCESS
    useEffect(() => {
        if (step === 'SUCCESS') {
            const timer = setTimeout(() => {
                onSuccess();
                onClose();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [step, onSuccess, onClose]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('INPUT');
            setOtpCode(['', '', '', '', '', '']);
            setError('');
            setAttemptCount(0);
        }
    }, [isOpen]);

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
        if (code.length !== 6) {
            setError('Enter all 6 digits');
            return;
        }

        const sessionStr = localStorage.getItem('st_session');
        const resolvedUid = uid || (sessionStr ? JSON.parse(sessionStr).uid : null);
        
        if (!resolvedUid) {
            setError('Session not found. Please log in again.');
            return;
        }

        setStep('VERIFYING');
        setError('');

        try {
            const res = await fetch('/api/totp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, mode: 'restore' })
            });

            const data = await res.json();

            if (data.success) {
                setStep('SUCCESS');
                // Shield will be lifted in Firestore by the API — all devices unlock simultaneously
            } else {
                const newCount = attemptCount + 1;
                setAttemptCount(newCount);
                setError(newCount >= 3 ? 'Too many failed attempts. Wait 30 seconds.' : (data.error || 'Invalid code. Try again.'));
                setOtpCode(['', '', '', '', '', '']);
                setStep('INPUT');
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
                
                if (newCount >= 3) {
                    setTimeout(() => setAttemptCount(0), 30000);
                }
            }
        } catch {
            setError('Verification failed. Check your connection.');
            setStep('INPUT');
        }
    };

    if (!isOpen) return null;

    const isLocked = attemptCount >= 3;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <div className="relative bg-[#020617] border border-cyber-accent/30 p-10 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(14,165,233,0.15)] overflow-hidden">
                {/* Top gradient bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyber-accent to-transparent opacity-50" />
                
                {/* Background glows */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyber-accent/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyber-pink/5 rounded-full blur-3xl pointer-events-none" />

                {/* Close button — only visible before success */}
                {step !== 'SUCCESS' && (
                    <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-10">
                        <X size={20} />
                    </button>
                )}

                <div className="flex flex-col items-center text-center gap-8">

                    {/* INPUT STEP */}
                    {step === 'INPUT' && (
                        <>
                            <div className="p-5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 relative">
                                <Shield className="w-16 h-16 text-cyber-accent" />
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full" />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Identity Restoration</h2>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                                    {email || "Personal Fleet"} • MFA Verification Required
                                </p>
                            </div>
                            
                            <div className="w-full space-y-4">
                                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                                    <p className="text-[10px] text-amber-300 font-bold text-left">
                                        Open Google Authenticator → ShadowTrace → Enter the 6-digit code
                                    </p>
                                </div>
                                
                                <div className="flex gap-3 justify-center">
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
                                            disabled={isLocked}
                                            className="w-12 h-14 text-center text-xl font-black text-white bg-zinc-900 border border-zinc-700 rounded-lg focus:border-cyber-accent focus:ring-1 focus:ring-cyber-accent focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase justify-center">
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleVerify}
                                disabled={isLocked || otpCode.join('').length !== 6}
                                className="w-full py-4 bg-cyber-accent text-black font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-glow-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Shield className="w-4 h-4" /> Restore Identity Access
                            </button>
                        </>
                    )}

                    {/* VERIFYING STEP */}
                    {step === 'VERIFYING' && (
                        <>
                            <div className="p-8 bg-zinc-900/50 rounded-2xl relative">
                                <Loader2 className="w-16 h-16 text-cyber-accent animate-spin" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Validating Identity Proof</h2>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Verifying TOTP Signature via Secure Server...</p>
                            </div>
                        </>
                    )}

                    {/* SUCCESS STEP — Auto-dismisses in 2.5s */}
                    {step === 'SUCCESS' && (
                        <>
                            <div className="p-6 bg-green-500/20 rounded-full border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                <ShieldCheck className="w-16 h-16 text-green-500 animate-bounce" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Access Restored</h2>
                                <p className="text-[10px] text-green-500 font-black uppercase tracking-[0.3em]">Fleet Shield Lifted • ALL SYSTEMS NOMINAL</p>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all duration-2500 ease-linear w-full" />
                            </div>
                            <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Closing automatically...</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecoveryModal;
