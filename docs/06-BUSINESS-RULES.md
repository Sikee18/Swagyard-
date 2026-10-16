# 06 - Reverse-Engineered Business Rules Specification

Detailed documentation of all operational workflows, billing calculations, inventory rules, barcode logistics, and edge-case handling deduced from runtime verification and bundle analysis.

---

## 1. Billing & POS Workflow

### 1.1 Product Search & Catalog Filtering
- **Search Queries**: Supports searching across Product Name (English), Tamil Name (`name_ta`), SKU, and Category.
- **Debouncing**: Client updates results immediately upon input without debouncing latency.
- **Stock Guard**: Products with `stock_quantity <= 0` remain visible in catalog but show an "Out of Stock" badge.

### 1.2 Barcode Entry & Hardware Scanning
- **Barcode Formats**: Supports standard 12-digit (UPC) and 13-digit (EAN-13) formats, as well as alphanumeric internal store SKUs (e.g. `ZZTEST-PANT-32`).
- **Scanner Emulation**: Automatically detects rapid keystroke sequences ending in `Enter` as a hardware scanner event; looks up item via `barcodeService.lookupBarcode(code)` and appends to cart immediately.
- **Unrecognized Barcode**: If code is not found in database, triggers error toast: `Barcode not found in catalog`.

### 1.3 Cart Calculations & Line Items
- **Line Total Formula**:
  `line_total = quantity * unit_price`
- **Quantity Limits**:
  - Quantity cannot be less than 1. Decrementing below 1 removes line item from cart.
  - Adding quantity exceeding available stock warns the cashier with a stock warning toast.
- **Ad-Hoc / Custom Item Addition**:
  - Cashier can create an arbitrary manual item by providing Item Name, Quantity, and Price.
  - Custom items are flagged with `is_manual: true` in `order_items` table.

### 1.4 Discounts & Promotions
- **Coupon Discount**:
  - Validates code against active rows in `coupons` table.
  - Requires `is_active == true`, `current_date <= expiry_date`, and `subtotal >= min_order_value`.
  - Discount is calculated as a percentage: `coupon_discount = subtotal * (coupon_percentage / 100)`.
  - Increments `usage_count` on successful order.
- **Manual Bill Discount**:
  - Cashier can apply an ad-hoc bill-level discount either as a flat amount (₹) or percentage (%).
  - Cannot exceed subtotal after coupon discount.
- **Discount Precedence**:
  `Net Subtotal = Base Subtotal - Coupon Discount - Manual Discount`

### 1.5 GST Tax Computation
- **Exclusive vs Inclusive**:
  - System prices in the catalog are base prices.
  - When the GST toggle is enabled (`p_gst_enabled: true`), tax is computed as an addition:
    - `CGST = Net Subtotal * 0.025` (2.5%)
    - `SGST = Net Subtotal * 0.025` (2.5%)
    - `Total GST = CGST + SGST = Net Subtotal * 0.05` (5%)
- **Receipt Representation**:
  - Printed receipts list GST as a dedicated row item: `GST: +₹[Amount]` with separate CGST/SGST notations in full tax invoices.

### 1.6 Rounding Rules
- Line totals and tax lines are calculated to 2 decimal places.
- Grand Total is rounded to the nearest integer using standard commercial rounding (`Math.round(total)`).

### 1.7 Payment Settlement & Split Tender
- **Single Payment Modes**:
  - `Cash`: Cash drawer open trigger.
  - `Card`: Terminal card reference optional.
  - `QR / UPI`: Generates Dynamic/Static UPI QR code string for customer scan.
- **Split Payment Validation**:
  - When Split is selected, the sum of `cash + card + qr + other` must match `Grand Total`.
  - If discrepancy exists: checkout button remains disabled and validation error displays: `Split payment amounts must add up to total`.

### 1.8 Invoice Numbering Format
- **Format**: `TOC-[YYYYMMDD]-[SEQUENTIAL_ID]` or `INV-[NUMBER]` (e.g. `TOC-20261015-0012`).
- Generated atomically via database sequence or RPC to prevent duplicate numbers under concurrency.

### 1.9 Thermal Receipt & PDF Layout
- **Thermal Receipt (80mm)**:
  - Header: Centered Store Name (`[MY_APP_NAME]`), Full Address, Phone, Instagram.
  - Invoice No, Cashier ID, Timestamp.
  - Customer Name & Phone (if provided).
  - Divider rule.
  - Table: `Item Name`, `Qty`, `Price`, `Total`.
  - Divider rule.
  - Financial Summary: `Subtotal`, `Coupon Discount`, `Manual Discount`, `Delivery`, `GST`, `GRAND TOTAL`.
  - Payment Tender breakdown (e.g. `Split: Cash ₹500 + QR ₹350`).
  - Barcode representation of invoice number at bottom.
  - Thank you footer: `Thank you for shopping with us! Visit again.`
- **PDF Invoice**:
  - Rendered in A4 landscape/portrait format with gold branding `#C9B79C`, tabular lines, and digital signature block.

---

## 2. Inventory & Barcode Management

### 2.1 Product & Variant Hierarchy
- **Standard Product**: Single SKU without size/color variants (e.g., Accessories, Ties, Caps).
- **Variant Products**: Master product record (`products`) linked to multiple variant child rows (`product_variants`):
  - *Alpha Sizes*: XS, S, M, L, XL, XXL, 3XL.
  - *Numeric Sizes*: 28, 30, 32, 34, 36, 38, 40 (Pants, Trousers).
  - *Combo / Bundle*: Multi-piece sets sold together.
- Each variant has its own unique SKU, barcode, stock count, purchase cost, and selling price.

### 2.2 Stock Adjustment & Audit Trail
- Adjusting stock triggers RPC `adjust_inventory_stock`.
- Requires selecting a standard reason:
  - `Damaged in Store`
  - `Shrinkage / Theft`
  - `Physical Audit Correction`
  - `Supplier Return`
  - `Inward New Shipment`
- Creates an immutable audit row in `inventory_movements` recording previous stock, new stock, difference, reason, timestamp, and cashier name.

### 2.3 Barcode Label Generation & Printing
- Generates standard CODE128 SVG barcodes via `JsBarcode`.
- Custom label dimensions:
  - `Tag Label (50mm x 30mm)`: Includes Brand Title, Product Name, Size, Selling Price (MRP), and Barcode.
  - `Jewelry / Small Sticker (38mm x 25mm)`: Condensed layout.
- Print layouts: Thermal label roll printer (1-up continuous) and A4 grid sheet (3x8 = 24 labels per page).

---

## 3. Advance Order Booking (Tailoring & Reserves)

### 3.1 Lifecycle Stages
1. `Pending Deposit`: Initial order created; customer has not paid advance deposit.
2. `Deposit Received`: Minimum deposit collected (Cash/Card/QR/Split); recorded in `advance_order_payments`.
3. `Customer Contacted`: Tailor/staff notifies customer for trial or updates.
4. `Ready for Delivery`: Item stitched/in-stock and awaiting pickup.
5. `Final Payment Received`: Customer pays remaining balance; final invoice generated; stock decremented.

### 3.2 Financial Constraints
- `Deposit Amount` must be `>= 0` and `<= Total Order Amount`.
- `Remaining Balance = Total Order Amount - Deposit Amount`.
- Completing the order requires settling the remaining balance in full.

---

## 4. Edge Cases & Validation Matrix

| Scenario / Edge Case | Observed Reference Behavior | Required Behavior in Target App |
|---|---|---|
| Empty Product Name | Form submission blocked with error banner | Validate server-side (Zod schema) |
| Duplicate SKU or Barcode | Database constraint violation; toast error | Pre-validate uniqueness with instant feedback |
| Negative or Zero Price | Input prevents negative values; prices must be >= 0 | Strict non-negative number validation |
| Zero Stock Product Sale | Allowed in reference via warning modal | Enforce transactional check; prompt cashier override |
| Special Characters in Name | Handled cleanly; encoded safely | Sanitize and prevent XSS |
| Huge Quantities (>10,000) | Handled without crashing | Prevent overflow with realistic bounds (max 999/line) |
| Network Disconnection during Checkout | Fails with unhandled network error | Implement offline queue / clear failure recovery |

---

## 5. ASSUMED Business Rules from Static Analysis (With Dedicated Unit Tests)

Because live transactions on the reference site were audited without placing destructive production orders, the following operational rules are classified as **ASSUMED** from reverse-engineering the minified bundle. Each rule is encapsulated in a dedicated server-side function and verified by automated unit tests with worked examples.

### 5.1 Rule A: GST & Commercial Rounding Calculation
- **Function**: `calculateGstAndTotals(subtotalInPaise, couponDiscountInPaise, manualDiscountInPaise, gstEnabled, shippingInPaise)`
- **Assumption**: 
  1. Base subtotal is calculated by summing `item.price * item.quantity` in integer paise.
  2. Coupon discount is deducted first, then manual discount. The discounted subtotal cannot drop below zero (`Math.max(0, discountedSubtotal)`).
  3. When GST is enabled:
     - `CGST = Math.round(discountedSubtotal * 0.025)` (2.5%)
     - `SGST = Math.round(discountedSubtotal * 0.025)` (2.5%)
     - `Total GST = CGST + SGST` (5.0%)
  4. Final Grand Total in paise:
     - `Grand Total = discountedSubtotal + Total GST + shippingInPaise`
     - Rounded to the nearest whole Rupee (100 paise): `Math.round(grandTotal / 100) * 100`
- **Worked Example**:
  - Item: 1 Shirt @ ₹799.00 (79,900 paise).
  - Coupon: 10% OFF = ₹79.90 -> 7,990 paise.
  - Discounted Subtotal = 79,900 - 7,990 = 71,910 paise (₹719.10).
  - CGST (2.5%) = `Math.round(71,910 * 0.025)` = 1,798 paise (₹17.98).
  - SGST (2.5%) = `Math.round(71,910 * 0.025)` = 1,798 paise (₹17.98).
  - Total GST = 3,596 paise (₹35.96).
  - Pre-round Total = 71,910 + 3,596 = 75,506 paise (₹755.06).
  - Rounded Grand Total = `Math.round(75,506 / 100) * 100` = 75,500 paise (₹755.00).

### 5.2 Rule B: Split Tender Balance Validation
- **Function**: `validateSplitPayment(totalInPaise, splitDetails)`
- **Assumption**: 
  - `splitDetails` contains `{ cashInPaise, cardInPaise, qrInPaise, otherInPaise }`.
  - All amounts must be non-negative integers.
  - Sum must exactly match `totalInPaise`: `cash + card + qr + other === totalInPaise`.
  - If discrepancy != 0, transaction is rejected with error: `Split payment amounts must add up to the total bill amount`.
- **Worked Example**:
  - Bill: ₹1,500.00 (150,000 paise).
  - Tender: Cash ₹500.00 (50,000 paise) + QR ₹1,000.00 (100,000 paise) = 150,000 paise -> VALID.
  - Tender: Cash ₹500.00 + QR ₹999.00 = 149,900 paise -> INVALID (short by ₹1.00).

### 5.3 Rule C: Sequential Race-Safe Invoice Numbering
- **Function**: `generateSequentialInvoiceNumber(date, sequenceNumber)`
- **Assumption**:
  - Format: `SWAG-YYYYMMDD-XXXX` (e.g. `SWAG-20261016-0001`).
  - Generated inside an atomic PostgreSQL sequence or database transaction locking the daily invoice counter to prevent race collisions when multiple cashiers check out simultaneously.

### 5.4 Rule D: Coupon Validation and Stacking
- **Function**: `validateAndCalculateCoupon(couponRecord, subtotalInPaise)`
- **Assumption**:
  - Coupon requires `is_active === true`, `now <= expiry_date`, and `subtotalInPaise >= min_order_value_in_paise`.
  - Only one promotional coupon code can be applied per order.
  - Percentage discount calculated: `Math.round(subtotalInPaise * (percentage / 100))`.

### 5.5 Rule E: Advance Order Milestone State Machine
- **Function**: `transitionAdvanceOrderStatus(currentStatus, targetStatus, balanceRemainingInPaise)`
- **Assumption**:
  - Allowed status transitions:
    - `Pending Deposit` -> `Deposit Received` (upon collecting deposit)
    - `Deposit Received` -> `Customer Contacted` (trial/tailoring updates)
    - `Customer Contacted` -> `Ready for Delivery` (finished in store)
    - `Ready for Delivery` -> `Final Payment Received` (requires `balanceRemainingInPaise === 0`)
  - Order cannot be marked `Final Payment Received` until remaining balance is fully settled.

