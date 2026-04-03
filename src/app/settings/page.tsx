"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { APP_VERSION } from '@/lib/version';
import { initVersionSync } from '@/lib/versionSync';
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { 
    Shield, 
    ChevronLeft, 
    User, 
    Bell, 
    Monitor, 
    Settings as SettingsIcon,
    Radio,
    HardDrive,
    Database,
    Cpu,
    Fingerprint,
    Save,
    RefreshCw,
    Edit3,
    Check,
    Trash2,
    Plus,
    AlertTriangle,
    ShieldAlert,
    Zap,
    Clock
} from 'lucide-react';

interface LinkedAccount {
    id: string;
    email: string;
    provider: string;
    status: 'SAFE' | 'LOCKED';
    lastRiskScore: number;
}

type Section = 'PROFILE' | 'GUARDIAN' | 'NOTIFICATIONS' | 'HUD' | 'SIMULATOR';

const SettingsPage = () => {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<Section>('PROFILE');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [testCooldown, setTestCooldown] = useState<number>(0);
    const [dynamicVersion, setDynamicVersion] = useState(APP_VERSION);
    const [isPushingUpdate, setIsPushingUpdate] = useState(false);

    // Profile State
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    // Protocol State
    const [sensitivity, setSensitivity] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
    const [fleetLock, setFleetLock] = useState(true);
    const [biometricReq, setBiometricReq] = useState(true);

    // Notification State
    const [hudOverlay, setHudOverlay] = useState(true);
    const [smsDispatch, setSmsDispatch] = useState(false);
    const [emailDigest, setEmailDigest] = useState(true);

    // Simulator State
    const [pulseFrequency, setPulseFrequency] = useState(60);
    const [attackIntensity, setAttackIntensity] = useState(12);
    const [isSeeding, setIsSeeding] = useState(false);
    const [alphaReasoning, setAlphaReasoning] = useState(true);

    // Linked Accounts State
    const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        setIsMounted(true);
        const storedName = localStorage.getItem('st_user_name');
        const storedRole = localStorage.getItem('st_user_role');
        const storedSensitivity = localStorage.getItem('st_guardian_sensitivity');
        const storedFleetLock = localStorage.getItem('st_fleet_lock');
        const storedBio = localStorage.getItem('st_biometric_req');
        
        // Notifications
        const storedHud = localStorage.getItem('st_hud_overlay');
        const storedSms = localStorage.getItem('st_sms_dispatch');
        const storedEmail = localStorage.getItem('st_email_digest');
        
        // Simulator
        const storedPulse = localStorage.getItem('st_pulse_freq');
        const storedIntensity = localStorage.getItem('st_attack_intensity');
        const storedAlpha = localStorage.getItem('st_alpha_reasoning');

        if (storedName) setUserName(storedName);
        if (storedRole) setUserRole(storedRole);
        if (storedSensitivity) setSensitivity(storedSensitivity as any);
        if (storedFleetLock) setFleetLock(storedFleetLock === 'true');
        if (storedBio) setBiometricReq(storedBio === 'true');
        
        if (storedHud) setHudOverlay(storedHud === 'true');
        if (storedSms) setSmsDispatch(storedSms === 'true');
        if (storedEmail) setEmailDigest(storedEmail === 'true');
        
        if (storedPulse) setPulseFrequency(parseInt(storedPulse));
        if (storedIntensity) setAttackIntensity(parseInt(storedIntensity));
        if (storedAlpha) setAlphaReasoning(storedAlpha === 'true');

        // Load Linked Accounts
        const storedAccounts = localStorage.getItem('st_linked_accounts');
        if (storedAccounts) {
            try {
                setLinkedAccounts(JSON.parse(storedAccounts));
            } catch (e) {
                console.error("Failed to parse stored accounts");
            }
        }

        const unsubVersion = initVersionSync((newVersion: string) => {
            setDynamicVersion(newVersion);
        });

        return () => unsubVersion();
    }, [router]);

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
            setSaveStatus(`PUSHED v${nextVersion}`);
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error('Push Update Failed:', error);
            setSaveStatus("PUSH FAILED");
            setTimeout(() => setSaveStatus(null), 3000);
        } finally {
            setIsPushingUpdate(false);
        }
    };

    const detectProvider = (email: string) => {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) return 'CUSTOM';
        if (domain.includes('gmail')) return 'GMAIL';
        if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'OUTLOOK';
        if (domain.includes('yahoo')) return 'YAHOO';
        return 'CUSTOM';
    };

    const handleAddAccount = () => {
        if (!newEmail || !newEmail.includes('@')) return;
        setShowSecurityModal(true);
    };

    const confirmAddAccount = async () => {
        const id = Math.random().toString(36).substring(7).toUpperCase();
        const newAcc: LinkedAccount = { 
            id, 
            email: newEmail, 
            provider: 'GMAIL', 
            status: 'SAFE',
            lastRiskScore: Math.floor(Math.random() * 20)
        };

        // Sync to cloud
        try {
            await setDoc(doc(db, "accounts", newEmail), {
                ...newAcc,
                active: true,
                updatedAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Cloud Sync Failed", e);
        }

        const updated = [...linkedAccounts, newAcc];
        setLinkedAccounts(updated);
        localStorage.setItem('st_linked_accounts', JSON.stringify(updated));
        setNewEmail("");
        setShowSecurityModal(false);
    };

    const handleRemoveAccount = async (id: string) => {
        // Remove from cloud
        try {
            await deleteDoc(doc(db, "accounts", id));
        } catch (e) {
            console.error("Cloud Purge Failed", e);
        }

        const updated = linkedAccounts.filter(a => a.id !== id);
        setLinkedAccounts(updated);
        localStorage.setItem('st_linked_accounts', JSON.stringify(updated));
    };

    const handleBulkRemove = () => {
        const updated = linkedAccounts.filter(a => !selectedForBulk.includes(a.id));
        setLinkedAccounts(updated);
        localStorage.setItem('st_linked_accounts', JSON.stringify(updated));
        setSelectedForBulk([]);
    };

    const toggleBulkSelection = (id: string) => {
        setSelectedForBulk(prev => 
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        setIsSaving(true);
        
        // Persist to localStorage
        localStorage.setItem('st_user_name', userName);
        localStorage.setItem('st_user_role', userRole);
        localStorage.setItem('st_guardian_sensitivity', sensitivity);
        localStorage.setItem('st_fleet_lock', fleetLock.toString());
        localStorage.setItem('st_biometric_req', biometricReq.toString());
        
        localStorage.setItem('st_hud_overlay', hudOverlay.toString());
        localStorage.setItem('st_sms_dispatch', smsDispatch.toString());
        localStorage.setItem('st_email_digest', emailDigest.toString());
        
        localStorage.setItem('st_pulse_freq', pulseFrequency.toString());
        localStorage.setItem('st_attack_intensity', attackIntensity.toString());
        localStorage.setItem('st_alpha_reasoning', alphaReasoning.toString());

        setTimeout(() => {
            setIsSaving(false);
            setSaveStatus("PROTOCOL UPDATED");
            setTimeout(() => setSaveStatus(null), 3000);
        }, 1500);
    };

    const handleRunTest = async () => {
        if (testCooldown > 0) return;
        
        setIsSaving(true);
        setTestCooldown(30);
        
        const timer = setInterval(() => {
            setTestCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        try {
            // Fetch real metadata if possible
            let forensicOrigin = null;
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                forensicOrigin = {
                    ip: data.ip,
                    city: data.city,
                    country: data.country_name,
                    lat: data.latitude,
                    lng: data.longitude
                };
            } catch (e) {
                console.warn("Forensic Origin detection failed, using node defaults.");
            }

            const target = auth.currentUser?.email || (linkedAccounts.length > 0 ? linkedAccounts[0].email : '');
            if (!target) {
                setSaveStatus("NO PROTECTED IDENTITY FOUND");
                setIsSaving(false);
                if (timer) clearInterval(timer);
                setTestCooldown(0);
                setTimeout(() => setSaveStatus(null), 3000);
                return;
            }
            
            const fingerprint = {
                userAgent: navigator.userAgent,
                resolution: `${window.screen.width}x${window.screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                platform: (navigator as any).userAgentData?.platform || navigator.platform,
                language: navigator.language
            };
            
            await updateDoc(doc(db, 'settings', 'simulator_control'), {
                bruteForceTarget: target,
                triggeredAt: serverTimestamp(),
                isRealtime: true,
                origin: forensicOrigin,
                fingerprint: fingerprint
            });

            setTimeout(() => {
                setIsSaving(false);
                setSaveStatus("FORENSIC SCAN STARTED");
                setTimeout(() => setSaveStatus(null), 3000);
            }, 1000);
        } catch (e) {
            console.error("Safety Test failed", e);
            setIsSaving(false);
            clearInterval(timer);
            setTestCooldown(0);
        }
    };

    const navItems = [
        { id: 'PROFILE', label: 'Profile & Meta', icon: User },
        { id: 'GUARDIAN', label: 'Guardian Protocol', icon: Shield },
        { id: 'NOTIFICATIONS', label: 'Notifications', icon: Bell },
        { id: 'HUD', label: 'Global HUD', icon: Monitor },
        { id: 'SIMULATOR', label: 'Safety Testing', icon: Database },
    ];

    if (!isMounted) return <div className="min-h-screen bg-cyber-bg" />;

    return (
        <main className="min-h-screen bg-cyber-bg p-4 md:p-12 relative overflow-hidden font-inter" suppressHydrationWarning>
            {/* Security Authorization Modal */}
            {showSecurityModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="max-w-xl w-full cyber-card p-10 bg-zinc-900 border-cyber-accent shadow-glow-cyan/20 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-6 border-b border-cyber-border pb-6">
                            <div className="p-3 bg-cyber-accent/10 rounded-lg">
                                <ShieldAlert className="text-cyber-accent w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Identity Integration Protocol</h2>
                                <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mt-1">Institutional Authorization Required</p>
                            </div>
                        </div>

                        <div className="space-y-6 mb-10">
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                By initiating a link between ShadowTrace and an external identity endpoint, you authorize an <span className="text-cyber-accent font-bold italic">observational metadata layer</span> to begin monitoring for threat correlation.
                            </p>
                            
                            <div className="p-4 bg-black/40 border-l-4 border-cyber-accent rounded-r italic">
                                <h4 className="text-[10px] font-black uppercase text-cyber-accent mb-1 tracking-widest">Data Sovereignty Notice:</h4>
                                <p className="text-[10px] text-zinc-500 font-bold leading-normal">
                                    ShadowTrace strictly ingests unique identifiers (Email Addresses) for analysis. We <span className="underline">never</span> request, store, or process authentication credentials, private communication contents, or session tokens.
                                </p>
                            </div>

                            <p className="text-[10px] text-zinc-500 font-bold leading-normal uppercase tracking-wide">
                                Acknowledgement: Linkage is at the user's discretion. The inherent security of the endpoint remains the responsibility of the provider and user.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowSecurityModal(false)}
                                className="flex-1 py-3 px-6 bg-transparent border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 transition-all"
                            >
                                DEPLOYMENT ABORT
                            </button>
                            <button 
                                onClick={confirmAddAccount}
                                className="flex-1 py-3 px-6 bg-cyber-accent text-black text-[10px] font-black uppercase tracking-widest shadow-glow-cyan/20 hover:brightness-110 active:scale-95 transition-all"
                            >
                                PROCEED WITH LINKAGE
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Background elements */}
            <div className="fixed top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyber-accent/50 to-transparent" />
            <div className="absolute top-1/4 -right-24 w-64 h-64 bg-cyber-pink/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -left-24 w-64 h-64 bg-cyber-accent/5 rounded-full blur-3xl" />

            <div className="max-w-[1600px] mx-auto flex flex-col gap-10 relative z-10">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-cyber-border pb-8">
                    <div className="flex items-center gap-6">
                        <Link 
                            href="/" 
                            className="p-3 bg-zinc-900 border border-cyber-border rounded-xl text-zinc-400 hover:text-white hover:border-cyber-accent/50 transition-all hover:scale-105 active:scale-95"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
                                ShadowTrace
                                <SettingsIcon className="w-6 h-6 text-cyber-accent animate-spin-slow" />
                            </h1>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">ShadowTrace Security Protocol v{dynamicVersion}</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="group relative px-8 py-3 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-cyber-accent transition-all active:scale-95 shadow-glow-cyan/20 disabled:opacity-50"
                    >
                        <span className="flex items-center gap-2">
                            {isSaving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saveStatus || "Apply Protocol"}
                        </span>
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    
                    {/* Sidebar Nav */}
                    <nav className="md:col-span-3 flex flex-col gap-2">
                        {navItems.map((item) => (
                            <button 
                                key={item.id}
                                onClick={() => setActiveSection(item.id as Section)}
                                className={`flex items-center gap-3 px-5 py-3 rounded-lg border transition-all text-left uppercase text-[10px] tracking-widest font-black ${
                                    activeSection === item.id 
                                    ? 'bg-cyber-accent/10 border-cyber-accent text-cyber-accent' 
                                    : 'hover:bg-white/5 border-transparent text-zinc-500 hover:text-white'
                                }`}
                            >
                                <item.icon size={16} /> {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Main Settings Panel */}
                    <div className="md:col-span-9 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Profile Section */}
                        {activeSection === 'PROFILE' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="cyber-card p-10 bg-zinc-900/30">
                                    <div className="flex flex-col md:flex-row justify-between gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-cyber-accent/20 to-cyber-pink/20 border-2 border-dashed border-cyber-accent/30 flex items-center justify-center relative group">
                                                <User className="w-10 h-10 text-white opacity-50" />
                                                <div className="absolute -bottom-2 -right-2 p-1.5 bg-cyber-accent rounded-lg">
                                                    <Fingerprint size={12} className="text-black font-black" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                {isEditingProfile ? (
                                                    <div className="space-y-3">
                                                        <input 
                                                            type="text" 
                                                            value={userName} 
                                                            onChange={(e) => setUserName(e.target.value)}
                                                            className="bg-black/50 border border-cyber-accent/30 rounded px-3 py-1 text-xl font-black text-white italic uppercase focus:outline-none focus:border-cyber-accent w-full"
                                                            autoFocus
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={userRole} 
                                                            onChange={(e) => setUserRole(e.target.value)}
                                                            className="bg-black/50 border border-cyber-border rounded px-3 py-1 text-[10px] uppercase font-bold tracking-widest text-zinc-400 focus:outline-none focus:border-cyber-accent w-full"
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h3 className="text-xl font-black text-white italic uppercase">{userName}'s Identity</h3>
                                                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">{userRole} • Level 4 Access</p>
                                                    </>
                                                )}
                                                <div className="flex items-center gap-4 mt-4">
                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black border border-green-500/20 rounded-md uppercase tracking-widest">Biometric Active</span>
                                                    <span className="px-2 py-0.5 bg-cyber-accent/10 text-cyber-accent text-[8px] font-black border border-cyber-accent/20 rounded-md uppercase tracking-widest">Hardware Key Linked</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsEditingProfile(!isEditingProfile)}
                                            className="self-start px-4 py-2 border border-cyber-border rounded-lg text-xs text-zinc-400 hover:text-white hover:border-cyber-accent/50 transition-all font-bold flex items-center gap-2"
                                        >
                                            {isEditingProfile ? <><Check size={14} /> Finish Editing</> : <><Edit3 size={14} /> Update Identity</>}
                                        </button>
                                    </div>
                                </div>
                                <div className="cyber-card p-8 bg-zinc-900/30">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Linked Identities</h4>
                                        <div className="flex items-center gap-4">
                                            {selectedForBulk.length > 0 && (
                                                <button 
                                                    onClick={handleBulkRemove}
                                                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[8px] font-black uppercase tracking-tighter hover:bg-red-500/20 transition-all rounded flex items-center gap-2"
                                                >
                                                    <Trash2 size={12} /> Purge Selected ({selectedForBulk.length})
                                                </button>
                                            )}
                                            <div className="flex items-center gap-2 px-3 py-1 bg-black/20 border border-white/5 rounded-lg">
                                                <input 
                                                    type="email" 
                                                    placeholder="LINK NEW ENDPOINT (EMAIL)..." 
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="bg-transparent border-none focus:outline-none text-[9px] font-mono text-zinc-400 w-48 placeholder:text-zinc-700"
                                                />
                                                <button 
                                                    onClick={handleAddAccount}
                                                    className="p-1 hover:text-cyber-accent transition-colors"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {linkedAccounts.length === 0 && (
                                            <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-zinc-700 italic">
                                                <Database size={24} className="mb-2 opacity-20" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">No Identities Linked</span>
                                            </div>
                                        )}
                                        {linkedAccounts.map((acc) => (
                                            <div key={acc.id} className="group relative flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedForBulk.includes(acc.id)}
                                                        onChange={() => toggleBulkSelection(acc.id)}
                                                        className="w-3 h-3 accent-cyber-accent bg-transparent border-zinc-800 rounded"
                                                    />
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${
                                                        acc.provider === 'GMAIL' ? 'bg-red-500/10 text-red-500' : 
                                                        acc.provider === 'OUTLOOK' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                        {acc.provider[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white uppercase italic flex items-center gap-2">
                                                            {acc.provider} ENDPOINT
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-glow-cyan" />
                                                        </p>
                                                        <p className="text-[10px] text-zinc-600 font-mono tracking-tighter">{acc.email}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveAccount(acc.id)}
                                                    className="p-3 bg-linear-to-r from-red-500/20 to-cyber-pink/20 rounded-xl border border-red-500/30 shadow-glow-red/20 group-hover:scale-105 transition-transform"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {linkedAccounts.length > 1 && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    if (selectedForBulk.length === linkedAccounts.length) setSelectedForBulk([]);
                                                    else setSelectedForBulk(linkedAccounts.map(a => a.id));
                                                }}
                                                className="text-[9px] font-black uppercase text-zinc-600 hover:text-zinc-400 tracking-widest"
                                            >
                                                {selectedForBulk.length === linkedAccounts.length ? '[ Unselect All ]' : '[ Select All for Batch Purge ]'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Guardian Section */}
                        {activeSection === 'GUARDIAN' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="cyber-card font-black">
                                    <div className="p-8 border-b border-cyber-border/50 flex items-center justify-between">
                                        <h3 className="text-sm italic uppercase tracking-[0.2em] text-cyber-accent">Guardian Protocol Tuning</h3>
                                        <Radio className="text-cyber-accent animate-pulse w-4 h-4" />
                                    </div>
                                    <div className="p-10 flex flex-col gap-10">
                                        <div className="flex flex-col gap-4">
                                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Autonomous Sensitivity</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {['LOW', 'MED', 'HIGH'].map((level) => (
                                                    <button 
                                                        key={level}
                                                        onClick={() => setSensitivity(level as any)}
                                                        className={`py-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                                            sensitivity === level 
                                                            ? 'bg-cyber-accent/10 border-cyber-accent text-white shadow-glow-cyan/10' 
                                                            : 'bg-zinc-900/50 border-cyber-border/30 text-zinc-500 hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <Cpu size={24} className={sensitivity === level ? 'text-cyber-accent animate-pulse' : ''} />
                                                        <span className="text-[10px] tracking-widest uppercase font-black">{level}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-wide">Adjusts the threshold for correlated flight pattern threat detection across accounts.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <button 
                                                onClick={() => setFleetLock(!fleetLock)}
                                                className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-cyber-border/30 hover:border-cyber-accent/30 transition-all text-left"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-white uppercase tracking-widest italic font-black">Autonomous Fleet Lock</span>
                                                    <span className="text-[9px] text-zinc-600 uppercase font-bold">Instantly lock all accounts upon critical threat detection.</span>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative p-1 transition-all ${fleetLock ? 'bg-cyber-accent' : 'bg-zinc-800'}`}>
                                                    <div className={`w-4 h-4 bg-black rounded-full shadow-lg transition-all transform ${fleetLock ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                            <button 
                                                onClick={() => setBiometricReq(!biometricReq)}
                                                className="w-full flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-cyber-border/30 hover:border-cyber-accent/30 transition-all text-left"
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-white uppercase tracking-widest italic font-black">Biometric Verification Requirement</span>
                                                    <span className="text-[9px] text-zinc-600 uppercase font-bold">Mandatory hardware key or biometric token to lift shield.</span>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative p-1 transition-all ${biometricReq ? 'bg-cyber-accent' : 'bg-zinc-800'}`}>
                                                    <div className={`w-4 h-4 bg-black rounded-full shadow-lg transition-all transform ${biometricReq ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* HUD Preference Section */}
                        {activeSection === 'HUD' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="cyber-card p-10 flex flex-col md:flex-row items-center gap-10">
                                    <div className="flex-1 space-y-6">
                                        <h3 className="text-sm font-black italic uppercase tracking-[0.2em] text-cyber-blue">Global HUD Rendering</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Globe Texture resolution</span>
                                                <span className="text-[10px] text-cyber-accent font-black uppercase">8K Cinema Mode</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-cyber-border/30 rounded-full overflow-hidden">
                                                <div className="h-full bg-linear-to-r from-cyber-blue to-cyan-400 w-full" />
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[8px] text-zinc-600 uppercase font-bold">4K Standard</span>
                                                <span className="text-[8px] text-zinc-600 uppercase font-bold">8K Forensic</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-48 h-32 bg-zinc-900 border border-cyber-border rounded-2xl flex items-center justify-center p-4 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-cyber-blue/5 animate-pulse" />
                                        <HardDrive className="w-10 h-10 text-cyber-blue opacity-50 relative z-10" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notification Section */}
                        {activeSection === 'NOTIFICATIONS' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="cyber-card p-10 space-y-8">
                                    <div className="flex items-center gap-4 mb-2">
                                        <Bell className="text-cyber-accent w-5 h-5" />
                                        <h3 className="text-sm font-black italic uppercase tracking-[0.2em] text-white">Identity Dispatch Protocol</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {[
                                            { id: 'hud', label: 'Guardian HUD Overlay', desc: 'Real-time intervention HUD for critical leaks.', state: hudOverlay, setter: setHudOverlay },
                                            { id: 'alpha', label: 'Detailed Safety Analysis', desc: 'See exactly how our AI makes safety decisions.', state: alphaReasoning, setter: setAlphaReasoning },
                                            { id: 'sms', label: 'Neural Link (SMS)', desc: 'Direct identity breach alert via satellite link.', state: smsDispatch, setter: setSmsDispatch },
                                            { id: 'email', label: 'Fleet Digest (Email)', desc: '24-hour summary of account resilience.', state: emailDigest, setter: setEmailDigest }
                                        ].map((item) => (
                                            <button 
                                                key={item.id}
                                                onClick={() => item.setter(!item.state)}
                                                className="w-full flex items-center justify-between p-5 bg-zinc-900/40 border border-white/5 rounded-2xl hover:border-cyber-accent/30 transition-all group"
                                            >
                                                <div className="flex flex-col text-left gap-1">
                                                    <span className="text-[11px] font-black text-white uppercase italic group-hover:text-cyber-accent transition-colors">{item.label}</span>
                                                    <span className="text-[9px] text-zinc-600 uppercase font-black">{item.desc}</span>
                                                </div>
                                                <div className={`w-10 h-5 rounded-full p-1 transition-all ${item.state ? 'bg-cyber-accent' : 'bg-zinc-800'}`}>
                                                    <div className={`w-3 h-3 bg-black rounded-full transition-all transform ${item.state ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Simulator Section */}
                        {activeSection === 'SIMULATOR' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="cyber-card p-10 space-y-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Database className="text-cyber-accent w-5 h-5" />
                                            <h3 className="text-sm font-black italic uppercase tracking-[0.2em] text-white">Safety Testing Center</h3>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-cyber-accent/10 border border-cyber-accent/30 rounded-full">
                                            <div className="w-1.5 h-1.5 bg-cyber-accent rounded-full animate-pulse shadow-glow-cyan" />
                                            <span className="text-[8px] font-black text-cyber-accent uppercase tracking-tighter italic">Safety Engine Active</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Check-In Frequency</label>
                                            <div className="flex gap-2">
                                                {[30, 60, 300].map((v) => (
                                                    <button 
                                                        key={v}
                                                        onClick={() => setPulseFrequency(v)}
                                                        className={`flex-1 py-3 rounded-lg border text-[10px] font-black font-mono transition-all ${
                                                            pulseFrequency === v 
                                                            ? 'bg-cyber-accent/10 border-cyber-accent text-cyber-accent' 
                                                            : 'bg-black/20 border-white/5 text-zinc-600 hover:text-zinc-400'
                                                        }`}
                                                    >
                                                        {v >= 60 ? `${v/60}M` : `${v}S`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Simulated Threat Level ({attackIntensity}%)</label>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="100" 
                                                value={attackIntensity}
                                                onChange={(e) => setAttackIntensity(parseInt(e.target.value))}
                                                className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-cyber-accent"
                                            />
                                            <div className="flex justify-between text-[8px] text-zinc-600 font-black uppercase">
                                                <span>Normal Traffic</span>
                                                <span>Critical Fleet Attack</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <button 
                                            onClick={handleRunTest}
                                            disabled={testCooldown > 0 || isSaving}
                                            className="w-full p-4 bg-zinc-900 border border-cyber-accent/20 rounded-xl flex items-center justify-center gap-3 group hover:bg-cyber-accent/5 hover:border-cyber-accent/50 transition-all disabled:opacity-50"
                                        >
                                            {isSaving ? (
                                                <RefreshCw className="animate-spin text-cyber-accent" size={16} />
                                            ) : (
                                                <Radio className={`text-cyber-accent ${testCooldown > 0 ? '' : 'group-hover:animate-pulse'}`} size={16} />
                                            )}
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                                                {testCooldown > 0 ? `COOLDOWN: ${testCooldown}S` : 'Initialize Brute Force Test'}
                                            </span>
                                        </button>
                                        
                                        <button 
                                            onClick={handlePushUpdate}
                                            disabled={isPushingUpdate}
                                            className="w-full mt-4 p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl flex items-center justify-center gap-3 group hover:bg-pink-500/10 hover:border-pink-500/50 transition-all disabled:opacity-50"
                                        >
                                            <Zap className={`text-pink-500 ${isPushingUpdate ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} size={16} />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                                                {isPushingUpdate ? 'PUSHING UPDATE...' : `Push System Upgrade to v${(parseFloat(dynamicVersion) + 0.1).toFixed(1)}`}
                                            </span>
                                        </button>
                                        
                                        <p className="text-[8px] text-center text-zinc-600 mt-4 uppercase font-black">Test or upgrade the system infrastructure in real-time.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer HUD elements */}
                <footer className="mt-10 border-t border-cyber-border/50 pt-10 pb-20 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">Protocol Revision</span>
                            <span className="text-xs text-zinc-400 font-mono italic">v{dynamicVersion}-stable_release</span>
                        </div>
                        <div className="h-8 w-px bg-cyber-border/50" />
                        <div className="flex flex-col text-left">
                            <span className="text-[8px] text-zinc-600 uppercase tracking-widest font-black">Safety Engine Status</span>
                            <span className={`text-xs font-mono italic transition-all ${saveStatus ? 'text-white' : testCooldown > 0 ? 'text-pink-500 animate-pulse' : 'text-cyber-accent'}`}>
                                {saveStatus || (testCooldown > 0 ? `SCAN_IN_PROGRESS_${testCooldown}` : 'SYST_ALL_OK')}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/terms" className="text-[10px] text-zinc-600 uppercase hover:text-white transition-colors font-black tracking-widest">Guardian Agreement</Link>
                        <span className="text-zinc-800">•</span>
                        <Link href="/privacy" className="text-[10px] text-zinc-600 uppercase hover:text-white transition-colors font-black tracking-widest">Identity Rights</Link>
                    </div>
                </footer>

            </div>
        </main>
    );
};

export default SettingsPage;
