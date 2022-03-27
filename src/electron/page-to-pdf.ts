import puppeteer from 'puppeteer';
import normalizeUrl from 'normalize-url';
import PDFMerger from 'pdf-merger-js';
import * as path from 'path';
import { LangCode, PreviewHandlerData } from './types';

class PageNumber {
  current = 1;
  getAndIncrement() {
    const no = this.current;
    this.current += 1;
    return no;
  }
}

const removePageLinks = (page: puppeteer.Page) =>
  page.$$eval('a', (links) => links.forEach((node) => {
    const newNode = document.createElement('span');
    newNode.textContent = node.textContent;
    node.parentNode?.replaceChild(newNode, node);
  }));

const getPageLinks = (page: puppeteer.Page) =>
  // page.$$eval('h1 a, h2 a, h3 a', (links) => links.map((node) => node.getAttribute('href')))
  page.$$eval('h1 a, h2 a, h3 a, ol:not(.breadcrumb) > li > a, ul > li > a', (links) => links.map((node) => (node.getAttribute('href') || '')))
    .then((links) => links.filter((link) => link.startsWith('../')));

const getNextPageUrl = (pageToPdf: PageToPDF, url: string) => {
  const startPageUrl = pageToPdf.pageUrl;
  const baseUrl = startPageUrl.substring(0, startPageUrl.lastIndexOf('/') + 1);
  return normalizeUrl(baseUrl + url);
};

const getPageId = (url: string = '') => {
  const urls = url.split('/');
  if (urls.length < 2) return null;
  return urls[urls.length - 2];
};

const newPage = async (pageToPdf: PageToPDF) => {
  const browser = pageToPdf.browser;
  if (browser === null) {
    throw new Error('Browser not initialized');
  }

  const page = await browser.newPage();
  page.on('dialog', (dialog) => {
    console.log("[WARN] Dialog Opened. " + dialog.type() + ":" + dialog.message());
    dialog.dismiss();
  });

  // Resize viewport
  await page.setViewport({ width: 1024, height: 860 });

  // Set JEX_LANG cookie
  const domainName = new URL(pageToPdf.pageUrl).host;
  await page.setCookie({ name: 'JEX_LANG', value: pageToPdf.langCd, domain: domainName });

  return page;
};

const collectPage = async (pageToPdf: PageToPDF, url: string) => {
  const page = pageToPdf.page;
  if (page === null) {
    throw new Error('Page not initialized');
  }

  console.log(`Page: ${url}`);

  // move page
  await page.goto(url, { waitUntil: 'networkidle2' });

  const pageId = getPageId(page.url());
  const links = await getPageLinks(page);

  if (pageId === null) {
    console.warn(`Cannot find page id. ${page.url()}`);
    return;
  }

  const pageSet = pageToPdf.pageSet;
  if (pageSet.has(pageId)) {
    console.warn(`Already processed page. ${pageId}`);
    return;
  }

  // Change page style
  await setPageStyleBeforeProcess(page);

  // Generate PDF
  const pageNo = pageToPdf.pageNum.getAndIncrement();
  await createPagePDF(pageToPdf, page, pageNo, pageId);

  pageSet.add(pageId);

  // Loop sub pages
  for (let i = 0; i < links.length; i++) {
    const nextPageUrl = links[i];
    const nextPageId = getPageId(nextPageUrl);
    if (!nextPageId || pageSet.has(nextPageId)) continue;

    await collectPage(pageToPdf, getNextPageUrl(pageToPdf, nextPageUrl));
  }
};

const setPageStyleBeforeProcess = async (page: puppeteer.Page) => {
  await page.addStyleTag({ content: '.navbar { display: none } pre > code { white-space: pre-wrap !important }' });
  await removePageLinks(page);
};

const createPagePDF = async (pageToPdf: PageToPDF, page: puppeteer.Page, pageNo: number, pageId: string) => {
  // Create preview image
  await sendPreviewImage(pageToPdf, page, pageNo);

  // Create page pdf
  const pdfPath = pageToPdf.tmpDir + path.sep + `${pageNo}_${pageId}.pdf`;
  await page.emulateMediaType('screen');
  await page.pdf({
    path: pdfPath,
    format: 'a4',
    printBackground: true,
    margin: {
      top: '6mm',
      right: '6mm',
      bottom: '6mm',
      left: '6mm',
    },
  });

  // Add pdf to merger
  pageToPdf.pdfMerger.add(pdfPath);

  return pdfPath;
}

const generatePDF = async (pageToPdf: PageToPDF) => {
  const pageId = getPageId(pageToPdf.pageUrl);
  const langCode = pageToPdf.langCd;
  const fileName = `${langCode}_${pageId}.pdf`
  const filePath = pageToPdf.tmpDir + path.sep + fileName;
  await pageToPdf.pdfMerger.save(filePath);
  return { filePath, fileName };
};

const sendPreviewImage = async (pageToPdf: PageToPDF, page: puppeteer.Page, pageNo: number) => {
  const prevHandler = pageToPdf.prevHandler;
  const base64Image = await getPageScreenshot(page);
  prevHandler({ num: pageNo, image: base64Image });
};

const getPageScreenshot = async (page: puppeteer.Page) => {
  const base64Image = await page.screenshot({ encoding: 'base64' }) as string;
  return 'data:image/png;base64,' + base64Image;
};

const getFirstPagePreviewImage = async (pageToPdf: PageToPDF) => {
  const page = pageToPdf.page;
  if (page === null) {
    throw new Error('Page not initialized');
  }

  await page.goto(pageToPdf.pageUrl, { waitUntil: 'networkidle2' });
  await setPageStyleBeforeProcess(page);

  return await getPageScreenshot(page);
};

class PageToPDF {
  langCd: LangCode;
  tmpDir: string;
  pageUrl: string;
  pageSet: Set<string> = new Set();
  pageNum: PageNumber = new PageNumber();
  pdfMerger: PDFMerger = new PDFMerger();
  prevHandler: (data: PreviewHandlerData) => void = () => {};

  // page instance
  browser: puppeteer.Browser | null = null;
  page: puppeteer.Page | null = null;

  constructor(tmpDir: string, pageUrl: string, langCd: LangCode) {
    this.tmpDir = tmpDir;
    this.pageUrl = pageUrl;
    this.langCd = langCd;
  }

  setPreviewHandler(handler: (data: PreviewHandlerData) => void) {
    this.prevHandler = handler;
  }

  async init() {
    const executablePath = (puppeteer as any).executablePath().replace('app.asar', 'app.asar.unpacked');
    this.browser = await puppeteer.launch({ executablePath });
    this.page = await newPage(this);
  }

  async preview() {
    try {
      await this.init();
      return await getFirstPagePreviewImage(this);
    } finally {
      await this.browser?.close();
    }
  }

  async start() {
    try {
      await this.init();
      await collectPage(this, this.pageUrl);
    } finally {
      await this.browser?.close();
    }
  }

  async createPDF() {
    return await generatePDF(this);
  }

  async cancel() {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
  }
}

export default PageToPDF;
