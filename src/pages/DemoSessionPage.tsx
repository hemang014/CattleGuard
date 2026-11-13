import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Crosshair, 
  Radio, 
  MapPin, 
  Flag, 
  Layers, 
  Compass, 
  Sparkles,
  ArrowRight,
  Info,
  Activity
} from 'lucide-react';
import { 
  SimulationState, 
  PresetScenario, 
  DemoEvent, 
  InAppNotification 
} from '../types';
import { 
  demoSimulationService 
} from '../services/DemoSimulationService';
import { 
  demoEventManager 
} from '../services/DemoEventManager';
import { 
  notificationService 
} from '../services/NotificationService';
import { 
  formatCoordinates, 
  formatDateTime, 
  validateCoordinates 
} from '../utils/geo';
import { DemoMap } from '../components/Demo/DemoMap';

export const DemoSessionPage: React.FC = () => {
  // --- SIMULATION SERVICE STATE ---
  const [simState, setSimState] = useState<{
    status: SimulationState;
    herdLat: number;
    herdLon: number;
    destLat?: number;
    destLon?: number;
    distanceM: number;
    remainingSafeM: number;
    breachDistanceM: number;
    isInside: boolean;
    trail: Array<[number, number]>;
  }>({
    status: 'IDLE',
    herdLat: 23.122136,
    herdLon: 72.597685,
    distanceM: 0,
    remainingSafeM: 200,
    breachDistanceM: 0,
    isInside: true,
    trail: [[23.122136, 72.597685]],
  });

  // --- GEOFENCE CONFIG STATE ---
  const [centerLat, setCenterLat] = useState<number>(23.122136);
  const [centerLon, setCenterLon] = useState<number>(72.597685);
  const [radiusM, setRadiusM] = useState<number>(200);

  // Manual input fields
  const [inputCenterLat, setInputCenterLat] = useState<string>('23.122136');
  const [inputCenterLon, setInputCenterLon] = useState<string>('72.597685');
  const [inputCustomRadius, setInputCustomRadius] = useState<string>('200');

  const [inputHerdLat, setInputHerdLat] = useState<string>('23.122136');
  const [inputHerdLon, setInputHerdLon] = useState<string>('72.597685');

  // Validation errors
  const [coordError, setCoordError] = useState<string | null>(null);

  // Speed multiplier: 1x, 2x, 5x
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Active scenario badge
  const [activeScenario, setActiveScenario] = useState<PresetScenario>('CUSTOM');
  const [scenarioMessage, setScenarioMessage] = useState<string>('Custom simulation configured');

  // --- EVENTS & NOTIFICATIONS STATE ---
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [activeToasts, setActiveToasts] = useState<InAppNotification[]>([]);

  // Sound & Desktop Notification state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(notificationService.isSoundEnabled());
  const [soundVolume, setSoundVolume] = useState<number>(notificationService.getVolume());
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(
    notificationService.getNotificationPermission()
  );

  // --- SUBSCRIBE TO SIMULATION & EVENTS ---
  useEffect(() => {
    const unsubSim = demoSimulationService.subscribe((state) => {
      setSimState(state);
      setInputHerdLat(state.herdLat.toFixed(6));
      setInputHerdLon(state.herdLon.toFixed(6));
    });

    const unsubEvents = demoEventManager.subscribe((newEvents) => {
      setEvents(newEvents);

      // Check if latest event is a breach or return to display an In-App Toast
      if (newEvents.length > 0) {
        const latest = newEvents[0];
        if (latest.type === 'HERD_BREACH') {
          const toast: InAppNotification = {
            id: latest.id,
            title: 'CATTLEGUARD ALERT — Perimeter Breach!',
            message: `Herd has exited the safe zone! Distance from center: ${latest.distanceM}m (Safe radius: ${latest.radiusM}m)`,
            type: 'danger',
            timestamp: latest.timestamp,
            latitude: latest.latitude,
            longitude: latest.longitude,
            distanceM: latest.distanceM,
            radiusM: latest.radiusM,
            outside: true,
          };
          setActiveToasts((prev) => [toast, ...prev.slice(0, 3)]);
        } else if (latest.type === 'HERD_RETURN') {
          const toast: InAppNotification = {
            id: latest.id,
            title: 'CATTLEGUARD — Safe Zone Re-entry',
            message: `Herd has returned to the safe grazing perimeter. Distance: ${latest.distanceM}m`,
            type: 'success',
            timestamp: latest.timestamp,
            latitude: latest.latitude,
            longitude: latest.longitude,
            distanceM: latest.distanceM,
            radiusM: latest.radiusM,
            outside: false,
          };
          setActiveToasts((prev) => [toast, ...prev.slice(0, 3)]);
        }
      }
    });

    return () => {
      unsubSim();
      unsubEvents();
    };
  }, []);

  // Update sound settings
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    notificationService.setSoundEnabled(next);
  };

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    notificationService.setVolume(vol);
  };

  const handleTestSound = () => {
    notificationService.playBreachAlarm();
  };

  const handleRequestDesktopPermission = async () => {
    const result = await notificationService.requestDesktopPermission();
    setDesktopPermission(result);
  };

  // --- GEOFENCE UPDATE HANDLERS ---
  const applyGeofenceCenter = (lat: number, lon: number) => {
    const valid = validateCoordinates(lat, lon);
    if (!valid.valid) {
      setCoordError(valid.error || 'Invalid coordinates');
      return;
    }
    setCoordError(null);
    setCenterLat(lat);
    setCenterLon(lon);
    setInputCenterLat(lat.toFixed(6));
    setInputCenterLon(lon.toFixed(6));
    demoSimulationService.setGeofence(lat, lon, radiusM);
  };

  const handleRadiusPreset = (presetRadius: number) => {
    setRadiusM(presetRadius);
    setInputCustomRadius(String(presetRadius));
    demoSimulationService.setGeofence(centerLat, centerLon, presetRadius);
  };

  const handleCustomRadiusApply = () => {
    const val = parseInt(inputCustomRadius, 10);
    if (isNaN(val) || val <= 5) {
      setCoordError('Radius must be greater than 5 metres');
      return;
    }
    setCoordError(null);
    setRadiusM(val);
    demoSimulationService.setGeofence(centerLat, centerLon, val);
  };

  // --- HERD POSITION HANDLERS ---
  const handleHerdPositionUpdate = (lat: number, lon: number, isManualDrag: boolean = false) => {
    const valid = validateCoordinates(lat, lon);
    if (!valid.valid) {
      setCoordError(valid.error || 'Invalid coordinates');
      return;
    }
    setCoordError(null);
    demoSimulationService.setHerdPosition(lat, lon, isManualDrag);
  };

  const handleManualHerdApply = () => {
    const lat = parseFloat(inputHerdLat);
    const lon = parseFloat(inputHerdLon);
    handleHerdPositionUpdate(lat, lon, true);
  };

  // Set destination target
  const handleDestinationChange = (lat: number, lon: number) => {
    demoSimulationService.setDestination(lat, lon);
    setScenarioMessage(`Destination target set to (${lat.toFixed(5)}, ${lon.toFixed(5)})`);
  };

  // --- PRESET SCENARIOS (Section 7) ---
  const handleLoadScenario = (scenario: PresetScenario) => {
    setActiveScenario(scenario);
    demoSimulationService.loadPresetScenario(scenario);
    switch (scenario) {
      case 'HERD_INSIDE':
        setScenarioMessage('Scenario: Herd placed inside safe zone (40% radius)');
        break;
      case 'JUST_OUTSIDE':
        setScenarioMessage('Scenario: Herd placed slightly outside boundary (115% radius)');
        break;
      case 'FAR_OUTSIDE':
        setScenarioMessage('Scenario: Herd placed significantly beyond boundary (250% radius)');
        break;
      case 'RETURN_SAFE':
        setScenarioMessage('Scenario: Herd returned safely inside');
        break;
      case 'CUSTOM':
      default:
        setScenarioMessage('Custom simulation mode');
        break;
    }
  };

  // --- AUTOMATIC SIMULATION CONTROLS ---
  const handleStartSimulation = () => {
    demoSimulationService.setSpeedMultiplier(speedMultiplier);
    demoSimulationService.startSimulation();
  };

  const handlePauseSimulation = () => {
    demoSimulationService.pauseSimulation();
  };

  const handleResumeSimulation = () => {
    demoSimulationService.resumeSimulation();
  };

  const handleStopSimulation = () => {
    demoSimulationService.stopSimulation();
  };

  const handleResetSimulation = () => {
    demoSimulationService.resetSimulation();
    setActiveScenario('CUSTOM');
    setScenarioMessage('Simulation reset to origin');
  };

  const handleSpeedChange = (mult: number) => {
    setSpeedMultiplier(mult);
    demoSimulationService.setSpeedMultiplier(mult);
  };

  // Dismiss in-app toast
  const dismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const breachCount = events.filter((e) => e.type === 'HERD_BREACH').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Scenario Presets (Section 7) */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#202B26] font-['Manrope']">
                  Interactive Geofencing Simulation Sandbox
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  Demo Mode Active
                </span>
              </div>
              <p className="text-xs text-[#7A8980]">
                Stress-test perimeter breach alerts, manual marker dragging, and automated route simulation without ESP32 hardware.
              </p>
            </div>
          </div>

          {/* Data Isolation Notice */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#21865B]" />
            <span className="font-semibold">Isolated Sandbox: Simulated records will never touch Firebase.</span>
          </div>
        </div>

        {/* Quick Scenario Buttons (Section 7) */}
        <div className="pt-3 border-t border-[#F0F3EF] flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#202B26] flex items-center gap-1.5 mr-2">
            <Activity className="w-3.5 h-3.5 text-[#21865B]" />
            <span>Preset Scenarios:</span>
          </span>

          <button
            type="button"
            onClick={() => handleLoadScenario('HERD_INSIDE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'HERD_INSIDE'
                ? 'bg-[#123C2D] text-white border-[#123C2D] shadow-xs'
                : 'bg-[#F5F7F3] text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            1. Herd Inside (Safe)
          </button>

          <button
            type="button"
            onClick={() => handleLoadScenario('JUST_OUTSIDE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'JUST_OUTSIDE'
                ? 'bg-[#D94F50] text-white border-red-600 shadow-xs'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            2. Just Outside (+15%)
          </button>

          <button
            type="button"
            onClick={() => handleLoadScenario('FAR_OUTSIDE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'FAR_OUTSIDE'
                ? 'bg-[#D94F50] text-white border-red-600 shadow-xs'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            3. Far Outside (+150%)
          </button>

          <button
            type="button"
            onClick={() => handleLoadScenario('RETURN_SAFE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              activeScenario === 'RETURN_SAFE'
                ? 'bg-[#21865B] text-white border-[#21865B] shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            4. Return to Safe Zone
          </button>

          <span className="text-xs text-[#7A8980] italic ml-auto">
            {scenarioMessage}
          </span>
        </div>
      </div>

      {/* In-App Visual Alert Banners (Section 8.A) */}
      {activeToasts.length > 0 && (
        <div className="space-y-2">
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-2xl border shadow-lg flex items-start justify-between gap-3 animate-fade-in ${
                toast.type === 'danger'
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-[#21865B] text-white border-emerald-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/20 text-white mt-0.5">
                  {toast.type === 'danger' ? <AlertTriangle className="w-5 h-5 text-amber-200" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">
                    {toast.title}
                  </h3>
                  <p className="text-xs text-white/90 mt-0.5 font-medium">
                    {toast.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-white/80 font-mono">
                    <span>Animal: esp32_gps_01</span>
                    <span>&bull;</span>
                    <span>Coordinates: {toast.latitude?.toFixed(6)}, {toast.longitude?.toFixed(6)}</span>
                    <span>&bull;</span>
                    <span>Status: {toast.outside ? 'OUTSIDE SAFE BOUNDARY' : 'INSIDE'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-white/70 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-black/10 hover:bg-black/20"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 6 KPI Cards (Section 10) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Simulation Status */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card">
          <p className="text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
            Sim Status
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              simState.status === 'RUNNING' ? 'bg-blue-600 animate-ping' :
              simState.status === 'PAUSED' ? 'bg-amber-500' : 'bg-gray-400'
            }`} />
            <h3 className="text-base font-extrabold text-[#202B26] font-['Manrope']">
              {simState.status}
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {simState.status === 'RUNNING' ? 'Progressive movement active' : 'Awaiting start'}
          </p>
        </div>

        {/* KPI 2: Herd Position */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card">
          <p className="text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
            Herd Position
          </p>
          <h3 className="text-xs font-mono font-bold text-[#202B26] mt-2">
            {simState.herdLat.toFixed(5)}° N
          </h3>
          <p className="text-xs font-mono text-gray-500">
            {simState.herdLon.toFixed(5)}° E
          </p>
        </div>

        {/* KPI 3: Distance from Center */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card">
          <p className="text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
            Center Distance
          </p>
          <h3 className="text-xl font-extrabold text-[#202B26] font-['Manrope'] mt-1">
            {simState.distanceM} <span className="text-xs font-normal text-gray-500">m</span>
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Haversine calculated
          </p>
        </div>

        {/* KPI 4: Safe Radius */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card">
          <p className="text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
            Safe Radius
          </p>
          <h3 className="text-xl font-extrabold text-[#123C2D] font-['Manrope'] mt-1">
            {radiusM} <span className="text-xs font-normal text-gray-500">m</span>
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Configured perimeter
          </p>
        </div>

        {/* KPI 5: Current Geofence Status */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card">
          <p className="text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
            Geofence State
          </p>
          <div className="mt-1.5">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
              simState.isInside
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-red-100 text-red-700 border border-red-300 animate-pulse'
            }`}>
              {simState.isInside ? 'INSIDE' : 'OUTSIDE'}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {simState.isInside ? `${simState.remainingSafeM}m margin safe` : `${simState.breachDistanceM}m beyond boundary`}
          </p>
        </div>

        {/* KPI 6: Total Simulated Alerts */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card">
          <p className="text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
            Simulated Alerts
          </p>
          <h3 className="text-xl font-extrabold text-[#D94F50] font-['Manrope'] mt-1">
            {breachCount}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Perimeter exit events
          </p>
        </div>
      </div>

      {/* Main Split Layout: Left Map (65%) | Right Config & Controls (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Simulation Map */}
        <div className="lg:col-span-8 space-y-3">
          <DemoMap
            centerLat={centerLat}
            centerLon={centerLon}
            radiusM={radiusM}
            herdLat={simState.herdLat}
            herdLon={simState.herdLon}
            destLat={simState.destLat}
            destLon={simState.destLon}
            isInside={simState.isInside}
            distanceM={simState.distanceM}
            trail={simState.trail}
            onGeofenceCenterChange={(lat, lon) => applyGeofenceCenter(lat, lon)}
            onHerdPositionChange={(lat, lon, isManualDrag) => handleHerdPositionUpdate(lat, lon, isManualDrag)}
            onDestinationChange={(lat, lon) => handleDestinationChange(lat, lon)}
            heightClass="h-[520px] lg:h-[600px]"
          />

          {/* Quick Help Footnote */}
          <div className="p-3 bg-white rounded-xl border border-[#E3E8E3] flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Interaction Guide:</strong> Drag the livestock marker anywhere on the map, or use the top map buttons to click-to-reposition center, herd, or target destination.
              </span>
            </div>
            <span className="font-mono text-[11px] text-gray-500 font-semibold">
              Trail Points: {simState.trail.length}
            </span>
          </div>
        </div>

        {/* Right Column: Configuration, Controls, & Notifications */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Geofence Safe Radius & Center (Section 3) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#202B26] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#123C2D]" />
                <span>Geofence Configuration</span>
              </h3>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                R: {radiusM}m
              </span>
            </div>

            {/* Radius Presets (50, 100, 200, 500, 1000) */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                Safe Radius Presets:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[50, 100, 200, 500, 1000].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRadiusPreset(r)}
                    className={`py-1 text-xs font-bold rounded-lg border transition-all ${
                      radiusM === r
                        ? 'bg-[#123C2D] text-white border-[#123C2D] shadow-xs'
                        : 'bg-[#F5F7F3] text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Radius Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="10"
                max="10000"
                value={inputCustomRadius}
                onChange={(e) => setInputCustomRadius(e.target.value)}
                placeholder="Custom Radius (m)"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-mono focus:ring-1 focus:ring-[#21865B] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCustomRadiusApply}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl whitespace-nowrap transition-all"
              >
                Set Radius
              </button>
            </div>

            {/* Manual Geofence Center Coordinates */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-600 block">
                Center Coordinates (Manual Entry):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">Latitude:</span>
                  <input
                    type="text"
                    value={inputCenterLat}
                    onChange={(e) => setInputCenterLat(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-gray-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">Longitude:</span>
                  <input
                    type="text"
                    value={inputCenterLon}
                    onChange={(e) => setInputCenterLon(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded-lg border border-gray-300 font-mono focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => applyGeofenceCenter(parseFloat(inputCenterLat), parseFloat(inputCenterLon))}
                className="w-full mt-1.5 py-1.5 bg-[#E8F4EC] hover:bg-[#D7EEDF] text-[#123C2D] text-xs font-bold rounded-xl transition-all"
              >
                Update Geofence Center
              </button>
            </div>
          </div>

          {/* Card 2: Herd Location Configuration (Section 4) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#202B26] flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#21865B]" />
                <span>Herd Location (Manual Entry)</span>
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                simState.isInside ? 'bg-[#21865B]' : 'bg-[#D94F50]'
              }`}>
                {simState.isInside ? 'SAFE' : 'OUTSIDE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold block">Herd Latitude:</span>
                <input
                  type="text"
                  value={inputHerdLat}
                  onChange={(e) => setInputHerdLat(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded-lg border border-gray-300 font-mono focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold block">Herd Longitude:</span>
                <input
                  type="text"
                  value={inputHerdLon}
                  onChange={(e) => setInputHerdLon(e.target.value)}
                  className="w-full px-2 py-1 text-xs rounded-lg border border-gray-300 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualHerdApply}
                className="flex-1 py-1.5 bg-[#21865B] hover:bg-[#1B6F4B] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                Apply Coordinates
              </button>
              <button
                type="button"
                onClick={() => handleHerdPositionUpdate(centerLat, centerLon, true)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                title="Position herd exactly at geofence center"
              >
                Set to Center
              </button>
            </div>

            {coordError && (
              <p className="text-xs text-red-600 font-semibold">{coordError}</p>
            )}
          </div>

          {/* Card 3: Simulation Movement Controls (Section 6) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#202B26] flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600" />
                <span>Simulated Movement</span>
              </h3>
              <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {simState.status}
              </span>
            </div>

            {/* Play, Pause, Resume, Stop, Reset Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {simState.status !== 'RUNNING' && simState.status !== 'PAUSED' && (
                <button
                  type="button"
                  onClick={handleStartSimulation}
                  className="col-span-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Simulation</span>
                </button>
              )}

              {simState.status === 'RUNNING' && (
                <button
                  type="button"
                  onClick={handlePauseSimulation}
                  className="py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              )}

              {simState.status === 'PAUSED' && (
                <button
                  type="button"
                  onClick={handleResumeSimulation}
                  className="py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume</span>
                </button>
              )}

              {(simState.status === 'RUNNING' || simState.status === 'PAUSED') && (
                <button
                  type="button"
                  onClick={handleStopSimulation}
                  className="py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-sm flex items-center justify-center gap-1 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetSimulation}
                className="py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Playback Speed Multipliers */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500 font-semibold">Simulation Speed:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      speedMultiplier === speed
                        ? 'bg-[#123C2D] text-white border-[#123C2D]'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded-xl">
              Target destination can be set by clicking <strong>"Click: Set Target"</strong> on the map, then clicking any point on the terrain.
            </p>
          </div>

          {/* Card 4: Notification & Audio Settings (Section 8) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card space-y-3">
            <h3 className="text-sm font-bold text-[#202B26] border-b border-gray-100 pb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Multi-Channel Notifications</span>
            </h3>

            {/* Desktop Notification API */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-gray-700 block">Desktop Notifications:</span>
                <span className="text-[11px] text-gray-500">
                  Permission: <strong className="uppercase">{desktopPermission}</strong>
                </span>
              </div>

              {desktopPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleRequestDesktopPermission}
                  className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-xl transition-all"
                >
                  Enable Alerts
                </button>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  Enabled
                </span>
              )}
            </div>

            {/* Synthesized Audio Buzzer Alarm */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">Audio Alarm Tone:</span>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    soundEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
                </button>
              </div>

              {/* Volume Slider */}
              {soundEnabled && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-bold text-gray-500">Vol:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-[#21865B] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded transition-all whitespace-nowrap"
                  >
                    Test Tone
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Simulation Event History (Section 9) */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F3EF]">
          <div>
            <h3 className="text-base font-bold text-[#202B26] font-['Manrope'] flex items-center gap-2">
              <span>Simulation Event Log & Incident Feed</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                {events.length} Events
              </span>
            </h3>
            <p className="text-xs text-[#7A8980]">
              Chronological record of boundary crossings, manual movements, and configuration updates stored in browser local storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => demoEventManager.exportCsv()}
              disabled={events.length === 0}
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => demoEventManager.clearEvents()}
              disabled={events.length === 0}
              className="px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {/* Table of Events */}
        {events.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            No simulation events logged yet. Drag the herd marker outside the green circle or start a simulation to log incidents.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7F3] text-gray-600 uppercase text-[10px] font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Coordinates</th>
                  <th className="py-2.5 px-3">Distance / Radius</th>
                  <th className="py-2.5 px-3">Perimeter Status</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.type === 'HERD_BREACH' ? 'bg-red-100 text-red-800 border border-red-200' :
                        e.type === 'HERD_RETURN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        e.type === 'SIMULATION_STARTED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {e.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 font-sans text-[11px]">
                      {formatDateTime(e.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-800 font-mono text-[11px]">
                      {e.latitude.toFixed(6)}, {e.longitude.toFixed(6)}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700">
                      <strong>{e.distanceM}m</strong> / {e.radiusM}m
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.outside ? 'bg-[#D94F50] text-white' : 'bg-[#21865B] text-white'
                      }`}>
                        {e.outside ? 'OUTSIDE' : 'INSIDE'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 font-sans text-[11px] max-w-xs truncate" title={e.message}>
                      {e.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
