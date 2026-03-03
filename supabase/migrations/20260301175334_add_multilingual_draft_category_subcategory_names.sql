/*
  # Add multilingual name columns to draft_categories and draft_subcategories

  1. Modified Tables
    - `draft_categories`
      - Rename `name` to `name_en` (English name)
      - Add `name_sv` (Swedish name)
      - Add `name_zh` (Chinese name)
    - `draft_subcategories`
      - Rename `name` to `name_en` (English name)
      - Add `name_sv` (Swedish name)
      - Add `name_zh` (Chinese name)

  2. Notes
    - Mirrors the same change previously applied to the live `categories` and `subcategories` tables
    - Existing data in `name` column is preserved as `name_en`
    - New columns default to empty string so existing draft rows remain valid
*/

ALTER TABLE draft_categories RENAME COLUMN name TO name_en;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_categories' AND column_name = 'name_sv'
  ) THEN
    ALTER TABLE draft_categories ADD COLUMN name_sv TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_categories' AND column_name = 'name_zh'
  ) THEN
    ALTER TABLE draft_categories ADD COLUMN name_zh TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

ALTER TABLE draft_subcategories RENAME COLUMN name TO name_en;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_subcategories' AND column_name = 'name_sv'
  ) THEN
    ALTER TABLE draft_subcategories ADD COLUMN name_sv TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_subcategories' AND column_name = 'name_zh'
  ) THEN
    ALTER TABLE draft_subcategories ADD COLUMN name_zh TEXT NOT NULL DEFAULT '';
  END IF;
END $$;