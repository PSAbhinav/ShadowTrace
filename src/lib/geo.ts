// src/lib/geo.ts
/**
 * Real-time IP Geolocation Utility for ShadowTrace
 * Uses ip-api.com (No API key required for standard usage)
 */

export interface GeoLocation {
    status: string;
    country: string;
    countryCode: string;
    region: string;
    regionName: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
    timezone: string;
    isp: string;
    org: string;
    as: string;
    query: string; // The IP address
}

export async function fetchGeoByIP(ip?: string): Promise<GeoLocation | null> {
    const target = ip ? ip.trim() : "";
    
    // ShadowTrace Localhost & Private Network Handling
    const isMock = target === '::1' || target === '127.0.0.1' || target.startsWith('192.168.') || target.startsWith('10.');
    if (isMock) {
        console.log(`[ShadowTrace] Local Origin Detected (${target}). Returning Forensic Mock...`);
        return {
            status: 'success',
            country: 'United States',
            countryCode: 'US',
            region: 'NY',
            regionName: 'New York',
            city: 'New York City',
            zip: '10001',
            lat: 40.7128,
            lon: -74.0060,
            timezone: 'America/New_York',
            isp: 'ShadowTrace Internal Node',
            org: 'Forensic Lab',
            as: 'AS0001',
            query: target
        } as GeoLocation;
    }

    try {
        const response = await fetch(`https://freeipapi.com/api/json/${target}`);
        if (!response.ok) throw new Error('API unreachable');
        const data = await response.json();
        
        if (!data || !data.latitude) {
            console.error('[GEO_FETCH_ERROR] Invalid response from provider');
            return null;
        }
        
        return {
            status: 'success',
            country: data.countryName || 'Unknown Origin',
            countryCode: data.countryCode || '??',
            region: data.regionName || '',
            regionName: data.regionName || 'Unknown Region',
            city: data.cityName || 'Unknown City',
            zip: data.zipCode || '',
            lat: data.latitude,
            lon: data.longitude,
            timezone: data.timeZone || 'UTC',
            isp: data.ipVersion === 4 ? (data.isp || 'Detected ISP') : 'Detected ISP (v6)',
            org: '',
            as: '',
            query: data.ipAddress || target
        } as GeoLocation;
    } catch (error) {
        console.error('[GEO_FETCH_EXCEPTION]', error);
        return null;
    }
}
