const assert = require('assert');

// Test suite for Swagyard POS Business Rules
function runTests() {
  console.log('==================================================');
  console.log('RUNNING BUSINESS RULES & FINANCIAL ENGINE UNIT TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function it(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error('       ', err.message);
      failed++;
    }
  }

  // --- Rule A: calculateGstAndTotals ---
  const { calculateGstAndTotals } = require('../src/lib/business-rules.js');

  it('calculates single item without tax or discount correctly', () => {
    const res = calculateGstAndTotals([{ priceInPaise: 99900, quantity: 1 }]);
    assert.strictEqual(res.baseSubtotalInPaise, 99900);
    assert.strictEqual(res.discountedSubtotalInPaise, 99900);
    assert.strictEqual(res.totalGstInPaise, 0);
    assert.strictEqual(res.grandTotalInPaise, 99900);
  });

  it('calculates multi-item cart with coupon and manual discount', () => {
    // 2 x 500.00 = 1,000.00 (100,000 paise)
    // Coupon = 100.00 (10,000 paise) -> Subtotal = 90,000 paise
    // Manual discount = 50.00 (5,000 paise) -> Subtotal = 85,000 paise
    const res = calculateGstAndTotals(
      [{ priceInPaise: 50000, quantity: 2 }],
      10000, // coupon
      5000,  // manual
      false
    );
    assert.strictEqual(res.baseSubtotalInPaise, 100000);
    assert.strictEqual(res.couponDiscountInPaise, 10000);
    assert.strictEqual(res.manualDiscountInPaise, 5000);
    assert.strictEqual(res.discountedSubtotalInPaise, 85000);
    assert.strictEqual(res.grandTotalInPaise, 85000);
  });

  it('computes 5% GST (2.5% CGST + 2.5% SGST) and commercial rounding', () => {
    // 1 shirt @ ₹799.00 (79,900 paise)
    // 10% coupon = 7,990 paise -> Discounted = 71,910 paise
    // CGST = Math.round(71910 * 0.025) = 1,798 paise
    // SGST = Math.round(71910 * 0.025) = 1,798 paise
    // Total GST = 3,596 paise
    // Unrounded = 75,506 paise (₹755.06)
    // Nearest rupee rounded = 75,500 paise (₹755.00)
    const res = calculateGstAndTotals(
      [{ priceInPaise: 79900, quantity: 1 }],
      7990, // 10% coupon
      0,
      true // GST enabled
    );
    assert.strictEqual(res.cgstInPaise, 1798);
    assert.strictEqual(res.sgstInPaise, 1798);
    assert.strictEqual(res.totalGstInPaise, 3596);
    assert.strictEqual(res.unroundedGrandTotalInPaise, 75506);
    assert.strictEqual(res.grandTotalInPaise, 75500);
    assert.strictEqual(res.roundOffDifferenceInPaise, -6);
  });

  it('guards against negative subtotal when discounts exceed price', () => {
    const res = calculateGstAndTotals(
      [{ priceInPaise: 20000, quantity: 1 }],
      30000, // Coupon exceeds price
      10000
    );
    assert.strictEqual(res.baseSubtotalInPaise, 20000);
    assert.strictEqual(res.couponDiscountInPaise, 20000); // capped at subtotal
    assert.strictEqual(res.manualDiscountInPaise, 0);
    assert.strictEqual(res.discountedSubtotalInPaise, 0);
    assert.strictEqual(res.grandTotalInPaise, 0);
  });

  // --- Rule B: validateSplitPayment ---
  const { validateSplitPayment } = require('../src/lib/business-rules.js');

  it('accepts valid split tender matching total in paise exactly', () => {
    const check = validateSplitPayment(150000, {
      cashInPaise: 50000,
      cardInPaise: 50000,
      qrInPaise: 50000,
      otherInPaise: 0
    });
    assert.strictEqual(check.valid, true);
    assert.strictEqual(check.differenceInPaise, 0);
  });

  it('rejects split tender when sum is short by even 1 Rupee', () => {
    const check = validateSplitPayment(150000, {
      cashInPaise: 50000,
      cardInPaise: 40000,
      qrInPaise: 59000
    });
    assert.strictEqual(check.valid, false);
    assert.strictEqual(check.differenceInPaise, -1000);
    assert.match(check.error, /short by/);
  });

  it('rejects split tender when sum exceeds bill total', () => {
    const check = validateSplitPayment(100000, {
      cashInPaise: 70000,
      qrInPaise: 40000
    });
    assert.strictEqual(check.valid, false);
    assert.strictEqual(check.differenceInPaise, 10000);
    assert.match(check.error, /exceeds total/);
  });

  // --- Rule C: generateSequentialInvoiceNumber ---
  const { generateSequentialInvoiceNumber } = require('../src/lib/business-rules.js');

  it('generates properly formatted SWAG-YYYYMMDD-XXXX invoice numbers', () => {
    const inv1 = generateSequentialInvoiceNumber('20261016', 1);
    assert.strictEqual(inv1, 'SWAG-20261016-0001');

    const inv2 = generateSequentialInvoiceNumber('20261016', 42);
    assert.strictEqual(inv2, 'SWAG-20261016-0042');

    const inv3 = generateSequentialInvoiceNumber('20261016', 1234);
    assert.strictEqual(inv3, 'SWAG-20261016-1234');
  });

  // --- Rule D: validateAndCalculateCoupon ---
  const { validateAndCalculateCoupon } = require('../src/lib/business-rules.js');

  it('validates active coupon and computes percentage discount in paise', () => {
    const coupon = { code: 'SWAG20', percentage: 20, minOrderPaise: 50000, isActive: true };
    const res = validateAndCalculateCoupon(coupon, 100000);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.discountInPaise, 20000);
  });

  it('rejects coupon when minimum order requirement is not met', () => {
    const coupon = { code: 'SWAG20', percentage: 20, minOrderPaise: 150000, isActive: true };
    const res = validateAndCalculateCoupon(coupon, 100000);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Minimum order value/);
  });

  it('rejects expired coupon', () => {
    const coupon = {
      code: 'OLD20',
      percentage: 20,
      minOrderPaise: 0,
      isActive: true,
      expiryDate: new Date('2020-01-01')
    };
    const res = validateAndCalculateCoupon(coupon, 50000);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /expired/);
  });

  it('rejects coupon that has reached its usage limit', () => {
    const coupon = { code: 'LIMIT5', percentage: 5, minOrderPaise: 0, isActive: true, usageLimit: 3, usageCount: 3 };
    const res = validateAndCalculateCoupon(coupon, 50000);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /usage limit/);
    assert.strictEqual(validateAndCalculateCoupon({ ...coupon, usageCount: 2 }, 50000).valid, true);
  });

  // --- Rule E: transitionAdvanceOrderStatus ---
  const { transitionAdvanceOrderStatus } = require('../src/lib/business-rules.js');

  it('allows valid progressive transitions', () => {
    assert.strictEqual(transitionAdvanceOrderStatus('pending_deposit', 'deposit_received', 50000).allowed, true);
    assert.strictEqual(transitionAdvanceOrderStatus('deposit_received', 'customer_contacted', 50000).allowed, true);
    assert.strictEqual(transitionAdvanceOrderStatus('customer_contacted', 'ready_for_delivery', 50000).allowed, true);
  });

  it('blocks completing advance order with remaining balance', () => {
    const res = transitionAdvanceOrderStatus('ready_for_delivery', 'completed', 50000);
    assert.strictEqual(res.allowed, false);
    assert.match(res.error, /unpaid balance/);
  });

  it('allows completing advance order when balance is fully paid (0 paise)', () => {
    const res = transitionAdvanceOrderStatus('ready_for_delivery', 'completed', 0);
    assert.strictEqual(res.allowed, true);
  });

  console.log(`\nTEST RESULTS: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

// Compile typescript or run directly
try {
  runTests();
} catch (e) {
  // If typescript module requires transpiling
  const ts = require('typescript');
  const fs = require('fs');
  const path = require('path');
  const tsCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'business-rules.ts'), 'utf8');
  const jsCode = ts.transpileModule(tsCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'business-rules.js'), jsCode);
  runTests();
}
