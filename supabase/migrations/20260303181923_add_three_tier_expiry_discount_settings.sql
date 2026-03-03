/*
  # Add Three-Tier Expiry Discount Settings

  1. Modified Tables
    - `expiry_settings` and `draft_expiry_settings`:
      - Added `expired_discount_percentage` (numeric, default 0) - discount for items past expiration
      - Added `threshold_1_days` (integer, default 7) - first near-expiry threshold in days
      - Added `threshold_1_discount_percentage` (numeric, default 0) - discount for threshold 1
      - Added `threshold_2_days` (integer, default 14) - second near-expiry threshold in days
      - Added `threshold_2_discount_percentage` (numeric, default 0) - discount for threshold 2

  2. Notes
    - The old `discount_percentage` column is kept for backward compatibility but no longer used
    - Threshold 1 is the closer-to-expiry tier (fewer days), threshold 2 is the further tier
    - Expired items (past expiration date) use `expired_discount_percentage`
    - Items within threshold 1 days use `threshold_1_discount_percentage`
    - Items within threshold 2 days (but beyond threshold 1) use `threshold_2_discount_percentage`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expiry_settings' AND column_name = 'expired_discount_percentage'
  ) THEN
    ALTER TABLE expiry_settings ADD COLUMN expired_discount_percentage numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expiry_settings' AND column_name = 'threshold_1_days'
  ) THEN
    ALTER TABLE expiry_settings ADD COLUMN threshold_1_days integer DEFAULT 7;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expiry_settings' AND column_name = 'threshold_1_discount_percentage'
  ) THEN
    ALTER TABLE expiry_settings ADD COLUMN threshold_1_discount_percentage numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expiry_settings' AND column_name = 'threshold_2_days'
  ) THEN
    ALTER TABLE expiry_settings ADD COLUMN threshold_2_days integer DEFAULT 14;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expiry_settings' AND column_name = 'threshold_2_discount_percentage'
  ) THEN
    ALTER TABLE expiry_settings ADD COLUMN threshold_2_discount_percentage numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_expiry_settings' AND column_name = 'expired_discount_percentage'
  ) THEN
    ALTER TABLE draft_expiry_settings ADD COLUMN expired_discount_percentage numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_expiry_settings' AND column_name = 'threshold_1_days'
  ) THEN
    ALTER TABLE draft_expiry_settings ADD COLUMN threshold_1_days integer DEFAULT 7;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_expiry_settings' AND column_name = 'threshold_1_discount_percentage'
  ) THEN
    ALTER TABLE draft_expiry_settings ADD COLUMN threshold_1_discount_percentage numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_expiry_settings' AND column_name = 'threshold_2_days'
  ) THEN
    ALTER TABLE draft_expiry_settings ADD COLUMN threshold_2_days integer DEFAULT 14;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_expiry_settings' AND column_name = 'threshold_2_discount_percentage'
  ) THEN
    ALTER TABLE draft_expiry_settings ADD COLUMN threshold_2_discount_percentage numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expiry_items' AND column_name = 'discount_applied'
  ) THEN
    ALTER TABLE expiry_items ADD COLUMN discount_applied boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'draft_expiry_items' AND column_name = 'discount_applied'
  ) THEN
    ALTER TABLE draft_expiry_items ADD COLUMN discount_applied boolean DEFAULT false;
  END IF;
END $$;