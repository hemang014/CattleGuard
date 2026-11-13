import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldAlert, 
  Info 
} from 'lucide-react';
import { 
  getFirebaseCredentials, 
  saveFirebaseCredentials, 
  clearStoredFirebaseCredentials, 
  testFirebaseConnection 
} from '../services/firebase';
import { useCattleGuard } from '../context/CattleGuardContext';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RULES_JSON = `{
  "rules": {
    ".read": true,
    ".write": true
  }
}`;

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ isOpen, onClose }) => {
  const { setIsFirebaseMode } = useCattleGuard();
  const [credentials, setCredentials] = useState(getFirebaseCredentials());
  const [copiedRules, setCopiedRules] = useState(false);
  const [testResult, setTestResult] = useState<{ 
    status: 'idle' | 'testing' | 'success' | 'error'; 
    message: string;
    isPermissionDenied?: boolean;
  }>({
    status: 'idle',
    message: '',
    isPermissionDenied: false,
  });

  useEffect(() => {
    if (isOpen) {
      setCredentials(getFirebaseCredentials());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({
      ...prev,
      [e.target.name]: e.target.value.trim(),
    }));
  };

  const handleTestConnection = async () => {
    saveFirebaseCredentials(credentials);
    setTestResult({ status: 'testing', message: 'Connecting to Firebase Realtime Database...', isPermissionDenied: false });
    
    const result = await testFirebaseConnection();
    if (result.success) {
      setTestResult({ status: 'success', message: result.message, isPermissionDenied: false });
      setIsFirebaseMode(true);
    } else {
      const isDenied = Boolean(
        result.isPermissionDenied || 
        result.message.toLowerCase().includes('permission denied') ||
        result.message.toLowerCase().includes('permission_denied')
      );
      setTestResult({ 
        status: 'error', 
        message: result.message, 
        isPermissionDenied: isDenied 
      });
    }
  };

  const handleSave = () => {
    saveFirebaseCredentials(credentials);
    setIsFirebaseMode(true);
    onClose();
    window.location.reload(); // Reload to re-initialize firebase with new creds
  };

  const handleReset = () => {
    clearStoredFirebaseCredentials();
    const freshDefaults = getFirebaseCredentials();
    setCredentials(freshDefaults);
    setTestResult({ status: 'idle', message: 'Cleared custom credentials. Reverted to project defaults.', isPermissionDenied: false });
  };

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(RULES_JSON);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    } catch {
      // Fallback
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2500);
    }
  };

  const getFirebaseConsoleRulesUrl = () => {
    const proj = credentials.projectId || 'esp32-gps-tracker-4b283';
    const match = credentials.databaseURL.match(/https:\/\/([a-zA-Z0-9_-]+)\./);
    const dbInstance = match ? match[1] : `${proj}-default-rtdb`;
    return `https://console.firebase.google.com/project/${proj}/database/${dbInstance}/rules`;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-modal border border-[#E3E8E3] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#F5F7F3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4EC] text-[#21865B] flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202B26] font-['Manrope']">
                Firebase Realtime Database Setup
              </h2>
              <p className="text-xs text-[#7A8980]">
                Connect your existing Firebase project for real-time ESP32 sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#21865B] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Hardware Compatibility:</span>
              <p className="mt-0.5 text-emerald-800">
                CattleGuard reads and writes directly to existing paths: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">/devices/esp32_gps_01/latest</code> and <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">/geofence</code> without requiring any changes to your ESP32 Arduino code.
              </p>
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Database URL (Required)
              </label>
              <input
                type="text"
                name="databaseURL"
                value={credentials.databaseURL}
                onChange={handleChange}
                placeholder="https://esp32-gps-tracker-4b283-default-rtdb.asia-southeast1.firebasedatabase.app"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202B26] mb-1">
                Firebase Web API Key (Required)
              </label>
              <input
                type="text"
                name="apiKey"
                value={credentials.apiKey}
                onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  placeholder="esp32-gps-tracker-4b283.firebaseapp.com"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  name="storageBucket"
                  value={credentials.storageBucket}
                  onChange={handleChange}
                  placeholder="esp32-gps-tracker-4b283.firebasestorage.app"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  App ID
                </label>
                <input
                  type="text"
                  name="appId"
                  value={credentials.appId}
                  onChange={handleChange}
                  placeholder="1:32216940640:web:a862ab5942f5a0116634cb"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#21865B] bg-[#F5F7F3]"
                />
              </div>
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult.status !== 'idle' && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.status === 'testing'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : testResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-300 text-red-700'
            }`}>
              {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
              {testResult.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {testResult.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}

          {/* Dedicated Interactive Permission Denied Resolution Guide */}
          {testResult.isPermissionDenied && (
            <div className="p-4 rounded-xl bg-amber-50/95 border-2 border-amber-300/90 text-xs space-y-3.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    How to Fix "Permission Denied" in 30 Seconds
                  </h4>
                  <p className="text-amber-800 mt-0.5 leading-relaxed">
                    By default, Firebase Realtime Database creates databases in locked mode (blocking all reads & writes). Both your ESP32 tracker and this web dashboard need read/write permissions allowed in your Firebase Console.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-amber-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#21865B]" />
                    Copy These Database Rules:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRules}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123C2D] hover:bg-[#1B523E] text-white font-semibold transition-all shadow-sm active:scale-95"
                  >
                    {copiedRules ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-emerald-300">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Rules JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto select-all">
{RULES_JSON}
                </pre>

                <div className="space-y-2 text-gray-700 pt-1">
                  <div className="flex items-center justify-between bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                    <span className="font-semibold text-[#202B26]">
                      Step 1: Go directly to your project's Rules tab in Firebase:
                    </span>
                    <a
                      href={getFirebaseConsoleRulesUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#21865B] hover:bg-[#1B523E] text-white font-bold transition-colors shrink-0 text-xs"
                    >
                      Open Firebase Rules Console <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>

                  <div className="text-xs space-y-1.5 text-gray-600 pl-1">
                    <p>
                      <strong>Step 2:</strong> In the editor, select all and replace with the copied JSON above.
                    </p>
                    <p>
                      <strong>Step 3:</strong> Click the blue <strong>"Publish"</strong> button at the top right of the Firebase Console.
                    </p>
                    <p>
                      <strong>Step 4:</strong> Return to this tab and click <strong>"Test Connection"</strong> below. It will turn green!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-[#F5F7F3] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
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
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#123C2D] hover:bg-[#1B523E] text-white shadow-sm transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
