/*
  # Create Inventory Management Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text) - category display name
      - `image_url` (text) - circular thumbnail image URL for frontend
      - `display_order` (int) - ordering in frontend category section
      - `created_at` (timestamptz)
    - `subcategories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, FK to categories)
      - `name` (text) - subcategory display name
      - `display_order` (int) - ordering within parent category
      - `created_at` (timestamptz)
    - `products`
      - `id` (uuid, primary key)
      - `category_id` (uuid, FK to categories)
      - `subcategory_id` (uuid, FK to subcategories, nullable)
      - `parent_product_id` (uuid, FK self-ref, nullable) - for variants
      - `name_en`, `name_sv`, `name_zh` (text) - multi-language names
      - `description_en`, `description_sv`, `description_zh` (text) - multi-language descriptions
      - `price` (numeric) - regular price (black text in frontend)
      - `sale_price` (numeric, nullable) - discounted price (red text in frontend)
      - `image_url` (text) - product image
      - `brand` (text, nullable)
      - `stock` (int, default 0)
      - `preserve` (int, default 0) - reserved, not connected to frontend yet
      - `expiration` (date, nullable)
      - `display_order` (int) - controls card order on frontend pages
      - `internal_order` (int, default 0) - variant ordering within parent
      - `visible` (boolean, default true)
      - `trending` (boolean, default false)
      - `flash` (boolean, default false)
      - `unit` (text, nullable) - e.g. "/ lb"
      - `tags` (text[], nullable)
      - `rating` (numeric, default 0)
      - `reviews` (int, default 0)
      - `is_best_seller` (boolean, default false)
      - `is_new` (boolean, default false)
      - `created_at` (timestamptz)
    - `expiry_items`
      - `id` (uuid, primary key)
      - `source_product_id` (uuid, FK to products, nullable)
      - `parent_expiry_item_id` (uuid, FK self-ref, nullable)
      - Multi-language name/description fields
      - `price`, `sale_price`, `image_url`, `expiration`, `display_order`, etc.
      - `discount_percentage` (numeric, nullable)
    - `flash_sale_items`
      - `id` (uuid, primary key)
      - `source_product_id` (uuid, FK to products, nullable)
      - `parent_flash_item_id` (uuid, FK self-ref, nullable)
      - Multi-language name/description fields
      - `price`, `sale_price`, `image_url`, `display_order`, etc.
      - `flash_days`, `flash_start_date`, `flash_discount_percentage`
    - `expiry_settings` (single row)
      - `id` (int, default 1)
      - `threshold_days`, `discount_percentage`
    - `flash_sale_settings` (single row)
      - `id` (int, default 1)
      - `default_flash_days`, `default_discount_percentage`

  2. Security
    - Enable RLS on all tables
    - Add SELECT policy for anon (public read)
    - Add full access policy for service_role
*/

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage categories"
  ON categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subcategories"
  ON subcategories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage subcategories"
  ON subcategories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  parent_product_id uuid REFERENCES products(id) ON DELETE CASCADE,
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

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage products"
  ON products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Expiry items table
CREATE TABLE IF NOT EXISTS expiry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  parent_expiry_item_id uuid REFERENCES expiry_items(id) ON DELETE CASCADE,
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

ALTER TABLE expiry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read expiry_items"
  ON expiry_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage expiry_items"
  ON expiry_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Flash sale items table
CREATE TABLE IF NOT EXISTS flash_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  parent_flash_item_id uuid REFERENCES flash_sale_items(id) ON DELETE CASCADE,
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

ALTER TABLE flash_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flash_sale_items"
  ON flash_sale_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage flash_sale_items"
  ON flash_sale_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Expiry settings (single row)
CREATE TABLE IF NOT EXISTS expiry_settings (
  id int PRIMARY KEY DEFAULT 1,
  threshold_days int NOT NULL DEFAULT 30,
  discount_percentage numeric NOT NULL DEFAULT 50,
  CHECK (id = 1)
);

ALTER TABLE expiry_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read expiry_settings"
  ON expiry_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage expiry_settings"
  ON expiry_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO expiry_settings (id, threshold_days, discount_percentage) VALUES (1, 30, 50);

-- Flash sale settings (single row)
CREATE TABLE IF NOT EXISTS flash_sale_settings (
  id int PRIMARY KEY DEFAULT 1,
  default_flash_days int NOT NULL DEFAULT 7,
  default_discount_percentage numeric NOT NULL DEFAULT 30,
  CHECK (id = 1)
);

ALTER TABLE flash_sale_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flash_sale_settings"
  ON flash_sale_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage flash_sale_settings"
  ON flash_sale_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO flash_sale_settings (id, default_flash_days, default_discount_percentage) VALUES (1, 7, 30);

-- Add anon INSERT/UPDATE/DELETE policies for admin operations from frontend
-- (since the inventory UI uses the anon key, we need write access for anon too)
CREATE POLICY "Anon can insert categories"
  ON categories FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update categories"
  ON categories FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete categories"
  ON categories FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert subcategories"
  ON subcategories FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update subcategories"
  ON subcategories FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete subcategories"
  ON subcategories FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert products"
  ON products FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update products"
  ON products FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete products"
  ON products FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert expiry_items"
  ON expiry_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update expiry_items"
  ON expiry_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete expiry_items"
  ON expiry_items FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert flash_sale_items"
  ON flash_sale_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update flash_sale_items"
  ON flash_sale_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete flash_sale_items"
  ON flash_sale_items FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert expiry_settings"
  ON expiry_settings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update expiry_settings"
  ON expiry_settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete expiry_settings"
  ON expiry_settings FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon can insert flash_sale_settings"
  ON flash_sale_settings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update flash_sale_settings"
  ON flash_sale_settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete flash_sale_settings"
  ON flash_sale_settings FOR DELETE
  TO anon
  USING (true);
