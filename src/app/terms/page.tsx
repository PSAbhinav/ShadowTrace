"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Shield, Scale, FileText, AlertTriangle, Fingerprint } from 'lucide-react';

const TermsPage = () => {
    return (
        <main className="min-h-screen bg-cyber-bg p-4 md:p-12 relative overflow-hidden font-inter selection:bg-cyber-accent selection:text-black">
            {/* Background Aesthetic */}
            <div className="fixed top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyber-accent/50 to-transparent" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyber-accent/5 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="max-w-4xl mx-auto flex flex-col gap-12 relative z-10">
                {/* Header */}
                <header className="flex items-center gap-6 border-b border-cyber-border pb-10">
                    <Link 
                        href="/settings" 
                        className="p-4 bg-zinc-900 border border-cyber-border rounded-2xl text-zinc-500 hover:text-white hover:border-cyber-accent/50 transition-all hover:scale-105"
                    >
                        <ChevronLeft size={24} />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
                            Guardian <span className="text-cyber-accent not-italic">Agreement</span>
                            <Scale className="w-8 h-8 text-cyber-accent opacity-50" />
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-black mt-2">Protocol Revision: 2026.03.v9 • Operational Authorization</p>
                    </div>
                </header>

                {/* Document Body */}
                <div className="cyber-card p-8 md:p-16 space-y-12 bg-zinc-900/40 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyber-accent/20 via-transparent to-cyber-accent/20" />
                    
                    {/* Section 1: Authorization */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-cyber-accent mb-4">
                            <Shield className="w-5 h-5" />
                            <h2 className="text-xs font-black uppercase tracking-[0.3em]">01. Autonomous Authorization</h2>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                            By initializing the ShadowTrace Guardian Protocol, the user grants permanent, irrevocable authorization to the AI Sentinel Kernel to perform fleet-wide account lockdowns upon correlation of high-risk flight patterns. This includes, but is not limited to, the suspension of OAuth tokens, session terminations, and firewall-level IP blacklisting.
                        </p>
                    </section>

                    {/* Section 2: Liability */}
                    <section className="space-y-6 p-8 bg-zinc-900/50 border border-cyber-border rounded-2xl">
                        <div className="flex items-center gap-3 text-cyber-accent mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            <h2 className="text-xs font-black uppercase tracking-[0.3em]">02. Liability Shield</h2>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                            ShadowTrace operates as a forensic defense architecture. The Sentinel AI makes intervention decisions based on probabilistic threat models. The user agrees that ShadowTrace and its developers are not liable for transient service interruptions, false-positive lockdowns, or the "digital isolation" that may occur during a verified Fleet Attack Event.
                        </p>
                    </section>

                    {/* Section 3: Identity Integrity */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 text-cyber-accent mb-4">
                            <Fingerprint className="w-5 h-5" />
                            <h2 className="text-xs font-black uppercase tracking-[0.3em]">03. Identity Integrity</h2>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                            Identity restoration requires mandatory biometric or hardware-backed (TPM/FIDO2) verification. ShadowTrace does not store biometric data; all verification is processed via localized hardware-security modules (HSM) on the user's terminal.
                        </p>
                    </section>

                    {/* Stamp / Signature Area */}
                    <div className="pt-12 border-t border-cyber-border/30 flex flex-col md:flex-row justify-between items-end gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse" />
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Digital Signature Status</span>
                            </div>
                            <div className="p-6 border border-dashed border-cyber-border/50 rounded-xl bg-black/20">
                                <span className="text-cyber-accent font-mono text-xs italic tracking-widest opacity-40 uppercase font-black">
                                    [ SIGNATURE_BY_KEY_LOAD_REQD ]
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">Seal of the</p>
                            <p className="text-xl font-black italic text-zinc-300 uppercase leading-tight">ShadowTrace <br/> Sentinel Core</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="pb-20 flex justify-center">
                    <button className="px-10 py-4 bg-white text-black font-black uppercase tracking-[0.4em] text-[10px] hover:bg-cyber-accent hover:scale-105 active:scale-95 transition-all shadow-glow-white/10 hover:shadow-glow-cyan/20">
                        Acknowledge & Sync Protocols
                    </button>
                </footer>
            </div>
        </main>
    );
};

export default TermsPage;
