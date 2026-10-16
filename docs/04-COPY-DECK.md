# 04 - Complete Copy Deck & Microcopy

All user-facing copy, labels, headings, placeholders, validation alerts, empty states, and button texts extracted from the live reference application.
The reference brand name has been replaced with the token `[MY_APP_NAME]`.

---

## 1. Authentication & Navigation (`/admin-login` & Shell)

### Brand Headings & Subtitles
- **Main Brand Title**: `[MY_APP_NAME]`
- **Sub-Brand / Category**: `Retail Billing & Inventory`
- **Tamil Subtitle**: `சில்லறை பில்லிங் & சரக்கு மேலாண்மை`
- **Login Section Heading**: `Admin / Staff Portal`
- **Tamil Heading**: `நிர்வாக நுழைவு`
- **Status Indicator**: `ADMIN` / `ONLINE`

### Login Form Fields & Buttons
- **Portal ID Label**: `Portal ID`
- **Portal ID Placeholder**: `Enter admin portal ID`
- **Portal Password Label**: `Portal Password`
- **Portal Password Placeholder**: `••••••••`
- **Submit Button**: `Sign In` / `உள்நுழைக`
- **Loading State**: `Signing in...`
- **Validation Error Alert**: `Invalid Admin or Staff credentials` / `தவறான நிர்வாகி அல்லது பணியாளர் விவரங்கள்`

### Persistent Top Bar
- **Shop Address / Contact**: `174, Brazzer Street, Opp. Apollo Medical, Ammoor, Ranipet - 632501`
- **Phone**: `+91 63853 68479`
- **Instagram**: `@theone_clothing.in`
- **Sound Toggle Tooltip**: `Mute system sounds` / `Unmute system sounds`
- **Language Switch**: `English / தமிழ்`
- **Fullscreen Tooltip**: `Toggle fullscreen view`
- **Logged In Badge**: `Logged in as Admin`

### Sidebar Navigation Links
- `Billing Panel`
- `Inventory & Barcodes`
- `Advance Orders`
- `Birthdays`
- `Expenses`
- `Order History`
- `Analytics Dashboard`
- `Coupons`
- `Logout`

---

## 2. Low Stock Alert Modal (Global Alarm)
- **Modal Title**: `Low Stock Alarm Active`
- **Subtitle**: `[X] item requires immediate restocking` / `[X] items require immediate restocking`
- **Alert Description**: `The audible alarm and visual alert will sound until acknowledged.`
- **Item Limit Label**: `Item Limits Active`
- **Stock Counter**: `[Product Name] - [X] in Stock`
- **Alert Threshold**: `Alert limit: 5`
- **Action Buttons**:
  - `Test Sound`
  - `Silence Alarm & Acknowledge`
- **Helper Footnote**: `Silences sound until next new low-stock item`

---

## 3. Billing & POS Terminal (`/dashboard`)

### Catalog Search & Filter
- **Catalog Search Placeholder**: `Search by product name, Tamil name, or category...`
- **Barcode Input Placeholder**: `Scan barcode with machine, camera, or type code...`
- **Category Pill All**: `All Items`
- **Manual Item Trigger**: `+ Add Custom Item`

### Cart & Bill Table
- **Cart Section Title**: `Current Bill`
- **Table Headers**: `Item Name`, `Qty`, `Price`, `Line Total`, `Actions`
- **Empty Cart State**: `No items added to bill yet`
- **Empty Cart Subtext**: `Scan a barcode or click products from the catalog to start billing.`
- **Clear Cart Button**: `Clear Cart`

### Customer Capture Panel
- **Customer Section Title**: `Customer Information`
- **Name Input Label**: `Customer Name`
- **Name Placeholder**: `Enter name`
- **Phone Input Label**: `WhatsApp Number`
- **Phone Placeholder**: `Enter WhatsApp number (e.g. 9876543210)`
- **Birthday Date Label**: `Birthday (Optional)`

### Discounts, Coupons & Tax
- **Coupon Section Title**: `Promotional Coupon`
- **Coupon Placeholder**: `Enter coupon code`
- **Apply Coupon Button**: `Apply`
- **Manual Discount Label**: `Manual Discount`
- **Discount Amount Placeholder**: `0.00`
- **GST Toggle Label**: `Apply GST (SGST 2.5% + CGST 2.5%)`

### Payment Modes & Checkout
- **Payment Mode Section**: `Payment Method`
- **Payment Options**: `Cash`, `Card`, `QR / UPI`, `Split Payment`
- **Split Breakdown Fields**:
  - `Cash Amount (₹)`
  - `QR / UPI Amount (₹)`
  - `Card Amount (₹)`
  - `Other / Online (₹)`
- **Discrepancy Error Warning**: `Split payment amounts must add up to total bill amount.`
- **Checkout Action**: `Complete Order & Print Receipt`
- **Share Action**: `Send WhatsApp Receipt`

---

## 4. Inventory & Barcodes (`/dashboard?tab=inventory`)

### Metric Cards
- `Total Products`
- `Total Stock Units`
- `Low Stock Items`
- `Total Inventory Value`

### Table Controls & Headers
- **Search Placeholder**: `Search catalog by title, SKU, or barcode...`
- **Category Filter Dropdown**: `All Categories`
- **Low Stock Filter Checkbox**: `Show Low Stock Only (< 5)`
- **Table Headers**: `Image`, `Product Name`, `Category`, `Variants`, `Stock`, `Purchase Cost`, `Selling Price`, `Actions`
- **Add Product Button**: `+ Add New Product`
- **Barcode Tools Button**: `Print Barcode Labels`

### Add / Edit Product Modal
- **Modal Title**: `Add New Product` / `Edit Product`
- **Tab 1**: `Basic Details`
  - `Product Name (English) *`
  - `Product Name (Tamil)`
  - `Category *`
  - `Description`
  - `Low Stock Threshold (Default: 5)`
- **Tab 2**: `Variant Generator`
  - `Select Variant Structure:`
    - `Standard Piece (No Size)`
    - `Alpha Sizes (S, M, L, XL, XXL)`
    - `Numeric Sizes (28, 30, 32, 34, 36)`
    - `Bundle / Combo Set`
  - `Size Label`, `SKU`, `Barcode Code`, `Purchase Cost (₹)`, `Selling Price (₹)`, `Stock Inward Qty`
- **Modal Actions**: `Cancel`, `Save Product`

### Barcode Label Printing Modal
- **Modal Title**: `Barcode Label Generator`
- **Label Dimensions Dropdown**:
  - `Standard Clothing Tag (50mm x 30mm)`
  - `Jewelry / Small Sticker (38mm x 25mm)`
  - `A4 Sheet Batch (24 labels/page)`
- **Options**: `Show Store Name`, `Show Price`, `Show Size`, `Show Barcode Text`
- **Action Buttons**: `Generate Preview`, `Print Labels`, `Download PDF`

---

## 5. Advance Orders (`/dashboard?tab=advance_orders`)

### Status Filters
- `All Orders`, `Pending Deposit`, `Deposit Received`, `Customer Contacted`, `Ready for Delivery`, `Final Payment Received`

### Table Headers
- `Ref #`, `Date`, `Customer`, `Phone`, `Product / Tailoring Details`, `Total Amount`, `Deposit`, `Balance`, `Delivery Date`, `Status`, `Action`

### New Advance Order Modal
- **Customer Details**:
  - `Customer Name *`
  - `Phone Number *`
  - `Delivery Address`
- **Order Details**:
  - `Product Name *`
  - `Category`
  - `Detailed Measurements / Remarks`
  - `Total Order Amount (₹) *`
  - `Deposit Amount Received (₹) *`
  - `Remaining Balance: ₹[Auto-computed]`
  - `Deposit Payment Mode (Cash, Card, QR, Split)`
  - `Expected Delivery Date *`
- **Actions**: `Cancel`, `Create Advance Order`

---

## 6. Expenses (`/dashboard?tab=expenses`)

### Metric Cards
- `Total Monthly Expenses`, `Today's Outflow`, `Top Expense Category`

### Table Headers
- `Date`, `Category`, `Amount (₹)`, `Payment Mode`, `Recorded By`, `Description`, `Actions`

### Add Expense Modal
- **Modal Title**: `Record New Expense`
- **Category Options**: `Rent`, `Electricity`, `Salaries`, `Tea & Snacks`, `Shop Maintenance`, `Printing & Stationery`, `Marketing`, `Miscellaneous`
- **Amount Label**: `Amount (₹) *`
- **Payment Mode**: `Cash`, `UPI / Bank Transfer`, `Card`
- **Notes Label**: `Remarks / Description`
- **Actions**: `Cancel`, `Save Expense`

---

## 7. Order History (`/dashboard?tab=order_history`)

### Date Filters
- `Today`, `This Week`, `This Month`, `This Year`, `All Time`, `Custom Range`

### Table Headers
- `Invoice No`, `Date & Time`, `Customer`, `Phone`, `Items`, `Payment Mode`, `Total Amount`, `Status`, `Actions`

### Invoice Viewer Modal
- **Invoice Reference**: `Invoice #[Invoice Number]`
- **Receipt Note**: `TAX INVOICE / CASH BILL`
- **Store Contact**: `Ph: +91 63853 68479 | Email: theoneclothing2026@gmail.com`
- **Customer Details**: `Customer: [Name] | Phone: [Phone]`
- **Actions**: `Print Thermal Receipt`, `Download PDF Invoice`, `Resend on WhatsApp`, `Close`

---

## 8. Analytics Dashboard (`/dashboard?tab=pos_analytics`)

### KPI Cards
- `Total Revenue` - `Gross billings across all completed orders`
- `Total Expenses` - `Overheads from expense tracker`
- `Net Profit / Loss` - `Revenue minus Total Expenses`
- `Completed Bills` - `Total successful receipts issued`
- `Average Revenue Per Bill` - `Total Revenue divided by Completed Bills`
- `Total Items Sold` - `Total units moved`
- `Profit Margin` - `(Total Product Profit / Total Product Revenue) * 100`

### Sub-Tab Navigation
- `Revenue`
- `Product & Category`
- `Inventory`
- `Customer`
- `Billing`

---

## 9. Coupons (`/dashboard?tab=coupons`)

### Table Headers
- `Coupon Code`, `Discount %`, `Minimum Order (₹)`, `Usage / Limit`, `Expiry Date`, `Status`, `Actions`

### Create Coupon Modal
- `Coupon Code * (e.g. FESTIVE20)`
- `Discount Percentage (1-100%) *`
- `Minimum Order Value (₹)`
- `Maximum Redemption Limit`
- `Expiration Date *`
- **Actions**: `Cancel`, `Create Coupon`
