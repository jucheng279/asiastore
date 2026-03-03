/*
  # Update User Activity Stats - Points Overview

  Replaces the points section of get_user_activity_stats() with three
  audit-log-derived metrics and an integrity check.

  1. Removed Fields
    - `total_points_in_circulation` (replaced by current_points_left)
    - `average_points_per_user` (removed)
    - `points_distribution` (removed)

  2. New Fields
    - `total_points_ever_existed` - Sum of abs(change_amount) for registration,
      checkin, and admin_adjustment reasons. Both admin adds and subtracts
      contribute to this total since they represent points the system touched.
    - `total_points_ever_used` - Sum of abs(change_amount) for order_payment
      and deduction reasons. Only user checkout spending counts here.
    - `current_points_left` - Live sum of all user_points.balance values.
    - `points_discrepancy` - Difference between (ever_existed - ever_used - current_left).
      Should normally be zero; a margin beyond 100 indicates a potential issue.

  3. Important Notes
    - All other fields in the function remain unchanged
    - The old points_distribution subquery is removed entirely
*/

CREATE OR REPLACE FUNCTION get_user_activity_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_total_ever_existed NUMERIC;
  v_total_ever_used NUMERIC;
  v_current_left NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_total_ever_existed
  FROM points_audit_log
  WHERE reason IN ('registration', 'checkin', 'admin_adjustment');

  SELECT COALESCE(SUM(ABS(change_amount)), 0) INTO v_total_ever_used
  FROM points_audit_log
  WHERE reason IN ('order_payment', 'deduction');

  SELECT COALESCE(SUM(balance), 0) INTO v_current_left
  FROM user_points;

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
    'total_points_ever_existed', v_total_ever_existed,
    'total_points_ever_used', v_total_ever_used,
    'current_points_left', v_current_left,
    'points_discrepancy', v_total_ever_existed - v_total_ever_used - v_current_left,
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;
