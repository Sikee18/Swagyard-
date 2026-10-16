# 05 - Dashboard & Business Intelligence Metrics Verification

All analytical metrics, KPI cards, summary widgets, and charts reverse-engineered from runtime data and code extraction of `Dashboard-Dr5ZzWkg.js` and `charts-UpbGWgZV.js`.

---

## 1. Executive Summary KPIs

| KPI Card Label | Currency / Unit | Time Period | Exact Formula Reconstructed from Code | Hardcoded vs Computed | Verified Against Underlying DB Rows? | Zero / Empty State Handling |
|---|---|---|---|---|---|---|
| **Total Revenue** | ₹ (INR) | Selected Range (Today / Week / Month / Year / All) | `sum(orders.total)` where `status == 'completed'` and `created_at` in range | Computed Live | CONFIRMED. Matches sum of completed `orders` table rows. Cancelled orders excluded. | Displays `₹0.00` |
| **Total Expenses** | ₹ (INR) | Selected Range | `sum(expenses.amount)` where `expense_date` in range | Computed Live | CONFIRMED. Matches sum of `expenses` table rows. | Displays `₹0.00` |
| **Net Profit / Loss** | ₹ (INR) | Selected Range | `Total Revenue - Total Expenses` | Computed Live | CONFIRMED. Positive renders green with "Profitable" badge; negative renders red with "Loss" alert. | Displays `₹0.00` |
| **Completed Bills** | Integer (Count) | Selected Range | `count(orders.id)` where `status == 'completed'` and `created_at` in range | Computed Live | CONFIRMED. Increments on successful POS checkout. | Displays `0` |
| **Average Revenue Per Bill** | ₹ (INR) | Selected Range | `Total Revenue / Completed Bills` (guarded: returns `0` if `Completed Bills == 0`) | Computed Live | CONFIRMED. Exact division formula. | Displays `₹0.00` |
| **Total Items Sold** | Integer (Units) | Selected Range | `sum(order_items.quantity)` across completed orders | Computed Live | CONFIRMED. Calculated by aggregating line quantities. | Displays `0` |
| **Profit Margin** | % (Percentage) | Selected Range | `((Total Product Revenue - Total Product Cost) / Total Product Revenue) * 100` | Computed Live | CONFIRMED. Products without purchase cost excluded from margin calculation with notice tag. | Displays `0.0%` |
| **Total Inventory Value** | ₹ (INR) | Current Snapshot | `sum(stock_quantity * purchase_price)` across all active products and variants | Computed Live | CONFIRMED. Uses `purchase_price` or `price` if cost absent. | Displays `₹0.00` |
| **Low Stock Count** | Integer (SKUs) | Current Snapshot | `count(items)` where `stock <= low_stock_alert` (default limit: 5) | Computed Live | CONFIRMED. Triggers low-stock modal and audible oscillator alarm if > 0. | Displays `0` |

---

## 2. Channel & Payment Tender Breakdown

| Metric Label | Formula / Derivation | Observed Behavior | Verification Status |
|---|---|---|---|
| **Cash Collected** | `sum(orders.total)` where `payment_mode == 'cash'` + `sum(orders.split_details.cash)` | Aggregates pure cash bills and cash portions from split transactions | CONFIRMED |
| **QR / UPI Collected** | `sum(orders.total)` where `payment_mode == 'qr'` + `sum(orders.split_details.qr)` | Aggregates pure UPI/QR payments and QR portions from split bills | CONFIRMED |
| **Card Collected** | `sum(orders.total)` where `payment_mode == 'card'` + `sum(orders.split_details.card)` | Aggregates card swipe payments | CONFIRMED |
| **Other / Online Collected** | `sum(orders.total)` where `payment_mode == 'other'` + `sum(orders.split_details.other)` | Captures bank transfers and miscellaneous digital tenders | CONFIRMED |

---

## 3. Product & Category Performance Metrics

| Metric Label | Reconstructed Formula | Source Table & Columns | Status |
|---|---|---|---|
| **Top Selling Product** | Product with `max(sum(order_items.quantity))` | `order_items` grouped by `product_name` | CONFIRMED |
| **Category Share (%)** | `(Category Revenue / Total Revenue) * 100` | `order_items` joined with `categories` | CONFIRMED |
| **Dead Stock Alert** | Products with `stock > 0` and zero sales in last 60 days | `products` left join `order_items` | CONFIRMED |

---

## 4. Coupons & Marketing Metrics

| Metric Label | Reconstructed Formula | Source Table | Status |
|---|---|---|---|
| **Total Discounts Given** | `sum(orders.discount_amount + orders.manual_discount_amount)` | `orders` table | CONFIRMED |
| **Coupon Usage Rate** | `(Orders with coupon / Total completed orders) * 100` | `orders` table | CONFIRMED |
| **Top Coupon Code** | Coupon code with highest `usage_count` | `coupons` table | CONFIRMED |

---

## 5. Mathematical Integrity & Boundary Edge Cases

1. **Cancelled Orders**:
   - Orders with `status == 'cancelled'` are strictly excluded from Revenue, Items Sold, and Bill Counts.
2. **Discounts vs Net Revenue**:
   - `orders.total` reflects the final net payable amount after deducting coupons and manual discounts, and adding GST and delivery charges.
3. **Inclusive vs Exclusive GST**:
   - When GST is enabled, `total_gst` is added to the subtotal:
     `Final Total = Subtotal - Coupon Discount - Manual Discount + Total GST + Shipping`
4. **Rounding Handling**:
   - Display values are formatted with `toFixed(2)`.
   - The system internally performs arithmetic on floating numbers in JavaScript; **in Stage 2, all financial calculations must be handled using integer paise / Decimal on the backend server to eliminate floating-point drift.**
