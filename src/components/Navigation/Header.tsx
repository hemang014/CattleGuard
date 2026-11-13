import React, { useState } from 'react';
import { 
  Menu, 
  Volume2, 
  VolumeX, 
  Database, 
  Sliders, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useCattleGuard } from '../../context/CattleGuardContext';
import { ActiveTab } from '../../types';
import { demoSimulationService } from '../../services/DemoSimulationService';

interface HeaderProps {
  onMenuToggle: () => void;
  onOpenFirebaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuToggle, 
  onOpenFirebaseModal 
}) => {
  const { 
    activeTab, 
    isFirebaseMode, 
    setIsFirebaseMode, 
    isFirebaseConnected, 
    audioAlertEnabled, 
    setAudioAlertEnabled,
    setIsSimulatorActive,
    isSimulatorActive,
    deviceConnectivity
  } = useCattleGuard();

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const handleModeSwitch = (targetLive: boolean) => {
    if (targetLive === isFirebaseMode) return;
    
    // If leaving an active running simulation, display confirmation (Section 13)
    if (targetLive && demoSimulationService.getStatus() === 'RUNNING') {
      setShowConfirmModal(true);
      return;
    }
    
    setIsFirebaseMode(targetLive);
  };

  const confirmSwitchToLive = () => {
    demoSimulationService.stopSimulation();
    setIsFirebaseMode(true);
    setShowConfirmModal(false);
  };

  const getPageInfo = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview':
        return {
          category: 'LIVESTOCK INTELLIGENCE',
          title: 'Herd overview',
          subtitle: 'Monitor locations, grazing boundaries and device alerts from one place.',
        };
      case 'tracking':
        return {
          category: 'GPS SATELLITE TELEMETRY',
          title: 'Live Tracking',
          subtitle: 'Real-time livestock location, satellite count, and grazing perimeter status.',
        };
      case 'demo':
        return {
          category: 'INTERACTIVE SANDBOX',
          title: 'Geofence Simulation',
          subtitle: 'Simulate cattle movement, test perimeter alarms, and customize coordinates without hardware.',
        };
      case 'herd':
        return {
          category: 'HERD MANAGEMENT',
          title: 'Livestock & Devices',
          subtitle: 'Registered animals, ESP32 collar assignments, and physical profiles.',
        };
      case 'geofence':
        return {
          category: 'PERIMETER CONFIGURATION',
          title: 'Geofence Settings',
          subtitle: 'Define safe grazing boundaries and sync instantly with ESP32 collar firmware.',
        };
      case 'alerts':
        return {
          category: 'INCIDENT LOGS',
          title: 'Alert History',
          subtitle: 'Historical record of perimeter breaches, returns, and audio buzzer activations.',
        };
      case 'analytics':
        return {
          category: 'GRAZING METRICS',
          title: 'Pasture Analytics',
          subtitle: 'Distance from center trends, GPS update frequency, and compliance statistics.',
        };
      case 'settings':
        return {
          category: 'PLATFORM CONFIGURATION',
          title: 'System Settings',
          subtitle: 'Firebase Realtime Database credentials, collar timeouts, and sound alarms.',
        };
    }
  };

  const info = getPageInfo(activeTab);

  return (
    <header className="sticky top-0 z-30 bg-[#F5F7F3]/90 backdrop-blur-md border-b border-[#E3E8E3] px-4 sm:px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Titles & Mobile toggle */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl bg-white border border-[#E3E8E3] text-[#202B26] hover:bg-gray-50 shadow-sm"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <span className="text-[11px] font-bold tracking-wider text-[#21865B] uppercase block">
              {info.category}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#202B26] font-['Manrope'] tracking-tight">
              {info.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#7A8980] mt-0.5 max-w-xl">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions, Badges & Hardware Simulator toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Prominent Mode Switcher: Live Mode vs Demo Mode (Section 1 & 13) */}
          <div className="bg-[#EAEFEA] p-1 rounded-2xl border border-[#D5E0D5] flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => handleModeSwitch(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isFirebaseMode
                  ? 'bg-[#123C2D] text-white shadow-sm'
                  : 'text-[#4A5E52] hover:text-[#123C2D] hover:bg-white/50'
              }`}
              title="Live Mode: Connected to physical ESP32 GPS hardware and Firebase"
            >
              <span className={`w-2 h-2 rounded-full ${
                isFirebaseMode ? 'bg-[#32A56C] animate-pulse' : 'bg-gray-400'
              }`} />
              <span>Live Mode</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isFirebaseMode
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-[#4A5E52] hover:text-amber-800 hover:bg-white/50'
              }`}
              title="Demo Mode: Interactive sandbox simulation without hardware"
            >
              <span className={`w-2 h-2 rounded-full ${
                !isFirebaseMode ? 'bg-amber-200 animate-pulse' : 'bg-gray-400'
              }`} />
              <span>Demo Mode</span>
            </button>
          </div>

          {/* Connect Firebase Button */}
          <button
            type="button"
            onClick={onOpenFirebaseModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-sm transition-all ${
              isFirebaseConnected
                ? 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                : 'bg-white text-[#202B26] border-[#E3E8E3] hover:bg-gray-50'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#21865B]" />
            <span>{isFirebaseConnected ? 'Firebase Connected' : 'Connect Firebase'}</span>
          </button>

          {/* Audio Buzzer Alarm Toggle */}
          <button
            type="button"
            onClick={() => setAudioAlertEnabled(!audioAlertEnabled)}
            className={`p-2 rounded-xl border shadow-sm transition-all ${
              audioAlertEnabled 
                ? 'bg-white text-[#123C2D] border-[#E3E8E3] hover:bg-gray-50' 
                : 'bg-gray-100 text-gray-400 border-gray-200'
            }`}
            title={audioAlertEnabled ? 'Buzzer audio alert ON' : 'Buzzer audio alert MUTED'}
          >
            {audioAlertEnabled ? <Volume2 className="w-4 h-4 text-[#21865B]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Test Hardware / Simulator Trigger */}
          <button
            type="button"
            onClick={() => setIsSimulatorActive(!isSimulatorActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-sm transition-all ${
              isSimulatorActive
                ? 'bg-[#123C2D] text-white border-[#123C2D]'
                : 'bg-[#E8F4EC] text-[#123C2D] border-[#C4E2CF] hover:bg-[#D7EEDF]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#21865B]" />
            <span>Test Hardware</span>
          </button>
        </div>
      </div>

      {/* Simulation Exit Confirmation Modal (Section 13) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-amber-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#202B26] font-['Manrope']">
                  Active Simulation Running
                </h3>
                <p className="text-xs text-[#7A8980]">
                  Confirmation required before leaving Demo Mode
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              An automated movement simulation is currently in progress. Switching to <strong>Live Mode</strong> will immediately stop the simulation and return to real ESP32 collar hardware telemetry.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px]">
              <strong>Data Isolation Guaranteed:</strong> Simulated coordinates and events are never sent to your Firebase database.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancel & Stay in Demo
              </button>
              <button
                type="button"
                onClick={confirmSwitchToLive}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#123C2D] text-white hover:bg-[#0B261D] transition-all shadow-xs"
              >
                Stop Simulation & Switch to Live
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
