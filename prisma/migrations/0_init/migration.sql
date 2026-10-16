-- Swagyard POS Master PostgreSQL Migration with Row Level Security (RLS)
-- Decision 2: Enable RLS on every table with NO public/anon policies; browser must never talk to DB directly.

-- 1. USERS
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'cashier',
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ta" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_ta" TEXT,
    "category_id" INTEGER,
    "price_in_paise" INTEGER NOT NULL DEFAULT 0,
    "cost_in_paise" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_alert" INTEGER NOT NULL DEFAULT 5,
    "sku" TEXT,
    "barcode" TEXT,
    "has_variants" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "products_barcode_key" ON "products"("barcode");

-- 4. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_name" TEXT NOT NULL,
    "size_label" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "cost_in_paise" INTEGER,
    "mrp_in_paise" INTEGER,
    "price_in_paise" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_sku_key" ON "product_variants"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_barcode_key" ON "product_variants"("barcode");

-- 5. BARCODE REGISTRY
CREATE TABLE IF NOT EXISTS "barcode_registry" (
    "id" SERIAL NOT NULL,
    "barcode_value" TEXT NOT NULL,
    "product_id" INTEGER,
    "variant_id" INTEGER,
    "entity_type" TEXT NOT NULL DEFAULT 'product',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "barcode_registry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "barcode_registry_barcode_value_key" ON "barcode_registry"("barcode_value");

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "customer_name" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "subtotal_in_paise" INTEGER NOT NULL DEFAULT 0,
    "coupon_code" TEXT,
    "coupon_discount_paise" INTEGER NOT NULL DEFAULT 0,
    "manual_discount_paise" INTEGER NOT NULL DEFAULT 0,
    "total_gst_paise" INTEGER NOT NULL DEFAULT 0,
    "gst_enabled" BOOLEAN NOT NULL DEFAULT false,
    "delivery_charge_paise" INTEGER NOT NULL DEFAULT 0,
    "total_in_paise" INTEGER NOT NULL DEFAULT 0,
    "payment_mode" TEXT NOT NULL DEFAULT 'cash',
    "split_details" JSONB,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "remarks" TEXT,
    "reference_number" TEXT,
    "cashier_name" TEXT DEFAULT 'Admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_invoice_no_key" ON "orders"("invoice_no");

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" INTEGER,
    "variant_id" INTEGER,
    "product_name" TEXT NOT NULL,
    "category" TEXT,
    "unit_price_in_paise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "line_total_in_paise" INTEGER NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 8. COUPONS
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "min_order_paise" INTEGER NOT NULL DEFAULT 0,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "expiry_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");

-- 9. EXPENSES
CREATE TABLE IF NOT EXISTS "expenses" (
    "id" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" INTEGER,
    "category_name" TEXT NOT NULL,
    "amount_in_paise" INTEGER NOT NULL,
    "payment_mode" TEXT NOT NULL DEFAULT 'cash',
    "recorded_by_name" TEXT NOT NULL DEFAULT 'Admin',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- 10. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");

-- 11. INVENTORY MOVEMENTS
CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "variant_id" INTEGER,
    "previous_stock" INTEGER NOT NULL,
    "new_stock" INTEGER NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_name" TEXT NOT NULL DEFAULT 'Admin',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inventory_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 12. ADVANCE ORDERS
CREATE TABLE IF NOT EXISTS "advance_orders" (
    "id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "product_name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "total_amount_paise" INTEGER NOT NULL,
    "deposit_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "remaining_balance_paise" INTEGER NOT NULL DEFAULT 0,
    "deposit_payment_mode" TEXT NOT NULL DEFAULT 'cash',
    "expected_delivery_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending_deposit',
    "reference_number" TEXT,
    "remarks" TEXT,
    "completed_order_id" TEXT,
    "invoice_no" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "advance_orders_pkey" PRIMARY KEY ("id")
);

-- 13. ADVANCE ORDER PAYMENTS
CREATE TABLE IF NOT EXISTS "advance_order_payments" (
    "id" SERIAL NOT NULL,
    "advance_order_id" TEXT NOT NULL,
    "amount_in_paise" INTEGER NOT NULL,
    "payment_mode" TEXT NOT NULL DEFAULT 'cash',
    "split_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "advance_order_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "advance_order_payments_advance_order_id_fkey" FOREIGN KEY ("advance_order_id") REFERENCES "advance_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 14. ADVANCE ORDER TIMELINE
CREATE TABLE IF NOT EXISTS "advance_order_timeline" (
    "id" SERIAL NOT NULL,
    "advance_order_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "advance_order_timeline_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "advance_order_timeline_advance_order_id_fkey" FOREIGN KEY ("advance_order_id") REFERENCES "advance_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 15. CUSTOMER BIRTHDAYS
CREATE TABLE IF NOT EXISTS "customer_birthdays" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_birthdays_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "customer_birthdays_phone_key" ON "customer_birthdays"("phone");

-- 16. INVOICE SEQUENCES
CREATE TABLE IF NOT EXISTS "invoice_sequences" (
    "id" TEXT NOT NULL,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- MANDATORY REQUIREMENT: Enable RLS on every table with NO public/anon access.
-- All database operations execute through Next.js server-side service role.
-- =========================================================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "barcode_registry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "advance_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "advance_order_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "advance_order_timeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_birthdays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_sequences" ENABLE ROW LEVEL SECURITY;

-- Deny all direct public/anon access on all tables
-- (Server connects with authenticated service role or direct connection)
-- The anon role only exists on Supabase; on plain PostgreSQL these policies are skipped
-- (RLS stays enabled above, so non-owner roles still get no access).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    DROP POLICY IF EXISTS "no_anon_users" ON "users";
    CREATE POLICY "no_anon_users" ON "users" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_categories" ON "categories";
    CREATE POLICY "no_anon_categories" ON "categories" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_products" ON "products";
    CREATE POLICY "no_anon_products" ON "products" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_variants" ON "product_variants";
    CREATE POLICY "no_anon_variants" ON "product_variants" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_barcodes" ON "barcode_registry";
    CREATE POLICY "no_anon_barcodes" ON "barcode_registry" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_orders" ON "orders";
    CREATE POLICY "no_anon_orders" ON "orders" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_order_items" ON "order_items";
    CREATE POLICY "no_anon_order_items" ON "order_items" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_coupons" ON "coupons";
    CREATE POLICY "no_anon_coupons" ON "coupons" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_expenses" ON "expenses";
    CREATE POLICY "no_anon_expenses" ON "expenses" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_expense_cats" ON "expense_categories";
    CREATE POLICY "no_anon_expense_cats" ON "expense_categories" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_movements" ON "inventory_movements";
    CREATE POLICY "no_anon_movements" ON "inventory_movements" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_advance_orders" ON "advance_orders";
    CREATE POLICY "no_anon_advance_orders" ON "advance_orders" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_advance_payments" ON "advance_order_payments";
    CREATE POLICY "no_anon_advance_payments" ON "advance_order_payments" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_advance_timeline" ON "advance_order_timeline";
    CREATE POLICY "no_anon_advance_timeline" ON "advance_order_timeline" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_birthdays" ON "customer_birthdays";
    CREATE POLICY "no_anon_birthdays" ON "customer_birthdays" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "no_anon_sequences" ON "invoice_sequences";
    CREATE POLICY "no_anon_sequences" ON "invoice_sequences" FOR ALL TO anon USING (false);
  END IF;
END
$$;
