/*
  # Add merge_count column to user_orders

  1. Modified Tables
    - `user_orders`
      - Added `merge_count` (integer, default 1)
        - Tracks how many times items from separate checkouts were merged into this single order
        - Displayed as "N merged" badge in the customer and admin order views

  2. Notes
    - Existing orders default to 1 (they were never merged)
    - Each time a new checkout merges into an existing order, this counter increments
    - No data is dropped or deleted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_orders' AND column_name = 'merge_count'
  ) THEN
    ALTER TABLE user_orders ADD COLUMN merge_count integer NOT NULL DEFAULT 1;
  END IF;
END $$;
