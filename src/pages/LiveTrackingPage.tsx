import React, { useState } from 'react';
import { 
  Radio, 
  Satellite, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Zap,
  History,
  Navigation,
  Activity,
  Layers,
  Compass
} from 'lucide-react';
import { useCattleGuard } from '../context/CattleGuardContext';
import { CattleMap } from '../components/Map/CattleMap';
import { HistoricalTrackingView } from '../components/History/HistoricalTrackingView';
import { GpsQualityPanel } from '../components/Dashboard/GpsQualityPanel';
import { formatCoordinates, formatRelativeTime, getHdopRating } from '../utils/geo';

export const LiveTrackingPage: React.FC = () => {
  const { 
    geofence, 
    deviceData, 
    historyTrail, 
    historyRecords,
    deviceConnectivity, 
    isBuzzerActive,
    isFirebaseMode,
    setIsSimulatorActive 
  } = useCattleGuard();

  // Mode switcher: Live Tracking vs Historical Playback
  const [trackingMode, setTrackingMode] = useState<'live' | 'history'>('live');

  const isOutside = Boolean(deviceData?.outside);
  const hdopInfo = getHdopRating(deviceData?.hdop);

  const getConnectivityBadge = () => {
    switch (deviceConnectivity) {
      case 'ONLINE':
        return { label: 'ONLINE', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'OFFLINE':
        return { label: 'OFFLINE', cls: 'bg-gray-100 text-gray-700 border-gray-300' };
      case 'GPS_WAITING':
        return { label: 'GPS WAITING', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'NO_DATA':
      default:
        return { label: 'NO DATA', cls: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const connBadge = getConnectivityBadge();

  return (
    <div className="space-y-5">
      {/* Top Floating Telemetry & Mode Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E3E8E3] shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
            isOutside ? 'bg-red-100 text-red-600' : 'bg-[#E8F4EC] text-[#21865B]'
          }`}>
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
                Cattle Device 01
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                esp32_gps_01
              </span>
            </div>
            <p className="text-xs text-[#7A8980]">
              Agricultural GPS Telemetry &bull; Animal #CG-001 (Black Angus)
            </p>
          </div>
        </div>

        {/* View Switcher: Live GPS vs Historical Replay */}
        <div className="flex items-center bg-[#F5F7F3] p-1 rounded-xl border border-[#E3E8E3]">
          <button
            type="button"
            onClick={() => setTrackingMode('live')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              trackingMode === 'live'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#202B26]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Live GPS Map</span>
          </button>

          <button
            type="button"
            onClick={() => setTrackingMode('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              trackingMode === 'history'
                ? 'bg-[#123C2D] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#202B26]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>Historical Playback</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
              {historyRecords.length}
            </span>
          </button>
        </div>

        {/* Status Indicators Pill Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connectivity Badge */}
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${connBadge.cls}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${
              deviceConnectivity === 'ONLINE' ? 'bg-[#32A56C] animate-pulse' :
              deviceConnectivity === 'GPS_WAITING' ? 'bg-amber-400 animate-ping' : 'bg-gray-400'
            }`} />
            <span>{connBadge.label}</span>
          </div>

          {/* Safe / Breach Badge */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs ${
            isOutside
              ? 'bg-[#D94F50] text-white animate-pulse'
              : 'bg-[#E8F4EC] text-[#21865B] border border-[#C4E2CF]'
          }`}>
            {isOutside ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>OUTSIDE SAFE ZONE</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#21865B]" />
                <span>INSIDE SAFE ZONE</span>
              </>
            )}
          </div>

          {/* Buzzer State */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
            isBuzzerActive ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600'
          }`}>
            <Zap className={`w-3.5 h-3.5 ${isBuzzerActive ? 'text-red-600 animate-bounce' : 'text-gray-400'}`} />
            <span>Buzzer: {isBuzzerActive ? 'ACTIVE' : 'OFF'}</span>
          </div>

          {/* Simulator Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsSimulatorActive(true)}
            className="px-3 py-1.5 rounded-xl bg-[#123C2D] text-white text-xs font-semibold hover:bg-[#1B523E] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-[#32A56C]" />
            <span>Simulate</span>
          </button>
        </div>
      </div>

      {/* Main Content: Live Tracking Mode OR Historical Playback Mode */}
      {trackingMode === 'live' ? (
        <div className="space-y-4">
          {/* Main Full-Size Interactive Tracking Map */}
          <div className="relative">
            <CattleMap
              geofence={geofence}
              deviceData={deviceData}
              historyTrail={historyTrail}
              heightClass="h-[600px] sm:h-[660px]"
              showTrail={true}
              activeAnimalLabel="Cattle Device 01 (esp32_gps_01)"
            />

            {/* Floating Live Telemetry HUD Card (Bottom-Right) */}
            <div className="absolute bottom-6 right-6 z-[500] max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-modal border border-[#E3E8E3]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                <span className="text-[11px] font-bold uppercase text-[#7A8980] tracking-wider">
                  Live Hardware Telemetry
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                  NEO-6M GPS
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">CURRENT COORDINATES</span>
                  <span className="font-mono font-bold text-[#202B26]">
                    {deviceData?.latitude 
                      ? `${deviceData.latitude.toFixed(6)}°, ${deviceData.longitude.toFixed(6)}°` 
                      : 'Searching satellites...'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">DISTANCE FROM CENTRE</span>
                  <span className="font-mono font-bold text-[#123C2D]">
                    {deviceData?.distanceM !== undefined ? `${deviceData.distanceM} m` : '—'}
                    <span className="text-[10px] text-gray-400 font-normal ml-1">/ {geofence.radiusM}m</span>
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">SATELLITE LOCK</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-[#202B26]">
                    <Satellite className="w-3.5 h-3.5 text-blue-500" />
                    <span>{deviceData?.satellites ?? 0} locked</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 font-semibold block uppercase">HDOP GEOMETRY</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${hdopInfo.badgeClass}`}>
                    {hdopInfo.label}
                  </span>
                </div>

                <div className="col-span-2 pt-1 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <div className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Freshness: {formatRelativeTime(deviceData?.timestamp)}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Source: {isFirebaseMode ? 'Live Firebase RTDB' : 'Demo Mode'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GPS Quality Indicator Section (Section 10) */}
          <GpsQualityPanel deviceData={deviceData} />
        </div>
      ) : (
        /* Historical Playback & Location History Table */
        <HistoricalTrackingView
          historyRecords={historyRecords}
          geofence={geofence}
          deviceId="esp32_gps_01"
          isLiveMode={isFirebaseMode}
        />
      )}
    </div>
  );
};
