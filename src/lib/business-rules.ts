/**
 * Swagyard POS Business Rules & Calculation Engine
 * 
 * Implements strict integer paise financial calculations, commercial rounding,
 * GST SGST/CGST taxation, split-payment validation, and advance order state transitions.
 * ALL financial values are stored and computed in integer paise (1 Rupee = 100 paise).
 */

export interface CartItemInput {
  priceInPaise: number;
  quantity: number;
  name?: string;
  variantId?: number | null;
  productId?: number | null;
  isManual?: boolean;
}

export interface SplitDetailsInput {
  cashInPaise?: number;
  cardInPaise?: number;
  qrInPaise?: number;
  otherInPaise?: number;
}

export interface CalculationResult {
  baseSubtotalInPaise: number;
  couponDiscountInPaise: number;
  manualDiscountInPaise: number;
  discountedSubtotalInPaise: number;
  cgstInPaise: number;
  sgstInPaise: number;
  totalGstInPaise: number;
  shippingInPaise: number;
  unroundedGrandTotalInPaise: number;
  grandTotalInPaise: number;
  roundOffDifferenceInPaise: number;
}

/**
 * Rule A: GST & Commercial Rounding Calculation
 * Recomputes all line items, applies discounts, taxes, and nearest-rupee rounding.
 */
export function calculateGstAndTotals(
  items: CartItemInput[],
  couponDiscountInPaise: number = 0,
  manualDiscountInPaise: number = 0,
  gstEnabled: boolean = false,
  shippingInPaise: number = 0
): CalculationResult {
  // 1. Calculate Base Subtotal
  let baseSubtotal = 0;
  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const price = Math.max(0, Math.floor(item.priceInPaise || 0));
    baseSubtotal += price * qty;
  }

  // 2. Apply Discounts (Coupon first, then Manual)
  const safeCouponDiscount = Math.max(0, Math.min(baseSubtotal, Math.floor(couponDiscountInPaise || 0)));
  const afterCoupon = baseSubtotal - safeCouponDiscount;
  const safeManualDiscount = Math.max(0, Math.min(afterCoupon, Math.floor(manualDiscountInPaise || 0)));
  const discountedSubtotal = Math.max(0, afterCoupon - safeManualDiscount);

  // 3. Tax / GST Calculation (5% total: 2.5% CGST + 2.5% SGST)
  let cgst = 0;
  let sgst = 0;
  let totalGst = 0;

  if (gstEnabled) {
    cgst = Math.round(discountedSubtotal * 0.025);
    sgst = Math.round(discountedSubtotal * 0.025);
    totalGst = cgst + sgst;
  }

  // 4. Grand Total & Nearest-Rupee Rounding
  const safeShipping = Math.max(0, Math.floor(shippingInPaise || 0));
  const unroundedTotal = discountedSubtotal + totalGst + safeShipping;
  
  // Standard commercial rounding to nearest 100 paise (₹1.00)
  const grandTotal = Math.round(unroundedTotal / 100) * 100;
  const roundOffDifference = grandTotal - unroundedTotal;

  return {
    baseSubtotalInPaise: baseSubtotal,
    couponDiscountInPaise: safeCouponDiscount,
    manualDiscountInPaise: safeManualDiscount,
    discountedSubtotalInPaise: discountedSubtotal,
    cgstInPaise: cgst,
    sgstInPaise: sgst,
    totalGstInPaise: totalGst,
    shippingInPaise: safeShipping,
    unroundedGrandTotalInPaise: unroundedTotal,
    grandTotalInPaise: grandTotal,
    roundOffDifferenceInPaise: roundOffDifference,
  };
}

/**
 * Rule B: Split Tender Balance Validation
 * Validates that all split tender amounts are non-negative integers and match grand total exactly.
 */
export function validateSplitPayment(
  totalInPaise: number,
  split: SplitDetailsInput
): { valid: boolean; differenceInPaise: number; error?: string } {
  const cash = Math.max(0, Math.floor(split.cashInPaise || 0));
  const card = Math.max(0, Math.floor(split.cardInPaise || 0));
  const qr = Math.max(0, Math.floor(split.qrInPaise || 0));
  const other = Math.max(0, Math.floor(split.otherInPaise || 0));

  const sum = cash + card + qr + other;
  const diff = sum - totalInPaise;

  if (diff === 0) {
    return { valid: true, differenceInPaise: 0 };
  }

  if (diff < 0) {
    return {
      valid: false,
      differenceInPaise: diff,
      error: `Split tender is short by ₹${(Math.abs(diff) / 100).toFixed(2)}. Amounts must equal the total.`,
    };
  }

  return {
    valid: false,
    differenceInPaise: diff,
    error: `Split tender exceeds total by ₹${(diff / 100).toFixed(2)}. Amounts must equal the total.`,
  };
}

/**
 * Rule C: Sequential Invoice Number Generator
 */
export function generateSequentialInvoiceNumber(dateStr: string, sequenceNumber: number): string {
  const padded = String(Math.max(1, Math.floor(sequenceNumber))).padStart(4, '0');
  return `SWAG-${dateStr}-${padded}`;
}

/**
 * Rule D: Promotional Coupon Validator
 */
export function validateAndCalculateCoupon(
  coupon: {
    code: string;
    percentage: number;
    minOrderPaise?: number;
    isActive?: boolean;
    expiryDate?: string | Date | null;
    usageLimit?: number | null;
    usageCount?: number;
  } | null,
  subtotalInPaise: number
): { valid: boolean; discountInPaise: number; error?: string } {
  if (!coupon) {
    return { valid: false, discountInPaise: 0, error: 'Coupon code not found.' };
  }

  if (coupon.isActive === false) {
    return { valid: false, discountInPaise: 0, error: 'This coupon is inactive.' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { valid: false, discountInPaise: 0, error: 'This coupon has expired.' };
  }

  if (coupon.usageLimit != null && (coupon.usageCount || 0) >= coupon.usageLimit) {
    return { valid: false, discountInPaise: 0, error: 'This coupon has reached its usage limit.' };
  }

  const minOrder = coupon.minOrderPaise || 0;
  if (subtotalInPaise < minOrder) {
    return {
      valid: false,
      discountInPaise: 0,
      error: `Minimum order value of ₹${(minOrder / 100).toFixed(2)} required for this coupon.`,
    };
  }

  const pct = Math.max(1, Math.min(100, Math.floor(coupon.percentage || 0)));
  const discount = Math.round(subtotalInPaise * (pct / 100));

  return {
    valid: true,
    discountInPaise: discount,
  };
}

/**
 * Rule E: Advance Order Milestone State Machine
 */
export function transitionAdvanceOrderStatus(
  currentStatus: string,
  targetStatus: string,
  balanceRemainingInPaise: number
): { allowed: boolean; error?: string } {
  const allowedTransitions: Record<string, string[]> = {
    pending_deposit: ['deposit_received', 'cancelled'],
    deposit_received: ['customer_contacted', 'ready_for_delivery', 'cancelled'],
    customer_contacted: ['ready_for_delivery', 'cancelled'],
    ready_for_delivery: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const validNext = allowedTransitions[currentStatus] || [];
  if (!validNext.includes(targetStatus)) {
    return {
      allowed: false,
      error: `Cannot transition advance order from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  if (targetStatus === 'completed' && balanceRemainingInPaise > 0) {
    return {
      allowed: false,
      error: `Cannot complete advance order with unpaid balance of ₹${(balanceRemainingInPaise / 100).toFixed(2)}.`,
    };
  }

  return { allowed: true };
}
