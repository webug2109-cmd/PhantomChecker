/**
 * Phantom Checker — Electron Preload Script
 * Exposes a safe, typed API bridge to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('phantomAPI', {
  // ─── License ─────────────────────────────────────────────────────────────
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status'),

  // ─── Window Controls ─────────────────────────────────────────────────────
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // ─── Hits Export ─────────────────────────────────────────────────────────
  exportHitsFolder: (payload) => ipcRenderer.invoke('export-hits-folder', payload),

  // ─── Environment ─────────────────────────────────────────────────────────
  isElectron: true
});
