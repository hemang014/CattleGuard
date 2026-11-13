/**
 * LiveFirebaseService — Isolated service for ESP32 + NEO-6M + Firebase Realtime Database
 * 
 * Target project: esp32-gps-tracker-4b283
 * STRICT RULE: Demo Mode never calls these listeners or writes to these paths.
 */
import {
  listenToLatestLocation,
  listenToHistory,
  listenToGeofence,
  listenToAlerts,
  saveGeofenceToFirebase,
  publishDeviceTelemetry,
  pushAlertRecord,
  isFirebaseConfigured,
  getFirebaseCredentials,
  saveFirebaseCredentials,
} from './firebase';

export {
  listenToLatestLocation,
  listenToHistory,
  listenToGeofence,
  listenToAlerts,
  saveGeofenceToFirebase,
  publishDeviceTelemetry,
  pushAlertRecord,
  isFirebaseConfigured,
  getFirebaseCredentials,
  saveFirebaseCredentials,
};

export const FIREBASE_LIVE_PATHS = {
  LATEST: '/devices/esp32_gps_01/latest',
  HISTORY: '/devices/esp32_gps_01/history',
  GEOFENCE: '/geofence',
  ALERTS: '/alerts/esp32_gps_01',
} as const;
