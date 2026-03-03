/*
  # Add data validation constraints

  1. Changes
    - Add CHECK constraints for price >= 0 on products, expiry_items, flash_sale_items and their draft counterparts
    - Add CHECK constraints for sale_price >= 0 (when not null)
    - Add CHECK constraints for stock >= 0 on all relevant tables
    - Add CHECK constraints for rating between 0 and 5
    - Add CHECK constraints for reviews >= 0
    - Add CHECK constraints for discount_percentage between 0 and 100
    - Add CHECK constraints for flash_discount_percentage between 0 and 100

  2. Important Notes
    - All constraints use IF NOT EXISTS pattern via DO blocks to be safe for re-runs
    - These constraints prevent invalid data from being inserted regardless of the client
*/

-- products table constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT products_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sale_price_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT products_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_rating_range') THEN
    ALTER TABLE products ADD CONSTRAINT products_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_reviews_non_negative') THEN
    ALTER TABLE products ADD CONSTRAINT products_reviews_non_negative CHECK (reviews >= 0);
  END IF;
END $$;

-- expiry_items table constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_price_non_negative') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_sale_price_non_negative') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_stock_non_negative') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_stock_non_negative CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_discount_range') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_discount_range CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_rating_range') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expiry_items_reviews_non_negative') THEN
    ALTER TABLE expiry_items ADD CONSTRAINT expiry_items_reviews_non_negative CHECK (reviews >= 0);
  END IF;
END $$;

-- flash_sale_items table constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_price_non_negative') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_sale_price_non_negative') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_stock_non_negative') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_stock_non_negative CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_discount_range') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_discount_range CHECK (flash_discount_percentage >= 0 AND flash_discount_percentage <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_rating_range') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flash_items_reviews_non_negative') THEN
    ALTER TABLE flash_sale_items ADD CONSTRAINT flash_items_reviews_non_negative CHECK (reviews >= 0);
  END IF;
END $$;

-- draft_products table constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_products_price_non_negative') THEN
    ALTER TABLE draft_products ADD CONSTRAINT draft_products_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_products_sale_price_non_negative') THEN
    ALTER TABLE draft_products ADD CONSTRAINT draft_products_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_products_stock_non_negative') THEN
    ALTER TABLE draft_products ADD CONSTRAINT draft_products_stock_non_negative CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_products_rating_range') THEN
    ALTER TABLE draft_products ADD CONSTRAINT draft_products_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_products_reviews_non_negative') THEN
    ALTER TABLE draft_products ADD CONSTRAINT draft_products_reviews_non_negative CHECK (reviews >= 0);
  END IF;
END $$;

-- draft_expiry_items table constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_price_non_negative') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_sale_price_non_negative') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_stock_non_negative') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_stock_non_negative CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_discount_range') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_discount_range CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_rating_range') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_expiry_items_reviews_non_negative') THEN
    ALTER TABLE draft_expiry_items ADD CONSTRAINT draft_expiry_items_reviews_non_negative CHECK (reviews >= 0);
  END IF;
END $$;

-- draft_flash_sale_items table constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_price_non_negative') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_sale_price_non_negative') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_sale_price_non_negative CHECK (sale_price IS NULL OR sale_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_stock_non_negative') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_stock_non_negative CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_discount_range') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_discount_range CHECK (flash_discount_percentage >= 0 AND flash_discount_percentage <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_rating_range') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_rating_range CHECK (rating >= 0 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'draft_flash_items_reviews_non_negative') THEN
    ALTER TABLE draft_flash_sale_items ADD CONSTRAINT draft_flash_items_reviews_non_negative CHECK (reviews >= 0);
  END IF;
END $$;

-- user_order_items price constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_non_negative') THEN
    ALTER TABLE user_order_items ADD CONSTRAINT order_items_price_non_negative CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive') THEN
    ALTER TABLE user_order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;

-- user_orders total constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_non_negative') THEN
    ALTER TABLE user_orders ADD CONSTRAINT orders_total_non_negative CHECK (total >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_points_amount_non_negative') THEN
    ALTER TABLE user_orders ADD CONSTRAINT orders_points_amount_non_negative CHECK (points_amount >= 0);
  END IF;
END $$;
