/*
  # Create Draft Tables for Inventory Management

  This migration adds a complete set of "draft" tables that mirror the published
  inventory tables. The admin inventory app writes directly to draft tables on
  every edit. The published tables (categories, products, etc.) are only updated
  when the admin explicitly clicks "Push Update".

  1. New Tables
    - `draft_categories` - mirrors `categories`
    - `draft_subcategories` - mirrors `subcategories`
    - `draft_products` - mirrors `products`
    - `draft_expiry_items` - mirrors `expiry_items`
    - `draft_flash_sale_items` - mirrors `flash_sale_items`
    - `draft_expiry_settings` - mirrors `expiry_settings`
    - `draft_flash_sale_settings` - mirrors `flash_sale_settings`

  2. Security
    - Enable RLS on all draft tables
    - Public read access for anon and authenticated
    - Full CRUD access for anon (admin operations via anon key)
    - Full access for service_role

  3. Data Initialization
    - Copies all existing published data into draft tables so admin starts
      with the current state rather than an empty view

  4. Important Notes
    - Draft tables have identical column schemas to their published counterparts
    - Foreign keys reference other draft tables (not published tables)
    - ON DELETE CASCADE maintains referential integrity within the draft layer
*/

-- Draft Categories
CREATE TABLE IF NOT EXISTS draft_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE draft_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_categories"
  ON draft_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_categories"
  ON draft_categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_categories"
  ON draft_categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_categories"
  ON draft_categories FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_categories"
  ON draft_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Draft Subcategories
CREATE TABLE IF NOT EXISTS draft_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES draft_categories(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE draft_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_subcategories"
  ON draft_subcategories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_subcategories"
  ON draft_subcategories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_subcategories"
  ON draft_subcategories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_subcategories"
  ON draft_subcategories FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_subcategories"
  ON draft_subcategories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Draft Products
CREATE TABLE IF NOT EXISTS draft_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES draft_categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES draft_subcategories(id) ON DELETE SET NULL,
  parent_product_id uuid REFERENCES draft_products(id) ON DELETE CASCADE,
  name_en text NOT NULL DEFAULT '',
  name_sv text NOT NULL DEFAULT '',
  name_zh text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_sv text NOT NULL DEFAULT '',
  description_zh text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  sale_price numeric,
  image_url text NOT NULL DEFAULT '',
  brand text,
  stock int NOT NULL DEFAULT 0,
  preserve int NOT NULL DEFAULT 0,
  expiration date,
  display_order int NOT NULL DEFAULT 0,
  internal_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  trending boolean NOT NULL DEFAULT false,
  flash boolean NOT NULL DEFAULT false,
  unit text,
  tags text[],
  rating numeric NOT NULL DEFAULT 0,
  reviews int NOT NULL DEFAULT 0,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE draft_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_products"
  ON draft_products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_products"
  ON draft_products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_products"
  ON draft_products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_products"
  ON draft_products FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_products"
  ON draft_products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Draft Expiry Items
CREATE TABLE IF NOT EXISTS draft_expiry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid REFERENCES draft_products(id) ON DELETE SET NULL,
  parent_expiry_item_id uuid REFERENCES draft_expiry_items(id) ON DELETE CASCADE,
  name_en text NOT NULL DEFAULT '',
  name_sv text NOT NULL DEFAULT '',
  name_zh text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_sv text NOT NULL DEFAULT '',
  description_zh text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  sale_price numeric,
  image_url text NOT NULL DEFAULT '',
  brand text,
  expiration date NOT NULL DEFAULT CURRENT_DATE,
  display_order int NOT NULL DEFAULT 0,
  internal_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  stock int NOT NULL DEFAULT 0,
  preserve int NOT NULL DEFAULT 0,
  discount_percentage numeric,
  tags text[],
  rating numeric NOT NULL DEFAULT 0,
  reviews int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE draft_expiry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_expiry_items"
  ON draft_expiry_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_expiry_items"
  ON draft_expiry_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_expiry_items"
  ON draft_expiry_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_expiry_items"
  ON draft_expiry_items FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_expiry_items"
  ON draft_expiry_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Draft Flash Sale Items
CREATE TABLE IF NOT EXISTS draft_flash_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid REFERENCES draft_products(id) ON DELETE SET NULL,
  parent_flash_item_id uuid REFERENCES draft_flash_sale_items(id) ON DELETE CASCADE,
  name_en text NOT NULL DEFAULT '',
  name_sv text NOT NULL DEFAULT '',
  name_zh text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_sv text NOT NULL DEFAULT '',
  description_zh text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  sale_price numeric,
  image_url text NOT NULL DEFAULT '',
  brand text,
  display_order int NOT NULL DEFAULT 0,
  internal_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  stock int NOT NULL DEFAULT 0,
  preserve int NOT NULL DEFAULT 0,
  flash_days int NOT NULL DEFAULT 7,
  flash_start_date date NOT NULL DEFAULT CURRENT_DATE,
  flash_discount_percentage numeric NOT NULL DEFAULT 0,
  tags text[],
  rating numeric NOT NULL DEFAULT 0,
  reviews int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE draft_flash_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_flash_sale_items"
  ON draft_flash_sale_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_flash_sale_items"
  ON draft_flash_sale_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_flash_sale_items"
  ON draft_flash_sale_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_flash_sale_items"
  ON draft_flash_sale_items FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_flash_sale_items"
  ON draft_flash_sale_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Draft Expiry Settings
CREATE TABLE IF NOT EXISTS draft_expiry_settings (
  id int PRIMARY KEY DEFAULT 1,
  threshold_days int NOT NULL DEFAULT 30,
  discount_percentage numeric NOT NULL DEFAULT 50,
  CHECK (id = 1)
);

ALTER TABLE draft_expiry_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_expiry_settings"
  ON draft_expiry_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_expiry_settings"
  ON draft_expiry_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_expiry_settings"
  ON draft_expiry_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_expiry_settings"
  ON draft_expiry_settings FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_expiry_settings"
  ON draft_expiry_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Draft Flash Sale Settings
CREATE TABLE IF NOT EXISTS draft_flash_sale_settings (
  id int PRIMARY KEY DEFAULT 1,
  default_flash_days int NOT NULL DEFAULT 7,
  default_discount_percentage numeric NOT NULL DEFAULT 30,
  CHECK (id = 1)
);

ALTER TABLE draft_flash_sale_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR DELETE TO anon USING (true);
CREATE POLICY "Service role can manage draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed draft tables from published tables (one-time copy)
INSERT INTO draft_categories (id, name, image_url, display_order, created_at)
  SELECT id, name, image_url, display_order, created_at FROM categories;

INSERT INTO draft_subcategories (id, category_id, name, display_order, created_at)
  SELECT id, category_id, name, display_order, created_at FROM subcategories;

-- Insert parent products first (no parent_product_id)
INSERT INTO draft_products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, stock, preserve, expiration, display_order, internal_order, visible, trending, flash, unit, tags, rating, reviews, is_best_seller, is_new, created_at)
  SELECT id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, stock, preserve, expiration, display_order, internal_order, visible, trending, flash, unit, tags, rating, reviews, is_best_seller, is_new, created_at
  FROM products WHERE parent_product_id IS NULL;

-- Insert child products (with parent_product_id)
INSERT INTO draft_products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, stock, preserve, expiration, display_order, internal_order, visible, trending, flash, unit, tags, rating, reviews, is_best_seller, is_new, created_at)
  SELECT id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, stock, preserve, expiration, display_order, internal_order, visible, trending, flash, unit, tags, rating, reviews, is_best_seller, is_new, created_at
  FROM products WHERE parent_product_id IS NOT NULL;

-- Insert parent expiry items first
INSERT INTO draft_expiry_items (id, source_product_id, parent_expiry_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, expiration, display_order, internal_order, visible, stock, preserve, discount_percentage, tags, rating, reviews, created_at)
  SELECT id, source_product_id, parent_expiry_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, expiration, display_order, internal_order, visible, stock, preserve, discount_percentage, tags, rating, reviews, created_at
  FROM expiry_items WHERE parent_expiry_item_id IS NULL;

-- Insert child expiry items
INSERT INTO draft_expiry_items (id, source_product_id, parent_expiry_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, expiration, display_order, internal_order, visible, stock, preserve, discount_percentage, tags, rating, reviews, created_at)
  SELECT id, source_product_id, parent_expiry_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, expiration, display_order, internal_order, visible, stock, preserve, discount_percentage, tags, rating, reviews, created_at
  FROM expiry_items WHERE parent_expiry_item_id IS NOT NULL;

-- Insert parent flash sale items first
INSERT INTO draft_flash_sale_items (id, source_product_id, parent_flash_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, internal_order, visible, stock, preserve, flash_days, flash_start_date, flash_discount_percentage, tags, rating, reviews, created_at)
  SELECT id, source_product_id, parent_flash_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, internal_order, visible, stock, preserve, flash_days, flash_start_date, flash_discount_percentage, tags, rating, reviews, created_at
  FROM flash_sale_items WHERE parent_flash_item_id IS NULL;

-- Insert child flash sale items
INSERT INTO draft_flash_sale_items (id, source_product_id, parent_flash_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, internal_order, visible, stock, preserve, flash_days, flash_start_date, flash_discount_percentage, tags, rating, reviews, created_at)
  SELECT id, source_product_id, parent_flash_item_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, internal_order, visible, stock, preserve, flash_days, flash_start_date, flash_discount_percentage, tags, rating, reviews, created_at
  FROM flash_sale_items WHERE parent_flash_item_id IS NOT NULL;

-- Seed draft settings
INSERT INTO draft_expiry_settings (id, threshold_days, discount_percentage)
  SELECT id, threshold_days, discount_percentage FROM expiry_settings;

INSERT INTO draft_flash_sale_settings (id, default_flash_days, default_discount_percentage)
  SELECT id, default_flash_days, default_discount_percentage FROM flash_sale_settings;
