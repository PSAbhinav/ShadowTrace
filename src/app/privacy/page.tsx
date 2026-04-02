"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Lock, Fingerprint, EyeOff, ShieldCheck, Database, Key } from 'lucide-react';

const PrivacyPage = () => {
    const protocols = [
        {
            title: "Zero-Knowledge Identity Trace",
            desc: "The Sentinel AI monitors patterns, not personhood. All data points are anonymized before being correlated into alert clusters.",
            icon: EyeOff,
            color: "text-blue-500"
        },
        {
            title: "Hardware isolation",
            desc: "Biometric signatures (Fingerprint/FaceID) are processed exclusively within your hardware's Secure Enclave (TPM).",
            icon: Key,
            color: "text-cyber-accent"
        },
        {
            title: "Encrypted Data Transmission",
            desc: "All forensic alerts are transmitted via AES-256 GCM encrypted channels with ephemeral key rotation.",
            icon: Lock,
            color: "text-green-500"
        }
    ];

    return (
        <main className="min-h-screen bg-cyber-bg p-4 md:p-12 relative overflow-hidden font-inter selection:bg-cyber-blue selection:text-white">
            {/* Background elements */}
            <div className="fixed top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyber-blue/50 to-transparent" />
            <div className="absolute top-1/4 -right-48 w-[600px] h-[600px] bg-cyber-blue/5 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-4xl mx-auto flex flex-col gap-12 relative z-10">
                {/* Header */}
                <header className="flex items-center gap-6 border-b border-cyber-border pb-10">
                    <Link 
                        href="/settings" 
                        className="p-4 bg-zinc-900 border border-cyber-border rounded-2xl text-zinc-500 hover:text-white hover:border-cyber-blue/50 transition-all hover:scale-105"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
                            Identity <span className="text-cyber-blue not-italic">Rights</span>
                            <ShieldCheck className="w-8 h-8 text-cyber-blue opacity-50" />
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-black mt-2">Privacy Framework v4.0.12 • Zero-Knowledge Protocols</p>
                    </div>
                </header>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {protocols.map((p, i) => (
                        <div key={i} className="cyber-card p-8 group hover:border-white/20 transition-all hover:-translate-y-1">
                            <p.icon className={`w-10 h-10 ${p.color} mb-6 group-hover:scale-110 transition-transform`} />
                            <h3 className="text-xs font-black uppercase tracking-widest text-white mb-4 italic">{p.title}</h3>
                            <p className="text-zinc-500 text-[11px] leading-relaxed font-bold uppercase">{p.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Main Policy Detail */}
                <div className="cyber-card p-12 bg-zinc-900/40 relative overflow-hidden space-y-10 group">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyber-blue/30 to-transparent" />
                    
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-black italic text-white uppercase tracking-tighter flex items-center gap-3">
                            The Sentinel <span className="text-cyber-blue not-italic">Privacy Shield</span>
                        </h2>
                        <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                            ShadowTrace's privacy philosophy is built on "Data Atrophy". We do not record your account passwords, private messages, or financial information. The Sentinel AI kernel only interacts with metadata—specifically authentication timestamps, location hashes, and session identifiers—to build a forensic threat model. 
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-cyber-border/30">
                        <div className="space-y-4">
                            <h4 className="text-[10px] text-cyber-blue uppercase font-black tracking-widest flex items-center gap-2">
                                <Database className="w-3 h-3" /> Data Retention Protocol
                            </h4>
                            <p className="text-zinc-500 text-[11px] uppercase font-bold tracking-wide">
                                All forensic logs older than 7,200 seconds (2 hours) are automatically purged from local memory and Firestore indexes unless flagged for permanent Archive by the Fleet Commander.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] text-cyber-blue uppercase font-black tracking-widest flex items-center gap-2">
                                <Fingerprint className="w-3 h-3" /> Biometric Integrity
                            </h4>
                            <p className="text-zinc-500 text-[11px] uppercase font-bold tracking-wide">
                                ShadowTrace never sends raw biometric data to our cloud servers. Your fingerprint is a key that unlocks a localized hardware-bound secret. If your hardware is lost, the recovery flow requires a Manual Override code generated at setup.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer HUD elements */}
                <footer className="mt-10 border-t border-cyber-border/50 pt-10 pb-20 flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-4 rounded-full bg-linear-to-br from-cyber-blue/10 to-transparent border border-cyber-blue/20">
                            <EyeOff size={32} className="text-cyber-blue opacity-50" />
                        </div>
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Your Private Identity is the ultimate Forensic Asset.</p>
                    </div>
                </footer>
            </div>
        </main>
    );
};

export default PrivacyPage;
