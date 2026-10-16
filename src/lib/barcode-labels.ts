'use client';

import JsBarcode from 'jsbarcode';
import { escapeHtml, printHtml } from './thermal-print';

export interface LabelSize {
  id: string;
  name: string;
  labelsPerRow: number;
  widthMm: number;
  heightMm: number;
  horizontalGapMm: number;
  verticalGapMm?: number;
  custom?: boolean;
}

export type PrinterType = 'label' | 'regular';

export interface BarcodeSettings {
  printerType: PrinterType;
  selectedSizeId: string;
  showSalePrice: boolean;
  showCompanyName: boolean;
  showItemName: boolean;
  showDiscount: boolean;
}

export interface LabelData {
  header: string;
  productName: string;
  variantName?: string | null;
  barcode: string;
  line1?: string;
  line2?: string;
  line3?: string;
  line4?: string;
  price?: number | null;
  mrp?: number | null;
}

export const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';

export const LABEL_SIZES: LabelSize[] = [
  { id: '2_38x25', name: '38 × 25 mm (Tag / Jewelry)', labelsPerRow: 1, widthMm: 38, heightMm: 25, horizontalGapMm: 0 },
  { id: '1_50x25', name: '50 × 25 mm (Standard Compact)', labelsPerRow: 1, widthMm: 50, heightMm: 25, horizontalGapMm: 0 },
  { id: '2_50x25', name: '50 × 38 mm (Retail Standard)', labelsPerRow: 1, widthMm: 50, heightMm: 38, horizontalGapMm: 0 },
  { id: '1_60x40', name: '60 × 40 mm (Shipping)', labelsPerRow: 1, widthMm: 60, heightMm: 40, horizontalGapMm: 0 },
  { id: '1_100x50', name: '100 × 50 mm (Large Carton / Box)', labelsPerRow: 1, widthMm: 100, heightMm: 50, horizontalGapMm: 0 },
  { id: '2up_50x25', name: '50 × 25 mm × 2 (2-Up Roll, Candidate A)', labelsPerRow: 2, widthMm: 50, heightMm: 25, horizontalGapMm: 2, verticalGapMm: 0 },
  { id: '2up_50x30', name: '50 × 30 mm × 2 (2-Up Roll, Candidate B)', labelsPerRow: 2, widthMm: 50, heightMm: 30, horizontalGapMm: 2, verticalGapMm: 0 },
  { id: '3up_33x22', name: '33 × 22 mm (3-Up Triple Roll)', labelsPerRow: 3, widthMm: 33, heightMm: 22, horizontalGapMm: 2, verticalGapMm: 0 },
  { id: '3up_33x25', name: '33 × 25 mm × 3 (3-Up Roll, Candidate A)', labelsPerRow: 3, widthMm: 33, heightMm: 25, horizontalGapMm: 2, verticalGapMm: 0 },
  { id: '3up_38x25', name: '38 × 25 mm × 3 (3-Up Roll, Candidate B)', labelsPerRow: 3, widthMm: 38, heightMm: 25, horizontalGapMm: 2, verticalGapMm: 0 },
  { id: '4up_25x25', name: '25 × 25 mm × 4 (4-Up Roll, Candidate A)', labelsPerRow: 4, widthMm: 25, heightMm: 25, horizontalGapMm: 2, verticalGapMm: 0 },
  { id: '4up_30x20', name: '30 × 20 mm × 4 (4-Up Roll, Candidate B)', labelsPerRow: 4, widthMm: 30, heightMm: 20, horizontalGapMm: 2, verticalGapMm: 0 },
];

export const DEFAULT_SETTINGS: BarcodeSettings = {
  printerType: 'label',
  selectedSizeId: '2_38x25',
  showSalePrice: true,
  showCompanyName: true,
  showItemName: true,
  showDiscount: false,
};

const SETTINGS_KEY = 'swagyard_barcode_settings';
const CUSTOM_SIZES_KEY = 'swagyard_custom_label_sizes';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export const loadSettings = (): BarcodeSettings => read(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveSettings = (s: BarcodeSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
};

export function loadCustomSizes(): LabelSize[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SIZES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export const saveCustomSizes = (sizes: LabelSize[]) => {
  try {
    localStorage.setItem(CUSTOM_SIZES_KEY, JSON.stringify(sizes));
  } catch {}
};

export const allSizes = () => [...LABEL_SIZES, ...loadCustomSizes()];
export const findSize = (id: string) => allSizes().find((s) => s.id === id) || LABEL_SIZES[0];

/** Random store item code in the original's TOC####### format. */
export const generateItemCode = () => `TOC${Math.floor(1e6 + Math.random() * 9e6)}`;

/** CODE128 barcode rendered to an SVG string (empty when the value can't be encoded). */
export function barcodeSvg(value: string, heightPx = 40, barWidth = 1.4) {
  if (typeof document === 'undefined' || !value) return '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, value, { format: 'CODE128', displayValue: false, height: heightPx, width: barWidth, margin: 0 });
  } catch {
    return '';
  }
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.width = '100%';
  svg.style.height = '100%';
  return svg.outerHTML;
}

function labelHtml(l: LabelData, size: LabelSize, settings: BarcodeSettings) {
  const small = size.heightMm <= 25;
  const title = l.variantName ? `${l.productName} (${l.variantName})` : l.productName;
  const lines = [l.line1, l.line2].filter(Boolean).map((t) => `<div class="tag">${escapeHtml(String(t))}</div>`).join('');
  const footer = [
    settings.showSalePrice && l.price ? `<span class="price">₹${l.price}</span>` : '',
    settings.showDiscount && (l.line3 || l.mrp) ? `<span class="tag">${escapeHtml(String(l.line3 || `MRP ₹${l.mrp}`))}</span>` : '',
  ].join('');
  return `<div class="sticker" style="width:${size.widthMm}mm;height:${size.heightMm}mm;">
  ${settings.showCompanyName ? `<div class="header">${escapeHtml(l.header || STORE_NAME)}</div>` : ''}
  <div class="barcode-box">${barcodeSvg(l.barcode, small ? 26 : 40)}</div>
  <div class="code">${escapeHtml(l.barcode)}</div>
  ${settings.showItemName ? `<div class="prod-title">${escapeHtml(title)}</div>` : ''}
  ${lines}
  ${footer ? `<div class="footer">${footer}</div>` : ''}
  ${l.line4 ? `<div class="tag">${escapeHtml(l.line4)}</div>` : ''}
</div>`;
}

/** Prints labels: one row of stickers per page on a roll printer, or a grid on A4. */
export function printLabels(labels: LabelData[], size: LabelSize, settings: BarcodeSettings) {
  if (!labels.length) return;
  const perRow = settings.printerType === 'label' ? Math.max(1, size.labelsPerRow) : Math.max(1, Math.floor(190 / (size.widthMm + 2)));
  const gap = settings.printerType === 'label' ? size.horizontalGapMm : 2;
  const small = size.heightMm <= 25;
  const rows: string[] = [];
  for (let i = 0; i < labels.length; i += perRow) {
    rows.push(`<div class="sticker-row">${labels.slice(i, i + perRow).map((l) => labelHtml(l, size, settings)).join('')}</div>`);
  }
  const pageCss =
    settings.printerType === 'label'
      ? `@page { size: ${(size.widthMm * perRow + gap * (perRow - 1)).toFixed(2)}mm ${size.heightMm.toFixed(2)}mm; margin: 0; }
         .sticker-row { break-after: page; page-break-after: always; }
         .sticker-row:last-child { break-after: auto; page-break-after: auto; }`
      : `@page { size: A4 portrait; margin: 10mm; } .sticker-row { margin-bottom: 2mm; }`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Barcode Labels</title><style>
  ${pageCss}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sticker-row { display: flex; gap: ${gap}mm; }
  .sticker { display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;
             padding: ${small ? '0.6mm 1.2mm' : '1.0mm 1.6mm'}; text-align: center; page-break-inside: avoid; }
  .header { font-weight: 900; font-size: ${small ? '7pt' : '9pt'}; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }
  .barcode-box { width: 100%; height: ${small ? '7mm' : '11mm'}; }
  .code { font-family: monospace; font-size: ${small ? '6pt' : '7.5pt'}; }
  .prod-title { font-size: ${small ? '6pt' : '8pt'}; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .tag { font-size: ${small ? '5.5pt' : '7pt'}; }
  .footer { display: flex; gap: 2mm; justify-content: center; align-items: baseline; }
  .price { font-size: ${small ? '8pt' : '10.5pt'}; font-weight: 900; }
</style></head><body>${rows.join('')}</body></html>`;
  printHtml(html);
}
