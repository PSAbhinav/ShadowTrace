import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { APP_VERSION } from './version';

/**
 * ShadowTrace Version Synchronization Engine
 * Listens for remote version updates and triggers core system refresh.
 */
export const initVersionSync = (onUpdate: (newVersion: string) => void) => {
    const versionDoc = doc(db, 'system', 'config');
    
    return onSnapshot(versionDoc, (snapshot) => {
        if (snapshot.exists()) {
            const remoteVersion = snapshot.data().version;
            if (remoteVersion && remoteVersion !== APP_VERSION) {
                console.log(`[ShadowTrace] Version Mismatch: Local(${APP_VERSION}) != Remote(${remoteVersion})`);
                onUpdate(remoteVersion);
            }
        }
    });
};
