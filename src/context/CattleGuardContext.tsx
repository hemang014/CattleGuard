import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  DeviceLatestData, 
  GeofenceConfig, 
  AlertRecord, 
  Animal, 
  DeviceConnectivity,
  ActiveTab,
  HistoricalGpsPoint 
} from '../types';
import { 
  listenToLatestLocation, 
  listenToGeofence, 
  listenToAlerts, 
  listenToHistory,
  saveGeofenceToFirebase, 
  pushAlertRecord,
  publishDeviceTelemetry,
  isFirebaseConfigured 
} from '../services/firebase';
import { calculateDistanceMeters, playBuzzerAlertSound } from '../utils/geo';

interface CattleGuardContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  geofence: GeofenceConfig;
  updateGeofence: (newConfig: GeofenceConfig) => Promise<{ success: boolean; message?: string }>;
  deviceData: DeviceLatestData | null;
  historyRecords: HistoricalGpsPoint[];
  historyTrail: Array<{ lat: number; lon: number; timestamp: number | string; outside?: boolean }>;
  deviceConnectivity: DeviceConnectivity;
  isFirebaseMode: boolean;
  setIsFirebaseMode: (val: boolean) => void;
  isFirebaseConnected: boolean;
  animals: Animal[];
  addAnimal: (animal: Omit<Animal, 'id'>) => void;
  updateAnimal: (animal: Animal) => void;
  deleteAnimal: (id: string) => void;
  selectedAnimalId: string;
  setSelectedAnimalId: (id: string) => void;
  alerts: AlertRecord[];
  clearAlerts: () => void;
  acknowledgeAlert: (id: string) => void;
  isBuzzerActive: boolean;
  audioAlertEnabled: boolean;
  setAudioAlertEnabled: (val: boolean) => void;
  lastUpdateTime: number;
  onlineTimeoutSeconds: number;
  setOnlineTimeoutSeconds: (val: number) => void;
  // Simulation actions (available in Demo mode or test)
  simulateMoveTo: (lat: number, lon: number) => void;
  simulateBreach: () => void;
  simulateSafeZone: () => void;
  simulateGpsLost: () => void;
  simulateOffline: () => void;
  isSimulatorActive: boolean;
  setIsSimulatorActive: (val: boolean) => void;
}

// Verified historical GPS coordinates from user specification (Section 3)
// Device ID: esp32_gps_01, Lat: 23.12213633, Lon: 72.59768517, Satellites: 8
const HISTORICAL_TEST_COORD = {
  lat: 23.12213633,
  lon: 72.59768517,
  satellites: 8,
  hdop: 0.88,
  timestamp: 1728660712000, // 2026-10-11T15:31:52Z
};

// Default Geofence centered around the verified coordinate
const DEFAULT_GEOFENCE: GeofenceConfig = {
  centerLat: 23.12213633,
  centerLon: 72.59768517,
  radiusM: 200,
};

// Sample Historical points based on actual verified coordinates
const INITIAL_DEMO_HISTORY: HistoricalGpsPoint[] = [
  {
    id: 'pt-1',
    latitude: 23.121650,
    longitude: 72.597120,
    satellites: 8,
    hdop: 0.95,
    timestamp: 1728659500000,
    outside: false,
    distanceM: 78,
  },
  {
    id: 'pt-2',
    latitude: 23.121820,
    longitude: 72.597340,
    satellites: 8,
    hdop: 0.92,
    timestamp: 1728660100000,
    outside: false,
    distanceM: 48,
  },
  {
    id: 'pt-3',
    latitude: 23.12213633,
    longitude: 72.59768517,
    satellites: 8,
    hdop: 0.88,
    timestamp: 1728660712000, // Exact historical record
    outside: false,
    distanceM: 0,
  },
  {
    id: 'pt-4',
    latitude: 23.122420,
    longitude: 72.597950,
    satellites: 9,
    hdop: 0.82,
    timestamp: 1728661300000,
    outside: false,
    distanceM: 42,
  },
  {
    id: 'pt-5',
    latitude: 23.122680,
    longitude: 72.598210,
    satellites: 9,
    hdop: 0.85,
    timestamp: 1728661900000,
    outside: false,
    distanceM: 81,
  },
];

const INITIAL_ANIMALS: Animal[] = [
  {
    id: 'CG-001',
    name: 'Cattle Device 01 (Black Angus)',
    deviceId: 'esp32_gps_01',
    breed: 'Black Angus',
    gender: 'Cow',
    weightKg: 502,
    registrationDate: '2026-01-15',
    avatarUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=400&q=80',
    notes: 'Equipped with ESP32 + NEO-6M GPS Collar #01. Mosfet buzzer attached.',
    status: 'SAFE',
  },
  {
    id: 'CG-002',
    name: 'Heifer Angus #24',
    deviceId: 'esp32_gps_02',
    breed: 'Black Angus',
    gender: 'Heifer',
    weightKg: 478,
    registrationDate: '2026-02-10',
    avatarUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&w=400&q=80',
    notes: 'Grazing in North Paddock 2. Normal temperature profile.',
    status: 'SAFE',
  },
  {
    id: 'CG-003',
    name: 'Brahman Bull #31',
    deviceId: 'esp32_gps_03',
    breed: 'Brahman',
    gender: 'Bull',
    weightKg: 640,
    registrationDate: '2026-03-01',
    avatarUrl: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?auto=format&fit=crop&w=400&q=80',
    notes: 'Herd sire. High mobility during morning hours.',
    status: 'SAFE',
  },
];

const CattleGuardContext = createContext<CattleGuardContextType | undefined>(undefined);

export const CattleGuardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isFirebaseMode, setIsFirebaseMode] = useState<boolean>(() => isFirebaseConfigured());
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [geofence, setGeofence] = useState<GeofenceConfig>(DEFAULT_GEOFENCE);
  const [animals, setAnimals] = useState<Animal[]>(INITIAL_ANIMALS);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('CG-001');
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [audioAlertEnabled, setAudioAlertEnabled] = useState<boolean>(true);
  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [onlineTimeoutSeconds, setOnlineTimeoutSeconds] = useState<number>(90);

  // Live device data (Strictly separated between Live Firebase mode and Demo mode)
  const [liveFirebaseDeviceData, setLiveFirebaseDeviceData] = useState<DeviceLatestData | null>(null);
  const [demoDeviceData, setDemoDeviceData] = useState<DeviceLatestData>({
    latitude: HISTORICAL_TEST_COORD.lat,
    longitude: HISTORICAL_TEST_COORD.lon,
    satellites: HISTORICAL_TEST_COORD.satellites,
    hdop: HISTORICAL_TEST_COORD.hdop,
    timestamp: Date.now(),
    outside: false,
    distanceM: 0,
    batteryPct: 92,
  });

  // History records
  const [firebaseHistoryRecords, setFirebaseHistoryRecords] = useState<HistoricalGpsPoint[]>([]);
  const [demoHistoryRecords, setDemoHistoryRecords] = useState<HistoricalGpsPoint[]>(INITIAL_DEMO_HISTORY);

  // Choose data source based on mode
  const deviceData = isFirebaseMode ? liveFirebaseDeviceData : demoDeviceData;
  const historyRecords = isFirebaseMode ? firebaseHistoryRecords : demoHistoryRecords;

  // History trail coordinates for simple polylines
  const historyTrail = useMemo(() => {
    return historyRecords.map((p) => ({
      lat: p.latitude,
      lon: p.longitude,
      timestamp: p.timestamp,
      outside: p.outside,
    }));
  }, [historyRecords]);

  const prevOutsideRef = useRef<boolean>(false);

  // Compute connectivity strictly according to Section 8:
  // ONLINE, OFFLINE, GPS WAITING, NO DATA
  const computeConnectivity = (): DeviceConnectivity => {
    if (!deviceData) {
      return 'NO_DATA';
    }
    if (
      !deviceData.latitude || 
      !deviceData.longitude || 
      (deviceData.latitude === 0 && deviceData.longitude === 0) || 
      (deviceData.satellites ?? 0) < 3
    ) {
      return 'GPS_WAITING';
    }

    const recordTime = typeof deviceData.timestamp === 'number' 
      ? (deviceData.timestamp < 10000000000 ? deviceData.timestamp * 1000 : deviceData.timestamp)
      : Date.parse(String(deviceData.timestamp)) || 0;

    const ageMs = Date.now() - recordTime;
    const timeoutMs = onlineTimeoutSeconds * 1000;

    if (ageMs > timeoutMs) {
      return 'OFFLINE';
    }
    return 'ONLINE';
  };

  const deviceConnectivity = computeConnectivity();
  const isBuzzerActive = Boolean(deviceData?.outside);

  // Sound alert trigger when entering breach
  useEffect(() => {
    if (deviceData?.outside && !prevOutsideRef.current) {
      if (audioAlertEnabled) {
        playBuzzerAlertSound();
      }
    }
    prevOutsideRef.current = Boolean(deviceData?.outside);
  }, [deviceData?.outside, audioAlertEnabled]);

  // Connect to Firebase listeners when isFirebaseMode is enabled
  useEffect(() => {
    if (!isFirebaseMode) {
      setIsFirebaseConnected(false);
      return;
    }

    let unsubLocation: (() => void) | null = null;
    let unsubGeofence: (() => void) | null = null;
    let unsubAlerts: (() => void) | null = null;
    let unsubHistory: (() => void) | null = null;

    try {
      // 1. Geofence listener (/geofence)
      unsubGeofence = listenToGeofence((remoteGeofence) => {
        if (remoteGeofence && remoteGeofence.centerLat && remoteGeofence.radiusM) {
          setGeofence(remoteGeofence);
          setIsFirebaseConnected(true);
        }
      });

      // 2. Latest Location listener (/devices/esp32_gps_01/latest)
      unsubLocation = listenToLatestLocation('esp32_gps_01', (telemetry) => {
        if (telemetry) {
          setIsFirebaseConnected(true);
          setLastUpdateTime(Date.now());
          setLiveFirebaseDeviceData(telemetry);
        } else {
          setLiveFirebaseDeviceData(null);
        }
      });

      // 3. Historical GPS Records (/devices/esp32_gps_01/history)
      unsubHistory = listenToHistory('esp32_gps_01', (records) => {
        setFirebaseHistoryRecords(records);
      });

      // 4. Alerts listener (/alerts/esp32_gps_01)
      unsubAlerts = listenToAlerts('esp32_gps_01', (remoteAlerts) => {
        setAlerts(remoteAlerts);
      });
    } catch (err) {
      console.error('Firebase subscription error:', err);
      setIsFirebaseConnected(false);
    }

    return () => {
      if (unsubLocation) unsubLocation();
      if (unsubGeofence) unsubGeofence();
      if (unsubAlerts) unsubAlerts();
      if (unsubHistory) unsubHistory();
    };
  }, [isFirebaseMode]);

  // Save Geofence Handler (writes directly to /geofence)
  const updateGeofence = useCallback(async (newConfig: GeofenceConfig): Promise<{ success: boolean; message?: string }> => {
    setGeofence(newConfig);

    // Recalculate distance and safe zone status for current animal position
    if (deviceData && deviceData.latitude && deviceData.longitude) {
      const dist = calculateDistanceMeters(
        newConfig.centerLat,
        newConfig.centerLon,
        deviceData.latitude,
        deviceData.longitude
      );
      const outside = dist > newConfig.radiusM;
      if (isFirebaseMode) {
        setLiveFirebaseDeviceData((prev) => (prev ? { ...prev, distanceM: dist, outside } : null));
      } else {
        setDemoDeviceData((prev) => ({ ...prev, distanceM: dist, outside }));
      }
    }

    if (isFirebaseMode && isFirebaseConfigured()) {
      try {
        await saveGeofenceToFirebase(newConfig);
        return { success: true, message: 'Geofence saved and synced with ESP32 collar successfully!' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Saved locally, but Firebase write failed: ${msg}` };
      }
    }

    return { success: true, message: 'Geofence updated in local workspace.' };
  }, [deviceData, isFirebaseMode]);

  // Telemetry Simulation Helpers (Demo Mode)
  const simulateMoveTo = useCallback((lat: number, lon: number) => {
    const dist = calculateDistanceMeters(geofence.centerLat, geofence.centerLon, lat, lon);
    const outside = dist > geofence.radiusM;
    const now = Date.now();

    const updatedTelemetry: DeviceLatestData = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6)),
      satellites: 9,
      hdop: 0.85,
      timestamp: now,
      outside,
      distanceM: dist,
      batteryPct: 91,
    };

    if (isFirebaseMode && isFirebaseConfigured()) {
      publishDeviceTelemetry('esp32_gps_01', updatedTelemetry).catch(console.error);
    } else {
      setDemoDeviceData(updatedTelemetry);
      setDemoHistoryRecords((prev) => [
        ...prev,
        {
          id: `pt-${now}`,
          latitude: lat,
          longitude: lon,
          satellites: 9,
          hdop: 0.85,
          timestamp: now,
          outside,
          distanceM: dist,
        },
      ]);
    }

    setLastUpdateTime(now);

    // Create an alert event if transitioned to breach
    if (outside && (!deviceData || !deviceData.outside)) {
      const newAlert: AlertRecord = {
        id: `alert-${now}`,
        type: 'GEOFENCE_BREACH',
        deviceId: 'esp32_gps_01',
        timestamp: now,
        latitude: lat,
        longitude: lon,
        distanceM: dist,
        outside: true,
        message: `Geofence breach detected! Distance: ${dist}m (Safe radius: ${geofence.radiusM}m). ESP32 Buzzer ON.`,
        acknowledged: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);

      if (isFirebaseMode && isFirebaseConfigured()) {
        pushAlertRecord(newAlert).catch(console.error);
      }
    } else if (!outside && deviceData?.outside) {
      const returnAlert: AlertRecord = {
        id: `return-${now}`,
        type: 'GEOFENCE_RETURN',
        deviceId: 'esp32_gps_01',
        timestamp: now,
        latitude: lat,
        longitude: lon,
        distanceM: dist,
        outside: false,
        message: `Livestock returned to safe grazing zone. ESP32 Buzzer OFF.`,
        acknowledged: true,
      };
      setAlerts((prev) => [returnAlert, ...prev]);

      if (isFirebaseMode && isFirebaseConfigured()) {
        pushAlertRecord(returnAlert).catch(console.error);
      }
    }
  }, [geofence, deviceData, isFirebaseMode]);

  const simulateBreach = useCallback(() => {
    // Offset lat/lon outside the configured radius
    const extraOffset = (geofence.radiusM + 80) / 111320;
    const breachLat = geofence.centerLat + extraOffset * 0.7;
    const breachLon = geofence.centerLon + extraOffset * 0.7;
    simulateMoveTo(breachLat, breachLon);
  }, [geofence, simulateMoveTo]);

  const simulateSafeZone = useCallback(() => {
    // Position inside the safe zone (approx 40m from center)
    const insideOffset = 40 / 111320;
    const safeLat = geofence.centerLat + insideOffset * 0.5;
    const safeLon = geofence.centerLon + insideOffset * 0.5;
    simulateMoveTo(safeLat, safeLon);
  }, [geofence, simulateMoveTo]);

  const simulateGpsLost = useCallback(() => {
    const updated: DeviceLatestData = {
      latitude: 0,
      longitude: 0,
      satellites: 1,
      hdop: null,
      timestamp: Date.now(),
      outside: false,
      distanceM: 0,
    };
    if (isFirebaseMode && isFirebaseConfigured()) {
      publishDeviceTelemetry('esp32_gps_01', updated).catch(console.error);
    } else {
      setDemoDeviceData(updated);
    }
  }, [isFirebaseMode]);

  const simulateOffline = useCallback(() => {
    const staleTime = Date.now() - (onlineTimeoutSeconds + 60) * 1000;
    if (isFirebaseMode && isFirebaseConfigured()) {
      publishDeviceTelemetry('esp32_gps_01', {
        latitude: HISTORICAL_TEST_COORD.lat,
        longitude: HISTORICAL_TEST_COORD.lon,
        satellites: 8,
        hdop: 0.88,
        timestamp: staleTime,
        outside: false,
        distanceM: 0,
      }).catch(console.error);
    } else {
      setDemoDeviceData((prev) => ({
        ...prev,
        timestamp: staleTime,
      }));
    }
  }, [isFirebaseMode, onlineTimeoutSeconds]);

  // Herd actions
  const addAnimal = (animalData: Omit<Animal, 'id'>) => {
    const newAnimal: Animal = {
      ...animalData,
      id: `CG-${String(animals.length + 1).padStart(3, '0')}`,
    };
    setAnimals((prev) => [...prev, newAnimal]);
  };

  const updateAnimal = (updated: Animal) => {
    setAnimals((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const deleteAnimal = (id: string) => {
    setAnimals((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  return (
    <CattleGuardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        geofence,
        updateGeofence,
        deviceData,
        historyRecords,
        historyTrail,
        deviceConnectivity,
        isFirebaseMode,
        setIsFirebaseMode,
        isFirebaseConnected,
        animals,
        addAnimal,
        updateAnimal,
        deleteAnimal,
        selectedAnimalId,
        setSelectedAnimalId,
        alerts,
        clearAlerts,
        acknowledgeAlert,
        isBuzzerActive,
        audioAlertEnabled,
        setAudioAlertEnabled,
        lastUpdateTime,
        onlineTimeoutSeconds,
        setOnlineTimeoutSeconds,
        simulateMoveTo,
        simulateBreach,
        simulateSafeZone,
        simulateGpsLost,
        simulateOffline,
        isSimulatorActive,
        setIsSimulatorActive,
      }}
    >
      {children}
    </CattleGuardContext.Provider>
  );
};

export const useCattleGuard = () => {
  const context = useContext(CattleGuardContext);
  if (!context) {
    throw new Error('useCattleGuard must be used within a CattleGuardProvider');
  }
  return context;
};
