import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  push, 
  get, 
  Database 
} from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';
import type { 
  DeviceLatestData, 
  GeofenceConfig, 
  AlertRecord, 
  HistoricalGpsPoint,
  FirebaseCredentials 
} from '../types';

const STORAGE_KEY = 'cattleguard_firebase_config';

const DEFAULT_PROJECT_ID = 'esp32-gps-tracker-4b283';
const DEFAULT_DATABASE_URL = 'https://esp32-gps-tracker-4b283-default-rtdb.asia-southeast1.firebasedatabase.app';
const DEFAULT_AUTH_DOMAIN = 'esp32-gps-tracker-4b283.firebaseapp.com';
const DEFAULT_API_KEY = '';
const DEFAULT_STORAGE_BUCKET = 'esp32-gps-tracker-4b283.firebasestorage.app';
const DEFAULT_APP_ID = '';

/**
 * Retrieve credentials from environment, localStorage, or known project defaults
 */
export function getFirebaseCredentials(): FirebaseCredentials {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.apiKey && parsed.databaseURL) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '32216940640',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_APP_ID,
  };
}

export function saveFirebaseCredentials(creds: FirebaseCredentials) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  appInstance = null;
  dbInstance = null;
}

export function clearStoredFirebaseCredentials() {
  localStorage.removeItem(STORAGE_KEY);
  appInstance = null;
  dbInstance = null;
}

export function isFirebaseConfigured(): boolean {
  const creds = getFirebaseCredentials();
  return Boolean(creds.apiKey && creds.databaseURL);
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Database | null = null;

export function getFirebaseDb(): Database | null {
  const creds = getFirebaseCredentials();
  if (!creds.apiKey || !creds.databaseURL) {
    return null;
  }

  try {
    if (!appInstance) {
      if (getApps().length > 0) {
        appInstance = getApp();
      } else {
        appInstance = initializeApp({
          apiKey: creds.apiKey,
          authDomain: creds.authDomain,
          databaseURL: creds.databaseURL.trim(),
          projectId: creds.projectId,
          storageBucket: creds.storageBucket,
          messagingSenderId: creds.messagingSenderId,
          appId: creds.appId,
        });
      }
    }

    if (!dbInstance) {
      dbInstance = getDatabase(appInstance, creds.databaseURL.trim());
    }

    return dbInstance;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return null;
  }
}

/**
 * Test the Firebase Database connection by attempting a read
 */
export async function testFirebaseConnection(): Promise<{ success: boolean; message: string; isPermissionDenied?: boolean }> {
  appInstance = null;
  dbInstance = null;

  const db = getFirebaseDb();
  if (!db) {
    return { success: false, message: 'Firebase credentials are missing or invalid.' };
  }

  try {
    const testRef = ref(db, 'geofence');
    await get(testRef);
    return { success: true, message: 'Successfully connected to Firebase Realtime Database!' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isPermissionDenied = errMsg.toLowerCase().includes('permission denied') || errMsg.toLowerCase().includes('permission_denied');

    if (isPermissionDenied) {
      return { 
        success: false, 
        message: 'Permission denied: Your Firebase Realtime Database Security Rules are blocking access. Update your Security Rules in Firebase Console to allow read/write.',
        isPermissionDenied: true
      };
    }
    return { success: false, message: `Connection failed: ${errMsg}` };
  }
}

/**
 * Subscribe to the latest location of a device: /devices/{deviceId}/latest
 * Order of coordinates is strictly [latitude, longitude].
 */
export function listenToLatestLocation(
  deviceId: string,
  onData: (data: DeviceLatestData | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) {
    onData(null);
    return () => {};
  }

  const latestRef = ref(db, `devices/${deviceId}/latest`);
  return onValue(
    latestRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        onData({
          latitude: Number(val.latitude || 0),
          longitude: Number(val.longitude || 0),
          satellites: Number(val.satellites || 0),
          hdop: val.hdop !== undefined && val.hdop !== null ? Number(val.hdop) : null,
          timestamp: val.timestamp || Date.now(),
          outside: Boolean(val.outside),
          distanceM: Number(val.distanceM || 0),
          batteryPct: val.batteryPct !== undefined ? Number(val.batteryPct) : undefined,
          altitudeM: val.altitudeM !== undefined ? Number(val.altitudeM) : undefined,
          speedKmh: val.speedKmh !== undefined ? Number(val.speedKmh) : undefined,
        });
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error('Error reading latest device location:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to historical GPS records: /devices/{deviceId}/history
 * Sorts all records chronologically using their timestamps.
 */
export function listenToHistory(
  deviceId: string,
  onData: (points: HistoricalGpsPoint[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  const historyRef = ref(db, `devices/${deviceId}/history`);
  return onValue(
    historyRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const points: HistoricalGpsPoint[] = [];

        const parseTimestampMs = (ts: unknown): number => {
          if (!ts) return 0;
          if (typeof ts === 'number') {
            return ts < 10000000000 ? ts * 1000 : ts;
          }
          const parsed = Date.parse(String(ts));
          return isNaN(parsed) ? 0 : parsed;
        };

        if (Array.isArray(val)) {
          val.forEach((item, index) => {
            if (item && item.latitude !== undefined && item.longitude !== undefined) {
              points.push({
                id: String(index),
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
                satellites: item.satellites !== undefined ? Number(item.satellites) : undefined,
                hdop: item.hdop !== undefined && item.hdop !== null ? Number(item.hdop) : null,
                timestamp: item.timestamp || Date.now(),
                outside: Boolean(item.outside),
                distanceM: item.distanceM !== undefined ? Number(item.distanceM) : undefined,
              });
            }
          });
        } else if (typeof val === 'object') {
          Object.keys(val).forEach((key) => {
            const item = val[key];
            if (item && item.latitude !== undefined && item.longitude !== undefined) {
              points.push({
                id: key,
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
                satellites: item.satellites !== undefined ? Number(item.satellites) : undefined,
                hdop: item.hdop !== undefined && item.hdop !== null ? Number(item.hdop) : null,
                timestamp: item.timestamp || Date.now(),
                outside: Boolean(item.outside),
                distanceM: item.distanceM !== undefined ? Number(item.distanceM) : undefined,
              });
            }
          });
        }

        // Sort chronologically (oldest first for path polyline and chronological playback)
        points.sort((a, b) => parseTimestampMs(a.timestamp) - parseTimestampMs(b.timestamp));

        onData(points);
      } else {
        onData([]);
      }
    },
    (error) => {
      console.error('Error reading history records:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to geofence configuration: /geofence
 * Existing path: /geofence
 * Fields: centerLat, centerLon, radiusM
 */
export function listenToGeofence(
  onData: (data: GeofenceConfig | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) {
    onData(null);
    return () => {};
  }

  const geofenceRef = ref(db, 'geofence');
  return onValue(
    geofenceRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        onData({
          centerLat: Number(val.centerLat),
          centerLon: Number(val.centerLon),
          radiusM: Number(val.radiusM),
          updatedAt: val.updatedAt,
        });
      } else {
        onData(null);
      }
    },
    (error) => {
      console.error('Error reading geofence config:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save Geofence configuration to Firebase: /geofence
 * Writes EXACTLY:
 * /geofence
 *   centerLat
 *   centerLon
 *   radiusM
 */
export async function saveGeofenceToFirebase(geofence: GeofenceConfig): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase Database is not configured. Please connect Firebase in Settings.');
  }

  const geofenceRef = ref(db, 'geofence');
  await set(geofenceRef, {
    centerLat: Number(geofence.centerLat),
    centerLon: Number(geofence.centerLon),
    radiusM: Number(geofence.radiusM),
    updatedAt: Date.now(),
  });
}

/**
 * Subscribe to alerts for device: /alerts/{deviceId}
 */
export function listenToAlerts(
  deviceId: string,
  onData: (alerts: AlertRecord[]) => void
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  const alertsRef = ref(db, `alerts/${deviceId}`);
  return onValue(alertsRef, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      const list: AlertRecord[] = [];
      Object.keys(val).forEach((key) => {
        const item = val[key];
        list.push({
          id: key,
          type: item.type || (item.outside ? 'GEOFENCE_BREACH' : 'GEOFENCE_RETURN'),
          deviceId: item.deviceId || deviceId,
          timestamp: item.timestamp || Date.now(),
          latitude: Number(item.latitude || 0),
          longitude: Number(item.longitude || 0),
          distanceM: Number(item.distanceM || 0),
          outside: Boolean(item.outside),
          message: item.message || (item.outside ? 'Animal left safe grazing perimeter' : 'Animal returned to safe zone'),
          acknowledged: Boolean(item.acknowledged),
        });
      });
      // Sort newest first
      list.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      onData(list);
    } else {
      onData([]);
    }
  });
}

/**
 * Publish an alert record to /alerts/{deviceId}
 */
export async function pushAlertRecord(alert: Omit<AlertRecord, 'id'>): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const alertsRef = ref(db, `alerts/${alert.deviceId}`);
  await push(alertsRef, {
    ...alert,
    timestamp: typeof alert.timestamp === 'number' ? alert.timestamp : Date.now(),
  });
}

/**
 * Publish a GPS coordinate update to Firebase
 */
export async function publishDeviceTelemetry(
  deviceId: string,
  telemetry: DeviceLatestData
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const latestRef = ref(db, `devices/${deviceId}/latest`);
  await set(latestRef, telemetry);

  // Also push to history
  const historyRef = ref(db, `devices/${deviceId}/history`);
  await push(historyRef, telemetry);
}
