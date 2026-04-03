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
    const target = ip ? ip : "";
    try {
        // Switching to freeipapi.com for HTTPS support and high accuracy
        const response = await fetch(`https://freeipapi.com/api/json/${target}`);
        const data = await response.json();
        
        // freeipapi response format differs slightly: latitude -> lat, longitude -> lon
        if (!data || !data.latitude) {
            console.error('[GEO_FETCH_ERROR] Invalid response from provider');
            return null;
        }
        
        return {
            status: 'success',
            country: data.countryName || 'Unknown',
            countryCode: data.countryCode || '??',
            region: data.regionName || '',
            regionName: data.regionName || 'Unknown',
            city: data.cityName || 'Unknown',
            zip: data.zipCode || '',
            lat: data.latitude,
            lon: data.longitude,
            timezone: data.timeZone || 'UTC',
            isp: data.ipVersion === 4 ? 'Detected ISP' : 'Detected ISP (v6)',
            org: '',
            as: '',
            query: data.ipAddress || target
        } as GeoLocation;
    } catch (error) {
        console.error('[GEO_FETCH_EXCEPTION]', error);
        return null;
    }
}
