/*
  # Lock down all inventory tables - admin-only writes

  1. Tables Modified (14 total)
    Live tables: categories, subcategories, products, expiry_items, expiry_settings, flash_sale_items, flash_sale_settings
    Draft tables: draft_categories, draft_subcategories, draft_products, draft_expiry_items, draft_expiry_settings, draft_flash_sale_items, draft_flash_sale_settings

  2. Policy Changes per table
    - DROP "Anon can insert <table>" - removes anonymous write access
    - DROP "Anon can update <table>" - removes anonymous update access
    - DROP "Anon can delete <table>" - removes anonymous delete access
    - ADD "Admins can insert <table>" - authenticated admin-only insert
    - ADD "Admins can update <table>" - authenticated admin-only update
    - ADD "Admins can delete <table>" - authenticated admin-only delete
    - KEEP "Anyone can read <table>" - public read access unchanged (customer app needs this)
    - KEEP "Service role can manage <table>" - service role access unchanged

  3. Security
    - All inventory write operations now require authenticated admin user
    - Anonymous users can still read product data for the customer app
    - Service role retains full access for server-side operations
*/

-- ============================================================
-- categories
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert categories" ON categories;
DROP POLICY IF EXISTS "Anon can update categories" ON categories;
DROP POLICY IF EXISTS "Anon can delete categories" ON categories;

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- subcategories
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert subcategories" ON subcategories;
DROP POLICY IF EXISTS "Anon can update subcategories" ON subcategories;
DROP POLICY IF EXISTS "Anon can delete subcategories" ON subcategories;

CREATE POLICY "Admins can insert subcategories"
  ON subcategories FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update subcategories"
  ON subcategories FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subcategories"
  ON subcategories FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- products
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert products" ON products;
DROP POLICY IF EXISTS "Anon can update products" ON products;
DROP POLICY IF EXISTS "Anon can delete products" ON products;

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- expiry_items
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert expiry_items" ON expiry_items;
DROP POLICY IF EXISTS "Anon can update expiry_items" ON expiry_items;
DROP POLICY IF EXISTS "Anon can delete expiry_items" ON expiry_items;

CREATE POLICY "Admins can insert expiry_items"
  ON expiry_items FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update expiry_items"
  ON expiry_items FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete expiry_items"
  ON expiry_items FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- expiry_settings
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert expiry_settings" ON expiry_settings;
DROP POLICY IF EXISTS "Anon can update expiry_settings" ON expiry_settings;
DROP POLICY IF EXISTS "Anon can delete expiry_settings" ON expiry_settings;

CREATE POLICY "Admins can insert expiry_settings"
  ON expiry_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update expiry_settings"
  ON expiry_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete expiry_settings"
  ON expiry_settings FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- flash_sale_items
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert flash_sale_items" ON flash_sale_items;
DROP POLICY IF EXISTS "Anon can update flash_sale_items" ON flash_sale_items;
DROP POLICY IF EXISTS "Anon can delete flash_sale_items" ON flash_sale_items;

CREATE POLICY "Admins can insert flash_sale_items"
  ON flash_sale_items FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update flash_sale_items"
  ON flash_sale_items FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete flash_sale_items"
  ON flash_sale_items FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- flash_sale_settings
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert flash_sale_settings" ON flash_sale_settings;
DROP POLICY IF EXISTS "Anon can update flash_sale_settings" ON flash_sale_settings;
DROP POLICY IF EXISTS "Anon can delete flash_sale_settings" ON flash_sale_settings;

CREATE POLICY "Admins can insert flash_sale_settings"
  ON flash_sale_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update flash_sale_settings"
  ON flash_sale_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete flash_sale_settings"
  ON flash_sale_settings FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_categories
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_categories" ON draft_categories;
DROP POLICY IF EXISTS "Anon can update draft_categories" ON draft_categories;
DROP POLICY IF EXISTS "Anon can delete draft_categories" ON draft_categories;

CREATE POLICY "Admins can insert draft_categories"
  ON draft_categories FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_categories"
  ON draft_categories FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_categories"
  ON draft_categories FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_subcategories
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_subcategories" ON draft_subcategories;
DROP POLICY IF EXISTS "Anon can update draft_subcategories" ON draft_subcategories;
DROP POLICY IF EXISTS "Anon can delete draft_subcategories" ON draft_subcategories;

CREATE POLICY "Admins can insert draft_subcategories"
  ON draft_subcategories FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_subcategories"
  ON draft_subcategories FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_subcategories"
  ON draft_subcategories FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_products
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_products" ON draft_products;
DROP POLICY IF EXISTS "Anon can update draft_products" ON draft_products;
DROP POLICY IF EXISTS "Anon can delete draft_products" ON draft_products;

CREATE POLICY "Admins can insert draft_products"
  ON draft_products FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_products"
  ON draft_products FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_products"
  ON draft_products FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_expiry_items
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_expiry_items" ON draft_expiry_items;
DROP POLICY IF EXISTS "Anon can update draft_expiry_items" ON draft_expiry_items;
DROP POLICY IF EXISTS "Anon can delete draft_expiry_items" ON draft_expiry_items;

CREATE POLICY "Admins can insert draft_expiry_items"
  ON draft_expiry_items FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_expiry_items"
  ON draft_expiry_items FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_expiry_items"
  ON draft_expiry_items FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_expiry_settings
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_expiry_settings" ON draft_expiry_settings;
DROP POLICY IF EXISTS "Anon can update draft_expiry_settings" ON draft_expiry_settings;
DROP POLICY IF EXISTS "Anon can delete draft_expiry_settings" ON draft_expiry_settings;

CREATE POLICY "Admins can insert draft_expiry_settings"
  ON draft_expiry_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_expiry_settings"
  ON draft_expiry_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_expiry_settings"
  ON draft_expiry_settings FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_flash_sale_items
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_flash_sale_items" ON draft_flash_sale_items;
DROP POLICY IF EXISTS "Anon can update draft_flash_sale_items" ON draft_flash_sale_items;
DROP POLICY IF EXISTS "Anon can delete draft_flash_sale_items" ON draft_flash_sale_items;

CREATE POLICY "Admins can insert draft_flash_sale_items"
  ON draft_flash_sale_items FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_flash_sale_items"
  ON draft_flash_sale_items FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_flash_sale_items"
  ON draft_flash_sale_items FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- draft_flash_sale_settings
-- ============================================================
DROP POLICY IF EXISTS "Anon can insert draft_flash_sale_settings" ON draft_flash_sale_settings;
DROP POLICY IF EXISTS "Anon can update draft_flash_sale_settings" ON draft_flash_sale_settings;
DROP POLICY IF EXISTS "Anon can delete draft_flash_sale_settings" ON draft_flash_sale_settings;

CREATE POLICY "Admins can insert draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete draft_flash_sale_settings"
  ON draft_flash_sale_settings FOR DELETE TO authenticated
  USING (is_admin());
