import React, { useState } from 'react';
import { CattleGuardProvider, useCattleGuard } from './context/CattleGuardContext';
import { Sidebar } from './components/Navigation/Sidebar';
import { Header } from './components/Navigation/Header';
import { OverviewPage } from './pages/OverviewPage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { HerdManagementPage } from './pages/HerdManagementPage';
import { GeofenceSettingsPage } from './pages/GeofenceSettingsPage';
import { AlertHistoryPage } from './pages/AlertHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HardwareSimulatorDrawer } from './components/Simulator/HardwareSimulatorDrawer';
import { FirebaseModal } from './components/FirebaseModal';
import { DemoSessionPage } from './pages/DemoSessionPage';

const AppContent: React.FC = () => {
  const { activeTab } = useCattleGuard();
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'tracking':
        return <LiveTrackingPage />;
      case 'demo':
        return <DemoSessionPage />;
      case 'herd':
        return <HerdManagementPage />;
      case 'geofence':
        return <GeofenceSettingsPage />;
      case 'alerts':
        return <AlertHistoryPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F3] text-[#202B26]">
      {/* Persistent Left Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <Header 
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Hardware Simulator Tool Drawer */}
      <HardwareSimulatorDrawer />

      {/* Firebase Database Configuration Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CattleGuardProvider>
      <AppContent />
    </CattleGuardProvider>
  );
};

export default App;
