import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  invoke: (channel: string, payload?: any) => Promise<any>;
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => () => void;
}

const api: ElectronAPI = {
  invoke: (channel: string, payload?: any) => {
    return ipcRenderer.invoke(channel, payload);
  },
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    const subscription = (event: any, ...args: any[]) => callback(event, ...args);
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
