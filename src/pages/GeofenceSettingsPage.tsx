import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Save, 
  Compass, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useCattleGuard } from '../context/CattleGuardContext';
import { CattleMap } from '../components/Map/CattleMap';
import { GeofenceConfig } from '../types';

export const GeofenceSettingsPage: React.FC = () => {
  const { geofence, updateGeofence, deviceData, isFirebaseMode } = useCattleGuard();

  // Local state for interactive editing before save
  const [centerLat, setCenterLat] = useState<number>(geofence.centerLat);
  const [centerLon, setCenterLon] = useState<number>(geofence.centerLon);
  const [radiusM, setRadiusM] = useState<number>(geofence.radiusM);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  // Sync if remote geofence updates from Firebase
  useEffect(() => {
    setCenterLat(geofence.centerLat);
    setCenterLon(geofence.centerLon);
    setRadiusM(geofence.radiusM);
  }, [geofence]);

  // Handle center coordinate change from map click or drag
  const handleMapCenterChange = (lat: number, lon: number) => {
    setCenterLat(Number(lat.toFixed(6)));
    setCenterLon(Number(lon.toFixed(6)));
  };

  // Safe radius presets
  const radiusPresets = [50, 100, 150, 180, 200, 300, 500, 1000];

  // Calculate pasture area enclosed
  const areaSqM = Math.PI * radiusM * radiusM;
  const areaHectares = (areaSqM / 10000).toFixed(2);
  const areaAcres = (areaSqM / 4046.86).toFixed(2);

  // Save Geofence to Firebase / local state
  const handleSave = async () => {
    setIsSaving(true);
    setSaveBanner({ status: 'idle', message: '' });

    const newConfig: GeofenceConfig = {
      centerLat: Number(centerLat),
      centerLon: Number(centerLon),
      radiusM: Number(radiusM),
      updatedAt: Date.now(),
    };

    try {
      const result = await updateGeofence(newConfig);
      if (result.success) {
        setSaveBanner({
          status: 'success',
          message: result.message || 'Geofence successfully updated and synchronized to Firebase /geofence! The ESP32 collar will automatically fetch the new boundary.',
        });
      } else {
        setSaveBanner({
          status: 'error',
          message: result.message || 'Failed to update geofence.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveBanner({ status: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  // Preview config for live map rendering while dragging/typing
  const previewGeofence: GeofenceConfig = {
    centerLat,
    centerLon,
    radiusM,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner notification if saved */}
      {saveBanner.status === 'success' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">Geofence Perimeter Synchronized!</h4>
              <p className="text-xs text-emerald-800 mt-0.5">{saveBanner.message}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveBanner({ status: 'idle', message: '' })}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveBanner.status === 'error' && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 text-red-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-950">Save Failed</h4>
              <p className="text-xs text-red-800 mt-0.5">{saveBanner.message}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveBanner({ status: 'idle', message: '' })}
            className="text-xs font-semibold text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Interactive Map with Click-to-place & Drag */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0F3EF] gap-2">
              <div>
                <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
                  Virtual Safe Grazing Boundary
                </h2>
                <p className="text-xs text-[#7A8980]">
                  Click anywhere on the satellite map or drag the center marker to configure perimeter
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  isFirebaseMode
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  {isFirebaseMode ? 'LIVE FIREBASE MODE' : 'DEMO PREVIEW'}
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#E8F4EC] text-[#123C2D] border border-[#C4E2CF]">
                  Radius: <strong>{radiusM}m</strong>
                </span>
              </div>
            </div>

            {/* Editable Leaflet Map */}
            <div className="mt-4">
              <CattleMap
                geofence={previewGeofence}
                deviceData={deviceData}
                isEditable={true}
                onCenterChange={handleMapCenterChange}
                heightClass="h-[460px] sm:h-[500px]"
                showTrail={false}
              />
            </div>

            {/* Pasture Dimension metrics */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-gray-500 block">Enclosed Pasture Area</span>
                <span className="font-bold text-[#123C2D]">{areaHectares} ha ({areaAcres} ac)</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">Boundary Circumference</span>
                <span className="font-bold text-[#123C2D]">{(2 * Math.PI * radiusM).toFixed(0)} meters</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">ESP32 Firmware Target</span>
                <span className="font-mono font-semibold text-[#21865B]">/geofence</span>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">Current Status</span>
                <span className="font-semibold text-emerald-700">Realtime Sync Armed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Parameter Inputs & Save Actions */}
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-5">
            <div>
              <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
                Perimeter Parameters
              </h2>
              <p className="text-xs text-[#7A8980]">
                Configure precise center coordinates and radius
              </p>
            </div>

            {/* Latitude Input */}
            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1.5 flex items-center justify-between">
                <span>Center Latitude (°N)</span>
                <span className="text-[10px] text-gray-400 font-normal">Decimal degrees</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.00001"
                  value={centerLat}
                  onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
                <Compass className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
              </div>
            </div>

            {/* Longitude Input */}
            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1.5 flex items-center justify-between">
                <span>Center Longitude (°E)</span>
                <span className="text-[10px] text-gray-400 font-normal">Decimal degrees</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.00001"
                  value={centerLon}
                  onChange={(e) => setCenterLon(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
                <Compass className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
              </div>
            </div>

            {/* Safe Radius Slider & Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#202B26]">
                  Safe Radius (Metres)
                </label>
                <span className="font-mono font-bold text-sm text-[#21865B]">
                  {radiusM} m
                </span>
              </div>

              <input
                type="range"
                min="30"
                max="1000"
                step="10"
                value={radiusM}
                onChange={(e) => setRadiusM(parseInt(e.target.value, 10))}
                className="w-full accent-[#21865B] cursor-pointer"
              />

              {/* Quick Presets */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {radiusPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRadiusM(preset)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                      radiusM === preset
                        ? 'bg-[#123C2D] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
            </div>

            {/* Save Geofence Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl bg-[#123C2D] hover:bg-[#1B523E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#32A56C]" />
                    <span>Saving to Firebase RTDB...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#32A56C]" />
                    <span>Save Geofence Configuration</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-[#7A8980] text-center mt-2">
                Updates <code className="font-mono text-gray-800 font-semibold">/geofence</code> path. ESP32 reads these values automatically.
              </p>
            </div>
          </div>

          {/* Current Saved Configuration Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A8980] mb-3">
              Active Firebase Schema
            </h3>
            <div className="p-3.5 rounded-xl bg-[#0B261D] text-emerald-300 font-mono text-xs space-y-1">
              <div className="text-gray-400 text-[10px] pb-1 border-b border-white/10">PATH: /geofence</div>
              <div>centerLat: <span className="text-white font-bold">{geofence.centerLat}</span></div>
              <div>centerLon: <span className="text-white font-bold">{geofence.centerLon}</span></div>
              <div>radiusM: <span className="text-[#32A56C] font-bold">{geofence.radiusM}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
