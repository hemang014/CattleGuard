import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  badge?: {
    text: string;
    variant: 'success' | 'danger' | 'warning' | 'neutral';
  };
  highlight?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  highlight = false,
}) => {
  const getBadgeClass = () => {
    switch (badge?.variant) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-200 animate-pulse';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-white border transition-all duration-200 hover:shadow-card-hover ${
      highlight ? 'border-red-300 ring-2 ring-red-100 shadow-md' : 'border-[#E3E8E3] shadow-card'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#7A8980] uppercase tracking-wider">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-[#F5F7F3] text-[#21865B]">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-[#202B26] tracking-tight font-['Manrope']">
          {value}
        </span>

        {badge && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass()}`}>
            {badge.text}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-[#7A8980]">
        {subtitle}
      </p>
    </div>
  );
};
