import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

const ABUSEIPDB_URL = "https://api.abuseipdb.com/api/v2/check";
const API_KEY = process.env.ABUSEIPDB_API_KEY;

/**
 * IP Reputation Service
 * Calls AbuseIPDB API or falls back to Mock Mode.
 */
export async function checkIPReputation(ip) {
    if (!API_KEY || API_KEY.includes("your_")) {
        return mockReputation(ip);
    }

    try {
        const response = await fetch(`${ABUSEIPDB_URL}?ipAddress=${ip}&maxAgeInDays=90`, {
            method: "GET",
            headers: {
                "Key": API_KEY,
                "Accept": "application/json"
            }
        });

        if (!response.ok) throw new Error("API Limit or Network Error");

        const res = await response.json();
        const score = res.data.abuseConfidenceScore;

        return {
            isMalicious: score > 20,
            score: score,
            totalReports: res.data.totalReports,
            provider: "AbuseIPDB",
            lastReportedAt: res.data.lastReportedAt || "Never"
        };
    } catch (error) {
        return mockReputation(ip);
    }
}

function mockReputation(ip) {
    const maliciousIPs = ["192.168.1.189", "45.33.22.11"];
    const isMock = maliciousIPs.includes(ip);
    return {
        isMalicious: isMock,
        score: isMock ? 85 : 0,
        provider: "MockThreatIntel (Fallback)",
        lastSeen: new Date().toISOString()
    };
}
