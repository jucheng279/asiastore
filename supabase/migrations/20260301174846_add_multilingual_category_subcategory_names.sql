/*
  # Add multilingual names to categories and subcategories

  1. Modified Tables
    - `categories`
      - Rename `name` -> `name_en` (existing English name)
      - Add `name_sv` (Swedish translation, text, NOT NULL, default '')
      - Add `name_zh` (Chinese translation, text, NOT NULL, default '')
    - `subcategories`
      - Rename `name` -> `name_en` (existing English name)
      - Add `name_sv` (Swedish translation, text, NOT NULL, default '')
      - Add `name_zh` (Chinese translation, text, NOT NULL, default '')

  2. Data Population
    - Populate Swedish and Chinese translations for all 7 categories
    - Populate Swedish and Chinese translations for all 28 subcategories

  3. Important Notes
    - The naming convention (name_en, name_sv, name_zh) matches the products table
    - All three language columns are independently editable in the admin backend
    - Fallback to name_en is handled in application code
*/

-- Categories: rename name -> name_en
ALTER TABLE categories RENAME COLUMN name TO name_en;

-- Categories: add name_sv and name_zh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'name_sv'
  ) THEN
    ALTER TABLE categories ADD COLUMN name_sv TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'name_zh'
  ) THEN
    ALTER TABLE categories ADD COLUMN name_zh TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Subcategories: rename name -> name_en
ALTER TABLE subcategories RENAME COLUMN name TO name_en;

-- Subcategories: add name_sv and name_zh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subcategories' AND column_name = 'name_sv'
  ) THEN
    ALTER TABLE subcategories ADD COLUMN name_sv TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subcategories' AND column_name = 'name_zh'
  ) THEN
    ALTER TABLE subcategories ADD COLUMN name_zh TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Populate category translations (Swedish)
UPDATE categories SET name_sv = 'Gronsaker' WHERE name_en = 'Vegetables';
UPDATE categories SET name_sv = 'Fryst' WHERE name_en = 'Frozen';
UPDATE categories SET name_sv = 'Kryddor' WHERE name_en = 'Seasoning';
UPDATE categories SET name_sv = 'Sas' WHERE name_en = 'Sauce';
UPDATE categories SET name_sv = 'Fardiga ratter' WHERE name_en = 'Convenient';
UPDATE categories SET name_sv = 'Snacks' WHERE name_en = 'Snacks';
UPDATE categories SET name_sv = 'Dryck' WHERE name_en = 'Beverage';

-- Populate category translations (Chinese)
UPDATE categories SET name_zh = '蔬菜' WHERE name_en = 'Vegetables';
UPDATE categories SET name_zh = '冷冻食品' WHERE name_en = 'Frozen';
UPDATE categories SET name_zh = '调味料' WHERE name_en = 'Seasoning';
UPDATE categories SET name_zh = '酱料' WHERE name_en = 'Sauce';
UPDATE categories SET name_zh = '方便食品' WHERE name_en = 'Convenient';
UPDATE categories SET name_zh = '零食' WHERE name_en = 'Snacks';
UPDATE categories SET name_zh = '饮料' WHERE name_en = 'Beverage';

-- Populate subcategory translations (Swedish)
UPDATE subcategories SET name_sv = 'Bladgronsaker' WHERE name_en = 'Leafy Greens';
UPDATE subcategories SET name_sv = 'Rotfrukter' WHERE name_en = 'Root Vegetables';
UPDATE subcategories SET name_sv = 'Svamp' WHERE name_en = 'Mushrooms';
UPDATE subcategories SET name_sv = 'Farsk ort' WHERE name_en = 'Fresh Herbs';
UPDATE subcategories SET name_sv = 'Salt och peppar' WHERE name_en = 'Salt & Pepper';
UPDATE subcategories SET name_sv = 'Kryddblandningar' WHERE name_en = 'Spice Blends';
UPDATE subcategories SET name_sv = 'MSG' WHERE name_en = 'MSG';
UPDATE subcategories SET name_sv = 'Torkad ort' WHERE name_en = 'Dried Herbs';
UPDATE subcategories SET name_sv = 'Sojasas' WHERE name_en = 'Soy Sauce';
UPDATE subcategories SET name_sv = 'Chilisas' WHERE name_en = 'Chili Sauce';
UPDATE subcategories SET name_sv = 'Fisksas' WHERE name_en = 'Fish Sauce';
UPDATE subcategories SET name_sv = 'Ostronsas' WHERE name_en = 'Oyster Sauce';
UPDATE subcategories SET name_sv = 'Snabbnudlar' WHERE name_en = 'Instant Noodles';
UPDATE subcategories SET name_sv = 'Fardiga maltider' WHERE name_en = 'Ready Meals';
UPDATE subcategories SET name_sv = 'Konserver' WHERE name_en = 'Canned Goods';
UPDATE subcategories SET name_sv = 'Risskalar' WHERE name_en = 'Rice Bowls';
UPDATE subcategories SET name_sv = 'Dumplings' WHERE name_en = 'Dumplings';
UPDATE subcategories SET name_sv = 'Sjomat' WHERE name_en = 'Seafood';
UPDATE subcategories SET name_sv = 'Gronsaker' WHERE name_en = 'Vegetables';
UPDATE subcategories SET name_sv = 'Glass' WHERE name_en = 'Ice Cream';
UPDATE subcategories SET name_sv = 'Chips' WHERE name_en = 'Chips';
UPDATE subcategories SET name_sv = 'Kex' WHERE name_en = 'Crackers';
UPDATE subcategories SET name_sv = 'Kakor' WHERE name_en = 'Cookies';
UPDATE subcategories SET name_sv = 'Godis' WHERE name_en = 'Candy';
UPDATE subcategories SET name_sv = 'Te' WHERE name_en = 'Tea';
UPDATE subcategories SET name_sv = 'Lask' WHERE name_en = 'Soda';
UPDATE subcategories SET name_sv = 'Juice' WHERE name_en = 'Juice';
UPDATE subcategories SET name_sv = 'Mjolkte' WHERE name_en = 'Milk Tea';

-- Populate subcategory translations (Chinese)
UPDATE subcategories SET name_zh = '叶菜' WHERE name_en = 'Leafy Greens';
UPDATE subcategories SET name_zh = '根菜' WHERE name_en = 'Root Vegetables';
UPDATE subcategories SET name_zh = '蘑菇' WHERE name_en = 'Mushrooms';
UPDATE subcategories SET name_zh = '新鲜香草' WHERE name_en = 'Fresh Herbs';
UPDATE subcategories SET name_zh = '盐和胡椒' WHERE name_en = 'Salt & Pepper';
UPDATE subcategories SET name_zh = '混合香料' WHERE name_en = 'Spice Blends';
UPDATE subcategories SET name_zh = '味精' WHERE name_en = 'MSG';
UPDATE subcategories SET name_zh = '干香草' WHERE name_en = 'Dried Herbs';
UPDATE subcategories SET name_zh = '酱油' WHERE name_en = 'Soy Sauce';
UPDATE subcategories SET name_zh = '辣酱' WHERE name_en = 'Chili Sauce';
UPDATE subcategories SET name_zh = '鱼露' WHERE name_en = 'Fish Sauce';
UPDATE subcategories SET name_zh = '蚝油' WHERE name_en = 'Oyster Sauce';
UPDATE subcategories SET name_zh = '方便面' WHERE name_en = 'Instant Noodles';
UPDATE subcategories SET name_zh = '即食餐' WHERE name_en = 'Ready Meals';
UPDATE subcategories SET name_zh = '罐头' WHERE name_en = 'Canned Goods';
UPDATE subcategories SET name_zh = '盖饭' WHERE name_en = 'Rice Bowls';
UPDATE subcategories SET name_zh = '饺子' WHERE name_en = 'Dumplings';
UPDATE subcategories SET name_zh = '海鲜' WHERE name_en = 'Seafood';
UPDATE subcategories SET name_zh = '蔬菜' WHERE name_en = 'Vegetables';
UPDATE subcategories SET name_zh = '冰淇淋' WHERE name_en = 'Ice Cream';
UPDATE subcategories SET name_zh = '薯片' WHERE name_en = 'Chips';
UPDATE subcategories SET name_zh = '饼干' WHERE name_en = 'Crackers';
UPDATE subcategories SET name_zh = '曲奇' WHERE name_en = 'Cookies';
UPDATE subcategories SET name_zh = '糖果' WHERE name_en = 'Candy';
UPDATE subcategories SET name_zh = '茶' WHERE name_en = 'Tea';
UPDATE subcategories SET name_zh = '汽水' WHERE name_en = 'Soda';
UPDATE subcategories SET name_zh = '果汁' WHERE name_en = 'Juice';
UPDATE subcategories SET name_zh = '奶茶' WHERE name_en = 'Milk Tea';
