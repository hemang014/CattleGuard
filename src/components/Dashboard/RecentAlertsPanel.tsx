import React from 'react';
import { AlertTriangle, ShieldCheck, BellRing, Trash2, ArrowUpRight } from 'lucide-react';
import { useCattleGuard } from '../../context/CattleGuardContext';
import { formatDateTime, formatRelativeTime } from '../../utils/geo';

export const RecentAlertsPanel: React.FC = () => {
  const { alerts, clearAlerts, setActiveTab } = useCattleGuard();

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
      <div className="flex items-center justify-between pb-3 border-b border-[#F0F3EF]">
        <div>
          <h2 className="text-sm font-bold text-[#202B26] font-['Manrope']">
            Recent alerts
          </h2>
          <p className="text-xs text-[#7A8980]">
            Latest geofence perimeter events
          </p>
        </div>

        {alerts.length > 0 && (
          <button
            type="button"
            onClick={clearAlerts}
            className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>
        )}
      </div>

      <div className="mt-3">
        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#202B26]">No alert events yet</p>
            <p className="text-[11px] text-[#7A8980] mt-0.5">Firebase events appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {alerts.slice(0, 5).map((alert) => {
              const isBreach = alert.type === 'GEOFENCE_BREACH';
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    isBreach
                      ? 'bg-red-50/60 border-red-200'
                      : 'bg-emerald-50/50 border-emerald-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${
                      isBreach ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {isBreach ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${
                          isBreach ? 'text-red-700' : 'text-emerald-800'
                        }`}>
                          {isBreach ? 'Geofence Breach' : 'Returned Safe'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/80 border text-gray-600">
                          {alert.deviceId}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 mt-0.5 leading-snug">
                        {alert.message}
                      </p>

                      <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                        <span>{formatRelativeTime(alert.timestamp)}</span>
                        <span>&bull;</span>
                        <span>{alert.distanceM}m from center</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className="p-1 text-gray-400 hover:text-gray-700"
                    title="View details"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
