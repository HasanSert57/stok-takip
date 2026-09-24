import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '../../shared/types';

export type TabType =
  | 'pos'
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'stock'
  | 'purchases'
  | 'price'
  | 'barcode'
  | 'stock-movements'
  | 'sales'
  | 'reports'
  | 'backup'
  | 'settings'
  | 'help';

export interface ToastState {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
}

export interface PrintQueueItem {
  product: Product;
  quantity: number;
}

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  toast: ToastState | null;
  showToast: (message: string, type?: ToastState['type']) => void;
  refreshSignal: number;
  triggerRefresh: () => void;
  printQueue: PrintQueueItem[];
  addToPrintQueue: (product: Product, quantity?: number) => void;
  removeFromPrintQueue: (productId: number) => void;
  updatePrintQueueQuantity: (productId: number, quantity: number) => void;
  clearPrintQueue: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);

  const showToast = (message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const triggerRefresh = () => {
    setRefreshSignal((prev) => prev + 1);
  };

  const addToPrintQueue = (product: Product, quantity: number = 1) => {
    setPrintQueue((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, quantity }];
    });
    showToast(`"${product.name}" barkod sepetine eklendi`, 'success');
  };

  const removeFromPrintQueue = (productId: number) => {
    setPrintQueue((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updatePrintQueueQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromPrintQueue(productId);
      return;
    }
    setPrintQueue((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearPrintQueue = () => {
    setPrintQueue([]);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        toast,
        showToast,
        refreshSignal,
        triggerRefresh,
        printQueue,
        addToPrintQueue,
        removeFromPrintQueue,
        updatePrintQueueQuantity,
        clearPrintQueue,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
