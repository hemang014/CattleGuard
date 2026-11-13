import React from 'react';
import { Satellite, Activity, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { getHdopRating, formatRelativeTime, formatDateTime } from '../../utils/geo';
import { DeviceLatestData } from '../../types';

interface GpsQualityPanelProps {
  deviceData: DeviceLatestData | null;
  className?: string;
}

export const GpsQualityPanel: React.FC<GpsQualityPanelProps> = ({ 
  deviceData, 
  className = '' 
}) => {
  const satellites = deviceData?.satellites ?? 0;
  const hdop = deviceData?.hdop ?? null;
  const hdopInfo = getHdopRating(hdop);
  const timestamp = deviceData?.timestamp;

  return (
    <div className={`p-3.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#E3E8E3] shadow-card text-xs ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5 font-bold text-[#202B26]">
          <Activity className="w-4 h-4 text-[#21865B]" />
          <span>NEO-6M GPS Signal Quality</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${hdopInfo.badgeClass}`}>
          {hdopInfo.label}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono">
        {/* Satellites */}
        <div className="p-2 rounded-lg bg-[#F5F7F3]">
          <span className="text-[10px] font-sans font-semibold text-gray-400 block uppercase">
            Locked Satellites
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Satellite className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-sm font-extrabold text-[#123C2D]">
              {satellites > 0 ? `${satellites} Sats` : '0 Sats (Searching)'}
            </span>
          </div>
        </div>

        {/* HDOP Geometry */}
        <div className="p-2 rounded-lg bg-[#F5F7F3]">
          <span className="text-[10px] font-sans font-semibold text-gray-400 block uppercase">
            HDOP Dilution
          </span>
          <span className="text-sm font-extrabold text-[#202B26] block mt-0.5">
            {hdop !== null && !isNaN(hdop) ? hdop.toFixed(2) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Freshness & Fix */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span>Last Fix: <strong>{formatRelativeTime(timestamp)}</strong></span>
        </div>
        <span className="text-[10px] text-gray-400">
          {hdopInfo.description}
        </span>
      </div>
    </div>
  );
};
