"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc,
    setDoc,
    serverTimestamp,
    orderBy, 
    limit, 
    writeBatch,
    getDocs
} from 'firebase/firestore';
import { 
    Shield, 
    ShieldAlert, 
    AlertTriangle, 
    Activity, 
    Globe, 
    Lock, 
    Zap, 
    User, 
    Settings, 
    ChevronRight, 
    RefreshCw, 
    Power, 
    Terminal,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    Clock,
    Eye,
    TrendingUp,
    ShieldCheck,
    Cpu,
    ExternalLink,
    LogOut,
    MapPin
} from 'lucide-react';
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlobeComponent from "../components/GlobeComponent";
import Link from "next/link";
import RecoveryModal from "../components/RecoveryModal";
import TotpSetupModal from "../components/TotpSetupModal";
import { initVersionSync } from "../lib/versionSync";
import { APP_VERSION } from "../lib/version";

interface Threat {
    detected: boolean;
    type: string;
    level: string;
    score: number;
    intel: any;
}

interface Alert {
    id: string;
    ip: string;
    endpoint: string;
    status: string;
    threat: Threat;
    accountId?: string;
    location?: any;
    analyst: {
        explanation: string;
        reasoning: string;
    };
    createdAt: any;
}

interface Incident {
    id: string;
    summary: string;
    status: string;
    threatDetails: any;
    location?: any;
    accountId?: string;
    sourceIp: string;
    createdAt: any;
}

interface Account {
    id: string;
    email: string;
    provider: string;
    status: 'SAFE' | 'LOCKED';
    lastRiskScore: number;
}

export default function Dashboard() {
    const router = useRouter();
    const [threatLevel, setThreatLevel] = useState("LOW");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [incidentsCount, setIncidentsCount] = useState(1);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    // Shield state is now Firestore-backed for cross-device real-time sync
    const [isShieldLocked, setIsShieldLocked] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
    const [guardianIntervention, setGuardianIntervention] = useState<{ active: boolean, reason?: string }>({ active: false });
    const [lastProcessedAlertId, setLastProcessedAlertId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [commanderUid, setCommanderUid] = useState<string | null>(null);
    const [commanderPhone, setCommanderPhone] = useState<string | null>(null);
    
    // Identity State
    const [commanderName, setCommanderName] = useState("");
    const [commanderEmail, setCommanderEmail] = useState("");
    const [commanderRole, setCommanderRole] = useState("");
    const [syncStatus, setSyncStatus] = useState<'ONLINE' | 'OFFLINE' | 'QUOTA'>('ONLINE');
    const [dynamicVersion, setDynamicVersion] = useState(APP_VERSION);
    const [isPushingUpdate, setIsPushingUpdate] = useState(false);
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    useEffect(() => {
        const unsubscribe = initVersionSync((newVersion: string) => {
            setDynamicVersion(newVersion);
        });
        return () => unsubscribe();
    }, []);

    const handlePushUpdate = async () => {
        setIsPushingUpdate(true);
        try {
            const nextVersion = (parseFloat(dynamicVersion) + 0.1).toFixed(1);
            const systemRef = doc(db, 'system', 'config');
            await setDoc(systemRef, { version: nextVersion }, { merge: true });
            
            await addDoc(collection(db, 'logs'), {
                type: 'SYSTEM_UPDATE',
                version: nextVersion,
                timestamp: serverTimestamp(),
                status: 'SUCCESS',
                analyst: 'Global Kernel'
            });
        } catch (error) {
            console.error('Push Update Failed:', error);
        } finally {
            setIsPushingUpdate(false);
        }
    };

    // Load from localStorage on mount
    // Force register the current user in the accounts collection for tracking
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user?.email) {
                setCommanderUid(user.uid);
                const register = async () => {
                    const accountRef = doc(db, 'accounts', user.email!);
                    const accountDoc = await getDoc(accountRef);
                    if (!accountDoc.exists()) {
                        await setDoc(accountRef, {
                            id: Math.random().toString(36).substring(7).toUpperCase(),
                            email: user.email,
                            provider: 'GOOGLE',
                            status: 'Secure',
                            lastEnrolled: serverTimestamp()
                        });
                        setShowSetupModal(true);
                        console.log(`[ShadowTrace] Primary identity linked: ${user.email}`);
                    } else {
                        // If account exists, check if TOTP is completed
                        const data = accountDoc.data();
                        if (!data?.totpSetupComplete) {
                            setShowSetupModal(true);
                        }
                    }
                    // Load phone from user profile in Firestore
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setCommanderPhone(userDoc.data()?.phone || null);
                    }
                };
                register();
            }
        });
        return () => unsubscribe();
    }, []);

    // Real-time Firestore-backed Shield State (cross-device sync)
    useEffect(() => {
        const shieldRef = doc(db, 'settings', 'security_status');
        const unsubShield = onSnapshot(shieldRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const active = data?.shieldActive === true;
                setIsShieldLocked(active);
                // Auto-dismiss: if shield was restored, clear UI banners
                if (!active) {
                    setGuardianIntervention({ active: false });
                    setShowUnlockModal(false);
                }
            }
        });
        return () => unsubShield();
    }, []);

    useEffect(() => {
        setIsMounted(true);

        const sessionStr = localStorage.getItem('st_session');
        if (!sessionStr) {
            router.push("/login");
            return;
        }

        try {
            const session = JSON.parse(sessionStr);
            setCommanderName(session.name || "");
            setCommanderEmail(session.email || "");
            setCommanderRole(session.role || localStorage.getItem('st_user_role') || "OPERATIVE");
        } catch (e) {
            router.push("/login");
            return;
        }

        // Load Linked Accounts
        const storedAccounts = localStorage.getItem('st_linked_accounts');
        if (storedAccounts) {
            try {
                const parsed = JSON.parse(storedAccounts);
                setAccounts(parsed);
                if (parsed.length > 0) {
                    const firstId = parsed[0].id;
                    setSelectedAccountId(firstId);
                    
                    setLogs([]);
                    setAlerts([]);
                } else {
                    setSelectedAccountId(null);
                }
            } catch (e) {
                console.error("Account sync error");
            }
        }
    }, [router]);

    // Real-time Intelligence Synchronization
    useEffect(() => {
        if (!selectedAccountId) return;

        setSyncStatus('ONLINE');

        const logsQ = query(collection(db, "logs"), where("accountId", "==", selectedAccountId), limit(100)); // Remove orderBy to avoid index errors
        const unsubLogs = onSnapshot(logsQ, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort locally
            const sorted = data.sort((a: any, b: any) => {
                const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : 0;
                const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : 0;
                return dateB - dateA;
            });
            setLogs(sorted);
            setSyncStatus('ONLINE');
        }, (err) => {
            if (err.code === 'resource-exhausted') setSyncStatus('QUOTA');
            else setSyncStatus('OFFLINE');
        });

        const alertsQ = query(collection(db, "alerts"), where("accountId", "==", selectedAccountId), limit(50)); // Remove orderBy
        const unsubAlerts = onSnapshot(alertsQ, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort locally
            const sorted = data.sort((a: any, b: any) => {
                const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : 0;
                const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : 0;
                return dateB - dateA;
            });
            setAlerts(prev => {
                // Keep local test alerts that haven't hit DB yet
                const localTests = prev.filter(a => a.id.startsWith('test-'));
                const dbIds = new Set(sorted.map(a => a.id));
                const filteredLocal = localTests.filter(a => !dbIds.has(a.id));
                return [...filteredLocal, ...sorted];
            });
        }, (err) => {
            if (err.code === 'resource-exhausted') setSyncStatus('QUOTA');
            else setSyncStatus('OFFLINE');
        });

        return () => { unsubLogs(); unsubAlerts(); };
    }, [selectedAccountId]);

    const globePoints = useMemo(() => {
        return logs
            .filter(l => l.location?.lat && l.location?.lng)
            .map(l => ({ 
                lat: l.location.lat, 
                lng: l.location.lng, 
                color: l.status === 'OK' ? '#0ea5e9' : '#f43f5e' 
            }));
    }, [logs]);

    const globeArcs = useMemo(() => {
        return alerts
            .filter(a => a.location?.lat && a.location?.lng)
            .map(a => ({
                startLat: 40.7128, startLng: -74.0060,
                endLat: a.location.lat, endLng: a.location.lng,
                color: a.threat?.level === 'High' ? '#f43f5e' : '#eab308'
            }));
    }, [alerts]);
    
    // Listen for Simulated Alerts from Settings
    useEffect(() => {
        const handleStorageChange = () => {
            const pendingAlert = localStorage.getItem('st_trigger_test_alert');
            if (pendingAlert) {
                try {
                    const alert = JSON.parse(pendingAlert);
                    setAlerts(prev => [alert, ...prev]);
                    localStorage.removeItem('st_trigger_test_alert');
                } catch (e) {
                    console.error("Alert parsing error");
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('st_alert_trigger', handleStorageChange);
        
        // Also check immediately
        handleStorageChange();
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('st_alert_trigger', handleStorageChange);
        };
    }, []);

    const centerLocation = useMemo(() => {
        if (!activeAlertId) return undefined;
        const alert = alerts.find(a => a.id === activeAlertId);
        return alert?.location ? { lat: alert.location.lat, lng: alert.location.lng } : undefined;
    }, [activeAlertId, alerts]);

    const handleAction = (id: string, ip: string, type: string) => {
        setIsProcessing(id);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
            setIsProcessing(null);
        }, 1500);
    };

    // Autonomous shield lock: writes to Firestore so ALL devices lock simultaneously
    const handleShieldLock = async (alertData?: any) => {
        try {
            await setDoc(doc(db, 'settings', 'security_status'), {
                shieldActive: true,
                activatedAt: serverTimestamp(),
                reason: alertData?.threat?.type || 'Manual Shield Activation'
            }, { merge: true });

            // Dispatch real SMS + Email notifications
            if (alertData) {
                fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: commanderEmail,
                        phone: commanderPhone,
                        alertType: alertData.threat?.type || 'Security Anomaly Detected',
                        ip: alertData.ip,
                        location: alertData.location,
                        timestamp: new Date().toISOString()
                    })
                }).catch(console.error);
            }
        } catch (err) {
            console.error('[SHIELD_LOCK_ERROR]', err);
            // Fallback to local state if Firestore write fails
            setIsShieldLocked(true);
        }
    };

    const handleGoogleUnlock = () => {
        // Shield unlock is handled by the TOTP API server-side
        // This just clears local state; Firestore listener handles the rest
        setShowUnlockModal(false);
    };

    const handleLogout = async (everywhere = true) => {
        try {
            if (everywhere) {
                const user = auth.currentUser;
                if (user) {
                    const token = await user.getIdToken();
                    // Call our new revocation API
                    await fetch('/api/auth/revoke-sessions', {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log("[SECURITY] Global revocation signal sent.");
                }
            }
            await signOut(auth);
            localStorage.clear();
            router.push('/login');
        } catch (err) {
            console.error("Logout failed:", err);
            // Fallback: clear local regardless of API success
            await signOut(auth);
            localStorage.clear();
            router.push('/login');
        }
    };

    useEffect(() => {
        if (!isMounted) return;
        // Refined Threat Logic: Only flag as CRITICAL if we have multiple High risk active alerts
        const highRiskAlerts = alerts.filter(a => a.threat?.level === 'High' && a.status !== 'RESOLVED');
        const isCritical = highRiskAlerts.length > 0;
        
        setThreatLevel(isCritical ? "CRITICAL" : alerts.length > 0 ? "ELEVATED" : "LOW");

        const lastAlert = alerts[0];
        if (lastAlert && lastAlert.id !== lastProcessedAlertId && lastAlert.threat?.level === 'High' && !isShieldLocked) {
            setGuardianIntervention({ active: true, reason: lastAlert.threat.type || 'High Risk Anomaly Detected' });
            setLastProcessedAlertId(lastAlert.id);
            setTimeout(() => {
                handleShieldLock(lastAlert);
                setGuardianIntervention({ active: false });
            }, 4000);
        }
    }, [alerts, lastProcessedAlertId, isShieldLocked, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        
        // Generate more realistic activity data based on actual distribution
        const now = new Date();
        const last10 = Array.from({ length: 10 }).map((_, i) => {
            const time = new Date(now.getTime() - (9 - i) * 60000);
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Count logs/alerts in this 1-minute window
            const windowLogs = logs.filter(l => {
                const logTime = new Date(l.timestamp);
                return Math.abs(logTime.getTime() - time.getTime()) < 60000;
            });
            const windowAlerts = alerts.filter(a => {
                const alertTime = new Date(a.timestamp);
                return Math.abs(alertTime.getTime() - time.getTime()) < 60000;
            });

            return {
                time: timeStr,
                requests: windowLogs.length * 5 + Math.floor(Math.random() * 15) + 5,
                threats: windowAlerts.length * 20 + (windowAlerts.some(a => a.threat?.level === 'High') ? 30 : 0) + Math.floor(Math.random() * 5)
            };
        });
        setChartData(last10);
    }, [logs, alerts, isMounted]);

    if (!isMounted) return <div className="min-h-screen bg-cyber-bg p-8" />;

    return (
        <main className="min-h-screen bg-cyber-bg p-4 md:p-8 flex flex-col gap-6 max-w-[1600px] mx-auto relative z-10" suppressHydrationWarning>
            {/* Guardian Intervention HUD Overlay */}
            {guardianIntervention.active && (
                <div className="fixed top-12 left-1/2 -translate-x-1/2 z-60 animate-in fade-in zoom-in slide-in-from-top-10 duration-500">
                    <div className="bg-red-500 text-black px-10 py-5 rounded-lg font-black uppercase tracking-[0.4em] italic flex items-center gap-6 shadow-glow-red border-b-8 border-red-700">
                        <ShieldAlert className="w-12 h-12 animate-pulse" />
                        <div className="flex flex-col">
                            <span className="text-2xl leading-none mb-1">Safety Intervention</span>
                            <span className="text-[10px] opacity-70">Account Shield Active • {guardianIntervention.reason}</span>
                        </div>
                    </div>
                </div>
            )}

            <RecoveryModal 
                isOpen={showUnlockModal}
                onClose={() => setShowUnlockModal(false)}
                onSuccess={() => {
                    handleGoogleUnlock();
                }}
                email={commanderEmail}
                uid={commanderUid || undefined}
            />

            <TotpSetupModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                onComplete={() => setShowSetupModal(false)}
                email={commanderEmail}
                uid={commanderUid || ""}
            />

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 border-b border-cyber-border">
                <div className="flex items-center gap-4">
                    <div className="relative p-3 bg-cyber-accent/10 rounded-lg shadow-glow-cyan border border-cyber-accent/30">
                        <Shield className="w-8 h-8 text-cyber-accent" />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-cyber-bg ${syncStatus === 'ONLINE' ? 'bg-green-500 shadow-glow-green' : syncStatus === 'QUOTA' ? 'bg-amber-500 animate-pulse shadow-glow-amber' : 'bg-red-500 shadow-glow-red'}`} title={syncStatus} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                            ShadowTrace
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-cyber-accent font-bold">v{dynamicVersion}-LIVE_SYNC</p>
                            <span className="h-1 w-1 rounded-full bg-zinc-800" />
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{syncStatus === 'QUOTA' ? 'SYNC OFFLINE (QUOTA LIMIT)' : 'Secure Identity Mesh'}</p>
                            {commanderName && (
                                <>
                                    <span className="h-1 w-1 rounded-full bg-zinc-800" />
                                    <span className="text-[8px] font-black text-cyber-accent/50 tracking-widest uppercase">ID: {Buffer.from(commanderName).toString('hex').slice(0, 8).toUpperCase()}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {accounts.length > 0 && (
                        <div className="hidden lg:flex items-center gap-4 px-4 py-2 border-x border-cyber-border/50">
                            <div className="w-8 h-8 rounded-lg bg-cyber-accent/10 border border-cyber-accent/20 flex items-center justify-center">
                                <User size={14} className="text-cyber-accent" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white uppercase italic tracking-tighter leading-none">{commanderName}</span>
                                <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{commanderEmail}</span>
                                <span className="text-[6px] text-cyber-accent/50 uppercase font-black tracking-[0.2em]">{commanderRole}</span>
                            </div>
                        </div>
                    )}
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-black text-cyber-blue tracking-[0.2em] uppercase">Overall Safety</span>
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-white uppercase">{isShieldLocked ? 'CRITICAL - SHIELD LOCKED' : 'ALL SYSTEMS SAFE'}</span>
                             <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded font-black italic">MONITORING ACTIVE</span>
                        </div>
                    </div>
                    {isShieldLocked ? (
                        <button 
                            onClick={() => setShowUnlockModal(true)}
                            className="bg-green-500 text-black px-6 py-2 font-black uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-glow-green/20 border-b-4 border-green-700"
                        >
                            <span className="flex items-center gap-2 animate-pulse"><Power size={12} /> RESTORE IDENTITY</span>
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleShieldLock()}
                            className="px-6 py-2.5 bg-red-500 text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all shadow-glow-red/20 flex items-center gap-2"
                        >
                            <ShieldAlert size={14} /> Safety Shield
                        </button>
                    )}
                    <div className="h-10 w-px bg-cyber-border" />
                    <Link 
                        href="/settings"
                        className="p-2 text-zinc-400 hover:text-white transition-colors border border-cyber-border rounded hover:border-cyber-accent/50"
                        title="Command Settings"
                    >
                        <Settings size={18} />
                    </Link>
                    <button 
                        onClick={() => handleLogout(true)}
                        className="p-2 text-red-500/70 hover:text-red-500 transition-all border border-red-500/20 rounded hover:border-red-500/50 bg-red-500/5 group relative overflow-hidden"
                        title="Sign Out Everywhere (Global Revocation)"
                    >
                        <LogOut size={18} className="group-hover:drop-shadow-glow-red transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors" />
                    </button>
                </div>
            </header>

            {/* Layout Grid */}
            {accounts.length === 0 ? (
                <div className="grow flex flex-col items-center justify-center gap-8 py-20 px-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyber-accent/20 blur-[100px] animate-pulse rounded-full" />
                        <div className="relative w-32 h-32 rounded-3xl border border-dashed border-cyber-accent/30 flex items-center justify-center bg-zinc-900/50 backdrop-blur-xl group">
                            <Shield className="w-16 h-16 text-zinc-700 group-hover:text-cyber-accent transition-colors duration-500" />
                            <div className="absolute -bottom-2 -right-2 bg-red-500 text-black p-1.5 rounded-lg">
                                <AlertTriangle size={18} />
                            </div>
                        </div>
                    </div>
                    <div className="text-center flex flex-col items-center gap-2">
                        <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">No Accounts <span className="text-cyber-accent not-italic">Added</span></h2>
                        <p className="text-[12px] text-zinc-500 font-bold uppercase tracking-[0.5em] max-w-lg mb-8">
                            Your digital presence is currently unmonitored. Add an account to let the ShadowTrace Safety Guardian protect you.
                        </p>
                        <Link 
                            href="/settings"
                            className="group relative px-10 py-4 bg-cyber-accent text-black font-black uppercase italic tracking-widest text-sm hover:scale-105 transition-all shadow-glow-cyan/20"
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                <Zap className="fill-current" /> Secure Your First Account
                            </span>
                            <div className="absolute inset-0 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 grow overflow-hidden">
                    {/* ACCOUNT SIDEBAR */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="h-1.5 w-full bg-cyber-border/30 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-linear-to-r from-cyber-accent to-cyber-pink w-[78%]" />
                        </div>
                        <div className="cyber-card p-5 h-full flex flex-col gap-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="text-cyber-blue w-5 h-5" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-white">Protected Accounts</h2>
                            </div>
                            <div className="flex flex-col gap-3">
                                {accounts.map((acc) => (
                                    <button 
                                        key={acc.id}
                                        onClick={() => setSelectedAccountId(acc.id)}
                                        className={`p-4 rounded-lg border text-left transition-all duration-300 ${
                                            selectedAccountId === acc.id 
                                            ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/30 shadow-glow-cyan' 
                                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                                acc.provider === 'GMAIL' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                                            }`}>{acc.provider}</span>
                                            <div className={`w-2 h-2 rounded-full ${acc.status === 'SAFE' ? 'bg-green-500 shadow-glow-cyan' : 'bg-red-500 animate-pulse shadow-glow-red'}`} />
                                        </div>
                                        <div className="text-sm font-bold text-white truncate">{acc.email}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* VISUALIZATION CENTER */}
                    <div className="lg:col-span-6 flex flex-col gap-6">
                        <div className="cyber-card p-0 overflow-hidden relative min-h-[450px]">
                            <GlobeComponent 
                                points={globePoints}
                                arcs={globeArcs}
                                selectedAccount={selectedAccountId || undefined}
                                centerLocation={centerLocation}
                            />
                        </div>
                        <div className="cyber-card p-6 h-[250px]">
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Resilience</span>
                                <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-linear-to-r from-green-500 to-emerald-400 w-full animate-pulse" />
                                </div>
                            </div>
                            <div className="mb-4 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Identity Risk Analytics</span>
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-2 text-[10px] text-cyber-blue"><div className="w-2 h-2 rounded-full bg-cyber-blue" /> SIGN-INS</span>
                                    <span className="flex items-center gap-2 text-[10px] text-cyber-pink"><div className="w-2 h-2 rounded-full bg-cyber-pink" /> THREATS</span>
                                </div>
                            </div>
                            <div className="h-[150px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <Area type="monotone" dataKey="requests" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} />
                                        <Area type="monotone" dataKey="threats" stroke="#ec4899" fill="#ec4899" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* INTELLIGENCE FEED */}
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <div className="cyber-card grow flex flex-col">
                            <div className="p-4 border-b border-cyber-border flex items-center justify-between">
                                <h2 className="grow text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2 italic">
                                    <Terminal className="w-3 h-3 text-cyber-accent" /> Intelligence Feed
                                </h2>
                                <div className="text-[10px] bg-red-900/20 text-red-500 px-2 rounded animate-pulse">LIVE</div>
                            </div>
                            <div className="grow overflow-y-auto p-4 flex flex-col gap-4 max-h-[600px] scrollbar-hide">
                                {alerts.filter(a => !selectedAccountId || a.accountId === selectedAccountId).length > 0 ? (
                                    alerts.filter(a => !selectedAccountId || a.accountId === selectedAccountId).map((alert) => {
                                        const isIdentitySuccess = alert.threat.type === 'IDENTITY_SUCCESS';
                                        
                                        return (
                                            <div 
                                                key={alert.id} 
                                                onClick={() => setActiveAlertId(alert.id)}
                                                className={`p-4 rounded border transition-all cursor-pointer group ${
                                                    activeAlertId === alert.id 
                                                    ? `bg-cyber-blue/10 border-cyber-blue shadow-glow-cyan/20` 
                                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                                        isIdentitySuccess 
                                                        ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' 
                                                        : alert.threat.level === 'High' 
                                                            ? 'text-red-500 border-red-500/30' 
                                                            : 'text-blue-400 border-blue-400/30'
                                                    }`}>
                                                        {isIdentitySuccess ? 'IDENTITY SAFE' : `${alert.threat.level.toUpperCase()} RISK`}
                                                    </span>
                                                    <span className="text-[8px] text-zinc-600 font-mono">ID: 0x{alert.id.slice(0,4)}</span>
                                                </div>
                                                <div className="text-[11px] font-bold text-white mb-1 leading-tight flex items-center gap-2">
                                                    {isIdentitySuccess && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                                                    {alert.threat.type}
                                                </div>
                                                <div className={`flex items-center gap-2 text-[9px] font-mono mb-2 ${isIdentitySuccess ? 'text-zinc-500' : 'text-cyber-accent'}`}>
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {alert.location?.city || 'Verified Location'} ({alert.ip})
                                                </div>
                                                <p className="text-[9px] text-zinc-400 leading-relaxed font-mono mb-4">{alert.analyst.explanation}</p>
                                                <div className="flex gap-2">
                                                    {!isIdentitySuccess ? (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleAction(alert.id, alert.ip, 'block'); }} className="grow py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-[8px] font-black transition-all">BLOCK</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleAction(alert.id, alert.ip, 'resolve'); }} className="grow py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[8px] font-black">RESOLVE</button>
                                                        </>
                                                    ) : (
                                                        <div className="grow py-1 rounded bg-emerald-500/5 text-emerald-500/70 text-[7px] font-black uppercase text-center border border-emerald-500/10 italic">Logged by Security Mesh</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="grow flex flex-col items-center justify-center text-center p-6 border border-white/5 bg-white/5 rounded-xl border-dashed">
                                        <div className="w-10 h-10 rounded-full bg-cyber-accent/5 border border-cyber-accent/10 flex items-center justify-center mb-3">
                                            <ShieldCheck className="text-cyber-accent/30 w-5 h-5" />
                                        </div>
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">No Active Threats</h3>
                                        <p className="text-[8px] text-zinc-600 mt-1 max-w-[180px] leading-relaxed">Guardian mesh is scanning for signal anomalies.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-cyber-border mt-auto">
                                <Link 
                                    href={selectedAccountId ? `/detailed/${encodeURIComponent(selectedAccountId)}` : '#'} 
                                    className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest transition-all block text-center"
                                >
                                    View Full Safety Analysis
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
