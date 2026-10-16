export interface CouponFields {
  percentage: number;
  minOrderPaise: number;
  usageLimit: number | null;
  expiryDate: string | null;
}

/**
 * Validates the editable coupon fields sent by the Coupons screen.
 * Amounts arrive in rupees (`minOrderAmount`) and are stored in paise.
 */
export function parseCouponInput(body: any): { data: CouponFields } | { error: string } {
  const percentage = Number(body.percentage);
  if (!(percentage > 0 && percentage <= 100)) {
    return { error: 'Discount must be between 1% and 100%' };
  }
  const minOrder = Number(body.minOrderAmount || 0);
  if (!Number.isFinite(minOrder) || minOrder < 0) {
    return { error: 'Min order must be 0 or more' };
  }
  const usageLimit = body.usageLimit ? Number(body.usageLimit) : null;
  if (usageLimit !== null && !(Number.isInteger(usageLimit) && usageLimit >= 1)) {
    return { error: 'Usage limit must be a whole number of 1 or more' };
  }
  return {
    data: {
      percentage: Math.floor(percentage),
      minOrderPaise: Math.round(minOrder * 100),
      usageLimit,
      expiryDate: body.expiryDate ? new Date(body.expiryDate).toISOString() : null,
    },
  };
}
