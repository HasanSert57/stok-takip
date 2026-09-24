import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  invoke: (channel: string, payload?: any) => Promise<any>;
}

const api: ElectronAPI = {
  invoke: (channel: string, payload?: any) => {
    return ipcRenderer.invoke(channel, payload);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
