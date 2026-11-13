import React, { useState } from 'react';
import { 
  Database, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Play,
  Clock,
  Compass,
  History
} from 'lucide-react';
import { useCattleGuard } from '../context/CattleGuardContext';
import { 
  getFirebaseCredentials, 
  saveFirebaseCredentials, 
  testFirebaseConnection 
} from '../services/firebase';
import { playBuzzerAlertSound } from '../utils/geo';
import { FirebaseCredentials } from '../types';

export const SettingsPage: React.FC = () => {
  const { 
    isFirebaseMode, 
    setIsFirebaseMode, 
    isFirebaseConnected, 
    audioAlertEnabled, 
    setAudioAlertEnabled,
    onlineTimeoutSeconds,
    setOnlineTimeoutSeconds 
  } = useCattleGuard();

  const [credentials, setCredentials] = useState<FirebaseCredentials>(getFirebaseCredentials());
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const [farmName, setFarmName] = useState<string>('Estancia CattleGuard');
  const [pastureLocation, setPastureLocation] = useState<string>('Ahmedabad / Gandhinagar Pastures, Gujarat');

  const handleCredsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev: FirebaseCredentials) => ({
      ...prev,
      [e.target.name]: e.target.value.trim(),
    }));
  };

  const handleTestConnection = async () => {
    saveFirebaseCredentials(credentials);
    setTestResult({ status: 'testing', message: 'Testing Firebase Realtime Database connection...' });
    const res = await testFirebaseConnection();
    if (res.success) {
      setTestResult({ status: 'success', message: res.message });
      setIsFirebaseMode(true);
    } else {
      setTestResult({ status: 'error', message: res.message });
    }
  };

  const handleSaveSettings = () => {
    saveFirebaseCredentials(credentials);
    setIsFirebaseMode(true);
    alert('Settings and Firebase credentials successfully updated!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
            System & Hardware Settings
          </h2>
          <p className="text-xs text-[#7A8980]">
            Firebase Realtime Database credentials, collar timeout intervals, and hardware pinout wiring guide
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
            isFirebaseConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            {isFirebaseConnected ? 'Firebase Live Connected' : 'Simulated / Offline Mode'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Firebase Realtime Database Config */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#F0F3EF]">
            <div className="w-9 h-9 rounded-xl bg-[#E8F4EC] text-[#21865B] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#202B26]">
                Firebase Realtime Database Setup
              </h3>
              <p className="text-xs text-[#7A8980]">
                Project: <code className="font-mono text-gray-800 font-bold">esp32-gps-tracker-4b283</code>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Database URL (VITE_FIREBASE_DATABASE_URL)
              </label>
              <input
                type="text"
                name="databaseURL"
                value={credentials.databaseURL}
                onChange={handleCredsChange}
                placeholder="https://esp32-gps-tracker-4b283-default-rtdb.firebaseio.com"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                API Key (VITE_FIREBASE_API_KEY)
              </label>
              <input
                type="text"
                name="apiKey"
                value={credentials.apiKey}
                onChange={handleCredsChange}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  name="projectId"
                  value={credentials.projectId}
                  onChange={handleCredsChange}
                  placeholder="esp32-gps-tracker-4b283"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Auth Domain
                </label>
                <input
                  type="text"
                  name="authDomain"
                  value={credentials.authDomain}
                  onChange={handleCredsChange}
                  placeholder="esp32-gps-tracker-4b283.firebaseapp.com"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
              </div>
            </div>
          </div>

          {/* Connection Test Output */}
          {testResult.status !== 'idle' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.status === 'testing' ? 'bg-blue-50 border-blue-200 text-blue-700' :
              testResult.status === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
              'bg-red-50 border-red-300 text-red-700'
            }`}>
              {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
              {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testResult.status === 'testing'}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 hover:bg-gray-100 text-[#202B26] transition-colors"
            >
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#123C2D] hover:bg-[#1B523E] text-white shadow-sm transition-colors"
            >
              Save Credentials
            </button>
          </div>
        </div>

        {/* Right: Collar Parameters, Audio Buzzer & Verified Coordinate */}
        <div className="space-y-6">
          {/* Device Online Timeout Settings (Section 8) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F0F3EF]">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202B26]">
                  Collar Connectivity Timeout
                </h3>
                <p className="text-xs text-[#7A8980]">
                  Controls when stale GPS records transition from ONLINE to OFFLINE
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#202B26]">
                Offline Timeout Threshold:
              </span>
              <span className="font-mono font-bold text-sm text-[#21865B]">
                {onlineTimeoutSeconds} seconds
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setOnlineTimeoutSeconds(sec)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    onlineTimeoutSeconds === sec
                      ? 'bg-[#123C2D] text-white border-[#123C2D] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Audio Buzzer Configuration */}
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F0F3EF]">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202B26]">
                  Acoustic Buzzer & Alarm Audio
                </h3>
                <p className="text-xs text-[#7A8980]">
                  Synthesizes the ESP32 2.4 kHz piezo buzzer on perimeter breach
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
              <div>
                <span className="text-xs font-bold text-[#202B26] block">
                  Browser Audio Alarm
                </span>
                <span className="text-[11px] text-[#7A8980]">
                  Play tone when livestock breaches the virtual boundary
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAudioAlertEnabled(!audioAlertEnabled)}
                className={`p-2 rounded-xl border transition-all ${
                  audioAlertEnabled
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-gray-200 text-gray-500 border-gray-300'
                }`}
              >
                {audioAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => playBuzzerAlertSound()}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test 2.4 kHz ESP32 Buzzer Tone</span>
              </button>
            </div>
          </div>

          {/* Historical Record Reference (Section 3) */}
          <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card space-y-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#21865B]" />
              <h3 className="text-xs font-bold text-[#202B26] uppercase tracking-wider">
                Historical Benchmark Coordinate
              </h3>
            </div>
            <p className="text-[11px] text-[#7A8980]">
              Verified GPS record used for map and geofence accuracy audits:
            </p>
            <div className="p-3 rounded-xl bg-[#0B261D] text-emerald-300 font-mono text-xs space-y-1">
              <div>Device ID: <strong className="text-white">esp32_gps_01</strong></div>
              <div>Latitude: <strong className="text-white">23.12213633</strong></div>
              <div>Longitude: <strong className="text-white">72.59768517</strong></div>
              <div>Satellites: <strong className="text-white">8</strong> &bull; HDOP: <strong className="text-emerald-400">0.88</strong></div>
              <div className="text-[10px] text-gray-400">Timestamp: 2026-10-11T15:31:52Z</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Pinout & Wiring Reference Guide */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E8E3] shadow-card">
        <div className="flex items-center gap-3 pb-3 border-b border-[#F0F3EF]">
          <div className="w-9 h-9 rounded-xl bg-[#E8F4EC] text-[#21865B] flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#202B26]">
              Hardware Architecture & ESP32 Collar Pinout
            </h3>
            <p className="text-xs text-[#7A8980]">
              Standard wiring table for ESP32 DevKit, NEO-6M GPS, and MOSFET Buzzer Circuit
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <h4 className="font-bold text-[#123C2D] mb-2 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#21865B]" /> NEO-6M GPS Module
            </h4>
            <ul className="space-y-1 font-mono text-gray-700">
              <li>&bull; VCC &rarr; 3.3V / 5V</li>
              <li>&bull; GND &rarr; ESP32 GND</li>
              <li>&bull; TX &rarr; ESP32 GPIO 16 (RX2)</li>
              <li>&bull; RX &rarr; ESP32 GPIO 17 (TX2)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <h4 className="font-bold text-[#123C2D] mb-2 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-red-600" /> MOSFET Buzzer Circuit
            </h4>
            <ul className="space-y-1 font-mono text-gray-700">
              <li>&bull; Gate &rarr; ESP32 GPIO 18 (PWM)</li>
              <li>&bull; Drain &rarr; Buzzer Negative (-)</li>
              <li>&bull; Source &rarr; ESP32 GND</li>
              <li>&bull; Buzzer (+) &rarr; 5V / Battery VCC</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E3E8E3]">
            <h4 className="font-bold text-[#123C2D] mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" /> Firebase RTDB Paths
            </h4>
            <ul className="space-y-1 font-mono text-gray-700">
              <li>&bull; /devices/esp32_gps_01/latest</li>
              <li>&bull; /devices/esp32_gps_01/history</li>
              <li>&bull; /geofence (centerLat, radiusM)</li>
              <li>&bull; /alerts/esp32_gps_01</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
