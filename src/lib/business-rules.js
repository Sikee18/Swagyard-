"use strict";
/**
 * Swagyard POS Business Rules & Calculation Engine
 *
 * Implements strict integer paise financial calculations, commercial rounding,
 * GST SGST/CGST taxation, split-payment validation, and advance order state transitions.
 * ALL financial values are stored and computed in integer paise (1 Rupee = 100 paise).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGstAndTotals = calculateGstAndTotals;
exports.validateSplitPayment = validateSplitPayment;
exports.generateSequentialInvoiceNumber = generateSequentialInvoiceNumber;
exports.validateAndCalculateCoupon = validateAndCalculateCoupon;
exports.transitionAdvanceOrderStatus = transitionAdvanceOrderStatus;
/**
 * Rule A: GST & Commercial Rounding Calculation
 * Recomputes all line items, applies discounts, taxes, and nearest-rupee rounding.
 */
function calculateGstAndTotals(items, couponDiscountInPaise, manualDiscountInPaise, gstEnabled, shippingInPaise) {
    if (couponDiscountInPaise === void 0) { couponDiscountInPaise = 0; }
    if (manualDiscountInPaise === void 0) { manualDiscountInPaise = 0; }
    if (gstEnabled === void 0) { gstEnabled = false; }
    if (shippingInPaise === void 0) { shippingInPaise = 0; }
    // 1. Calculate Base Subtotal
    var baseSubtotal = 0;
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        var qty = Math.max(1, Math.floor(item.quantity || 1));
        var price = Math.max(0, Math.floor(item.priceInPaise || 0));
        baseSubtotal += price * qty;
    }
    // 2. Apply Discounts (Coupon first, then Manual)
    var safeCouponDiscount = Math.max(0, Math.min(baseSubtotal, Math.floor(couponDiscountInPaise || 0)));
    var afterCoupon = baseSubtotal - safeCouponDiscount;
    var safeManualDiscount = Math.max(0, Math.min(afterCoupon, Math.floor(manualDiscountInPaise || 0)));
    var discountedSubtotal = Math.max(0, afterCoupon - safeManualDiscount);
    // 3. Tax / GST Calculation (5% total: 2.5% CGST + 2.5% SGST)
    var cgst = 0;
    var sgst = 0;
    var totalGst = 0;
    if (gstEnabled) {
        cgst = Math.round(discountedSubtotal * 0.025);
        sgst = Math.round(discountedSubtotal * 0.025);
        totalGst = cgst + sgst;
    }
    // 4. Grand Total & Nearest-Rupee Rounding
    var safeShipping = Math.max(0, Math.floor(shippingInPaise || 0));
    var unroundedTotal = discountedSubtotal + totalGst + safeShipping;
    // Standard commercial rounding to nearest 100 paise (₹1.00)
    var grandTotal = Math.round(unroundedTotal / 100) * 100;
    var roundOffDifference = grandTotal - unroundedTotal;
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
function validateSplitPayment(totalInPaise, split) {
    var cash = Math.max(0, Math.floor(split.cashInPaise || 0));
    var card = Math.max(0, Math.floor(split.cardInPaise || 0));
    var qr = Math.max(0, Math.floor(split.qrInPaise || 0));
    var other = Math.max(0, Math.floor(split.otherInPaise || 0));
    var sum = cash + card + qr + other;
    var diff = sum - totalInPaise;
    if (diff === 0) {
        return { valid: true, differenceInPaise: 0 };
    }
    if (diff < 0) {
        return {
            valid: false,
            differenceInPaise: diff,
            error: "Split tender is short by \u20B9".concat((Math.abs(diff) / 100).toFixed(2), ". Amounts must equal the total."),
        };
    }
    return {
        valid: false,
        differenceInPaise: diff,
        error: "Split tender exceeds total by \u20B9".concat((diff / 100).toFixed(2), ". Amounts must equal the total."),
    };
}
/**
 * Rule C: Sequential Invoice Number Generator
 */
function generateSequentialInvoiceNumber(dateStr, sequenceNumber) {
    var padded = String(Math.max(1, Math.floor(sequenceNumber))).padStart(4, '0');
    return "SWAG-".concat(dateStr, "-").concat(padded);
}
/**
 * Rule D: Promotional Coupon Validator
 */
function validateAndCalculateCoupon(coupon, subtotalInPaise) {
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
    var minOrder = coupon.minOrderPaise || 0;
    if (subtotalInPaise < minOrder) {
        return {
            valid: false,
            discountInPaise: 0,
            error: "Minimum order value of \u20B9".concat((minOrder / 100).toFixed(2), " required for this coupon."),
        };
    }
    var pct = Math.max(1, Math.min(100, Math.floor(coupon.percentage || 0)));
    var discount = Math.round(subtotalInPaise * (pct / 100));
    return {
        valid: true,
        discountInPaise: discount,
    };
}
/**
 * Rule E: Advance Order Milestone State Machine
 */
function transitionAdvanceOrderStatus(currentStatus, targetStatus, balanceRemainingInPaise) {
    var allowedTransitions = {
        pending_deposit: ['deposit_received', 'cancelled'],
        deposit_received: ['customer_contacted', 'ready_for_delivery', 'cancelled'],
        customer_contacted: ['ready_for_delivery', 'cancelled'],
        ready_for_delivery: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
    };
    var validNext = allowedTransitions[currentStatus] || [];
    if (!validNext.includes(targetStatus)) {
        return {
            allowed: false,
            error: "Cannot transition advance order from '".concat(currentStatus, "' to '").concat(targetStatus, "'."),
        };
    }
    if (targetStatus === 'completed' && balanceRemainingInPaise > 0) {
        return {
            allowed: false,
            error: "Cannot complete advance order with unpaid balance of \u20B9".concat((balanceRemainingInPaise / 100).toFixed(2), "."),
        };
    }
    return { allowed: true };
}
