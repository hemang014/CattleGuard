import React from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { useCattleGuard } from '../context/CattleGuardContext';
import { calculateDistanceMeters } from '../utils/geo';
import { AlertRecord } from '../types';

export const AnalyticsPage: React.FC = () => {
  const { geofence, deviceData, historyTrail, alerts } = useCattleGuard();

  // Generate chart data based on history trail
  const distanceChartData = historyTrail.map((point: { lat: number; lon: number; timestamp: number | string; outside?: boolean }, index: number) => {
    const dist = calculateDistanceMeters(geofence.centerLat, geofence.centerLon, point.lat, point.lon);
    const timeLabel = new Date(Number(point.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      index: index + 1,
      time: timeLabel,
      distance: dist,
      safeRadius: geofence.radiusM,
      isOutside: dist > geofence.radiusM,
    };
  });

  // GPS Satellite telemetry over time
  const satelliteData = [
    { time: '10:00', satellites: 8, hdop: 1.1 },
    { time: '11:00', satellites: 9, hdop: 0.9 },
    { time: '12:00', satellites: 10, hdop: 0.8 },
    { time: '13:00', satellites: 9, hdop: 0.9 },
    { time: '14:00', satellites: 8, hdop: 1.2 },
    { time: '15:00', satellites: 9, hdop: 0.9 },
    { time: 'Now', satellites: deviceData?.satellites ?? 9, hdop: 0.8 },
  ];

  // Daily alert count distribution
  const alertBarData = [
    { day: 'Mon', breaches: 0, returns: 0 },
    { day: 'Tue', breaches: 1, returns: 1 },
    { day: 'Wed', breaches: 0, returns: 0 },
    { day: 'Thu', breaches: 2, returns: 2 },
    { day: 'Fri', breaches: 0, returns: 0 },
    { day: 'Sat', breaches: 1, returns: 1 },
    { 
      day: 'Today', 
      breaches: alerts.filter((a: AlertRecord) => a.type === 'GEOFENCE_BREACH').length, 
      returns: alerts.filter((a: AlertRecord) => a.type === 'GEOFENCE_RETURN').length 
    },
  ];

  const totalPoints = distanceChartData.length;
  const breachesCount = distanceChartData.filter((d: { distance: number }) => d.distance > geofence.radiusM).length;
  const complianceRate = totalPoints > 0 ? (((totalPoints - breachesCount) / totalPoints) * 100).toFixed(1) : '100.0';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
        <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
          Livestock Analytics & Grazing Compliance
        </h2>
        <p className="text-xs text-[#7A8980]">
          Distance trends from geofence center, GPS satellite performance, and perimeter breach metrics
        </p>

        {/* 4 Summary Stat Pills */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Boundary Compliance</span>
            <p className="text-lg font-extrabold text-[#21865B] mt-0.5">{complianceRate}%</p>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Safe Radius Threshold</span>
            <p className="text-lg font-extrabold text-[#123C2D] mt-0.5">{geofence.radiusM} m</p>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Current Distance</span>
            <p className="text-lg font-extrabold text-[#202B26] mt-0.5">{deviceData?.distanceM || 0} m</p>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">GPS Fix Strength</span>
            <p className="text-lg font-extrabold text-blue-600 mt-0.5">{deviceData?.satellites ?? 0} Satellites</p>
          </div>
        </div>
      </div>

      {/* Chart 1: Distance from Center over Time (With Safe Radius Reference Line) */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0F3EF] gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#202B26]">
              Distance from Geofence Center (Meters)
            </h3>
            <p className="text-xs text-[#7A8980]">
              Green line represents safe grazing zone. Red dashed line indicates the {geofence.radiusM}m geofence limit.
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Realtime Trajectory
          </span>
        </div>

        <div className="h-64 sm:h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={distanceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3EF" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#7A8980' }} />
              <YAxis tick={{ fontSize: 11, fill: '#7A8980' }} unit="m" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '12px', 
                  border: '1px solid #E3E8E3',
                  fontSize: '12px' 
                }} 
              />
              <ReferenceLine 
                y={geofence.radiusM} 
                stroke="#D94F50" 
                strokeDasharray="4 4" 
                label={{ value: `Perimeter Limit (${geofence.radiusM}m)`, fill: '#D94F50', fontSize: 11, position: 'top' }} 
              />
              <Line 
                type="monotone" 
                dataKey="distance" 
                stroke="#21865B" 
                strokeWidth={2.5} 
                dot={{ r: 4, fill: '#123C2D' }} 
                activeDot={{ r: 6, fill: '#32A56C' }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: GPS Satellites over time & Daily Alert Count Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GPS Satellite Lock Reliability */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
          <div className="pb-3 border-b border-[#F0F3EF]">
            <h3 className="text-sm font-bold text-[#202B26]">
              NEO-6M GPS Satellite Reception
            </h3>
            <p className="text-xs text-[#7A8980]">
              Visible satellites locked over recent observation intervals
            </p>
          </div>

          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={satelliteData}>
                <defs>
                  <linearGradient id="satColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32A56C" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#32A56C" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F3EF" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#7A8980' }} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#7A8980' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="satellites" stroke="#21865B" fillOpacity={1} fill="url(#satColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Alert Occurrences */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
          <div className="pb-3 border-b border-[#F0F3EF]">
            <h3 className="text-sm font-bold text-[#202B26]">
              Daily Geofence Events
            </h3>
            <p className="text-xs text-[#7A8980]">
              Number of boundary breach events and verified safe returns
            </p>
          </div>

          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F3EF" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7A8980' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7A8980' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="breaches" fill="#D94F50" radius={[4, 4, 0, 0]} name="Breaches" />
                <Bar dataKey="returns" fill="#21865B" radius={[4, 4, 0, 0]} name="Safe Returns" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
