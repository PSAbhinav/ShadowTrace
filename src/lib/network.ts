"use client";

/**
 * Public IP Discovery Utility
 * Used to resolve the client's public internet IP for forensic logging.
 */

const PROVIDERS = [
    "https://api.ipify.org?format=json",
    "https://ipapi.co/json/",
    "https://ident.me/.json",
    "https://api.seeip.org/jsonip"
];

export async function getPublicIP(): Promise<string> {
    // Try each provider in sequence until one succeeds
    for (const url of PROVIDERS) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (!response.ok) continue;
            
            const data = await response.json();
            // Some providers return {ip: ...}, others return {ip_address: ...}
            const ip = data.ip || data.ip_address || data.query;
            
            if (ip && typeof ip === 'string') {
                return ip;
            }
        } catch (error) {
            console.warn(`Public IP provider ${url} failed, trying next...`);
        }
    }
    
    // Final fallback: Return generic localhost if all providers fail (rare)
    return "127.0.0.1";
}
