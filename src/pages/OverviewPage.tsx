import React from 'react';
import { 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Sliders, 
  ArrowRight,
  Info
} from 'lucide-react';
import { useCattleGuard } from '../context/CattleGuardContext';
import { KpiCard } from '../components/Dashboard/KpiCard';
import { CattleMap } from '../components/Map/CattleMap';
import { DeviceStatusPanel } from '../components/Dashboard/DeviceStatusPanel';
import { RecentAnimalsPanel } from '../components/Dashboard/RecentAnimalsPanel';
import { RecentAlertsPanel } from '../components/Dashboard/RecentAlertsPanel';
import { formatRelativeTime } from '../utils/geo';

export const OverviewPage: React.FC = () => {
  const { 
    geofence, 
    deviceData, 
    historyTrail, 
    animals, 
    alerts, 
    setActiveTab, 
    deviceConnectivity,
    isFirebaseMode 
  } = useCattleGuard();

  const isOutside = Boolean(deviceData?.outside);
  const activeAlertsCount = alerts.filter(a => !a.acknowledged && a.type === 'GEOFENCE_BREACH').length;

  const getConnectivityBadge = () => {
    switch (deviceConnectivity) {
      case 'ONLINE':
        return { text: 'ONLINE', variant: 'success' as const };
      case 'GPS_WAITING':
        return { text: 'GPS WAITING', variant: 'warning' as const };
      case 'OFFLINE':
        return { text: 'OFFLINE', variant: 'neutral' as const };
      case 'NO_DATA':
      default:
        return { text: 'NO DATA', variant: 'danger' as const };
    }
  };

  const connBadge = getConnectivityBadge();

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards (Matching Mi Rodeo & CattleGuard Reference 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Registered Animals / Devices */}
        <KpiCard
          title="Registered Animals"
          value={String(animals.length).padStart(2, '0')}
          subtitle="Configured device records"
          icon={<Radio className="w-5 h-5 text-[#21865B]" />}
          badge={{ text: '1 Active ESP32', variant: 'success' }}
        />

        {/* KPI 2: Animals Inside Safe Zone */}
        <KpiCard
          title="Inside Safe Zone"
          value={!deviceData ? '—' : isOutside ? '00' : '01'}
          subtitle={!deviceData ? 'Waiting for telemetry' : isOutside ? 'Breach detected' : 'Within virtual boundary'}
          icon={<ShieldCheck className="w-5 h-5 text-[#21865B]" />}
          badge={{ 
            text: !deviceData ? 'No Fix' : isOutside ? 'Breach Detected' : 'Inside Zone', 
            variant: !deviceData ? 'neutral' : isOutside ? 'danger' : 'success' 
          }}
          highlight={isOutside}
        />

        {/* KPI 3: Active Geofence Alerts */}
        <KpiCard
          title="Active Alerts"
          value={String(activeAlertsCount).padStart(2, '0')}
          subtitle={activeAlertsCount > 0 ? 'Requires immediate attention' : 'No active alerts'}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          badge={{ 
            text: activeAlertsCount > 0 ? 'Action Needed' : 'Normal', 
            variant: activeAlertsCount > 0 ? 'danger' : 'neutral' 
          }}
          highlight={activeAlertsCount > 0}
        />

        {/* KPI 4: Last GPS Update */}
        <KpiCard
          title="Last GPS Update"
          value={deviceData?.timestamp ? formatRelativeTime(deviceData.timestamp) : '—'}
          subtitle={
            deviceConnectivity === 'ONLINE' ? 'NEO-6M Lock Active' :
            deviceConnectivity === 'GPS_WAITING' ? 'Waiting for satellites' :
            deviceConnectivity === 'NO_DATA' ? 'No telemetry received' : 'Collar Stale / Offline'
          }
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          badge={connBadge}
        />
      </div>

      {/* Main Dashboard Grid: Map on Left, Device & Animal panels on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Large Interactive Grazing Map (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0F3EF] gap-2">
              <div>
                <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
                  Live Grazing Map
                </h2>
                <p className="text-xs text-[#7A8980]">
                  Real-time animal position, street labels, and virtual grazing perimeter
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('tracking')}
                  className="px-3 py-1.5 rounded-xl border border-[#21865B]/30 text-xs font-semibold text-[#21865B] hover:bg-[#E8F4EC] transition-all flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Full Map View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('geofence')}
                  className="px-3 py-1.5 rounded-xl bg-[#123C2D] text-white text-xs font-semibold hover:bg-[#1B523E] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Safe Zone</span>
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div className="mt-4">
              <CattleMap
                geofence={geofence}
                deviceData={deviceData}
                historyTrail={historyTrail}
                heightClass="h-[440px] sm:h-[480px]"
              />
            </div>
          </div>

          {/* Quick Tip / System Status Banner (from Mi Rodeo reference 1) */}
          <div className="p-4 rounded-2xl bg-[#E8F4EC] border border-[#C4E2CF] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white text-[#21865B] flex items-center justify-center shrink-0 shadow-xs">
                <Info className="w-4 h-4" />
              </div>
              <p className="text-xs text-[#123C2D]">
                <strong className="font-bold">Virtual Geofence Armed:</strong> Safe radius of <strong>{geofence.radiusM}m</strong> around geofence center. When collar leaves boundary, ESP32 MOSFET automatically triggers the audio buzzer.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('geofence')}
              className="text-xs font-bold text-[#21865B] hover:text-[#123C2D] shrink-0 flex items-center gap-1"
            >
              <span>Edit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Device Status Panel & Recent Livestock (1 Column) */}
        <div className="space-y-6">
          <DeviceStatusPanel />
          <RecentAnimalsPanel />
        </div>
      </div>

      {/* Bottom Section: Recent Alerts Activity Feed */}
      <RecentAlertsPanel />
    </div>
  );
};
