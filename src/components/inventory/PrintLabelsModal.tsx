'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Printer, X } from 'lucide-react';
import {
  STORE_NAME,
  allSizes,
  barcodeSvg,
  findSize,
  loadSettings,
  printLabels,
  saveSettings,
  type BarcodeSettings,
  type PrinterType,
} from '@/lib/barcode-labels';
import type { InventorySku } from '@/lib/inventory';

/** Label preview rendered with the same fields that get printed. */
export function LabelPreview({
  header,
  barcode,
  title,
  line1,
  line2,
  footer,
  widthPx = 220,
}: {
  header?: string;
  barcode: string;
  title?: string;
  line1?: string;
  line2?: string;
  footer?: string;
  widthPx?: number;
}) {
  const svg = useMemo(() => barcodeSvg(barcode || 'TOC0000000', 50, 1.6), [barcode]);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-center text-black mx-auto" style={{ width: widthPx }}>
      {header && <div className="text-[13px] font-black uppercase tracking-wide leading-tight">{header}</div>}
      <div className="h-16 my-1" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="font-mono text-[10px] leading-tight">{barcode || 'TOC0000000'}</div>
      {title && <div className="text-[11px] font-bold leading-tight truncate">{title}</div>}
      {line1 && <div className="text-[10px] leading-tight">{line1}</div>}
      {line2 && <div className="text-[10px] leading-tight">{line2}</div>}
      {footer && <div className="text-[13px] font-black leading-tight">{footer}</div>}
    </div>
  );
}

export function PrintLabelsModal({ item, onClose }: { item: InventorySku; onClose: () => void }) {
  const [settings, setSettings] = useState<BarcodeSettings>(() => loadSettings());
  const [quantity, setQuantity] = useState(Math.max(1, item.stock));
  const sizes = allSizes();
  const size = findSize(settings.selectedSizeId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const update = (patch: Partial<BarcodeSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const rows = Math.ceil(quantity / (settings.printerType === 'label' ? size.labelsPerRow : 1));

  const print = () => {
    if (!item.barcode) return;
    printLabels(
      Array.from({ length: quantity }, () => ({
        header: STORE_NAME,
        productName: item.name,
        variantName: item.variantName,
        barcode: item.barcode!,
        price: item.price,
      })),
      size,
      settings
    );
  };

  const toggle = (t: PrinterType) =>
    `py-2 px-2.5 rounded-lg text-xs font-black transition-all text-center cursor-pointer ${
      settings.printerType === t ? 'bg-[#111111] text-[#C9B79C] shadow-sm' : 'text-gray-600 hover:text-black hover:bg-gray-100'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-3xl max-w-lg w-full max-h-[94dvh] border border-[#DDD2BE] shadow-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-[#111111] text-white flex items-center justify-between border-b border-[#C9B79C]/30">
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <Printer size={15} className="text-[#C9B79C]" /> Print Barcode Labels ({STORE_NAME})
            </h3>
            <p className="text-[11px] text-[#7A6A4F] font-semibold">Generate physical retail stickers for this SKU</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="p-3 bg-[#FBFAF6] border border-gray-200 rounded-xl flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#7A6A4F]">Product / SKU</div>
              <div className="text-sm font-black text-gray-900 truncate">{item.name}</div>
              {item.variantName && <div className="text-[11px] text-gray-600">Variant: {item.variantName}</div>}
              <div className="font-mono text-[11px] text-gray-800 mt-0.5">{item.barcode}</div>
            </div>
            <button
              type="button"
              title="Copy Barcode Value"
              onClick={() => item.barcode && navigator.clipboard?.writeText(item.barcode)}
              className="w-8 h-8 rounded-lg border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer shrink-0"
            >
              <Copy size={14} />
            </button>
          </div>

          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1.5">Target Printer</div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl">
              <button type="button" onClick={() => update({ printerType: 'label' })} className={toggle('label')}>
                Thermal (Roll)
              </button>
              <button type="button" onClick={() => update({ printerType: 'regular' })} className={toggle('regular')}>
                Desktop (A4)
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {settings.printerType === 'label'
                ? `Roll label printer (${size.labelsPerRow > 1 ? `${size.labelsPerRow} labels per row` : '1 label per page'})`
                : 'A4 sheet printer (Canon G2010, HP, Epson)'}
            </p>
          </div>

          <div>
            <label htmlFor="barcode-preset-select" className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1">
              Label Sizing Preset
            </label>
            <select
              id="barcode-preset-select"
              value={size.id}
              onChange={(e) => update({ selectedSizeId: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 outline-none focus:border-[#111111]"
            >
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              Dimensions: {size.widthMm}mm × {size.heightMm}mm
              {size.labelsPerRow > 1 ? ` · gap across ${size.horizontalGapMm}mm · gap between rows ${size.verticalGapMm || 0}mm` : ''}
            </p>
          </div>

          <div>
            <label htmlFor="barcode-print-quantity" className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-1">
              Number of Labels to Print
            </label>
            <input
              id="barcode-print-quantity"
              type="number"
              min={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="w-full h-10 px-3 rounded-xl border border-gray-300 bg-white text-sm font-black text-gray-900 outline-none focus:border-[#111111]"
            />
          </div>

          <div className="rounded-2xl border border-[#DDD2BE] bg-[#FAF7F2] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">Sticker Print Preview</span>
              <span className="text-[10px] font-bold text-gray-500">
                {size.widthMm} × {size.heightMm} mm ({settings.printerType === 'label' ? 'Roll' : 'A4 Sheet'})
              </span>
            </div>
            <LabelPreview
              header={settings.showCompanyName ? STORE_NAME : undefined}
              barcode={item.barcode || ''}
              title={settings.showItemName ? (item.variantName ? `${item.name} (${item.variantName})` : item.name) : undefined}
              footer={settings.showSalePrice ? `₹${item.price}` : undefined}
            />
            {settings.printerType === 'label' && (
              <p className="text-center text-[10px] text-gray-500 mt-2">
                Each row prints as one page · {rows} pages in total
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-gray-200 bg-[#FBFAF6] flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={print}
            disabled={!item.barcode}
            className="px-5 py-2.5 rounded-xl bg-[#111111] border border-[#C9B79C] text-[#C9B79C] text-xs font-black hover:bg-[#262626] shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer size={14} /> Print {quantity} Labels
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
