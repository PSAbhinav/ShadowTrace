"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Mail, ChevronRight, AlertTriangle, Terminal, Zap, RefreshCcw } from "lucide-react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import TotpSetupModal from "@/components/TotpSetupModal";
import { fetchGeoByIP } from "@/lib/geo";
import { getPublicIP } from "@/lib/network";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [error, setError] = useState("");
    const [showTotpSetup, setShowTotpSetup] = useState(false);
    const [pendingSession, setPendingSession] = useState<{
        session: any;
        uid: string;
        email: string;
        accounts: any[];
    } | null>(null);

    const [nodeId, setNodeId] = useState("");

    useEffect(() => {
        // Fix hydration mismatch by generating random ID only on client
        setNodeId(`${Math.floor(1000 + Math.random() * 9000)}`);
        
        // Check if session exists
        const session = localStorage.getItem("st_session");
        if (session) {
            router.push("/");
        }
    }, [router]);

    const logSecurityEvent = async (user: any, status: string) => {
        try {
            const publicIp = await getPublicIP();
            const geo = await fetchGeoByIP(publicIp);
            const logEntry = {
                uid: user.uid,
                email: user.email,
                accountId: user.email, // Link to account for dashboard filtering
                userName: user.displayName || "Unknown Commander",
                timestamp: serverTimestamp(),
                status: status,
                ip: geo?.query || "UNKNOWN",
                location: geo ? { city: geo.city, country: geo.country, lat: geo.lat, lng: geo.lon } : null,
                device: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    resolution: `${window.screen.width}x${window.screen.height}`,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                threatLevel: status === 'SUCCESS' ? 'LOW' : 'HIGH',
                type: 'AUTHENTICATION_EVENT'
            };

            await addDoc(collection(db, "logs"), logEntry);
            
            // For the Intelligence Feed: Create a 'safe' alert or a 'threat' alert
            await addDoc(collection(db, "alerts"), {
                accountId: user.email,
                ip: geo?.query || "UNKNOWN",
                createdAt: serverTimestamp(),
                status: status === 'SUCCESS' ? 'RESOLVED' : 'OPEN',
                location: geo ? { city: geo.city, country: geo.country, lat: geo.lat, lng: geo.lon } : null,
                threat: {
                    type: status === 'SUCCESS' ? 'IDENTITY_SUCCESS' : 'LOGIN_ANOMALY',
                    level: status === 'SUCCESS' ? 'Low' : 'High'
                },
                analyst: {
                    explanation: status === 'SUCCESS' 
                        ? `Identity handover successful. Secure session established from ${geo?.city || 'Verified Node'}.`
                        : `Repeated authentication failure detected from ${geo?.query || 'Unknown IP'}. Potential brute force attempt.`,
                    reasoning: status === 'SUCCESS' ? 'Valid credential + MFA match' : 'Multiple invalid credential signatures',
                    confidence: status === 'SUCCESS' ? 2 : 98
                },
                forensicDetails: logEntry.device
            });
            
            // Also update account status
            await setDoc(doc(db, "accounts", user.email!), {
                lastSeen: serverTimestamp(),
                lastIp: geo?.query || "UNKNOWN",
                lastLocation: geo ? `${geo.city}, ${geo.country}` : "Unknown",
                status: status === 'SUCCESS' ? 'SAFE' : 'INVESTIGATING'
            }, { merge: true });

        } catch (err) {
            console.warn("[ShadowTrace] Forensic Logging Deferred:", err);
        }
    };

    const handleGoogleLogin = async () => {
        if (!isAccepted) {
            setError("You must acknowledge the Security Protocol.");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const session = {
                name: user.displayName || "Unknown Commander",
                email: user.email || "",
                photoURL: user.photoURL || "",
                uid: user.uid,
                role: "COMMANDER_LEVEL_5"
            };

            // Sync Identity to Cloud Node (Zero-Hardcode)
            try {
                await setDoc(doc(db, "accounts", user.email!), {
                    id: user.email,
                    email: user.email,
                    provider: 'GMAIL',
                    status: 'SAFE',
                    lastRiskScore: 0,
                    active: true,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } catch (syncErr) {
                console.warn("Cloud Sync Deferred - Local session only", syncErr);
            }

            // Build accounts list
            const storedAccounts = localStorage.getItem("st_linked_accounts");
            const accounts = storedAccounts ? JSON.parse(storedAccounts) : [];
            if (!accounts.some((a: any) => a.email === user.email)) {
                accounts.push({
                    id: user.email,
                    email: user.email,
                    provider: 'GMAIL',
                    status: 'SAFE',
                    lastRiskScore: 0
                });
            }

            // Check if TOTP is already configured for this user
            const totpConfigured = localStorage.getItem('st_totp_configured') === 'true';
            if (!totpConfigured) {
                // Hold login and show TOTP setup
                setPendingSession({ session, uid: user.uid, email: user.email!, accounts });
                setShowTotpSetup(true);
                setIsLoading(false);
                return;
            }

            // TOTP already configured — proceed to dashboard
            await logSecurityEvent(user, 'SUCCESS');
            finalizLogin(session, accounts);
        } catch (err: any) {
            console.error("Identity Handshake Error:", err);
            let userMessage = "Credential verification timed out. Close any previous popups and retry.";
            
            if (err.code === 'auth/popup-blocked') {
                userMessage = "Security Handshake Blocked. Please allow popups for this security node.";
            } else if (err.code === 'auth/unauthorized-domain') {
                userMessage = "Domain Verification Failed. Port " + window.location.port + " is not authorized in Firebase.";
            } else if (err.code === 'auth/configuration-not-found') {
                userMessage = "Security Node Configuration Missing. Check AUTH_DOMAIN in .env.local";
            } else if (err.message) {
                userMessage = `Protocol Error: ${err.message}`;
            }

            setError(userMessage);
            setIsLoading(false);
        }
    };

    const finalizLogin = (session: any, accounts: any[]) => {
        localStorage.setItem("st_session", JSON.stringify(session));
        localStorage.setItem("st_user_name", session.name);
        localStorage.setItem("st_user_role", session.role);
        localStorage.setItem("st_linked_accounts", JSON.stringify(accounts));
        router.push("/");
    };

    const handleTotpSetupComplete = () => {
        if (!pendingSession) return;
        finalizLogin(pendingSession.session, pendingSession.accounts);
    };

    return (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-6 relative overflow-hidden font-inter">
            {/* TOTP Setup Modal — blocks dashboard access until MFA is configured */}
            <TotpSetupModal
                isOpen={showTotpSetup}
                onClose={() => setShowTotpSetup(false)} 
                uid={pendingSession?.uid || ""}
                email={pendingSession?.email || ""}
                onComplete={handleTotpSetupComplete}
            />
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-alert/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="grid-bg absolute inset-0 opacity-20" />
            </div>

            <main className="max-w-md w-full relative z-10">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="relative mb-6 group">
                        <div className="absolute inset-0 bg-cyber-accent/20 rounded-2xl blur-xl group-hover:bg-cyber-accent/40 transition-all duration-500" />
                        <div className="relative p-5 bg-zinc-900 border border-cyber-accent/50 rounded-2xl shadow-glow-cyan/20">
                            <Shield className="w-10 h-10 text-cyber-accent" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-cyber-accent rounded-full animate-ping opacity-50" />
                    </div>
                    
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-2 flex items-center gap-2">
                        Shadow<span className="text-cyber-accent not-italic">Trace</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Identity Security Protocol v5.0.0</p>
                </div>

                <div className="cyber-glass rounded-2xl p-8 border border-white/5 relative bg-zinc-900/50">
                    <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-cyber-accent/30 to-transparent" />
                    
                    <div className="space-y-6">
                        <div className="space-y-4 text-center py-4">
                            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Biometric Handshake Required</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ShadowTrace utilizes Google Identity Services for secure command node authentication.</p>
                        </div>

                        {/* Security Disclaimer */}
                        <div className="p-4 bg-black/60 rounded-xl border border-white/5 space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 text-cyber-warning mt-1 shrink-0" />
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase text-cyber-warning tracking-widest">Formal Security Disclaimer</h4>
                                    <p className="text-[10px] text-zinc-500 font-bold leading-normal">
                                        ShadowTrace is an observational forensics platform. We only request your identifier for metadata correlation. 
                                        <span className="text-zinc-300 italic block mt-1 underline underline-offset-2">ShadowTrace is used at the user's discretion.</span>
                                    </p>
                                </div>
                            </div>
                            
                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={isAccepted}
                                        onChange={(e) => setIsAccepted(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${
                                        isAccepted ? "bg-cyber-accent border-cyber-accent" : "bg-transparent border-zinc-700"
                                    }`}>
                                        {isAccepted && <Zap className="w-3 h-3 text-black" />}
                                    </div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                    Acknowledge Protocol
                                </span>
                            </label>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-cyber-alert text-[10px] font-black uppercase italic animate-in fade-in slide-in-from-top-1">
                                <Terminal className="w-3 h-3" />
                                {error}
                            </div>
                        )}

                        <button 
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full group relative py-4 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] rounded-xl hover:bg-cyber-accent transition-all active:scale-95 shadow-glow-cyan/20 disabled:opacity-50 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <>
                                        <RefreshCcw className="w-4 h-4 animate-spin" />
                                        Verifying Identity...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Initialize Command Node
                                    </>
                                )}
                            </span>
                            {isLoading && (
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                            )}
                        </button>
                    </div>
                </div>

                <footer className="mt-8 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3 opacity-30" />
                        Encrypted SOC Node: ST-{nodeId || "----"}-ALPHA
                    </p>
                </footer>
            </main>
            
            <style jsx>{`
                .grid-bg {
                    background-image: radial-gradient(circle at 1px 1px, rgba(0, 242, 255, 0.1) 1px, transparent 0);
                    background-size: 24px 24px;
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
            `}</style>
        </div>
    );
}
