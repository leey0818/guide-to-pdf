export type LangCode = 'KO' | 'EN';

export interface IPCPageEventData {
  pageUrl: string;
  langCode: string;
}

export interface PreviewImageResult {
  success: boolean;
  data: string;
}

export interface PreviewHandlerData {
  num: number;
  image: string;
};

export interface ProgressHandlerData {
  status: 'collect' | 'generate',
  pageNo?: number;
  pageImage?: string;
}

export interface GenerateCommandResult {
  success: number;
  data: string;
}
