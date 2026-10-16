# Swagyard — Retail POS & Inventory Billing System

A modern, high-performance retail clothing point-of-sale (POS) terminal, inventory management system, and customer communications center built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM** connected to a real **PostgreSQL** database on Supabase.

---

## ✨ Features

- **🚀 POS Billing Terminal**:
  - Real-time catalog search (English & Tamil titles, SKUs).
  - High-speed hardware barcode scanner listener (`keydown` buffer detection) with audio feedback.
  - Variant selection chips for Alpha sizes (`S`, `M`, `L`, `XL`, `XXL`) and Numeric sizes (`28`, `30`, `32`, `34`...).
  - Ad-hoc custom line-item billing modal.
  - Promotional coupon application (`SWAG10`) & manual rupee discount adjustments.
  - 5% GST toggle (2.5% CGST + 2.5% SGST) with commercial nearest rupee rounding.
  - Multi-tender Split Payment calculator (Cash, Card, QR/UPI, Online/Other).
  - Atomic, sequential invoice numbering (`SWAG-YYYYMMDD-XXXX`).
  - Stock depletion protection (prevents overselling out-of-stock items).

- **🧾 Receipts & Invoices**:
  - **80mm Thermal Print**: CSS `@media print` formatted receipt for thermal receipt printers.
  - **Vector PDF Invoices**: Client-side downloadable A4 PDF invoice generated via `jspdf`.
  - **Public Digital Tax Invoice (`/invoice/:id`)**: Responsive customer-facing invoice with verified badge, printable layout, and 1-click WhatsApp share.

- **📦 Inventory & Barcode Generation**:
  - Multi-variant catalog matrix with independent costs, prices, and stock levels.
  - Vector SVG barcode generator (`JsBarcode`, format CODE128) with printable label templates (Standard 50×30mm, Small, A4 Sheet).
  - Stock level adjustments with mandatory audit reason codes (`physical_audit`, `damaged`, `supplier_restock`, `shrinkage`, `return`).
  - Real-time inventory valuation metrics and low-stock indicators.

- **🔔 Audio-Visual Low Stock Alarm**:
  - Web Audio API oscillator alarm that sounds continuous alerts when stock dips below configured thresholds.
  - Dedicated "Test Sound" and "Silence Alarm & Acknowledge" modal.

- **📅 Custom Advance Orders**:
  - Booking modal capturing customer measurements, total estimate, and deposit paid.
  - Progress lifecycle: `Deposit Received` -> `In Progress` -> `Ready for Pickup` -> `Completed`.
  - Balance settlement modal with multi-tender support and final delivery recording.

- **🎂 Customer Birthdays & Loyalty**:
  - Customer directory with month filters and upcoming birthday indicators.
  - 1-click WhatsApp birthday greetings with automatic 10% discount promo codes (`SWAG10`).

- **💸 Operational Expense Tracker**:
  - Expense logging across categories (Store Rent, Electricity, Staff Salaries, Restock Inward, Tea/Snacks).
  - Monthly outflow metrics integrated with store analytics.

- **📊 Comprehensive POS Analytics**:
  - Executive KPI cards: Gross Revenue, Estimated Net Profit, Total Orders, Average Basket Value.
  - Recharts visualizations across 4 sub-tabs:
    1. *Revenue Trends* (Daily sales area chart)
    2. *Category & Products* (Category distribution bar chart & top-selling items)
    3. *Payment Tenders* (Pie chart of Cash vs Card vs QR vs Split)
    4. *P&L Financials* (Gross Sales, Discounts, COGS, Gross Profit, Expenses, Net Operating Profit)

- **💬 WhatsApp Communications Center**:
  - Customer directory synced from recent orders, advance bookings, and birthdays.
  - 4 pre-configured message templates:
    1. Festive collection & restock broadcast
    2. Digital tax receipt share
    3. Birthday greeting with coupon
    4. Advance order ready for pickup notification
  - Live message preview and direct launch in WhatsApp Web.

- **🔒 Enterprise Security**:
  - **Zero client-side database connections**: Browser never talks directly to PostgreSQL.
  - **Strict Row Level Security (RLS)**: Public and anon access revoked on all 11 tables.
  - Salted bcrypt password hashing with `HttpOnly`, `SameSite=lax` signed JWT cookies.
  - Server-side price recalculation (client cart unit prices are never trusted).
  - Monetary values stored in exact **Integer Paise** to prevent floating-point rounding errors.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4
- **Database**: PostgreSQL (Supabase) via Prisma ORM 5.22
- **Authentication**: `jose` (JWT) + `bcryptjs`
- **Validation**: `zod`
- **Barcodes**: `jsbarcode`
- **PDF Generation**: `jspdf`
- **Charts**: `recharts`
- **Icons**: `lucide-react`
- **Audio**: Web Audio API (`AudioContext` oscillators)
- **Typography**: Google Fonts via `next/font`:
  - `Cinzel` (Luxury Brand Display)
  - `DM Sans` (Clean UI text)
  - `Outfit` (Headings & Numerics)
  - `Noto Sans Tamil` (Tamil Language Script)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.17+ or Node.js 20+
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/your-username/swagyard.git
cd swagyard
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Connections (Supabase or any PostgreSQL instance)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Authentication & Security
JWT_SECRET="replace-with-a-random-string-of-at-least-32-characters"

# Default Admin Credentials for Seeding
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
```

> **Note**: If no PostgreSQL server is reachable, Swagyard falls back to a local JSON store (`prisma/dev_db.json`, created from `prisma/seed_data.json`), so you can try it with zero database setup. Once PostgreSQL is connected it is the only source of truth — query errors are raised instead of silently writing to the JSON file.

### 4. Database Setup & Seeding

**Local PostgreSQL with Docker** (matches `DATABASE_URL="postgresql://postgres:<password>@localhost:5432/swagyard_pos"`):
```bash
docker run -d --name swagyard-pg -e POSTGRES_PASSWORD=<password> -e POSTGRES_DB=swagyard_pos   -p 5432:5432 -v swagyard-pg-data:/var/lib/postgresql/data postgres:16-alpine
```

Then apply the migrations and load data:
```bash
npx prisma migrate deploy
npx prisma generate

# Seed data: writes prisma/seed_data.json (the JSON store's starting data)
npm run prisma:seed

# Copy the JSON store (prisma/dev_db.json or the seed) into PostgreSQL, keeping IDs.
# Add --force to wipe and re-import into a non-empty database.
node scripts/import-json-to-postgres.js
```

On Supabase, the init migration also adds deny-all policies for the `anon` role; on plain PostgreSQL those are skipped and row level security stays enabled.

### 5. Run the Application
```bash
# Development mode
npm run dev

# Or production build & start
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) (or specified port) in your browser.

**Default Login Credentials**:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🧪 Testing & Verification

Swagyard includes complete automated test suites:

```bash
# 1. Run Financial & Business Rules Unit Tests (14 assertions)
npm run test:rules

# 2. Run Milestones 1-3 Browser Verification (15 assertions)
node scripts/verify_m1_m3.js

# 3. Run Milestones 4-6 Browser Verification (10 assertions)
node scripts/verify_m4_m6.js
```

---

## 📚 Technical Documentation Index

Detailed audit documentation and specifications are available in the [`docs/`](file:///c:/Users/rathu/Downloads/yolo/docs/) directory:
- [`00-FEATURE-MATRIX.md`](file:///c:/Users/rathu/Downloads/yolo/docs/00-FEATURE-MATRIX.md): Detailed 31-feature verification matrix.
- [`01-PAGE-INVENTORY.md`](file:///c:/Users/rathu/Downloads/yolo/docs/01-PAGE-INVENTORY.md): Comprehensive inventory of all 11 application views and modals.
- [`02-INTERACTION-INVENTORY.md`](file:///c:/Users/rathu/Downloads/yolo/docs/02-INTERACTION-INVENTORY.md): Complete verification log of all interactive controls.
- [`03-DESIGN-TOKENS.md`](file:///c:/Users/rathu/Downloads/yolo/docs/03-DESIGN-TOKENS.md): Color palette, fonts, shadows, radii, and print CSS specs.
- [`04-COPY-DECK.md`](file:///c:/Users/rathu/Downloads/yolo/docs/04-COPY-DECK.md): Full English and Tamil UI copy deck.
- [`05-METRICS.md`](file:///c:/Users/rathu/Downloads/yolo/docs/05-METRICS.md): Formulas for revenue, COGS, gross margin, and inventory valuation.
- [`06-BUSINESS-RULES.md`](file:///c:/Users/rathu/Downloads/yolo/docs/06-BUSINESS-RULES.md): Financial rounding, GST formulas, split tenders, and order state machines.
- [`07-API-AND-DATA-MODEL.md`](file:///c:/Users/rathu/Downloads/yolo/docs/07-API-AND-DATA-MODEL.md): Mermaid ER diagram and schema definitions.
- [`08-ISSUES.md`](file:///c:/Users/rathu/Downloads/yolo/docs/08-ISSUES.md): Security vulnerabilities identified in the reference app and resolved in Swagyard.
- [`09-PARITY-REPORT.md`](file:///c:/Users/rathu/Downloads/yolo/docs/09-PARITY-REPORT.md): Final technical audit and side-by-side parity report.

---

## 📄 License
Private and confidential proprietary retail POS system.
