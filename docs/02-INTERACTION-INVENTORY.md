# 02 - Interaction Inventory & QA Verification Log

Every interactive element across all pages and views of the reference POS application was systematically tested via browser automation and DOM inspection.
Status classifications:
- `PASS`: Operates exactly as expected with proper state updates, DOM mutation, or modal appearance.
- `FAIL`: Fails to execute, throws an error, or produces an invalid state.
- `PARTIAL`: Operates partially (e.g., changes local state but fails to persist or lacks complete validation).
- `BLOCKED`: Control disabled by prerequisite business logic (e.g., checkout button disabled on empty cart).
- `NOT TESTED`: Intentionally skipped to avoid altering live customer or business records (e.g. executing destructive operations on existing live database rows).

---

| Page / Route | Control Label / Type | Expected Behavior | Actual Behavior | Result | Screenshot Reference | Console / Network Notes |
|---|---|---|---|---|---|---|
| `/admin-login` | Portal ID Input (`#admin-portal-id`) | Accepts cashier ID text | Accepts text, binds to React state | PASS | `01-login-desktop.png` | None |
| `/admin-login` | Portal Password Input (`#admin-portal-password`) | Accepts password with masking | Masks text, toggles visibility with eye icon | PASS | `01-login-desktop.png` | None |
| `/admin-login` | Password Reveal Button (Eye Icon) | Toggles input type between password and text | Toggles state cleanly | PASS | `01-login-desktop.png` | None |
| `/admin-login` | Submit Button ("Sign In / உள்நுழைக") with empty inputs | Shows validation message | Shows alert: "Invalid Admin or Staff credentials" | PASS | `01-login-error-empty.png` | Console clean |
| `/admin-login` | Submit Button with valid credentials (`admin` / `admin123`) | Authenticates and navigates to `/dashboard` | Sets `the-one-admin-session` in `sessionStorage` and routes to `/dashboard` | PASS | `02-post-login-initial.png` | Hardcoded client auth |
| Global Top Bar | Sound Mute / Alarm Icon Button | Toggles system sound effects and alarm audio | Mutes/unmutes Web Audio context | PASS | `03-pos-billing-desktop.png` | Controls OscillatorNode |
| Global Top Bar | Language Switch Toggle ("English / தமிழ்") | Swaps interface strings between English and Tamil | Rerenders UI labels in Tamil/English | PASS | `03-pos-billing-desktop.png` | Zustand `langStore` |
| Global Top Bar | Fullscreen Toggle Button | Toggles browser fullscreen mode | Triggers `requestFullscreen()` | PASS | `03-pos-billing-desktop.png` | Browser API |
| Global Modal | "Silence Alarm & Acknowledge" Button | Silences low-stock audible alarm and closes modal | Closes overlay, silences audio until next low-stock event | PASS | `02-low-stock-modal.png` | State saved in memory |
| Global Modal | "Test Sound" Button | Plays audio chime to test speaker system | Triggers test waveform on AudioContext | PASS | `02-low-stock-modal.png` | Verified Web Audio |
| Sidebar | "Billing Panel" Button | Navigates to POS billing screen | Activates POS tab (`?tab=pos`) with active border highlight | PASS | `billing-desktop.png` | Fast client transition |
| Sidebar | "Inventory & Barcodes" Button | Switches to inventory catalog & barcode tools | Displays product inventory table and metrics | PASS | `inventory-desktop.png` | Fetches `products` & `variants` |
| Sidebar | "Advance Orders" Button | Switches to pre-orders / tailoring tracker | Displays advance order status boards and table | PASS | `advance-orders-desktop.png` | Queries `advance_orders` |
| Sidebar | "Birthdays" Button | Switches to customer birthday reminder list | Displays birthdays list and WhatsApp trigger | PASS | `birthdays-desktop.png` | Reads `customer_birthdays` |
| Sidebar | "Expenses" Button | Switches to operational expenses log | Displays expenses table and overhead metrics | PASS | `expenses-desktop.png` | Queries `expenses` |
| Sidebar | "Order History" Button | Switches to completed sales history ledger | Renders orders table with date filters and search | PASS | `order-history-desktop.png` | Queries `orders` table |
| Sidebar | "Analytics Dashboard" Button | Switches to executive metrics and Recharts graphs | Loads BI dashboard with revenue & profit charts | PASS | `pos-analytics-desktop.png` | Computes live metrics |
| Sidebar | "Coupons" Button | Switches to promo coupon administration | Displays active coupon table and create modal trigger | PASS | `coupons-desktop.png` | Queries `coupons` table |
| Sidebar | "Logout" Button | Logs cashier out and redirects to `/admin-login` | Clears `the-one-admin-session`, redirects to `/admin-login` | PASS | `01-login-desktop.png` | Clean redirection |
| POS Billing | Product Catalog Search Input | Filters products by name, Tamil name, or category | Filters in real-time as user types | PASS | `billing-search-results.png` | Client-side filter |
| POS Billing | Barcode Scan Input Box | Captures barcode number and auto-adds product to cart | Adds matching variant to cart immediately | PASS | `billing-desktop.png` | Keyup listener |
| POS Billing | Product Card Click | Adds selected item/variant to cart with qty 1 | Item appears in cart table, subtotal updates | PASS | `billing-cart-item-added.png` | Live total recalculation |
| POS Billing | Cart Item Quantity Stepper (`+`) | Increments item quantity by 1 | Increments count, recalculates line total | PASS | `billing-cart-item-added.png` | Recalculates live |
| POS Billing | Cart Item Quantity Stepper (`-`) | Decrements quantity; removes item if qty drops below 1 | Decrements count or deletes row cleanly | PASS | `billing-cart-item-added.png` | Recalculates live |
| POS Billing | Customer Name Input (`Enter name`) | Accepts customer name for invoice and loyalty records | Stores name in checkout state | PASS | `billing-customer-details.png` | Optional field |
| POS Billing | Customer WhatsApp Input (`Enter WhatsApp number`) | Accepts 10-digit Indian mobile number | Validates number for WhatsApp share link | PASS | `billing-customer-details.png` | Format: 10 digits |
| POS Billing | Coupon Code Input & Apply Button | Applies promo discount to subtotal | Validates coupon code in database; shows error if invalid | PASS | `billing-cart-item-added.png` | Checks `coupons` table |
| POS Billing | Manual Discount Input (`₹` or `%`) | Deducts flat or percentage discount from bill total | Deducts discount amount, recomputes total | PASS | `billing-cart-item-added.png` | Recalculates live |
| POS Billing | GST Tax Toggle Switch | Enables/disables tax breakdown and adds tax to total | Calculates SGST and CGST and updates receipt summary | PASS | `billing-cart-item-added.png` | Recomputes tax live |
| POS Billing | Payment Mode Buttons (Cash, Card, QR) | Selects single payment tender | Highlights active payment button | PASS | `billing-cart-item-added.png` | Toggles selected mode |
| POS Billing | Split Payment Button | Opens split payment distribution fields | Shows Cash, QR, Card, and Online inputs | PASS | `billing-payment-split-selected.png` | Verifies split match |
| POS Billing | Checkout Button ("Complete Order & Print") with empty cart | Should be disabled | Button disabled; cursor not-allowed | BLOCKED | `billing-empty-desktop.png` | Correct UX guard |
| POS Billing | "Clear Cart" Action Button | Resets active cart and fields | Empties cart table, resets totals | PASS | `billing-empty-desktop.png` | Fast client state clear |
| Inventory | "Add Product" Action Button | Opens modal to create new product & variants | Displays modal with form fields and variant tabs | PASS | `inventory-add-product-modal.png` | Modal overlays cleanly |
| Inventory | "Print Barcodes" Button | Opens barcode designer and batch print tool | Displays label size selector and CODE128 SVG preview | PASS | `inventory-barcode-modal.png` | Uses JsBarcode |
| Inventory | Stock Search Filter Box | Filters inventory table rows by SKU or title | Filters table instantaneously | PASS | `inventory-search-results.png` | Client-side filter |
| Advance Orders | "New Advance Order" Button | Opens booking modal for tailor/reserve order | Form displays customer, deposit, and balance fields | PASS | `advance-orders-new-modal.png` | Form opens smoothly |
| Advance Orders | Status Filter Tabs (Pending, Ready, Final) | Filters advance order records by lifecycle status | Changes table dataset to matching status | PASS | `advance-orders-desktop.png` | Filter tabs work |
| Expenses | "Add Expense" Action Button | Opens expense entry modal | Displays category dropdown, amount, payment mode | PASS | `expenses-add-modal.png` | Form validates numbers |
| Order History | Date Presets ("Today", "This Week", "Month") | Filters sales records by selected date window | Updates order table rows and aggregate summary | PASS | `order-history-desktop.png` | Client date filtering |
| Order History | Invoice Search Input Box | Searches by invoice number or phone | Filters matching orders | PASS | `order-history-desktop.png` | Real-time filter |
| Coupons | "Create Coupon" Action Button | Opens promo creation modal | Modal captures code, percentage, minimum bill, expiry | PASS | `coupons-create-modal.png` | Form captures rules |
| Analytics | Sub-Tabs (Revenue, Products, Inventory, Billing) | Switches between different Recharts analytics views | Displays corresponding charts and breakdowns | PASS | `analytics-subtab-revenue.png` | Recharts responsive |
| WhatsApp Center | Send Message / Open WhatsApp Trigger | Opens `https://wa.me/...` with templated text | Opens WhatsApp URL with encoded message payload | PASS | `whatsapp-center-desktop.png` | Formatted URI |
