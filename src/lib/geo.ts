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
    
    // ShadowTrace Internal Security Node Handling (Zero-Mock Policy)
    const isInternal = target === '::1' || target === '127.0.0.1' || target.startsWith('192.168.') || target.startsWith('10.');
    
    if (isInternal) {
        return {
            status: 'success',
            country: 'Internal Management Node',
            countryCode: 'SOC',
            region: 'CMD',
            regionName: 'Command & Control',
            city: 'ShadowTrace System',
            zip: '',
            lat: 0,
            lon: 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            isp: 'ShadowTrace Command Infrastructure',
            org: 'Internal Secure Network',
            as: 'LOCAL_PIPE',
            query: target
        } as GeoLocation;
    }

    try {
        // Primary: ipapi.co (High Fidelity Forensic Data)
        const response = await fetch(`https://ipapi.co/${target}/json/`);
        if (response.ok) {
            const data = await response.json();
            if (!data.error) {
                return {
                    status: 'success',
                    country: data.country_name || 'Unknown Origin',
                    countryCode: data.country_code || '??',
                    region: data.region_code || '',
                    regionName: data.region || 'Unknown Region',
                    city: data.city || 'Unknown City',
                    zip: data.postal || '',
                    lat: data.latitude,
                    lon: data.longitude,
                    timezone: data.timezone || 'UTC',
                    isp: data.org || 'Detected ISP', // ipapi.co uses 'org' for ISP usually
                    org: data.org || '',
                    as: data.asn || '',
                    query: data.ip || target
                } as GeoLocation;
            }
        }

        // Secondary Fallback: ipwho.is
        const altResponse = await fetch(`https://ipwho.is/${target}`);
        if (altResponse.ok) {
            const data = await altResponse.json();
            if (data && data.success) {
                return {
                    status: 'success',
                    country: data.country || 'Unknown Origin',
                    countryCode: data.country_code || '??',
                    region: data.region || '',
                    regionName: data.region || 'Unknown Region',
                    city: data.city || 'Unknown City',
                    zip: data.postal || '',
                    lat: data.latitude,
                    lon: data.longitude,
                    timezone: data.timezone?.id || 'UTC',
                    isp: data.connection?.isp || 'Detected ISP',
                    org: data.connection?.org || '',
                    as: data.connection?.asn ? `AS${data.connection.asn}` : '',
                    query: data.ip || target
                } as GeoLocation;
            }
        }
        
        return null;
    } catch (error) {
        console.error('[GEO_FETCH_EXCEPTION]', error);
        return null;
    }
}
