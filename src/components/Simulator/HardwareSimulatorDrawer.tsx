import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  X, 
  Play, 
  Square, 
  AlertTriangle, 
  ShieldCheck, 
  WifiOff, 
  Compass, 
  Radio, 
  Sparkles,
  Zap
} from 'lucide-react';
import { useCattleGuard } from '../../context/CattleGuardContext';

export const HardwareSimulatorDrawer: React.FC = () => {
  const {
    isSimulatorActive,
    setIsSimulatorActive,
    simulateMoveTo,
    simulateBreach,
    simulateSafeZone,
    simulateGpsLost,
    simulateOffline,
    geofence,
    deviceData,
    isBuzzerActive
  } = useCattleGuard();

  const [isAutoWalking, setIsAutoWalking] = useState<boolean>(false);
  const [walkAngle, setWalkAngle] = useState<number>(0);

  // Auto walk loop simulation around the perimeter
  useEffect(() => {
    if (!isAutoWalking) return;

    const timer = setInterval(() => {
      setWalkAngle((prevAngle) => {
        const nextAngle = (prevAngle + 15) % 360;
        const rad = (nextAngle * Math.PI) / 180;
        
        // Grazing distance oscillates between 40m and 190m
        const radiusFraction = 0.5 + 0.45 * Math.sin(nextAngle * 0.1);
        const distanceM = geofence.radiusM * radiusFraction;
        
        const latOffset = (distanceM * Math.cos(rad)) / 111320;
        const lonOffset = (distanceM * Math.sin(rad)) / (111320 * Math.cos((geofence.centerLat * Math.PI) / 180));

        simulateMoveTo(geofence.centerLat + latOffset, geofence.centerLon + lonOffset);
        return nextAngle;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isAutoWalking, geofence, simulateMoveTo]);

  if (!isSimulatorActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1000] w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-modal border-2 border-[#123C2D]/30 p-5 transition-all animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E8F4EC] text-[#21865B] flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#202B26]">ESP32 Hardware Simulator</h3>
            <p className="text-[11px] text-[#7A8980]">Simulate hardware states & buzzer</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAutoWalking(false);
            setIsSimulatorActive(false);
          }}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Buzzer and Hardware Status Banner */}
      <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
        isBuzzerActive
          ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>ESP32 Buzzer: {isBuzzerActive ? 'SOUNDING ALARM' : 'QUIET'}</span>
        </div>
        <span className="font-mono text-[11px]">
          {deviceData?.distanceM || 0}m / {geofence.radiusM}m
        </span>
      </div>

      {/* Preset Action Buttons */}
      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Quick Simulation Presets
        </p>

        <div className="grid grid-cols-2 gap-2">
          {/* Safe inside button */}
          <button
            type="button"
            onClick={() => {
              setIsAutoWalking(false);
              simulateSafeZone();
            }}
            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Walk Inside Zone</span>
          </button>

          {/* Trigger Geofence Breach */}
          <button
            type="button"
            onClick={() => {
              setIsAutoWalking(false);
              simulateBreach();
            }}
            className="p-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Trigger Breach!</span>
          </button>

          {/* GPS Signal Lost */}
          <button
            type="button"
            onClick={() => {
              setIsAutoWalking(false);
              simulateGpsLost();
            }}
            className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <Radio className="w-4 h-4 text-amber-600" />
            <span>Simulate No GPS</span>
          </button>

          {/* Device Offline */}
          <button
            type="button"
            onClick={() => {
              setIsAutoWalking(false);
              simulateOffline();
            }}
            className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
          >
            <WifiOff className="w-4 h-4 text-gray-600" />
            <span>Simulate Offline</span>
          </button>
        </div>
      </div>

      {/* Continuous Live Walk Generator */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setIsAutoWalking(!isAutoWalking)}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
            isAutoWalking
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#123C2D] hover:bg-[#1B523E] text-white'
          }`}
        >
          {isAutoWalking ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Continuous Grazing Walk</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Continuous Grazing Walk</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
