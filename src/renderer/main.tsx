import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Browser fallback guard if window.electronAPI is not injected by Electron ContextBridge
if (!window.electronAPI) {
  (window as any).electronAPI = {
    invoke: async (channel: string, payload?: any) => {
      console.warn(`[Browser Fallback] IPC channel '${channel}' called outside Electron with payload:`, payload);
      return { success: true, data: [] };
    },
    on: () => {},
    removeAllListeners: () => {},
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
