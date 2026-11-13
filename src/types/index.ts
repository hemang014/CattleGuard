export interface DeviceLatestData {
  latitude: number;
  longitude: number;
  satellites: number;
  hdop?: number | null;
  timestamp: number | string;
  outside: boolean;
  distanceM: number;
  batteryPct?: number;
  altitudeM?: number;
  speedKmh?: number;
}

export interface HistoricalGpsPoint {
  id?: string;
  latitude: number;
  longitude: number;
  satellites?: number;
  hdop?: number | null;
  timestamp: number | string;
  outside?: boolean;
  distanceM?: number;
}

export interface GeofenceConfig {
  centerLat: number;
  centerLon: number;
  radiusM: number;
  updatedAt?: number | string;
}

export type AlertType = 'GEOFENCE_BREACH' | 'GEOFENCE_RETURN' | 'GPS_LOST' | 'LOW_BATTERY' | 'BUZZER_ACTIVE';

export interface AlertRecord {
  id: string;
  type: AlertType;
  deviceId: string;
  timestamp: number | string;
  latitude: number;
  longitude: number;
  distanceM: number;
  outside: boolean;
  message: string;
  acknowledged?: boolean;
}

export interface Animal {
  id: string;
  name: string;
  deviceId: string;
  breed: string;
  gender: 'Cow' | 'Bull' | 'Heifer' | 'Calf';
  weightKg: number;
  registrationDate: string;
  avatarUrl: string;
  notes?: string;
  status: 'SAFE' | 'BREACH' | 'OFFLINE';
}

export type DeviceConnectivity = 'ONLINE' | 'OFFLINE' | 'GPS_WAITING' | 'NO_DATA';

export type MapLayerType = 'street' | 'satellite' | 'terrain';

export type OperatingMode = 'LIVE' | 'DEMO';

export type SimulationState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type DemoEventType = 
  | 'SIMULATION_STARTED'
  | 'SIMULATION_PAUSED'
  | 'SIMULATION_RESUMED'
  | 'SIMULATION_STOPPED'
  | 'HERD_BREACH'
  | 'HERD_RETURN'
  | 'GEOFENCE_UPDATED'
  | 'HERD_MANUAL_MOVE'
  | 'SCENARIO_LOADED';

export interface DemoEvent {
  id: string;
  type: DemoEventType;
  timestamp: number;
  latitude: number;
  longitude: number;
  distanceM: number;
  radiusM: number;
  outside: boolean;
  message: string;
  details?: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'success' | 'info' | 'warning';
  timestamp: number;
  latitude?: number;
  longitude?: number;
  distanceM?: number;
  radiusM?: number;
  outside?: boolean;
}

export type PresetScenario = 'HERD_INSIDE' | 'JUST_OUTSIDE' | 'FAR_OUTSIDE' | 'RETURN_SAFE' | 'CUSTOM';

export type ActiveTab = 
  | 'overview' 
  | 'tracking' 
  | 'demo'
  | 'herd' 
  | 'geofence' 
  | 'alerts' 
  | 'analytics' 
  | 'settings';

export interface FirebaseCredentials {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

