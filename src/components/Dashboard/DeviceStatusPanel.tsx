import React from 'react';
import { Radio, Satellite, ShieldCheck, AlertTriangle, Compass, Clock, Zap, Activity } from 'lucide-react';
import { useCattleGuard } from '../../context/CattleGuardContext';
import { formatCoordinates, formatRelativeTime, getHdopRating } from '../../utils/geo';

export const DeviceStatusPanel: React.FC = () => {
  const { deviceData, isFirebaseMode, deviceConnectivity, isBuzzerActive } = useCattleGuard();

  const isOutside = Boolean(deviceData?.outside);
  const hasGps = Boolean(
    deviceData?.latitude && 
    deviceData?.longitude && 
    deviceData.latitude !== 0 && 
    deviceData.longitude !== 0 && 
    (deviceData?.satellites ?? 0) >= 3
  );

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
    <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
      <div className="flex items-center justify-between pb-3 border-b border-[#F0F3EF]">
        <div>
          <h2 className="text-sm font-bold text-[#202B26] font-['Manrope']">
            Device Status
          </h2>
          <p className="text-xs text-[#7A8980]">
            Reported hardware telemetry from Firebase
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${connBadge.cls}`}>
            {connBadge.label}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
            isFirebaseMode ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isFirebaseMode ? 'LIVE' : 'DEMO'}
          </span>
        </div>
      </div>

      {/* Main Device Identity Card */}
      <div className="mt-4 p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isOutside ? 'bg-red-100 text-red-600' : 'bg-[#E8F4EC] text-[#21865B]'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#202B26]">
              Cattle device 01
            </h3>
            <p className="text-xs font-mono text-[#7A8980]">
              esp32_gps_01
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs ${
          isOutside
            ? 'bg-[#D94F50] text-white animate-pulse'
            : hasGps
            ? 'bg-[#E8F4EC] text-[#21865B] border border-[#C4E2CF]'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isOutside ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              OUTSIDE
            </>
          ) : hasGps ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              INSIDE
            </>
          ) : (
            <span>WAITING</span>
          )}
        </span>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold text-[#7A8980] flex items-center gap-1">
            <Compass className="w-3 h-3 text-gray-400" /> Latitude
          </span>
          <p className="mt-1 font-mono text-xs font-bold text-[#202B26]">
            {deviceData?.latitude ? `${deviceData.latitude.toFixed(6)}° N` : '—'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold text-[#7A8980] flex items-center gap-1">
            <Compass className="w-3 h-3 text-gray-400" /> Longitude
          </span>
          <p className="mt-1 font-mono text-xs font-bold text-[#202B26]">
            {deviceData?.longitude ? `${deviceData.longitude.toFixed(6)}° E` : '—'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold text-[#7A8980] flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#21865B]" /> Distance from center
          </span>
          <p className="mt-1 font-mono text-xs font-bold text-[#123C2D]">
            {deviceData?.distanceM !== undefined ? `${deviceData.distanceM} m` : '—'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
          <span className="text-[11px] font-semibold text-[#7A8980] flex items-center gap-1">
            <Satellite className="w-3 h-3 text-blue-500" /> Satellites
          </span>
          <p className="mt-1 font-mono text-xs font-bold text-[#202B26]">
            {deviceData?.satellites !== undefined ? `${deviceData.satellites} locked` : '0'}
          </p>
        </div>
      </div>

      {/* HDOP & GPS Quality Bar */}
      <div className="mt-3 p-2.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-[#21865B]" />
          <span className="text-gray-500">HDOP:</span>
          <strong className="text-gray-800">
            {deviceData?.hdop !== undefined && deviceData?.hdop !== null ? deviceData.hdop.toFixed(2) : 'N/A'}
          </strong>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${hdopInfo.badgeClass}`}>
          {hdopInfo.label}
        </span>
      </div>

      {/* Hardware Details Bar */}
      <div className="mt-3 pt-3 border-t border-[#F0F3EF] flex items-center justify-between text-xs text-[#7A8980]">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${isBuzzerActive ? 'text-red-500 animate-bounce' : 'text-gray-400'}`} />
          <span>Buzzer: <strong className={isBuzzerActive ? 'text-red-600' : 'text-gray-600'}>
            {isBuzzerActive ? 'ALERTING' : 'IDLE'}
          </strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{formatRelativeTime(deviceData?.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};
