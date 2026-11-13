import React, { useState } from 'react';
import { 
  BellRing, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Radio 
} from 'lucide-react';
import { useCattleGuard } from '../context/CattleGuardContext';
import { formatDateTime, formatRelativeTime, formatCoordinates } from '../utils/geo';
import { AlertRecord } from '../types';

export const AlertHistoryPage: React.FC = () => {
  const { alerts, clearAlerts, acknowledgeAlert, isFirebaseMode } = useCattleGuard();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredAlerts = alerts.filter((alert: AlertRecord) => {
    const matchesSearch = 
      alert.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'ALL') return matchesSearch;
    if (filterType === 'BREACH') return matchesSearch && alert.type === 'GEOFENCE_BREACH';
    if (filterType === 'RETURN') return matchesSearch && alert.type === 'GEOFENCE_RETURN';
    return matchesSearch;
  });

  const exportCsv = () => {
    if (alerts.length === 0) return;

    const headers = ['Alert ID', 'Device ID', 'Alert Type', 'Status', 'Distance (m)', 'Latitude', 'Longitude', 'Timestamp', 'Message'];
    const rows = alerts.map((a: AlertRecord) => [
      a.id,
      a.deviceId,
      a.type,
      a.outside ? 'OUTSIDE' : 'INSIDE',
      a.distanceM,
      a.latitude,
      a.longitude,
      new Date(Number(a.timestamp)).toISOString(),
      `"${a.message.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cattleguard_alerts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
              Geofence Alert History & Incident Log
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F4EC] text-[#21865B]">
              {alerts.length} Total Recorded
            </span>
          </div>
          <p className="text-xs text-[#7A8980]">
            Auditable log of perimeter breaches, safe returns, and ESP32 audio buzzer activations
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {alerts.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportCsv}
                className="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-bold text-[#202B26] transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={clearAlerts}
                className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts by device or message..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'BREACH', label: 'Perimeter Breaches' },
            { id: 'RETURN', label: 'Safe Returns' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === item.id
                  ? 'bg-[#123C2D] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-card overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#202B26]">No Alerts Recorded</h3>
            <p className="text-xs text-[#7A8980] max-w-sm mx-auto mt-1">
              {isFirebaseMode
                ? 'Your Firebase database has no breach events recorded under /alerts/esp32_gps_01.'
                : 'No alerts in local buffer. Use "Test Hardware" to simulate an animal wandering outside the boundary!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0F3EF] bg-[#F5F7F3] text-[11px] font-bold text-[#7A8980] uppercase tracking-wider">
                  <th className="py-3 px-4">Status & Type</th>
                  <th className="py-3 px-4">Device Collar</th>
                  <th className="py-3 px-4">Distance from Center</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredAlerts.map((alert: AlertRecord) => {
                  const isBreach = alert.type === 'GEOFENCE_BREACH';
                  return (
                    <tr 
                      key={alert.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        !alert.acknowledged && isBreach ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Type & Icon */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`p-1.5 rounded-lg ${
                            isBreach ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {isBreach ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </span>
                          <div>
                            <span className={`font-bold block ${
                              isBreach ? 'text-red-700' : 'text-emerald-800'
                            }`}>
                              {isBreach ? 'Geofence Breach' : 'Returned Safe'}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {alert.message}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-800">
                        <span className="flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-gray-400" />
                          {alert.deviceId}
                        </span>
                      </td>

                      {/* Distance */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={isBreach ? 'text-red-600' : 'text-[#21865B]'}>
                          {alert.distanceM} m
                        </span>
                      </td>

                      {/* Coordinates */}
                      <td className="py-3.5 px-4 font-mono text-gray-600 text-[11px]">
                        {alert.latitude ? formatCoordinates(alert.latitude, alert.longitude) : '—'}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-gray-600">
                        <div>
                          <span className="font-medium text-[#202B26] block">
                            {formatRelativeTime(alert.timestamp)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {formatDateTime(alert.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {!alert.acknowledged ? (
                          <button
                            type="button"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 flex items-center justify-end gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
