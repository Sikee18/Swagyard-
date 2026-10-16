# 03 - Design Tokens & Visual Design System Specification

This document extracts and defines the complete design system of the reference retail POS application (`one-clothing.vercel.app`).
All font families, font weights, color palettes, spacing scales, border radii, shadows, breakpoints, and print styles must be replicated identically in the new implementation.

---

## 1. Typography & Font System (Exact Parity)

### External Google Fonts Link (from Network & Head)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Noto+Sans+Tamil:wght@400;500;600;700&family=Outfit:wght@100..900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Tamil:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Font Stacks
1. **Primary Body & UI Elements**:
   - `font-family: "DM Sans", Outfit, "Noto Sans Tamil", system-ui, -apple-system, sans-serif;`
2. **Brand / Luxury Heading Elements**:
   - `font-family: Cinzel, "Playfair Display", serif;`
3. **Monospace (Barcodes, SKUs, Technical IDs)**:
   - `font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;`

### Font Weights
- `400`: Regular / Body copy / Table cells
- `500`: Medium / Form labels / Nav links
- `600`: SemiBold / Card headers / Badge text / Button labels
- `700`: Bold / Metric values / Section titles
- `900`: Black / Luxury brand titles / Active POS tabs

### Font Size Scale
- Micro / Badges: `8px`, `8.5px`, `10px`
- Caption / Help text: `11px`, `11.235px`, `12px`
- Body & Inputs: `13px`, `14px`, `14.98px`, `15px`
- Subheadings & Card Titles: `16.85px`, `18.725px`
- Section Titles & Modal Headings: `22.47px`, `24px`
- Hero / Page Titles: `28px`, `32px`

---

## 2. Color Palette & CSS Variables

### CSS Custom Properties on `:root`
```css
:root {
  /* Dark Luxury Base */
  --brand-blue: #111111;         /* Main Header, Sidebar & Dark Base */
  --brand-blue-hover: #262626;   /* Active / Hover dark state */
  --brand-blue-light: #FAF7F2;   /* Main background: Warm Ivory / Paper */
  --brand-blue-surface: #F1EBE0; /* Secondary surface: Warm Sand */

  /* Gold Luxury Accent */
  --brand-gold: #C9B79C;         /* Primary Brand Gold Accent */
  --brand-gold-rich: #C9B79C;    /* Accent highlight */
  --brand-gold-deep: #7A6A4F;    /* Dark muted gold for outlines / text */
  --brand-gold-hover: #A8946F;   /* Darker gold on interaction */
  --brand-gold-glow: #F1EBE0;    /* Soft gold glow tint */
  --brand-gold-border: #C9B79C;  /* Active borders */

  /* Surface & Text */
  --brand-surface: #FAF7F2;      /* Default page background */
  --brand-text-dark: #1F1F1F;    /* Dark high-contrast text */
  --brand-text-muted: #6B7280;   /* Muted secondary labels */
}
```

### Complete Color Swatches
| Semantic Token | Hex Code | Usage |
|---|---|---|
| Dark Base / Header | `#111111` | Header bar, sidebar background, dark cards |
| Dark Surface | `#262626` | Active sidebar item background, table dark header |
| Luxury Gold Primary | `#C9B79C` | Active border, buttons, brand badge, gold accents |
| Luxury Gold Deep | `#7A6A4F` | Inactive borders, dark gold text |
| Luxury Gold Hover | `#A8946F` | Button hover state |
| Paper Ivory Surface | `#FAF7F2` | Main page canvas background, modal backgrounds |
| Sand Surface Secondary | `#F1EBE0` | Card background, input background, table row hover |
| Text Primary | `#1F1F1F` | Primary text headings, product titles |
| Text Muted | `#6B7280` | Placeholder text, secondary metadata |
| Status Success | `#16A34A` / `#22C55E` | Order completed, payment received, stock in-stock |
| Status Warning | `#D97706` / `#F59E0B` | Pending deposit, customer contacted |
| Status Danger / Alert | `#DC2626` / `#EF4444` | Low stock alarm, cancelled order, delete action |

---

## 3. Border Radii & Elevation (Shadows)

### Border Radii Scale
- `rounded-xs`: `3.745px` (Badges, small tags)
- `rounded-sm`: `5.6175px` (Table cell chips)
- `rounded-md`: `7.49px` (Search inputs, buttons, variant tags)
- `rounded-lg`: `11.235px` / `12px` (Cards, product grid items, modals)
- `rounded-xl`: `14.98px` (Checkout drawers, primary modal containers)
- `rounded-2xl`: `22.47px` (Dialog panels)
- `rounded-full`: `9999px` (Avatars, pills, circular icon toggles)

### Box Shadows & Elevation
- **Card Shadow**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **Dropdown / Popup**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- **Modal / Floating Drawer**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
- **Gold Glow (Login Card & Modals)**: `0 0 40px 0 rgba(201, 183, 156, 0.15), 0 20px 50px 0 rgba(0, 0, 0, 0.5)`

---

## 4. Breakpoints & Responsive Behavior

| Breakpoint | Window Width | Observed Layout Adjustments |
|---|---|---|
| Mobile (`< 768px`) | `375px` | Sidebar collapses to bottom navigation bar / hamburger drawer; product grid switches to 1 or 2 columns; cart moves to slide-up drawer. |
| Tablet (`768px - 1023px`) | `768px` | Sidebar displays compact icon-only view; catalog grid switches to 3 columns; order history table enables horizontal scroll. |
| Desktop (`1024px - 1279px`) | `1024px` | Full sidebar with text labels; 2-column POS layout (catalog on left, cart drawer on right). |
| Wide Desktop (`>= 1280px`) | `1280px+` | Expanded catalog grid (4-5 columns), wide table displays, spacious modal dialogs. |

---

## 5. Icon Library
- **Library**: `Lucide React` (inlined optimized SVGs).
- **Icons observed**:
  - Navigation: `ShoppingBag`, `Boxes`, `CalendarClock`, `Cake`, `ReceiptText`, `History`, `BarChart3`, `Tag`, `LogOut`.
  - Actions: `Search`, `Plus`, `Minus`, `Trash2`, `Printer`, `Download`, `Share2`, `Check`, `X`, `Volume2`, `VolumeX`, `Maximize`, `Eye`, `EyeOff`.
  - Payment: `Banknote`, `CreditCard`, `QrCode`, `Split`.

---

## 6. Print Styles (Thermal Receipts & Invoices)

```css
@media print {
  @page {
    size: auto;
    margin: 8mm 10mm;
  }
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  aside, nav, button, .no-print {
    display: none !important;
  }
  .print\:m-0 {
    margin: 0 !important;
  }
}
```
- **Thermal Receipt (58mm / 80mm)**:
  - Fixed monospace/sans layout, centered header, store details, dashed horizontal dividers (`--------------------------------`), tabular line items (`Item`, `Qty`, `Price`), subtotal, coupon discount, GST breakdown, grand total, and barcode footer.

---

## 7. Raw Console Extraction Output (Requirement 1C)

Below is the verified output from the browser console execution across the key views:

```json
{
  "url": "https://one-clothing.vercel.app/dashboard",
  "loadedFonts": [
    "DM Sans 400 normal",
    "DM Sans 500 normal",
    "DM Sans 600 normal",
    "DM Sans 700 normal",
    "DM Sans 900 normal",
    "Outfit 400 normal",
    "Outfit 600 normal",
    "Outfit 700 normal",
    "Cinzel 400 normal",
    "Cinzel 700 normal",
    "Noto Sans Tamil 400 normal",
    "Noto Sans Tamil 700 normal"
  ],
  "fontFamilies": [
    "\"DM Sans\", Outfit, \"Noto Sans Tamil\", system-ui, -apple-system, sans-serif",
    "\"DM Sans\", Outfit, \"Noto Sans Tamil\", sans-serif",
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  ],
  "fontSizes": [
    "8px", "8.5px", "10px", "11px", "11.235px", "12px", "13px", "14px", "14.98px", "15px", "16.85px", "18.725px", "22.47px", "24px", "28px"
  ],
  "fontWeights": [
    "400", "500", "600", "700", "900"
  ],
  "textColors": [
    "rgb(17, 17, 17)", "rgb(31, 31, 31)", "rgb(107, 114, 128)", "rgb(201, 183, 156)", "rgb(255, 255, 255)", "rgb(220, 38, 38)", "rgb(22, 163, 74)"
  ],
  "backgrounds": [
    "rgb(17, 17, 17)", "rgb(38, 38, 38)", "rgb(250, 247, 242)", "rgb(241, 235, 224)", "rgb(201, 183, 156)", "rgb(255, 255, 255)", "rgba(0, 0, 0, 0.75)"
  ],
  "borderRadii": [
    "0px", "3.745px", "5.6175px", "7.49px", "11.235px", "12px", "14.98px", "22.47px", "9999px"
  ],
  "shadows": [
    "none",
    "rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
    "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px",
    "rgba(0, 0, 0, 0.5) 0px 20px 50px 0px, rgba(201, 183, 156, 0.15) 0px 0px 40px 0px"
  ]
}
```
