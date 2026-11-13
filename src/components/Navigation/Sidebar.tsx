import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Layers, 
  ShieldAlert, 
  BellRing, 
  BarChart3, 
  Settings, 
  Wifi, 
  Radio,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useCattleGuard } from '../../context/CattleGuardContext';
import { ActiveTab } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { 
    activeTab, 
    setActiveTab, 
    alerts, 
    isFirebaseConnected, 
    isFirebaseMode,
    deviceConnectivity,
    isBuzzerActive 
  } = useCattleGuard();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin },
    { id: 'demo', label: 'Demo Session', icon: Sparkles },
    { id: 'herd', label: 'Herd Management', icon: Layers },
    { id: 'geofence', label: 'Geofence Settings', icon: Radio },
    { id: 'alerts', label: 'Alert History', icon: BellRing, badge: alerts.filter(a => !a.acknowledged).length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#123C2D] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } border-r border-[#1B523E]`}>
        
        {/* Top Branding */}
        <div>
          <div className="p-6 border-b border-[#1B523E]/80">
            <div className="flex items-center gap-3">
              {/* Logo Emblem */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#21865B] to-[#32A56C] flex items-center justify-center shadow-lg shadow-black/20 text-white">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10v12"/>
                  <path d="M15 10v12"/>
                  <path d="M11 14h6a3 3 0 0 0 3-3V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4a3 3 0 0 0 3 3h4"/>
                  <circle cx="9" cy="9" r="1" fill="currentColor"/>
                  <circle cx="15" cy="9" r="1" fill="currentColor"/>
                </svg>
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-['Manrope']">
                  CattleGuard
                </h1>
                <p className="text-[10px] font-semibold tracking-wider uppercase text-[#54BA86]">
                  Smart Livestock IoT
                </p>
              </div>
            </div>

            {/* Mode & Device Status Tag */}
            <div className="mt-4 px-3 py-1.5 rounded-lg bg-[#0B261D]/70 border border-[#1B523E] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  isFirebaseMode
                    ? deviceConnectivity === 'ONLINE' ? 'bg-[#32A56C] animate-pulse' : 'bg-gray-400'
                    : 'bg-amber-400 animate-pulse'
                }`} />
                <span className="font-mono text-[11px] text-gray-300">
                  {isFirebaseMode ? 'esp32_gps_01' : 'Demo Sandbox'}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isFirebaseMode
                  ? deviceConnectivity === 'ONLINE' ? 'bg-emerald-950 text-emerald-300' : 'bg-gray-800 text-gray-400'
                  : 'bg-amber-950 text-amber-300 border border-amber-600/30'
              }`}>
                {isFirebaseMode ? deviceConnectivity : 'DEMO MODE'}
              </span>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="px-4 py-4">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
              Workspace
            </p>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#E8F4EC] text-[#123C2D] font-semibold shadow-sm'
                        : 'text-gray-300 hover:text-white hover:bg-[#1B523E]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#123C2D]' : 'text-gray-300'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        isActive ? 'bg-[#D94F50] text-white' : 'bg-[#D94F50] text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Buzzer Alert Banner (if breach active) */}
        {isBuzzerActive && (
          <div className="mx-4 my-2 p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-xs flex items-center gap-2.5 text-red-200 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-bold text-red-100">Buzzer Triggered!</p>
              <p className="text-[11px] text-red-300">ESP32 MOSFET active</p>
            </div>
          </div>
        )}

        {/* Bottom User & Ranch Profile */}
        <div className="p-4 border-t border-[#1B523E]/80 bg-[#0B261D]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#21865B] flex items-center justify-center font-bold text-sm text-white border border-[#32A56C]">
              CG
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Estancia CattleGuard</p>
              <p className="text-[11px] text-gray-400 truncate">Sardar Patel Ring Pastures</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#32A56C]" title="System Running" />
          </div>
        </div>

      </aside>
    </>
  );
};
