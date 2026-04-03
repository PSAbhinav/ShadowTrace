"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';

// Dynamic import for React Globe GL to handle SSR
const Globe = dynamic(() => import('react-globe.gl'), { 
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-transparent border border-cyber-accent/20 rounded-lg animate-pulse text-cyber-blue font-mono text-[10px] uppercase tracking-widest">Initialising Guardian Mesh...</div>
});

interface GlobePoint {
    lat: number;
    lng: number;
    size?: number;
    color?: string;
    label?: string;
}

interface GlobeArc {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    color?: string;
    label?: string;
}

interface GlobeComponentProps {
    points?: GlobePoint[];
    arcs?: GlobeArc[];
    selectedAccount?: string;
    centerLocation?: { lat: number; lng: number }; // For zooming in to alerts
    showOverlay?: boolean;
}

const GlobeComponent: React.FC<GlobeComponentProps> = ({ 
    points = [], 
    arcs = [], 
    selectedAccount, 
    centerLocation,
    showOverlay = true
}) => {
    const globeRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Premium Textures
    const globeConfig = useMemo(() => ({
        globeImageUrl: "//unpkg.com/three-globe/example/img/earth-night.jpg", // 4k-equivalent
        bumpImageUrl: "//unpkg.com/three-globe/example/img/earth-topology.png",
        backgroundImageUrl: null,
        showAtmosphere: true,
        atmosphereColor: "#0ea5e9",
        atmosphereAltitude: 0.15,
    }), []);

    // Handle Responsive Resize
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Point Of View (Zoom) Effect
    useEffect(() => {
        if (globeRef.current && centerLocation) {
            globeRef.current.pointOfView({
                lat: centerLocation.lat,
                lng: centerLocation.lng,
                altitude: 0.6 // Zoomed in level
            }, 2000); // 2 second smooth transition
        }
    }, [centerLocation]);

    // Rotation effect
    useEffect(() => {
        if (globeRef.current) {
            const controls = globeRef.current.controls();
            if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = centerLocation ? 0.4 : 0.8;
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
            }
        }
    }, [centerLocation, dimensions]); // Trigger on dimensions change too to ensure it's set after mount

    // Custom Cloud Layer
    useEffect(() => {
        if (!globeRef.current) return;
        
        const CLOUDS_IMG_URL = '//unpkg.com/three-globe/example/img/earth-clouds.png'; 
        const CLOUDS_ALT = 0.004;
        const CLOUDS_ROTATION_SPEED = -0.006; // deg/frame

        new THREE.TextureLoader().load(CLOUDS_IMG_URL, cloudsTexture => {
            const clouds = new THREE.Mesh(
                new THREE.SphereGeometry(globeRef.current.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
                new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
            );
            globeRef.current.scene().add(clouds);

            (function rotateClouds() {
                clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
                requestAnimationFrame(rotateClouds);
            })();
        });
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center">
            {dimensions.width > 0 && (
                <Globe
                    ref={globeRef}
                    backgroundColor="rgba(0,0,0,0)"
                    width={dimensions.width}
                    height={dimensions.height}
                    {...globeConfig}
                    
                    // Point Visualization (Logins/Attempts)
                    pointsData={points}
                    pointRadius="size"
                    pointColor="color"
                    pointAltitude={0.02}
                    pointLabel="label"
                    
                    // Arc Visualization (Attacks)
                    arcsData={arcs}
                    arcColor="color"
                    arcDashLength={0.4}
                    arcDashGap={2}
                    arcDashAnimateTime={2000}
                    arcStroke={0.5}
                    arcAltitude={0.25}
                    
                    // Interaction
                    onPointClick={(point: any) => {
                        if (globeRef.current) {
                            globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1 }, 1000);
                        }
                    }}
                />
            )}
            
            {/* Overlay Info */}
            {showOverlay && (
                <div className="absolute top-4 left-4 pointer-events-none group">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] text-cyber-blue font-black uppercase tracking-[0.2em] opacity-40 italic group-hover:opacity-100 transition-opacity">
                          ShadowTrace Global Identity Mesh
                      </div>
                      <div className="text-xs font-black text-white uppercase tracking-tight shadow-sm">
                          {selectedAccount || "ALL IDENTITIES MONITORING"}
                      </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobeComponent;
