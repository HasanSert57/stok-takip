import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { FirstRunModal } from './components/FirstRunModal';
import { LicenseModal } from './components/license/LicenseModal';
import { UpdateNotification } from './components/UpdateNotification';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { IPC_CHANNELS } from '../shared/constants/ipc-channels';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StockPage } from './pages/StockPage';
import { PosPage } from './pages/PosPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { PricePage } from './pages/PricePage';
import { BarcodePage } from './pages/BarcodePage';
import { StockMovementsPage } from './pages/StockMovementsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { HelpPage } from './pages/HelpPage';

const PageContent: React.FC = () => {
  const { activeTab } = useApp();
  useKeyboardShortcuts();

  switch (activeTab) {
    case 'dashboard':
      return <DashboardPage />;
    case 'products':
      return <ProductsPage />;
    case 'categories':
      return <CategoriesPage />;
    case 'stock':
      return <StockPage />;
    case 'pos':
      return <PosPage />;
    case 'sales':
      return <SalesHistoryPage />;
    case 'purchases':
      return <PurchasesPage />;
    case 'price':
      return <PricePage />;
    case 'barcode':
      return <BarcodePage />;
    case 'stock-movements':
      return <StockMovementsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'backup':
      return <SettingsPage />;
    case 'settings':
      return <SettingsPage />;
    case 'help':
      return <HelpPage />;
    default:
      return <DashboardPage />;
  }
};

interface LicenseState {
  isChecking: boolean;
  isLicensed: boolean;
  machineId: string;
  errorMessage?: string;
}

const MainLayout: React.FC = () => {
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
  const [licenseState, setLicenseState] = useState<LicenseState>({
    isChecking: true,
    isLicensed: false,
    machineId: '',
  });

  const checkLicenseStatus = async () => {
    try {
      const res = await window.electronAPI.invoke(IPC_CHANNELS.LICENSE_GET_STATUS);
      if (res && res.success && res.data) {
        setLicenseState({
          isChecking: false,
          isLicensed: Boolean(res.data.isLicensed),
          machineId: res.data.machineId || '',
          errorMessage: res.data.errorMessage,
        });
      } else {
        setLicenseState({
          isChecking: false,
          isLicensed: false,
          machineId: '',
          errorMessage: res?.error?.message || 'Lisans kontrolü yapılırken sunucu yanıt vermedi.',
        });
      }
    } catch (err: any) {
      setLicenseState({
        isChecking: false,
        isLicensed: false,
        machineId: '',
        errorMessage: 'Lisans servisine erişilemedi.',
      });
    }
  };

  useEffect(() => {
    checkLicenseStatus();

    window.electronAPI.invoke(IPC_CHANNELS.SETTINGS_GET).then((res) => {
      if (res.success && res.data) {
        if (res.data.first_run_completed !== 'true') {
          setIsFirstRun(true);
        }
      }
    });
  }, []);

  if (licenseState.isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Cihaz Lisans Güvenlik Kontrolü Yapılıyor...
          </span>
        </div>
      </div>
    );
  }

  // Hard block: If not licensed, DO NOT render Sidebar, Header, or PageContent
  if (!licenseState.isLicensed) {
    return (
      <LicenseModal
        machineId={licenseState.machineId}
        errorMessage={licenseState.errorMessage}
        onActivated={checkLicenseStatus}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <div className="flex-1 p-6 overflow-y-auto">
          <PageContent />
        </div>
      </main>
      <Toast />
      <UpdateNotification />
      <FirstRunModal isOpen={isFirstRun} onComplete={() => setIsFirstRun(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};
