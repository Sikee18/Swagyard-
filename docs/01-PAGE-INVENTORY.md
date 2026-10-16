# 01 - Page Inventory & Route Architecture

Comprehensive inventory of all pages, views, modals, and routes discovered on the reference retail application (`one-clothing.vercel.app`).

---

## 1. Global Navigation Architecture

The application is structured as a Single-Page Application (SPA) powered by React Router v6, with client-side state preservation, responsive collapsible sidebar navigation, and a persistent top action bar.

### Sidebar Navigation Structure
The sidebar contains the brand header, staff status tag, and 8 main application module links:
1. **Brand Header**: `[MY_APP_NAME] - Retail Billing & Inventory` (Click navigates to `/dashboard`)
2. **Staff Tag**: `ADMIN` status badge
3. **Billing Panel**: Route `/dashboard` or query param `?tab=pos`
4. **Inventory & Barcodes**: Route `/dashboard?tab=inventory`
5. **Advance Orders**: Route `/dashboard?tab=advance_orders` (also mapped via standalone `/advance-orders`)
6. **Birthdays**: Route `/dashboard?tab=birthdays`
7. **Expenses**: Route `/dashboard?tab=expenses` (also mapped via standalone `/expenses` and `/dashboard/expenses`)
8. **Order History**: Route `/dashboard?tab=order_history`
9. **Analytics Dashboard**: Route `/dashboard?tab=pos_analytics` (also mapped via standalone `/pos-analytics`)
10. **Coupons**: Route `/dashboard?tab=coupons`
11. **Logout Action**: Clears `sessionStorage` and redirects to `/admin-login`

### Top Bar Controls
- **Store Location / Status Indicator**: Displays live shop status and date/time.
- **Audio Alarm Indicator**: Beeping speaker icon with active pulse animation when low-stock items exist; click toggles mute.
- **Language Switch**: English / தமிழ் toggle.
- **Fullscreen Button**: Fullscreen expand toggle icon.
- **Staff / Admin Profile Badge**: Displays current operator (`Admin`).

---

## 2. Detailed Route Inventory

### Page 1: Staff / Admin Login Portal
- **Route**: `/admin-login` (Redirected from `/login`, `/admin`, and unauthenticated `/dashboard` or `/`)
- **How to Reach**: Direct URL navigation or clicking "Logout" from any dashboard page.
- **Purpose**: Authenticates cashier/admin into the POS and management modules.
- **Components**:
  - Luxury Brand card with gold glow borders and animated backdrop.
  - Dual-language header: "The One Clothing / நிர்வாக நுழைவு".
  - Credentials Form: Portal ID input, Portal Password input, Password reveal toggle.
  - Submit Button: "Sign In / உள்நுழைக" with loading spinner state.
- **States**:
  - *Empty State*: Error alert banner "Invalid Admin or Staff credentials".
  - *Loading State*: Button disabled with animated spinner.
  - *Success State*: Redirects to `/dashboard` or referring route (`state.from`).
- **Direct URL**: CONFIRMED. Works directly.
- **Refresh**: CONFIRMED. Works directly.
- **Back/Forward**: CONFIRMED. Preserves history stack.
- **Status**: FUNCTIONAL. (Security vulnerability noted: credentials verified in client bundle).

---

### Page 2: Billing & POS Terminal
- **Route**: `/dashboard` (or `?tab=pos`, `/pos`)
- **How to Reach**: Default landing page post-login; sidebar item "Billing Panel".
- **Purpose**: Fast cashier terminal for product barcode lookup, cart management, customer capture, discount application, split payment settlement, and thermal receipt printing.
- **Components**:
  - *Product Search Bar*: Real-time auto-filtering catalog search box with Tamil/English matching.
  - *Barcode Scanner Input*: High-priority listener for 12/13-digit scanner feeds.
  - *Category Filter Pills*: Horizontal scrolling pill buttons for quick filtering (e.g. Pants, Shirts, Sarees, Combos).
  - *Product Grid*: Responsive cards showing product photo, stock badge, pricing, and variant picker.
  - *Active Cart Drawer / Table*: List of selected items, item quantities, price steppers, delete action, line totals.
  - *Customer Capture Panel*: Customer Name, WhatsApp Phone Number, and Birthday date input.
  - *Coupon & Discount Panel*: Promo code input with "Apply" button; manual discount input (% vs flat ₹).
  - *GST Breakdown Widget*: Tax toggle switch with SGST & CGST computation.
  - *Payment Method Selector*: Cash, Card, QR/UPI, Split.
  - *Split Payment Calculator*: Breakout fields for Cash, Card, QR, and Online with live discrepancy validation.
  - *Checkout Actions*: "Complete Order & Print", "WhatsApp Share", "Clear Cart".
- **States**:
  - *Empty Cart*: Payment and checkout buttons disabled. Placeholder illustration: "Cart is empty".
  - *Loading State*: Skeleton shimmer placeholders during Supabase product fetch.
  - *Error State*: Toast alert on invalid coupon, out-of-stock item, or unbalanced split amounts.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 3: Inventory & Barcodes
- **Route**: `/dashboard?tab=inventory`
- **How to Reach**: Sidebar navigation "Inventory & Barcodes".
- **Purpose**: Stock administration, product catalog creation, multi-variant matrices, barcode generation, and stock adjustment auditing.
- **Components**:
  - *Summary Metrics*: Total Products, Total In-Stock Units, Low Stock Items (<5 alert limit), Total Inventory Value.
  - *Search & Filters*: Text search, category selector dropdown, low-stock filter toggle.
  - *Products Table*: Columns for Image, Product Name (EN & TA), SKU, Barcode, Category, Stock Level, Cost Price, Selling Price, and Actions.
  - *Add Product Modal*: Tabbed modal for Basic Details (Name, Description, Category), Variant Generator (Alpha sizes: S, M, L, XL, XXL; Numeric sizes: 28, 30, 32, 34; Bundle sets), and Stock Limits.
  - *Barcode Registry & Label Printing Modal*: Barcode designer supporting CODE128 SVG generation, custom label dimensions (standard tag, adhesive sticker), price/size labels, and batch printing.
  - *Stock Adjustment Modal*: RPC-backed modal to adjust quantity with audit reasons (Damaged, Audit Correction, Shrinkage, Inward Shipment).
- **States**:
  - *Loading*: Skeleton table rows.
  - *Empty Table*: "No products found matching your search criteria".
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 4: Advance Orders (Custom Bookings)
- **Route**: `/dashboard?tab=advance_orders` (also `/advance-orders`)
- **How to Reach**: Sidebar item "Advance Orders".
- **Purpose**: Booking management for pre-orders, tailoring, special reserves, deposit collection, balance settlement, and delivery milestone tracking.
- **Components**:
  - *Lifecycle Status Tabs*: All, Pending Deposit, Deposit Received, Customer Contacted, Ready for Delivery, Final Payment Received.
  - *Orders Table*: Columns for Order Ref, Customer Name, Phone, Items/Description, Total Amount, Deposit Paid, Remaining Balance, Expected Delivery Date, Status Badge, and Actions.
  - *New Advance Order Modal*: Comprehensive form capturing Customer Name, Phone, Address, Product/Tailoring description, Total Amount, Initial Deposit, Deposit Payment Mode, Reference Number, Remarks, and Delivery Target Date.
  - *Order Details & Timeline Drawer*: Visual event history logging each milestone (`add_advance_order_event`) and payments.
  - *Complete Order Modal*: Collects final balance payment (supports split modes) and generates final invoice.
- **States**:
  - *Loading*: Shimmer loaders.
  - *Empty State*: "No advance orders in this status category".
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 5: Customer Birthdays & Loyalty Offers
- **Route**: `/dashboard?tab=birthdays`
- **How to Reach**: Sidebar item "Birthdays".
- **Purpose**: Customer relationship management, anniversary/birthday tracking, and automated promotional discount dispatch.
- **Components**:
  - *Upcoming Birthdays List*: Filterable by "Today", "This Week", "This Month", and "All".
  - *Customer Loyalty Cards*: Customer Name, Phone, Birth Date, Days Remaining countdown badge.
  - *Offer Assignment*: Default 20% OFF coupon generator (`the_one_birthday_offers_v1`).
  - *WhatsApp Action*: Direct trigger opening WhatsApp web/app with pre-filled birthday greeting and personalized discount coupon code.
- **States**:
  - *Empty State*: Friendly banner indicating no birthdays in selected period.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 6: Expense Management
- **Route**: `/dashboard?tab=expenses` (also `/expenses`, `/dashboard/expenses`)
- **How to Reach**: Sidebar item "Expenses".
- **Purpose**: Operational overhead tracking (Rent, Electricity, Tea/Snacks, Staff Salary, Maintenance) for real-time net profit computation.
- **Components**:
  - *Expense Metrics Cards*: Total Monthly Expenses, Today's Expenses, Top Category, Cash vs Digital Outflow.
  - *Expenses Table*: Date, Category, Amount (₹), Payment Mode (Cash, Bank Transfer, UPI), Recorded By, Description.
  - *Add Expense Modal*: Form for Expense Date, Category dropdown (Rent, Salaries, Tea/Snacks, Utilities, Supplies, Misc), Amount, Payment Mode, Description notes.
  - *Category Filter & Date Picker*: Filter by period and specific operational categories.
- **States**:
  - *Storage Fallback*: Reads and syncs between Supabase `expenses` table and `the_one_expenses_records_v1` in `localStorage`.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 7: Sales & Order History
- **Route**: `/dashboard?tab=order_history`
- **How to Reach**: Sidebar item "Order History".
- **Purpose**: Historical sales transaction ledger, invoice reprint, and cashier audit log.
- **Components**:
  - *Date Filters*: Preset buttons ("Today", "This Week", "This Month", "This Year", "All") and Custom Date Range picker.
  - *Search Filter*: Search by invoice number, customer phone number, or customer name.
  - *Order Table*: Invoice No, Date/Time, Customer Name, Phone, Item Count, Payment Method badge (Cash, Card, QR, Split), Order Total (₹), Status Badge (Completed / Cancelled), Action Buttons.
  - *Invoice Viewer & Reprint Modal*: Full digital receipt and invoice preview with 1-click thermal print, PDF download, and WhatsApp resend.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 8: Analytics Dashboard
- **Route**: `/dashboard?tab=pos_analytics` (also `/pos-analytics`)
- **How to Reach**: Sidebar item "Analytics Dashboard".
- **Purpose**: Business intelligence, revenue reporting, profit margin analysis, and channel breakdowns.
- **Components**:
  - *Executive KPI Grid*:
    - Total Revenue (₹)
    - Total Expenses (₹)
    - Net Profit / Loss (₹) with profitability indicator
    - Completed Bills Count
    - Average Revenue Per Bill (₹)
    - Total Items Sold
    - Overall Profit Margin (%)
  - *Sub-Tab Navigation*:
    - `Revenue`: Daily revenue bar charts, monthly trajectory, Cash vs Card vs QR share.
    - `Product & Category`: Best-selling items, category revenue breakdown, dead-stock alert.
    - `Inventory`: Current valuation, out-of-stock items, turnover velocity.
    - `Customer`: Repeat purchase rates, top spenders, customer acquisition volume.
    - `Billing`: Average items per bill, payment mode distribution, peak hours.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 9: Promotional Coupons Management
- **Route**: `/dashboard?tab=coupons`
- **How to Reach**: Sidebar item "Coupons".
- **Purpose**: Create and manage marketing coupon campaigns, discount percentages, and redemption limits.
- **Components**:
  - *Coupons Table*: Code, Discount %, Minimum Order Value, Expiry Date, Usage Count / Limit, Status Toggle (Active / Inactive), Delete Action.
  - *Create Coupon Modal*: Coupon Code, Percentage (1-100%), Minimum Order Amount (₹), Expiry Date, Max Usage Count.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 10: WhatsApp Communications Center
- **Route**: `/whatsapp-center`
- **How to Reach**: Direct route or from Customer / Order actions.
- **Purpose**: Centralized messaging portal for sending order updates, ready-for-pickup notifications, payment reminders, and promotional broadcasts.
- **Components**:
  - Tabbed message queues (Pending Advance Pickups, Birthday Greetings, Special Promotions).
  - Message preview card with dynamic variable substitution (`{{customer_name}}`, `{{invoice_no}}`, `{{balance}}`).
  - Action button triggering WhatsApp URI `wa.me`.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.

---

### Page 11: Digital Invoice View & PDF Download
- **Route**: `/invoice/:id`
- **How to Reach**: Direct link shared via WhatsApp or clicking "View Invoice" from Order History.
- **Purpose**: Standalone responsive digital invoice view for customers and store audit.
- **Components**:
  - Store identity header with address, GST number, contact details.
  - Customer info box and invoice reference number.
  - Itemized table with product name, quantity, unit price, and line totals.
  - Financial summary: Subtotal, Discounts, CGST, SGST, Delivery, Grand Total.
  - Print / Download PDF action buttons.
- **Direct URL**: CONFIRMED.
- **Refresh**: CONFIRMED.
- **Status**: FUNCTIONAL.
