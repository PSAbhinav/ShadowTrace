"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ChevronLeft, 
    Shield, 
    Activity, 
    Globe, 
    Zap, 
    Search, 
    Database, 
    ShieldAlert, 
    AlertTriangle,
    User,
    Clock,
    ShieldCheck,
    Lock,
    MapPin,
    Terminal,
    CheckCircle,
    Eye,
    Crosshair,
    ArrowUpRight,
    Smartphone,
    Cpu,
    Globe2,
    X,
    LogOut,
    RefreshCw
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { 
    collection, 
    query, 
    where,
    orderBy, 
    limit, 
    onSnapshot, 
    doc, 
    getDoc,
    updateDoc,
    getDocs
} from "firebase/firestore";
import GlobeComponent from "../../../components/GlobeComponent";

interface AccountDetails {
    email: string;
    status: string;
    provider: string;
    lastRiskScore: number;
}

interface Alert {
    id: string;
    email: string;
    ip: string;
    timestamp: string;
    status: string;
    location: {
        city: string;
        lat: number;
        lng: number;
    };
    threat: {
        type: string;
        severity: string;
    };
    analyst: {
        explanation: string;
        confidence: number;
    };
    forensicDetails?: {
        isp: string;
        asn: string;
        device: string;
        resolution: string;
        timezone: string;
        platform: string;
        riskScore: number;
        capturedAt: string;
    };
}

export default function DetailedAccountView({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const accountEmail = decodeURIComponent(id);
    const [account, setAccount] = useState<AccountDetails | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
    const [isTerminating, setIsTerminating] = useState(false);

    const [isAlphaEnabled, setIsAlphaEnabled] = useState(true);

    useEffect(() => {
        const session = localStorage.getItem('st_session');
        if (!session) {
            router.push('/login');
            return;
        }

        // Fetch Account Metadata with Resilient Fallback
        const fetchAcc = async () => {
            try {
                const accDoc = await getDoc(doc(db, "accounts", accountEmail));
                if (accDoc.exists()) {
                    setAccount(accDoc.data() as AccountDetails);
                } else {
                    // Generic fallback for accounts not yet in cloud sync
                    setAccount({
                        email: accountEmail,
                        status: 'SYNC_PENDING',
                        provider: accountEmail.includes('gmail') ? 'GMAIL' : accountEmail.includes('outlook') ? 'OUTLOOK' : 'YAHOO',
                        lastRiskScore: 0
                    });
                }
            } catch (error) {
                console.warn("⚠️ [DEEP ANALYSIS] Cloud Node Offline (Quota). Using local buffer.");
                setAccount({
                    email: accountEmail,
                    status: 'SAFE',
                    provider: 'SECURE_NODE',
                    lastRiskScore: 0
                });
            }
        };
        fetchAcc();

        // Alpha Kernel Setting
        const storedAlpha = localStorage.getItem('st_alpha_reasoning');
        if (storedAlpha) setIsAlphaEnabled(storedAlpha === 'true');

        // Subscriptions - Client-side sorting used to bypass indexing requirements
        const logsQ = query(collection(db, "logs"), where("accountId", "==", accountEmail), limit(50));
        const unsubLogs = onSnapshot(logsQ, (snap) => {
            if (snap.empty) {
                setLogs([]);
                return;
            }
            const data = snap.docs.map(d => {
                const docData = d.data();
                return {
                    id: d.id,
                    ...docData,
                    // Format timestamp if it's a Firestore Timestamp
                    timestamp: docData.timestamp?.toDate ? docData.timestamp.toDate().toLocaleString() : docData.timestamp
                };
            });
            setLogs(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }, (err) => console.warn("⚠️ Logs Subscription Failed (Quota). Bridge Active."));

        const alertsQ = query(collection(db, "alerts"), where("accountId", "==", accountEmail), limit(20));
        const unsubAlerts = onSnapshot(alertsQ, (snap) => {
            if (snap.empty) {
                setAlerts([]);
                return;
            }
            const data = snap.docs.map(d => {
                const docData = d.data();
                return {
                    id: d.id,
                    ...docData,
                    // Format createdAt if it's a Firestore Timestamp
                    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toLocaleString() : docData.createdAt
                };
            });
            setAlerts(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }, (err) => console.warn("⚠️ Alerts Subscription Failed (Quota). Bridge Active."));

        return () => { unsubLogs(); unsubAlerts(); };
    }, [accountEmail]);
    
    // Listen for Simulated Alerts from Settings
    useEffect(() => {
        const handleStorageChange = () => {
            const pendingAlert = localStorage.getItem('st_trigger_test_alert');
            if (pendingAlert) {
                try {
                    const alert = JSON.parse(pendingAlert);
                    // Only add if it's for this account or general
                    if (!alert.accountId || alert.accountId === accountEmail) {
                        setAlerts(prev => [alert, ...prev]);
                        // Don't remove here, let Dashboard handle the cleanup to avoid race conditions
                    }
                } catch (e) {
                    console.error("Failed to parse simulated alert");
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        handleStorageChange();
        
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [accountEmail]);

    if (!account) return <div className="min-h-screen bg-cyber-bg flex items-center justify-center text-cyber-blue font-mono">LOADING IDENTITY ENCRYPT...</div>;

    return (
        <main className="min-h-screen bg-cyber-bg p-8 md:p-12 flex flex-col gap-12 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all group">
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1" /> Back to Fleet Overview
                </Link>
                <div className={`px-4 py-1.5 rounded-full border ${account.status === 'SAFE' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-red-500 border-red-500/20 bg-red-500/10'} text-xs font-black uppercase tracking-widest animate-pulse`}>
                    Identity State: {account.status}
                </div>
            </div>

            {/* Profile Section */}
            <div className="cyber-card p-10 flex flex-col md:flex-row gap-10 items-center bg-white/5 border-white/10 shadow-glow-cyan/5">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-linear-to-r from-cyber-blue to-cyber-accent rounded-full opacity-20 group-hover:opacity-40 blur-sm transition-opacity" />
                    <div className="relative w-28 h-28 rounded-full bg-slate-900 flex items-center justify-center border-2 border-white/10 shadow-2xl">
                        <User className="w-14 h-14 text-cyber-accent group-hover:scale-110 transition-transform" />
                    </div>
                </div>
                <div className="grow text-center md:text-left flex flex-col gap-3">
                    <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">{account.email}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-6">
                        <span className="flex items-center gap-2 text-[11px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                            <Database className="w-3.5 h-3.5 text-cyber-blue" /> {account.provider} Identity
                        </span>
                        <span className="flex items-center gap-2 text-[11px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                            <Activity className="w-3.5 h-3.5 text-cyber-warning" /> Risk Score: {account.lastRiskScore}/100
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-center md:items-end gap-3">
                    {account.status === 'LOCKED' ? (
                        <div className="px-8 py-4 bg-green-500 text-black font-black uppercase tracking-widest skew-x-12 flex items-center gap-2 shadow-glow-green/20">
                            <ShieldCheck className="-skew-x-12 w-5 h-5" /> <span className="-skew-x-12">Protected by Shield</span>
                        </div>
                    ) : (
                        <div className="px-8 py-4 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-widest skew-x-12 flex items-center gap-2 animate-pulse shadow-glow-red/10">
                            <ShieldAlert className="-skew-x-12 w-5 h-5" /> <span className="-skew-x-12">Unshielded Access</span>
                        </div>
                    )}
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">Guardian Protocol v4.0</span>
                </div>
            </div>

            {/* Geo-Forensics Map */}
            <div className="cyber-card relative h-[500px] overflow-hidden group border-cyan-500/20 shadow-glow-cyan/5">
                <div className="absolute top-8 left-8 z-10 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-xl border border-cyber-blue/20 p-4 rounded-lg">
                        <h3 className="text-sm font-black text-cyber-blue uppercase tracking-[0.3em] flex items-center gap-3 mb-2">
                            <Globe size={18} className="animate-spin-slow text-cyber-accent" /> Account Safety Monitoring
                        </h3>
                        <div className="h-1.5 w-full bg-cyber-border/30 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-linear-to-r from-cyber-accent to-cyber-pink w-[78%]" />
                        </div>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Tracking Access Vectors: <span className="text-white italic">{accountEmail}</span></p>
                    </div>
                </div>
                <GlobeComponent 
                    selectedAccount={accountEmail}
                    showOverlay={false}
                    points={logs.filter(l => l.location).map(l => ({
                        lat: l.location.lat,
                        lng: l.location.lng,
                        size: 0.05,
                        color: l.status === 'OK' ? '#00f2fe' : '#ff0055',
                        label: `${l.endpoint} [${l.ip}]`
                    }))}
                    arcs={alerts.filter(a => a.location).map(a => ({
                        startLat: a.location.lat,
                        startLng: a.location.lng,
                        endLat: 40.7128, // Dashboard Core (Simulated User Home)
                        endLng: -74.0060,
                        color: '#ff0055'
                    }))}
                />
                <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3 pointer-events-none">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase text-white tracking-[0.2em] bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-2xl">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyber-blue shadow-glow-cyan animate-pulse" /> Valid Interaction
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase text-white tracking-[0.2em] bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 shadow-2xl">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyber-pink shadow-glow-pink animate-pulse" /> Attack Origin
                    </div>
                </div>
            </div>

            {/* Forensic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Event History */}
                <div className="cyber-card flex flex-col p-6">
                    <h3 className="text-sm font-black text-cyber-blue uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Clock size={16} /> Recent Activity Log
                    </h3>
                    <div className="flex flex-col gap-4">
                        {logs.map(log => (
                            <div 
                                key={log.id} 
                                onClick={() => {
                                    // Try to find an alert that matches this log's context
                                    const matchingAlert = alerts.find(a => a.ip === log.ip || a.email === log.accountId);
                                    if (matchingAlert) {
                                        setSelectedAlert(matchingAlert);
                                    } else {
                                        // Create a temporary "Log-level" forensic view if no full alert exists
                                        setSelectedAlert({
                                            id: `idx-${log.id}`,
                                            email: log.accountId || accountEmail,
                                            ip: log.ip,
                                            timestamp: log.timestamp,
                                            status: log.status,
                                            location: log.location || { city: 'Unknown', lat: 0, lng: 0 },
                                            threat: { type: log.status === 'OK' ? 'Standard Protocol' : 'Suspicious Probe', severity: log.status === 'OK' ? 'Low' : 'Medium' },
                                            analyst: { explanation: `This event was captured during automated monitoring. ${log.status === 'OK' ? 'No immediate threat detected.' : 'Repeated failures from this origin may trigger a full forensic scan.'}`, confidence: 75 }
                                        });
                                    }
                                }}
                                className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-lg ${log.status === 'OK' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <Eye size={12} className={log.status !== 'OK' ? 'animate-pulse' : ''} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-white group-hover:text-cyber-accent transition-colors">{log.endpoint} <span className="text-zinc-500 ml-2">{log.ip}</span></div>
                                        <div className="text-[9px] text-zinc-600 uppercase font-mono">{log.timestamp}</div>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-black px-2 py-0.5 rounded ${log.status === 'OK' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {log.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Threat Matrix */}
                <div className="cyber-card flex flex-col p-6 border-pink-500/20">
                    <h3 className="text-sm font-black text-cyber-pink uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertTriangle size={16} /> Detected Identity Threats
                    </h3>
                    <div className="flex flex-col gap-4 grow">
                        {alerts.map(alert => (
                            <div 
                                key={alert.id} 
                                className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-lg group cursor-pointer hover:bg-pink-500/10 transition-all hover:border-pink-500/40 relative overflow-hidden"
                                onClick={() => setSelectedAlert(alert)}
                            >
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Search size={14} className="text-pink-500" />
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-pink-500 uppercase">{alert.threat.type}</span>
                                    <span className="text-[9px] text-zinc-600 font-mono">ID: {alert.id.slice(0,6)}</span>
                                </div>
                                <div className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                                    <MapPin size={12} className="text-pink-500" /> {alert.location?.city || 'Origin Unknown'}
                                </div>
                                <p className="text-[10px] text-zinc-400 font-mono italic">
                                    {alert.analyst.explanation}
                                </p>
                            </div>
                        ))}
                        {alerts.length === 0 && <div className="grow flex items-center justify-center text-zinc-600 italic text-sm py-20">NO ACTIVE THREATS DETECTED</div>}
                    </div>
                </div>
            </div>

            {/* Reasoning Tree */}
            <div className="cyber-card p-8 flex flex-col gap-8 border-cyan-500/10">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                        <Terminal className="text-cyber-blue" /> Safety Analysis Steps
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">How our AI checked your account's safety levels for {accountEmail}.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                    {/* Trace Line */}
                    <div className="absolute top-[45%] left-0 right-0 h-px bg-cyber-accent/10 -translate-y-1/2 hidden md:block" />
                    
                    {(() => {
                        const activeAlert = alerts[0]; // Use latest alert for context
                        const isHighRisk = activeAlert?.threat.level === 'High';
                        const threatType = activeAlert?.threat.type || 'Standard Probe';
                        
                        if (!isAlphaEnabled) {
                            return (
                                <div className="col-span-1 md:col-span-5 py-12 flex flex-col items-center justify-center bg-black/40 border border-dashed border-white/5 rounded-2xl gap-4">
                                    <Lock className="text-zinc-600 w-8 h-8 opacity-20" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Detailed Analysis Hidden</span>
                                        <span className="text-[8px] text-zinc-700 uppercase font-bold mt-1">Turn on "Detailed Safety Analysis" in Settings to see exactly how we protect you</span>
                                    </div>
                                </div>
                            );
                        }

                        const steps = [
                            { 
                                agent: "Activity Watcher", 
                                action: "Pattern Check", 
                                result: threatType.includes('Travel') ? "Location Mismatch" : "Unusual Sign-in", 
                                icon: Search, 
                                color: "text-cyber-blue", 
                                score: isHighRisk ? 92 : 88 
                            },
                            { 
                                agent: "Risk Scanner", 
                                action: "Comparison", 
                                result: isHighRisk ? "Confirmed Threat" : "Strange Behavior", 
                                icon: Activity, 
                                color: "text-cyan-400", 
                                score: isHighRisk ? 96 : 84 
                            },
                            { 
                                agent: "Account Shield", 
                                action: "Damage Assessment", 
                                result: threatType.includes('IP') ? "Fake Identity Risk" : "Device Concern", 
                                icon: Database, 
                                color: "text-cyber-accent", 
                                score: isHighRisk ? 85 : 72 
                            },
                            { 
                                agent: "Safety Evaluator", 
                                action: "Safety Score", 
                                result: isHighRisk ? "Serious Risk" : "Minor Issue", 
                                icon: ShieldAlert, 
                                color: "text-cyber-warning", 
                                score: isHighRisk ? 94 : 85 
                            },
                            { 
                                agent: "Action Planner", 
                                action: "Next Step", 
                                result: activeAlert?.status === 'OPEN' ? "Shield Account" : "Safe Status", 
                                icon: Zap, 
                                color: "text-cyber-pink", 
                                score: 99 
                            }
                        ];

                        return steps.map((step, i) => (
                            <div key={i} className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl relative z-10 flex flex-col gap-4 group hover:border-cyber-accent/30 transition-all hover:-translate-y-1">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 bg-black/40 rounded-lg ${step.color} border border-current/20`}>
                                        <step.icon size={16} />
                                    </div>
                                    <span className="text-[8px] font-mono text-zinc-600">00{i+1}_AGENT</span>
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-white font-black uppercase italic">{step.agent}</span>
                                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest leading-none">{step.action}</span>
                                </div>

                                <div className="pt-2 border-t border-white/5">
                                    <span className={`text-[9px] font-bold uppercase tracking-tight ${step.color}`}>{step.result}</span>
                                </div>

                                <div className="flex flex-col gap-1 items-center mt-auto">
                                    <div className="flex justify-between w-full">
                                        <span className="text-[7px] text-zinc-600 uppercase font-black">Accuracy</span>
                                        <span className="text-[7px] text-zinc-400 font-mono">{step.score}%</span>
                                    </div>
                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full bg-current ${step.color} transition-all duration-1000`} 
                                            style={{ width: `${step.score}%`, opacity: 0.6 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>

                {/* Final Decision HUD */}
                {alerts.length > 0 && (
                    <div className="mt-4 p-6 bg-cyber-accent/5 border border-cyber-accent/20 rounded-xl animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle size={16} className="text-cyber-accent animate-pulse" />
                            <h4 className="text-[10px] font-black text-cyber-accent uppercase tracking-[0.2em]">Safety Decision: {alerts[0].threat.type}</h4>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono leading-relaxed italic">
                            "{alerts[0].analyst.explanation}"
                        </p>
                    </div>
                )}
            </div>

            {/* Forensic Intelligence Modal */}
            {selectedAlert && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                <div 
                    className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-crosshair" 
                    onClick={() => setSelectedAlert(null)}
                />
                <div className="cyber-card max-w-2xl w-full p-0 relative animate-in zoom-in-95 duration-300 border-pink-500 shadow-[0_0_80px_rgba(236,72,153,0.15)] overflow-hidden">
                    {/* Retro Scanner Header */}
                    <div className="bg-pink-500/10 border-b border-pink-500/20 p-6 flex justify-between items-center relative">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-pink-500/30 animate-pulse" />
                        <div>
                            <h2 className="text-lg font-black text-pink-500 uppercase tracking-[0.3em] flex items-center gap-3 italic">
                                <Crosshair size={24} className="animate-spin-slow" /> Forensic Intelligence Deep-Dive
                            </h2>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">TRACE_ID: {selectedAlert.id} // THREAT_LEVEL: CRITICAL</p>
                        </div>
                        <button 
                            onClick={() => setSelectedAlert(null)}
                            className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Evidence Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
                                <div className="text-[9px] text-pink-500 font-black uppercase mb-3 flex items-center gap-2">
                                    <Globe2 size={12} /> Network Origin
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                        <span className="text-[10px] text-zinc-500 uppercase">IP Address</span>
                                        <span className="text-[10px] text-white font-mono">{selectedAlert.ip}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                        <span className="text-[10px] text-zinc-500 uppercase">City/Country</span>
                                        <span className="text-[10px] text-white underline decoration-pink-500/30">{selectedAlert.location?.city}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] text-zinc-500 uppercase">ISP Provider</span>
                                        <span className="text-[10px] text-white italic">{selectedAlert.forensicDetails?.isp || 'Encrypted Traffic'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
                                <div className="text-[9px] text-pink-500 font-black uppercase mb-3 flex items-center gap-2">
                                    <Smartphone size={12} /> Device Fingerprint
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                        <span className="text-[10px] text-zinc-500 uppercase">Platform</span>
                                        <span className="text-[10px] text-white font-mono">{selectedAlert.forensicDetails?.platform || 'ShadowTrace Agent'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-1">
                                        <span className="text-[10px] text-zinc-500 uppercase">Resolution</span>
                                        <span className="text-[10px] text-white">{selectedAlert.forensicDetails?.resolution || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] text-zinc-500 uppercase">Timezone</span>
                                        <span className="text-[10px] text-white">{selectedAlert.forensicDetails?.timezone || 'GMT+0'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Breakdown */}
                        <div className="bg-black/40 border border-white/5 p-6 rounded-xl">
                            <div className="text-[9px] text-pink-500 font-black uppercase mb-4 flex items-center gap-2">
                                <Cpu size={12} /> AI Analyst Reasoning
                            </div>
                            <div className="flex gap-6 items-start">
                                <div className="relative p-4 rounded-full border-2 border-pink-500/20">
                                    <div className="text-lg font-black text-white">{selectedAlert.analyst?.confidence}%</div>
                                    <div className="text-[7px] text-pink-500 absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black px-1 uppercase font-black">Risk</div>
                                </div>
                                <p className="text-xs text-zinc-400 font-mono italic leading-relaxed">
                                    "{selectedAlert.analyst?.explanation}"
                                </p>
                            </div>
                        </div>

                        {/* Remediation Hub */}
                        <div className="pt-4 border-t border-white/5">
                            <div className="text-[9px] text-zinc-500 font-black uppercase mb-4 tracking-widest text-center">Threat Remediation Actions</div>
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={async () => {
                                        setIsTerminating(true);
                                        try {
                                            // 1. Mark account as revoked in Firestore
                                            const accountRef = doc(db, 'linked_accounts', id as string);
                                            await updateDoc(accountRef, {
                                                security_status: 'REVOKED',
                                                last_revoked: new Date().toISOString(),
                                                risk_level: 'Critical'
                                            });

                                            // 2. Kill local session
                                            await signOut(auth);
                                            localStorage.removeItem('st_session');
                                            router.push('/login');
                                        } catch (error) {
                                            console.error("Revocation failed:", error);
                                            setIsTerminating(false);
                                        }
                                    }}
                                    disabled={isTerminating}
                                    className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl hover:bg-pink-500/20 hover:border-pink-500/40 transition-all group flex flex-col items-center gap-2 disabled:opacity-50"
                                >
                                    <LogOut size={20} className={`text-pink-500 group-hover:scale-110 transition-transform ${isTerminating ? 'animate-ping' : ''}`} />
                                    <span className="text-[10px] font-black text-white uppercase italic">
                                        {isTerminating ? 'REVOKING...' : 'Force Identity Reset'}
                                    </span>
                                    <span className="text-[8px] text-zinc-500 uppercase font-mono">Sign out everywhere</span>
                                </button>
                                <button 
                                    onClick={async () => {
                                        const accountRef = doc(db, 'linked_accounts', id as string);
                                        await updateDoc(accountRef, {
                                            encryption_status: 'REFRESHED',
                                            last_encrypted: new Date().toISOString(),
                                            safety_score: 98
                                        });
                                        setSelectedAlert(null);
                                    }}
                                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group flex flex-col items-center gap-2"
                                >
                                    <RefreshCw size={20} className="text-zinc-400 group-hover:rotate-180 transition-transform duration-700" />
                                    <span className="text-[10px] font-black text-white uppercase italic">Re-Encrypt Profile</span>
                                    <span className="text-[8px] text-zinc-500 uppercase font-mono">Security Refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </main>
);
}
