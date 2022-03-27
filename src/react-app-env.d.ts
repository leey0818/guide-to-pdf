/// <reference types="react-scripts" />

import { IpcRenderer, IpcRendererEvent } from 'electron';
import { IPCPageEventData, PreviewImageResult, GenerateCommandResult, ProgressHandlerData } from "./electron/types";

declare global {
  interface Window {
    electron: {
      previewImage: (data: IPCPageEventData) => Promise<PreviewImageResult>,
      generatePDF: (data: IPCPageEventData) => Promise<GenerateCommandResult>,
      onProgress: (callback: (event: IpcRendererEvent, data: ProgressHandlerData) => void) => IpcRenderer
    }
  }
}
