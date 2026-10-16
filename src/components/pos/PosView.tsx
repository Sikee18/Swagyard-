'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Scan,
  Camera,
  Trash2,
  Plus,
  Minus,
  User,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Split,
  Printer,
  Share2,
  RotateCcw,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';
import { useAudioAlarm } from '@/hooks/useAudioAlarm';
import { calculateGstAndTotals, SplitDetailsInput } from '@/lib/business-rules';
import { SearchCatalogModal } from './SearchCatalogModal';
import { DepositOrderModal } from './DepositOrderModal';
import { CustomItemModal } from './CustomItemModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import { ThermalReceipt, ReceiptOrder } from './ThermalReceipt';

export interface CartItem {
  id: string; // unique cart line id
  productId?: number | null;
  variantId?: number | null;
  name: string;
  sizeLabel?: string | null;
  priceInPaise: number;
  quantity: number;
  isManual?: boolean;
}

export function PosView({ lang }: { lang: 'en' | 'ta' }) {
  // Mode state: Offline or Online
  const [posMode, setPosMode] = useState<'offline' | 'online'>('offline');

  // Catalog State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Barcode Query
  const [barcodeQuery, setBarcodeQuery] = useState('');

  // Customer Details Form State (Two-Way Synced between Left Card & Right Current Order)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerBirthday, setCustomerBirthday] = useState('');
  const [billingDate, setBillingDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Cart & Pricing State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [manualDiscount, setManualDiscount] = useState<string>('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState<string>('0');

  // Payment Mode & Tender
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'qr' | 'split'>('card');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [splitDetails, setSplitDetails] = useState<SplitDetailsInput | undefined>(undefined);

  // Modals state
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<ReceiptOrder | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const { playScanBeep } = useAudioAlarm();

  // Load Catalog and Categories
  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/categories'),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch (err) {
      console.error('Failed to fetch catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Raw cart subtotal
  const rawSubtotalPaise = cart.reduce((acc, it) => acc + it.priceInPaise * it.quantity, 0);

  // Calculate manual discount in paise
  const rawDiscountNum = Number(manualDiscount || 0);
  let manualDiscountPaise = 0;
  if (discountType === 'percent') {
    manualDiscountPaise = Math.round((rawSubtotalPaise * rawDiscountNum) / 100);
  } else {
    manualDiscountPaise = Math.round(rawDiscountNum * 100);
  }

  // Coupon discount in paise
  const couponDiscountPaise = appliedCoupon
    ? Math.round((rawSubtotalPaise * (appliedCoupon.percentage || 0)) / 100)
    : 0;

  const deliveryChargePaise = Math.round(Number(deliveryCharge || 0) * 100);

  // Calculate live financial summary using business rules
  const totals = calculateGstAndTotals(
    cart.map((it) => ({ priceInPaise: it.priceInPaise, quantity: it.quantity })),
    couponDiscountPaise,
    manualDiscountPaise,
    gstEnabled,
    deliveryChargePaise
  );

  // Auto-fill amount received when grand total changes or payment mode changes
  useEffect(() => {
    if (totals.grandTotalInPaise > 0) {
      setAmountReceived((totals.grandTotalInPaise / 100).toFixed(2));
    } else {
      setAmountReceived('0.00');
    }
  }, [totals.grandTotalInPaise, paymentMode]);

  // Add product or variant to cart
  const handleAddToCart = (product: any, variant?: any) => {
    playScanBeep();
    const targetPrice = variant ? variant.priceInPaise : product.priceInPaise;
    const targetId = variant ? `v_${variant.id}` : `p_${product.id}`;
    const name = variant
      ? `${product.name} – ${variant.sizeLabel || variant.variantName}`
      : product.name;

    setCart((prev) => {
      const existingIdx = prev.findIndex((it) => it.id === targetId);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          id: targetId,
          productId: product.id,
          variantId: variant ? variant.id : null,
          name,
          sizeLabel: variant?.sizeLabel || null,
          priceInPaise: targetPrice,
          quantity: 1,
          isManual: false,
        },
      ];
    });
  };

  // Add custom manual item
  const handleAddCustomItem = (custom: { name: string; priceInPaise: number; quantity: number }) => {
    playScanBeep();
    const id = `custom_${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        id,
        productId: null,
        variantId: null,
        name: custom.name,
        priceInPaise: custom.priceInPaise,
        quantity: custom.quantity,
        isManual: true,
      },
    ]);
  };

  // Stepper adjustments
  const handleUpdateQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id === cartId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (cartId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== cartId));
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerBirthday('');
    setBillingDate('');
    setRemarks('');
    setCouponCode('');
    setAppliedCoupon(null);
    setManualDiscount('');
    setSplitDetails(undefined);
    setPaymentMode('card');
    setAmountReceived('0.00');
  };

  // Barcode Lookup Trigger (Enter key)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeQuery.trim().toUpperCase();
    if (!code) return;

    let found = false;
    for (const p of products) {
      if (p.barcode === code) {
        handleAddToCart(p);
        found = true;
        break;
      }
      if (p.variants?.length) {
        const v = p.variants.find((item: any) => item.barcode === code);
        if (v) {
          handleAddToCart(p, v);
          found = true;
          break;
        }
      }
    }

    if (!found) {
      showToast(`Barcode '${code}' not found in catalog.`, 'error');
    } else {
      showToast(`Item added from barcode scan`, 'success');
    }

    setBarcodeQuery('');
  };

  // Apply Coupon Code
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await fetch(`/api/coupons?code=${encodeURIComponent(couponCode.trim())}`);
      const data = await res.json();
      if (!res.ok || !data) {
        showToast('Invalid or inactive coupon code.', 'error');
        return;
      }
      setAppliedCoupon(data);
      showToast(`Coupon ${data.code} applied (${data.percentage}% off)`, 'success');
    } catch {
      showToast('Could not verify coupon code.', 'error');
    }
  };

  // Submit Order Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty. Add items before completing sale.', 'error');
      return;
    }
    setCheckoutLoading(true);

    try {
      const payload = {
        customerName: customerName.trim() || null,
        phone: customerPhone.trim() || null,
        birthday: customerBirthday || null,
        billingDate: billingDate || null,
        remarks: remarks.trim() || null,
        posMode,
        items: cart.map((it) => ({
          productId: it.productId || null,
          variantId: it.variantId || null,
          productName: it.name,
          quantity: it.quantity,
          isManual: Boolean(it.isManual),
          manualPriceInPaise: it.isManual ? it.priceInPaise : undefined,
        })),
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        manualDiscountInPaise: manualDiscountPaise,
        gstEnabled,
        paymentMode,
        splitDetails: paymentMode === 'split' ? splitDetails : null,
      };

      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Checkout failed', 'error');
        setCheckoutLoading(false);
        return;
      }

      // Order Success! Setup completed order for thermal receipt print & WhatsApp
      const receiptData: ReceiptOrder = {
        invoiceNo: data.invoiceNo,
        customerName: customerName.trim() || null,
        phone: customerPhone.trim() || null,
        createdAt: data.createdAt,
        cashierName: 'Admin',
        subtotalInPaise: totals.baseSubtotalInPaise,
        couponCode: appliedCoupon?.code || null,
        couponDiscountPaise: totals.couponDiscountInPaise,
        manualDiscountPaise: totals.manualDiscountInPaise,
        totalGstPaise: totals.totalGstInPaise,
        gstEnabled,
        deliveryChargePaise,
        totalInPaise: totals.grandTotalInPaise,
        paymentMode,
        splitDetails,
        items: cart.map((it) => ({
          productName: it.name,
          quantity: it.quantity,
          unitPrice: it.priceInPaise,
          lineTotal: it.priceInPaise * it.quantity,
        })),
      };

      setCompletedOrder(receiptData);
      handleClearCart();
      fetchCatalog(); // refresh stock numbers
    } catch (err: any) {
      showToast(err.message || 'Network error during checkout', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto select-none bg-[#FAF7F2] p-4 sm:p-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 p-3.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER: POS Billing Panel + Offline/Online Toggle (Matches Image 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-[#C9B79C] rounded-full shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight font-heading">
              POS Billing Panel
            </h1>
            <p className="text-xs text-black/55 mt-0.5 font-medium">
              Quick Invoice generator & database synced checkout
            </p>
          </div>
        </div>

        {/* Offline / Online Mode Toggle Pills */}
        <div className="flex items-center self-start sm:self-auto bg-black/5 p-1 rounded-2xl border border-black/10">
          <button
            type="button"
            onClick={() => setPosMode('offline')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
              posMode === 'offline'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'bg-transparent text-black/60 hover:text-black'
            }`}
          >
            OFFLINE
          </button>
          <button
            type="button"
            onClick={() => setPosMode('online')}
            className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
              posMode === 'online'
                ? 'bg-[#111111] text-white shadow-sm'
                : 'bg-transparent text-black/60 hover:text-black'
            }`}
          >
            ONLINE
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT (Matches Image 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
        {/* LEFT COLUMN: Customer Details + Order Items (approx 60-65% width) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
          {/* CARD 1: Customer Details (Matches Image 1) */}
          <div className="bg-white rounded-3xl border border-black/10 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 text-black">
              <User size={18} className="text-[#7A6A4F]" />
              <h2 className="text-sm sm:text-base font-black tracking-tight">Customer Details</h2>
            </div>

            <div className="space-y-4">
              {/* Row 1: Customer Name & Mobile Number (WhatsApp) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/75 mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3.5 py-2.5 bg-white border border-black/15 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/75 mb-1.5">
                    Mobile Number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter WhatsApp number"
                    className="w-full px-3.5 py-2.5 bg-white border border-black/15 rounded-xl text-xs sm:text-sm font-mono font-medium outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Birthday (Optional) & Billing Date (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/75 mb-1.5">
                    Birthday (Optional)
                  </label>
                  <input
                    type="date"
                    value={customerBirthday}
                    onChange={(e) => setCustomerBirthday(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-black/15 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-black/45 mt-1 font-medium">
                    Used to send birthday offers on WhatsApp
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/75 mb-1.5">
                    Billing Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={billingDate}
                    onChange={(e) => setBillingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-black/15 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-black/45 mt-1 font-medium">
                    Leave blank to use today's date & time
                  </p>
                </div>
              </div>

              {/* Row 3: Remarks (Internal) */}
              <div>
                <label className="block text-xs font-bold text-black/75 mb-1.5">
                  Remarks (Internal)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full px-3.5 py-2.5 bg-white border border-black/15 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* CARD 2: Order Items (Matches Image 1) */}
          <div className="bg-white rounded-3xl border border-black/10 p-5 sm:p-6 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4 text-black">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[#7A6A4F]" />
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  Order Items ({cart.length})
                </h2>
              </div>

              {/* Quick Custom Item Button */}
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="px-3 py-1.5 rounded-xl bg-black/5 hover:bg-black/10 text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle size={14} className="text-[#7A6A4F]" />
                <span>+ Custom Item</span>
              </button>
            </div>

            {/* Barcode / Query Search Box with Camera Icon */}
            <form onSubmit={handleBarcodeSubmit} className="relative mb-3.5">
              <Scan size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                placeholder="Scan barcode with machine, camera, or type code..."
                className="w-full pl-11 pr-12 py-3 bg-white border border-black/20 rounded-2xl text-xs sm:text-sm font-mono outline-none focus:border-black focus:ring-1 focus:ring-black/10 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowCameraScanner(!showCameraScanner)}
                title="Toggle Camera Scanner"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-black/50 hover:text-black hover:bg-black/5 transition-colors"
              >
                <Camera size={18} />
              </button>
            </form>

            {/* Mock Camera scanner visual helper if toggled */}
            {showCameraScanner && (
              <div className="mb-4 p-4 rounded-2xl bg-[#111111] text-white flex flex-col items-center justify-center text-center animate-in fade-in">
                <Camera size={32} className="text-[#C9B79C] mb-2 animate-pulse" />
                <p className="text-xs font-bold text-white">Camera Barcode Scanner Active</p>
                <p className="text-[11px] text-white/60 mt-0.5">
                  Point camera at garment barcode tag or enter code above.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(false)}
                  className="mt-2 text-xs text-[#C9B79C] underline font-bold"
                >
                  Close Camera
                </button>
              </div>
            )}

            {/* Buttons Row: Clear Order & Search Catalog (Matches Image 1) */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="px-3.5 py-2 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-black text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 size={13} className="text-black/60" />
                <span>Clear Order</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#262626] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Search size={14} />
                <span>Search Catalog</span>
              </button>
            </div>

            {/* Items Table Headers (Matches Image 1) */}
            <div className="grid grid-cols-12 text-[11px] font-bold text-black/45 border-b border-black/10 pb-2.5 mb-2 px-2">
              <div className="col-span-7">Item Name / Description</div>
              <div className="col-span-2 text-right">Price (₹)</div>
              <div className="col-span-3 text-right">Qty</div>
            </div>

            {/* Items Table Content */}
            <div className="min-h-[200px] max-h-[360px] overflow-y-auto pr-1 space-y-2">
              {cart.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-black/35">
                  <ShoppingBag size={48} strokeWidth={1.2} className="mb-2 text-black/20" />
                  <p className="text-xs font-bold text-black/50">No items added yet</p>
                  <p className="text-[11px] text-black/40 mt-0.5">
                    Scan barcode or click Search Catalog to add products
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center p-2.5 rounded-2xl bg-[#FAF7F2] border border-black/10 hover:border-black/20 transition-all"
                  >
                    <div className="col-span-7 min-w-0 pr-2">
                      <div className="text-xs font-bold text-black truncate">{item.name}</div>
                      {item.isManual && (
                        <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-1 rounded">
                          CUSTOM
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="text-xs font-mono font-black text-black">
                        ₹{(item.priceInPaise / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-black/15 hover:bg-black/5 flex items-center justify-center text-black transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs font-black font-mono text-black">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-black/15 hover:bg-black/5 flex items-center justify-center text-black transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="ml-1 text-black/35 hover:text-rose-600 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Current Order Card (Matches Image 1) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <div className="bg-white rounded-3xl border border-black/10 shadow-lg overflow-hidden flex flex-col">
            {/* Dark Top Header with Mode Badge */}
            <div className="bg-[#111111] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-[#C9B79C]" />
                <h3 className="text-sm font-black tracking-tight font-heading">Current Order</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/90 flex items-center gap-1.5 font-mono">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    posMode === 'offline' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                {posMode === 'offline' ? '• OFFLINE (POS)' : '• ONLINE (SYNCED)'}
              </span>
            </div>

            {/* Current Order Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* SOURCE Row */}
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-black/45">
                  SOURCE
                </span>
                <span className="px-3 py-0.5 rounded-md text-[10px] font-mono font-black bg-black/5 text-black border border-black/10">
                  {posMode.toUpperCase()}
                </span>
              </div>

              {/* CUSTOMER NAME and WHATSAPP NUMBER (Two-way live synced with left card) */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black/50 mb-1">
                    CUSTOMER NAME
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs outline-none focus:border-black font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-black/50 mb-1">
                    WHATSAPP NUMBER
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter WhatsApp number"
                    className="w-full px-3 py-2 bg-white border border-black/15 rounded-xl text-xs font-mono outline-none focus:border-black font-medium"
                  />
                </div>
              </div>

              {/* Items summary list inside Current Order if items exist */}
              {cart.length > 0 && (
                <div className="py-2 px-3 rounded-2xl bg-[#FAF7F2] border border-black/5 max-h-32 overflow-y-auto space-y-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs py-0.5">
                      <span className="text-black/80 font-medium truncate pr-2">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="font-bold text-black font-mono shrink-0">
                        ₹{((item.priceInPaise * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* COUPON CODE */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-black/50 mb-1">
                  COUPON CODE
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="ENTER CODE"
                    className="flex-1 px-3 py-2 bg-white border border-black/15 rounded-xl text-xs uppercase font-mono font-bold outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 bg-[#525252] hover:bg-[#262626] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* MANUAL DISCOUNT */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-black/50 mb-1">
                  MANUAL DISCOUNT
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
                    className="px-2.5 py-2 bg-white border border-black/15 rounded-xl text-xs font-bold outline-none focus:border-black"
                  >
                    <option value="fixed">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualDiscount}
                    onChange={(e) => setManualDiscount(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 bg-white border border-black/15 rounded-xl text-xs font-mono outline-none focus:border-black"
                  />
                  <span className="text-xs font-mono font-black text-black/70 min-w-[20px] text-right">
                    {manualDiscountPaise > 0
                      ? `₹${(manualDiscountPaise / 100).toFixed(2)}`
                      : '0'}
                  </span>
                </div>
              </div>

              {/* Enable GST on Bill Toggle (Matches Image 1) */}
              <div className="flex items-center justify-between py-1 border-t border-black/5">
                <span className="text-xs font-bold text-black/75">Enable GST on Bill</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-black/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#111111]" />
                </label>
              </div>

              {/* Financial Totals Breakdown (Matches Image 1) */}
              <div className="pt-2 border-t border-black/5 space-y-1.5">
                <div className="flex justify-between text-black/70">
                  <span>
                    Subtotal ({cart.reduce((acc, it) => acc + it.quantity, 0)} Items)
                  </span>
                  <span className="font-mono font-bold">
                    ₹{(totals.baseSubtotalInPaise / 100).toFixed(2)}
                  </span>
                </div>

                {totals.couponDiscountInPaise > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Coupon Discount:</span>
                    <span className="font-mono">
                      -₹{(totals.couponDiscountInPaise / 100).toFixed(2)}
                    </span>
                  </div>
                )}

                {totals.manualDiscountInPaise > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Manual Discount:</span>
                    <span className="font-mono">
                      -₹{(totals.manualDiscountInPaise / 100).toFixed(2)}
                    </span>
                  </div>
                )}

                {totals.totalGstInPaise > 0 && (
                  <div className="flex justify-between text-black/60">
                    <span>GST (5% SGST + CGST):</span>
                    <span className="font-mono font-bold">
                      +₹{(totals.totalGstInPaise / 100).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-black/70 items-center">
                  <span>Delivery</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(e.target.value)}
                    className="w-16 px-1.5 py-0.5 text-right bg-white border border-black/15 rounded-md font-mono text-xs outline-none"
                  />
                </div>

                <div className="flex justify-between text-base font-black text-black pt-2 border-t border-black/10">
                  <span className="tracking-tight">GRAND TOTAL</span>
                  <span className="font-mono text-lg">
                    ₹{(totals.grandTotalInPaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* PAYMENT MODE Selector (Matches Image 1) */}
              <div className="pt-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-black/50 mb-1.5">
                  PAYMENT MODE
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['CASH', 'QR', 'CARD', 'SPLIT'] as const).map((m) => {
                    const modeVal = m.toLowerCase() as 'cash' | 'qr' | 'card' | 'split';
                    const isActive = paymentMode === modeVal;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPaymentMode(modeVal);
                          if (modeVal === 'split') {
                            setShowSplitModal(true);
                          }
                        }}
                        className={`py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#111111] text-white shadow-xs'
                            : 'bg-white text-black/75 border border-black/15 hover:bg-black/5'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Amount Received Field (Matches Image 1) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-black/50 mb-1">
                  {paymentMode.toUpperCase()} — AMOUNT RECEIVED (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-black/15 rounded-xl text-xs font-mono font-bold outline-none focus:border-black"
                />
              </div>

              {/* Action Buttons (Matches Image 1) */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(true)}
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-2xl border border-black bg-white hover:bg-black/5 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  SAVE AS DEPOSIT ORDER
                </button>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || checkoutLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#111111] hover:bg-[#262626] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Printer size={15} />
                      <span>COMPLETE SALE</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-black/45 leading-relaxed font-medium">
                  Deposit orders do not count as revenue until the remaining payment is received.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Search Catalog Modal (Image 2) */}
      <SearchCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        products={products}
        categories={categories}
        onAddToCart={handleAddToCart}
        lang={lang}
      />

      {/* MODAL 2: Deposit Order Modal */}
      <DepositOrderModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        cart={cart}
        totalInPaise={totals.grandTotalInPaise}
        customerName={customerName}
        customerPhone={customerPhone}
        onSuccess={(ref) => {
          showToast(`Deposit order ${ref} created successfully!`, 'success');
          handleClearCart();
        }}
      />

      {/* MODAL 3: Custom Item Modal */}
      <CustomItemModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdd={handleAddCustomItem}
      />

      {/* MODAL 4: Split Payment Modal */}
      <SplitPaymentModal
        isOpen={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        totalInPaise={totals.grandTotalInPaise}
        initialSplit={splitDetails}
        onConfirm={(split) => {
          setSplitDetails(split);
          setPaymentMode('split');
        }}
      />

      {/* MODAL 5: Checkout Success & Thermal Receipt Modal */}
      {completedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-black flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 mb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={20} />
                <h3 className="text-base font-black">Order Completed Successfully!</h3>
              </div>
              <button
                data-testid="receipt-close"
                onClick={() => setCompletedOrder(null)}
                className="p-1 rounded-lg text-black/50 hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 border border-black/10 rounded-2xl p-2 bg-[#FAF7F2]">
              <ThermalReceipt order={completedOrder} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-[#111111] hover:bg-[#262626] text-[#C9B79C] text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>

              {completedOrder.phone ? (
                <a
                  href={`https://wa.me/91${completedOrder.phone}?text=${encodeURIComponent(
                    `Hello ${completedOrder.customerName || 'Valued Customer'}, thank you for shopping at Swagyard! Your bill #${completedOrder.invoiceNo} for ₹${(completedOrder.totalInPaise / 100).toFixed(2)} is ready.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md text-center"
                >
                  <Share2 size={15} />
                  <span>WhatsApp Share</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setCompletedOrder(null)}
                  className="py-2.5 px-3 rounded-xl bg-black/10 hover:bg-black/20 text-black text-xs font-bold text-center"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
