import React from 'react';
import { ChevronRight, Scale, Clock } from 'lucide-react';
import { useCattleGuard } from '../../context/CattleGuardContext';

export const RecentAnimalsPanel: React.FC = () => {
  const { animals, setActiveTab, setSelectedAnimalId, deviceData } = useCattleGuard();

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
      <div className="flex items-center justify-between pb-3 border-b border-[#F0F3EF]">
        <h2 className="text-sm font-bold text-[#202B26] font-['Manrope']">
          Recent Livestock
        </h2>
        <button
          type="button"
          onClick={() => setActiveTab('herd')}
          className="text-xs font-semibold text-[#21865B] hover:text-[#123C2D] transition-colors"
        >
          View all
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        {animals.slice(0, 3).map((animal, idx) => {
          const isPrimary = animal.deviceId === 'esp32_gps_01';
          const isOutside = isPrimary ? Boolean(deviceData?.outside) : false;

          return (
            <div
              key={animal.id}
              onClick={() => {
                setSelectedAnimalId(animal.id);
                setActiveTab('tracking');
              }}
              className="p-2.5 rounded-xl border border-gray-100 hover:border-[#21865B]/40 hover:bg-[#F5F7F3] cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                {/* Photo with status indicator */}
                <div className="relative">
                  <img
                    src={animal.avatarUrl}
                    alt={animal.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                  />
                  <span className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white ${
                    isOutside ? 'bg-red-500 animate-ping' : 'bg-[#21865B]'
                  }`} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F4EC] text-[#123C2D]">
                      {animal.id}
                    </span>
                    <span className="text-xs font-bold text-[#202B26] group-hover:text-[#21865B] transition-colors">
                      {animal.breed}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#7A8980]">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3 h-3 text-gray-400" />
                      {animal.weightKg} kg
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {idx === 0 ? 'Live synced' : `${idx + 1}h ago`}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#21865B] group-hover:translate-x-0.5 transition-all" />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setActiveTab('herd')}
        className="w-full mt-4 py-2 px-3 rounded-xl border border-[#21865B]/30 text-xs font-semibold text-[#21865B] hover:bg-[#E8F4EC] transition-all flex items-center justify-center gap-1.5"
      >
        <span>Manage full herd registry</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
