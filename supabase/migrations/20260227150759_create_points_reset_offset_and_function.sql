/*
  # Points Overview Reset Feature

  1. New Tables
    - `points_stats_offset`
      - `id` (integer, primary key, constrained to 1 for single-row)
      - `offset_ever_issued` (numeric, default 0) - baseline offset for "ever issued" counter
      - `offset_ever_used` (numeric, default 0) - baseline offset for "used orders" counter
      - `reset_at` (timestamptz, nullable) - when the last reset occurred

  2. New Functions
    - `reset_points_overview_counters()` - snapshots current totals into offsets so
      displayed values reset to current balance / 0 respectively

  3. Modified Functions
    - `get_user_activity_stats()` - now subtracts offsets from raw audit sums so
      displayed values reflect post-reset baselines

  4. Security
    - RLS enabled on `points_stats_offset`
    - No direct access policies (managed via SECURITY DEFINER functions only)
    - `reset_points_overview_counters` restricted to authenticated users

  5. Important Notes
    - No audit data is deleted; offsets provide a virtual reset
    - The offset table is seeded with a single row of zeros
    - After reset, "Ever Issued" equals "Current Balance" and "Used" equals 0
*/

CREATE TABLE IF NOT EXISTS points_stats_offset (
  id integer PRIMARY KEY DEFAULT 1,
  offset_ever_issued numeric NOT NULL DEFAULT 0,
  offset_ever_used numeric NOT NULL DEFAULT 0,
  reset_at timestamptz,
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE points_stats_offset ENABLE ROW LEVEL SECURITY;

INSERT INTO points_stats_offset (id, offset_ever_issued, offset_ever_used, reset_at)
VALUES (1, 0, 0, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION reset_points_overview_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issued NUMERIC;
  v_used NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_issued
  FROM points_audit_log
  WHERE reason IN ('registration', 'checkin', 'admin_adjustment');

  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_used
  FROM points_audit_log
  WHERE reason IN ('order_payment', 'deduction');

  UPDATE points_stats_offset
  SET offset_ever_issued = v_issued,
      offset_ever_used = v_used,
      reset_at = now()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION reset_points_overview_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_points_overview_counters() TO authenticated;

CREATE OR REPLACE FUNCTION get_user_activity_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_raw_issued NUMERIC;
  v_raw_used NUMERIC;
  v_current_left NUMERIC;
  v_offset_issued NUMERIC;
  v_offset_used NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_raw_issued
  FROM points_audit_log
  WHERE reason IN ('registration', 'checkin', 'admin_adjustment');

  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_raw_used
  FROM points_audit_log
  WHERE reason IN ('order_payment', 'deduction');

  SELECT COALESCE(SUM(balance), 0) INTO v_current_left
  FROM user_points;

  SELECT COALESCE(offset_ever_issued, 0), COALESCE(offset_ever_used, 0)
  INTO v_offset_issued, v_offset_used
  FROM points_stats_offset
  WHERE id = 1;

  IF NOT FOUND THEN
    v_offset_issued := 0;
    v_offset_used := 0;
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'users_today', (SELECT count(*) FROM profiles WHERE created_at >= CURRENT_DATE),
    'users_this_week', (SELECT count(*) FROM profiles WHERE created_at >= CURRENT_DATE - interval '7 days'),
    'users_this_month', (SELECT count(*) FROM profiles WHERE created_at >= CURRENT_DATE - interval '30 days'),
    'users_with_orders', (SELECT count(DISTINCT user_id) FROM user_orders),
    'users_with_favorites', (SELECT count(DISTINCT user_id) FROM user_favorites),
    'users_with_addresses', (SELECT count(DISTINCT user_id) FROM user_addresses),
    'checkins_today', (SELECT count(*) FROM user_checkins WHERE checkin_date = CURRENT_DATE),
    'checkins_this_week', (SELECT count(*) FROM user_checkins WHERE checkin_date >= CURRENT_DATE - interval '7 days'),
    'total_points_ever_existed', v_raw_issued - v_offset_issued,
    'total_points_ever_used', v_raw_used - v_offset_used,
    'current_points_left', v_current_left,
    'points_discrepancy', (v_raw_issued - v_offset_issued) - (v_raw_used - v_offset_used) - v_current_left,
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;
