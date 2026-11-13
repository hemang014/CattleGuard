import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Radio, Navigation } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-[#E3E8E3] overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 flex items-center justify-between gap-2 font-bold text-[#202B26] hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#21865B]" />
          <span>Map Legend</span>
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="p-3 pt-1 border-t border-gray-100 space-y-2 text-[11px] text-gray-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#21865B] border border-white shadow-xs shrink-0" />
            <span>Livestock Inside Safe Zone</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#D94F50] border border-white shadow-xs animate-pulse shrink-0" />
            <span>Perimeter Breach (Buzzer Active)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#123C2D] border border-[#32A56C] shrink-0" />
            <span>Geofence Centre Pin</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-[#21865B] rounded-full border border-emerald-400 shrink-0" />
            <span>Safe Grazing Boundary</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-[#32A56C] shrink-0" />
            <span>GPS Historical Route Polyline</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <span>Geocoded Search Landmark</span>
          </div>
        </div>
      )}
    </div>
  );
};
