/*
  # Add preserve column CHECK constraints

  1. Changes
    - Add CHECK constraints ensuring `preserve >= 0 AND preserve <= stock` on:
      - `products`
      - `expiry_items`
      - `flash_sale_items`
    - Same constraints on draft tables:
      - `draft_products`
      - `draft_expiry_items`
      - `draft_flash_sale_items`

  2. Purpose
    - Prevents stock overselling at the database level
    - Acts as a safety net against race conditions in concurrent order placement
    - Ensures the reserved quantity (preserve) can never exceed available stock

  3. Important Notes
    - Uses IF NOT EXISTS pattern for safe re-runs
    - These constraints complement the existing stock_non_negative constraints
    - If a concurrent UPDATE tries to push preserve above stock, the constraint violation
      causes the transaction to roll back, preventing overselling
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_preserve_within_stock') THEN
    ALTER TABLE products ADD CONSTRAINT products_preserve_within_stock CHECK (preserve >= 0 AND preserve <= stock);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_preserve_within_stock') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_preserve_within_stock CHECK (preserve >= 0 AND preserve <= stock);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_preserve_within_stock') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_preserve_within_stock CHECK (preserve >= 0 AND preserve <= stock);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_products_preserve_within_stock') THEN
    ALTER TABLE draft_products ADD CONSTRAINT draft_products_preserve_within_stock CHECK (preserve >= 0 AND preserve <= stock);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_preserve_within_stock') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_preserve_within_stock CHECK (preserve >= 0 AND preserve <= stock);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_preserve_within_stock') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_preserve_within_stock CHECK (preserve >= 0 AND preserve <= stock);
  END IF;
END $$;
