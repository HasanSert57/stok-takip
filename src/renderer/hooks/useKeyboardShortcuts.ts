import { useEffect } from 'react';
import { useApp, TabType } from '../context/AppContext';

interface KeyboardShortcutsCallbacks {
  onNewProduct?: () => void;
  onPurchaseIntake?: () => void;
  onFocusSearch?: () => void;
  onConfirm?: () => void;
}

export function useKeyboardShortcuts(callbacks?: KeyboardShortcutsCallbacks): void {
  const { setActiveTab } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Function keys F1 - F4
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (callbacks?.onFocusSearch) {
          callbacks.onFocusSearch();
        } else {
          const globalSearchInput = document.getElementById('global-search-input');
          if (globalSearchInput) globalSearchInput.focus();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (callbacks?.onNewProduct) {
          callbacks.onNewProduct();
        } else {
          setActiveTab('products');
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (callbacks?.onPurchaseIntake) {
          callbacks.onPurchaseIntake();
        } else {
          setActiveTab('purchases');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setActiveTab, callbacks]);
}
