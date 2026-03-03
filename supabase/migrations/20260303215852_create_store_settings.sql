/*
  # Create store_settings and draft_store_settings tables

  1. New Tables
    - `store_settings` (single-row, id=1 pattern)
      - `id` (integer, PK, CHECK id=1)
      - `ordering_mode` (text, 'auto' or 'manual')
      - `ordering_enabled` (boolean, used in manual mode)
      - `auto_open_day` (integer, 1=Monday)
      - `auto_open_time` (text, e.g. '00:00')
      - `auto_close_day` (integer, 5=Friday)
      - `auto_close_time` (text, e.g. '12:00')
      - `closed_message_en` (text)
      - `closed_message_sv` (text)
      - `closed_message_zh` (text)
    - `draft_store_settings` (same structure, for admin draft/push workflow)

  2. Security
    - Enable RLS on both tables
    - Anyone (anon + authenticated) can SELECT store_settings (needed for storefront)
    - Only admins can UPDATE store_settings
    - Only admins can SELECT/UPDATE draft_store_settings

  3. Notes
    - Follows the same single-row settings pattern as flash_sale_settings and expiry_settings
    - Default schedule: Monday 00:00 to Friday 12:00 (Sweden time)
*/

-- Live store settings
CREATE TABLE IF NOT EXISTS store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ordering_mode text NOT NULL DEFAULT 'auto',
  ordering_enabled boolean NOT NULL DEFAULT true,
  auto_open_day integer NOT NULL DEFAULT 1,
  auto_open_time text NOT NULL DEFAULT '00:00',
  auto_close_day integer NOT NULL DEFAULT 5,
  auto_close_time text NOT NULL DEFAULT '12:00',
  closed_message_en text NOT NULL DEFAULT 'Ordering is currently closed. We open every Monday and close Friday at noon.',
  closed_message_sv text NOT NULL DEFAULT 'Beställning är för tillfället stängd. Vi öppnar varje måndag och stänger fredag kl. 12.',
  closed_message_zh text NOT NULL DEFAULT '目前暂停接单。我们每周一开放，周五中午关闭。'
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read store settings (storefront needs this)
CREATE POLICY "Anyone can read store settings"
  ON store_settings
  FOR SELECT
  TO anon, authenticated
  USING (id = 1);

-- Only admins can update store settings
CREATE POLICY "Admins can update store settings"
  ON store_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Seed the single row
INSERT INTO store_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Draft store settings (for admin draft/push workflow)
CREATE TABLE IF NOT EXISTS draft_store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ordering_mode text NOT NULL DEFAULT 'auto',
  ordering_enabled boolean NOT NULL DEFAULT true,
  auto_open_day integer NOT NULL DEFAULT 1,
  auto_open_time text NOT NULL DEFAULT '00:00',
  auto_close_day integer NOT NULL DEFAULT 5,
  auto_close_time text NOT NULL DEFAULT '12:00',
  closed_message_en text NOT NULL DEFAULT 'Ordering is currently closed. We open every Monday and close Friday at noon.',
  closed_message_sv text NOT NULL DEFAULT 'Beställning är för tillfället stängd. Vi öppnar varje måndag och stänger fredag kl. 12.',
  closed_message_zh text NOT NULL DEFAULT '目前暂停接单。我们每周一开放，周五中午关闭。'
);

ALTER TABLE draft_store_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read draft store settings
CREATE POLICY "Admins can read draft store settings"
  ON draft_store_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Only admins can update draft store settings
CREATE POLICY "Admins can update draft store settings"
  ON draft_store_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Seed the single row
INSERT INTO draft_store_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;