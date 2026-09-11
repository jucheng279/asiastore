/*
# Add store address columns to store_settings and draft_store_settings

1. Modified Tables
   - `store_settings`: added store_address_street (text), store_address_postal_code (text),
     store_address_city (text), store_address_lat (double precision), store_address_lon (double precision)
   - `draft_store_settings`: same five columns added

2. Purpose
   - Store the physical store address for use as the delivery route starting point
   - Latitude/longitude stored for direct use with Geoapify Route Planner API

3. Security
   - No RLS changes needed; existing policies on both tables already cover these columns
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_settings' AND column_name='store_address_street') THEN
    ALTER TABLE store_settings ADD COLUMN store_address_street text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_settings' AND column_name='store_address_postal_code') THEN
    ALTER TABLE store_settings ADD COLUMN store_address_postal_code text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_settings' AND column_name='store_address_city') THEN
    ALTER TABLE store_settings ADD COLUMN store_address_city text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_settings' AND column_name='store_address_lat') THEN
    ALTER TABLE store_settings ADD COLUMN store_address_lat double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_settings' AND column_name='store_address_lon') THEN
    ALTER TABLE store_settings ADD COLUMN store_address_lon double precision;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='draft_store_settings' AND column_name='store_address_street') THEN
    ALTER TABLE draft_store_settings ADD COLUMN store_address_street text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='draft_store_settings' AND column_name='store_address_postal_code') THEN
    ALTER TABLE draft_store_settings ADD COLUMN store_address_postal_code text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='draft_store_settings' AND column_name='store_address_city') THEN
    ALTER TABLE draft_store_settings ADD COLUMN store_address_city text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='draft_store_settings' AND column_name='store_address_lat') THEN
    ALTER TABLE draft_store_settings ADD COLUMN store_address_lat double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='draft_store_settings' AND column_name='store_address_lon') THEN
    ALTER TABLE draft_store_settings ADD COLUMN store_address_lon double precision;
  END IF;
END $$;
