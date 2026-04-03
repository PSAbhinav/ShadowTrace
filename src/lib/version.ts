/**
 * ShadowTrace Versioning System
 * 
 * Following modern release naming conventions.
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Significant overhaul
 * - MINOR: Feature additions/Security updates
 * - PATCH: Bug fixes and small refinements
 */

export const APP_VERSION = "1.3.0"; 

export const getReleaseName = () => `ShadowTrace v${APP_VERSION}`;
