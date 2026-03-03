/*
  # Lock down diagnostic functions and tighten RPC grants

  1. Security Changes
    - Add `is_admin()` checks to all 5 diagnostic functions so only admins can call them
    - Revoke `anon` execution from diagnostic functions
    - Revoke `anon` execution from `reset_points_overview_counters`, `handle_checkin_points`, `handle_new_profile_points`
    - Tighten `admin_adjust_user_points` to remove `authenticated` grant (it already checks `is_admin()` internally, but non-admin authenticated users should not be able to call it at all)

  2. Important Notes
    - All diagnostic functions already run as SECURITY DEFINER
    - The body-level `is_admin()` check is defense-in-depth on top of GRANT restrictions
    - `admin_adjust_user_points` already checks `is_admin()` in the body, this just removes unnecessary `authenticated` grant
    - `create_order_atomic` and `deduct_user_points` correctly verify `auth.uid() = p_user_id` in their bodies - no changes needed
*/

-- Recreate get_database_health with is_admin check
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  RETURN jsonb_build_object(
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'max_connections', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
    'database_size', (SELECT pg_size_pretty(pg_database_size(current_database()))),
    'uptime', (SELECT now() - pg_postmaster_start_time())
  );
END;
$$;

-- Recreate get_table_stats with is_admin check
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'table_name', relname,
      'row_count', n_live_tup,
      'dead_tuples', n_dead_tup,
      'last_vacuum', last_vacuum,
      'last_autovacuum', last_autovacuum
    ))
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY n_live_tup DESC
  );
END;
$$;

-- Recreate get_order_analytics with is_admin check
CREATE OR REPLACE FUNCTION get_order_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  RETURN jsonb_build_object(
    'total_orders', (SELECT count(*) FROM public.user_orders),
    'total_revenue', (SELECT COALESCE(sum(total), 0) FROM public.user_orders),
    'orders_today', (SELECT count(*) FROM public.user_orders WHERE created_at >= CURRENT_DATE),
    'orders_this_week', (SELECT count(*) FROM public.user_orders WHERE created_at >= CURRENT_DATE - interval '7 days'),
    'orders_this_month', (SELECT count(*) FROM public.user_orders WHERE created_at >= CURRENT_DATE - interval '30 days'),
    'avg_order_value', (SELECT COALESCE(avg(total), 0) FROM public.user_orders),
    'top_products', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT name, SUM(quantity) as total_qty, SUM(price * quantity) as total_revenue
        FROM public.user_order_items
        GROUP BY name
        ORDER BY total_qty DESC
        LIMIT 10
      ) t
    )
  );
END;
$$;

-- Recreate get_user_activity_stats with is_admin check
CREATE OR REPLACE FUNCTION get_user_activity_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_offset_issued NUMERIC := 0;
  v_offset_used NUMERIC := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  SELECT COALESCE(offset_ever_issued, 0), COALESCE(offset_ever_used, 0)
  INTO v_offset_issued, v_offset_used
  FROM public.points_stats_offset
  WHERE id = 1;

  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users_today', (SELECT count(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'new_users_this_week', (SELECT count(*) FROM public.profiles WHERE created_at >= CURRENT_DATE - interval '7 days'),
    'checkins_today', (SELECT count(*) FROM public.user_checkins WHERE checkin_date = CURRENT_DATE),
    'checkins_this_week', (SELECT count(*) FROM public.user_checkins WHERE checkin_date >= CURRENT_DATE - interval '7 days'),
    'total_points_balance', (SELECT COALESCE(sum(balance), 0) FROM public.user_points),
    'total_points_ever_issued', (
      SELECT COALESCE(SUM(ABS(change_amount)), 0) - v_offset_issued
      FROM public.points_audit_log
      WHERE reason IN ('registration', 'checkin', 'admin_adjustment')
    ),
    'total_points_ever_used', (
      SELECT COALESCE(SUM(ABS(change_amount)), 0) - v_offset_used
      FROM public.points_audit_log
      WHERE reason IN ('order_payment', 'deduction')
    )
  );
END;
$$;

-- Recreate get_data_integrity_check with is_admin check
CREATE OR REPLACE FUNCTION get_data_integrity_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  RETURN jsonb_build_object(
    'orphaned_order_items', (
      SELECT count(*) FROM public.user_order_items oi
      LEFT JOIN public.user_orders o ON o.id = oi.order_id
      WHERE o.id IS NULL
    ),
    'orphaned_favorites', (
      SELECT count(*) FROM public.user_favorites f
      LEFT JOIN public.products p ON p.id::text = f.product_id
      WHERE p.id IS NULL
    ),
    'orphaned_subcategories', (
      SELECT count(*) FROM public.subcategories s
      LEFT JOIN public.categories c ON c.id = s.category_id
      WHERE c.id IS NULL
    ),
    'orphaned_products', (
      SELECT count(*) FROM public.products p
      LEFT JOIN public.categories c ON c.id = p.category_id
      WHERE c.id IS NULL
    ),
    'draft_live_category_mismatch', (
      SELECT count(*) FROM (
        SELECT id FROM public.draft_categories
        EXCEPT
        SELECT id FROM public.categories
      ) x
    ),
    'draft_live_product_mismatch', (
      SELECT count(*) FROM (
        SELECT id FROM public.draft_products
        EXCEPT
        SELECT id FROM public.products
      ) x
    )
  );
END;
$$;

-- Revoke anon from diagnostic functions
REVOKE EXECUTE ON FUNCTION get_database_health FROM anon;
REVOKE EXECUTE ON FUNCTION get_table_stats FROM anon;
REVOKE EXECUTE ON FUNCTION get_order_analytics FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_activity_stats FROM anon;
REVOKE EXECUTE ON FUNCTION get_data_integrity_check FROM anon;

-- Revoke anon from admin/trigger functions (these should never be called by anonymous users)
REVOKE EXECUTE ON FUNCTION reset_points_overview_counters FROM anon;
REVOKE EXECUTE ON FUNCTION handle_checkin_points FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_profile_points FROM anon;

-- Tighten admin_adjust_user_points: remove authenticated grant (only service_role should call, body already checks is_admin)
REVOKE EXECUTE ON FUNCTION admin_adjust_user_points FROM anon;
