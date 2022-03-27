import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import isDev from 'electron-is-dev';
import PageToPDF from './page-to-pdf';
import { IPCPageEventData, PreviewHandlerData, PreviewImageResult, ProgressHandlerData } from './types';

const devWindowUrl = `http://localhost:3000`;
const prodWindowUrl = `file://${path.join(__dirname, './index.html')}`;

console.log(prodWindowUrl);
console.log(isDev);

let mainWindow: BrowserWindow | null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 850,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, './preload.js'),
    },
  });

  mainWindow.loadURL(isDev ? devWindowUrl : prodWindowUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTempDir() {
  return app.getPath('temp') + (new Date().getTime());
}

ipcMain.handle('page:preview', async (evt, data: IPCPageEventData): Promise<PreviewImageResult> => {
  const { pageUrl, langCode } = data;
  if (!pageUrl || !langCode) return { success: false, data: 'Invalid parameter' };
  if (langCode !== 'KO' && langCode !== 'EN') return { success: false, data: 'Invalid langCode' };

  const tempDir = createTempDir();

  console.log('Start capture preview image with ' + tempDir);

  try {
    // create temp directory
    fs.mkdirSync(tempDir);

    const pageToPdf = new PageToPDF(tempDir, pageUrl, langCode);
    const base64Image = await pageToPdf.preview();

    console.log('Finished capture preview image!');

    return {
      success: true,
      data: base64Image
    };
  } catch (err) {
    return {
      success: false,
      data: (err instanceof Error) ? err.message : ('' + err),
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

ipcMain.handle('page:start', async (evt, data: IPCPageEventData) => {
  const { pageUrl, langCode } = data;
  if (!pageUrl || !langCode) return { success: false, data: 'Invalid parameter' };
  if (langCode !== 'KO' && langCode !== 'EN') return { success: false, data: 'Invalid langCode' };

  const webContents = evt.sender;
  const tempDir = createTempDir();
  console.log('Start create pdf in ' + tempDir);

  try {
    // create temp directory
    fs.mkdirSync(tempDir);

    const pageToPdf = new PageToPDF(tempDir, pageUrl, langCode);
    pageToPdf.setPreviewHandler((data: PreviewHandlerData) => {
      const eventData: ProgressHandlerData = {
        status: 'collect',
        pageNo: data.num,
        pageImage: data.image,
      }
      webContents.send('page:start:progress', eventData);
    });

    // collecting page
    await pageToPdf.start();

    const eventData: ProgressHandlerData = { status: 'generate' };
    webContents.send('page:start:progress', eventData);

    // create pdf file
    const { filePath, fileName } = await pageToPdf.createPDF();

    // move to download folder
    const newFilePath = app.getPath('downloads') + path.sep + fileName;
    fs.renameSync(filePath, newFilePath);

    return { success: true, data: newFilePath };
  } catch (err) {
    return {
      success: false,
      data: (err instanceof Error) ? err.message : ('' + err),
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true });
  }
});

ipcMain.on('page:cancel', (evt) => {
  // TODO
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
})
