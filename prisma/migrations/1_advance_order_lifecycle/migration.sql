-- Advance order lifecycle: deposit IDs, completion details, typed payments
ALTER TABLE "advance_orders" ADD COLUMN IF NOT EXISTS "deposit_id" TEXT;
ALTER TABLE "advance_orders" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);
ALTER TABLE "advance_orders" ADD COLUMN IF NOT EXISTS "final_payment_mode" TEXT;
ALTER TABLE "advance_orders" ADD COLUMN IF NOT EXISTS "final_split_details" JSONB;
ALTER TABLE "advance_orders" ADD COLUMN IF NOT EXISTS "created_by_name" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "advance_orders_deposit_id_key" ON "advance_orders"("deposit_id");

ALTER TABLE "advance_order_payments" ADD COLUMN IF NOT EXISTS "payment_type" TEXT NOT NULL DEFAULT 'deposit';
ALTER TABLE "advance_order_payments" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Map legacy statuses onto the current lifecycle
UPDATE "advance_orders" SET "status" = 'pending_deposit' WHERE "status" IN ('deposit_received', 'in_progress');
UPDATE "advance_orders" SET "status" = 'waiting_final_payment' WHERE "status" = 'customer_contacted';
UPDATE "advance_orders" SET "status" = 'ready_for_delivery' WHERE "status" = 'ready_for_pickup';
