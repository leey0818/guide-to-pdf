import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { GenerateCommandResult, IPCPageEventData, PreviewImageResult, ProgressHandlerData } from './types';

contextBridge.exposeInMainWorld('electron', {
  previewImage: (data: IPCPageEventData): Promise<PreviewImageResult> => ipcRenderer.invoke('page:preview', data),
  generatePDF: (data: IPCPageEventData): Promise<GenerateCommandResult> => ipcRenderer.invoke('page:start', data),
  cancelRequest: (): Promise<void> => ipcRenderer.invoke('page:cancel'),
  onProgressGenerate: (callback: (event: IpcRendererEvent, data: ProgressHandlerData) => void) => ipcRenderer.on('page:start:progress', callback),
});
