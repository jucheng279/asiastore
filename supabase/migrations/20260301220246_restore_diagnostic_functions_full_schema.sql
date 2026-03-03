/*
  # Restore diagnostic functions to full return schemas

  The lockdown migration (20260301195254) accidentally stripped fields and renamed
  keys when adding is_admin() checks. This migration restores each function's
  complete return schema to match the frontend TypeScript interfaces, while
  keeping the is_admin() security checks.

  1. Modified Functions
    - `get_database_health()` - Restores: database_size_bytes, total_connections,
      cache_hit_ratio, checked_at
    - `get_table_stats()` - Restores: row_estimate (was renamed row_count),
      dead_tuple_ratio, last_analyze, last_autoanalyze, seq_scan, idx_scan,
      table_size
    - `get_order_analytics()` - Restores: average_order_value (was renamed
      avg_order_value), revenue_today, revenue_this_week, total_items_sold,
      points_orders, top_products[].total_quantity (was renamed total_qty),
      checked_at
    - `get_user_activity_stats()` - Restores: users_today (was renamed
      new_users_today), users_this_week (was renamed new_users_this_week),
      users_this_month, users_with_orders, users_with_favorites,
      users_with_addresses, total_points_ever_existed (was renamed
      total_points_ever_issued), current_points_left (was renamed
      total_points_balance), points_discrepancy, checked_at. Also restores
      offset subtraction logic from points_stats_offset table.
    - `get_data_integrity_check()` - Restores full array results instead of
      scalar counts: orphaned_order_items (array), orphaned_order_items_count,
      orphaned_favorites (array), orphaned_favorites_count,
      products_missing_all_names (array + count), products_missing_image
      (array + count), draft_live_counts (nested object), total_issues,
      checked_at

  2. Security
    - All functions retain is_admin() check (defense-in-depth)
    - All functions use SECURITY DEFINER with search_path = public
    - Existing REVOKE/GRANT permissions remain in place (unaffected by
      CREATE OR REPLACE)
*/

-- 1. get_database_health
CREATE OR REPLACE FUNCTION get_database_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  SELECT jsonb_build_object(
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'database_size_bytes', pg_database_size(current_database()),
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'total_connections', (SELECT count(*) FROM pg_stat_activity),
    'max_connections', current_setting('max_connections')::int,
    'cache_hit_ratio', (
      SELECT CASE WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
        ELSE round(sum(heap_blks_hit)::numeric / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2)
      END
      FROM pg_statio_user_tables
    ),
    'uptime', (SELECT now() - pg_postmaster_start_time()),
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. get_table_stats
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', relname,
      'row_estimate', n_live_tup,
      'dead_tuples', n_dead_tup,
      'dead_tuple_ratio', CASE WHEN n_live_tup + n_dead_tup = 0 THEN 0
        ELSE round(n_dead_tup::numeric / (n_live_tup + n_dead_tup) * 100, 2)
      END,
      'last_vacuum', last_vacuum,
      'last_autovacuum', last_autovacuum,
      'last_analyze', last_analyze,
      'last_autoanalyze', last_autoanalyze,
      'seq_scan', seq_scan,
      'idx_scan', idx_scan,
      'table_size', pg_size_pretty(pg_total_relation_size(relid))
    ) ORDER BY n_live_tup DESC
  )
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 3. get_order_analytics
CREATE OR REPLACE FUNCTION get_order_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  top_products jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'name', sub.name,
      'total_quantity', sub.total_qty,
      'total_revenue', sub.total_rev
    )
  ), '[]'::jsonb)
  FROM (
    SELECT oi.name, sum(oi.quantity) as total_qty, sum(oi.price * oi.quantity) as total_rev
    FROM user_order_items oi
    GROUP BY oi.name
    ORDER BY total_qty DESC
    LIMIT 10
  ) sub
  INTO top_products;

  SELECT jsonb_build_object(
    'total_orders', (SELECT count(*) FROM user_orders),
    'orders_today', (SELECT count(*) FROM user_orders WHERE created_at >= CURRENT_DATE),
    'orders_this_week', (SELECT count(*) FROM user_orders WHERE created_at >= CURRENT_DATE - interval '7 days'),
    'orders_this_month', (SELECT count(*) FROM user_orders WHERE created_at >= CURRENT_DATE - interval '30 days'),
    'total_revenue', (SELECT COALESCE(sum(total), 0) FROM user_orders),
    'revenue_today', (SELECT COALESCE(sum(total), 0) FROM user_orders WHERE created_at >= CURRENT_DATE),
    'revenue_this_week', (SELECT COALESCE(sum(total), 0) FROM user_orders WHERE created_at >= CURRENT_DATE - interval '7 days'),
    'average_order_value', (SELECT COALESCE(round(avg(total)::numeric, 2), 0) FROM user_orders),
    'total_items_sold', (SELECT COALESCE(sum(quantity), 0) FROM user_order_items),
    'points_orders', (SELECT count(*) FROM user_orders WHERE paid_with_points = true),
    'top_products', top_products,
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- 4. get_user_activity_stats (with offset logic restored)
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

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

-- 5. get_data_integrity_check
CREATE OR REPLACE FUNCTION get_data_integrity_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  orphaned_order_items jsonb;
  orphaned_favorites jsonb;
  products_no_name jsonb;
  products_no_image jsonb;
  draft_live_mismatch jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access diagnostic functions';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', oi.id, 'order_id', oi.order_id, 'name', oi.name)), '[]'::jsonb)
  FROM user_order_items oi
  LEFT JOIN user_orders o ON o.id = oi.order_id
  WHERE o.id IS NULL
  INTO orphaned_order_items;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', f.id, 'user_id', f.user_id, 'product_id', f.product_id)), '[]'::jsonb)
  FROM user_favorites f
  LEFT JOIN products p ON p.id::text = f.product_id
  WHERE p.id IS NULL
  INTO orphaned_favorites;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'category_id', p.category_id)), '[]'::jsonb)
  FROM products p
  WHERE (p.name_en = '' OR p.name_en IS NULL)
    AND (p.name_sv = '' OR p.name_sv IS NULL)
    AND (p.name_zh = '' OR p.name_zh IS NULL)
  INTO products_no_name;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name_en)), '[]'::jsonb)
  FROM products p
  WHERE (p.image_url = '' OR p.image_url IS NULL)
    AND p.parent_product_id IS NULL
  INTO products_no_image;

  SELECT jsonb_build_object(
    'draft_categories', (SELECT count(*) FROM draft_categories),
    'live_categories', (SELECT count(*) FROM categories),
    'draft_products', (SELECT count(*) FROM draft_products),
    'live_products', (SELECT count(*) FROM products),
    'draft_expiry_items', (SELECT count(*) FROM draft_expiry_items),
    'live_expiry_items', (SELECT count(*) FROM expiry_items),
    'draft_flash_items', (SELECT count(*) FROM draft_flash_sale_items),
    'live_flash_items', (SELECT count(*) FROM flash_sale_items)
  ) INTO draft_live_mismatch;

  SELECT jsonb_build_object(
    'orphaned_order_items', orphaned_order_items,
    'orphaned_order_items_count', jsonb_array_length(orphaned_order_items),
    'orphaned_favorites', orphaned_favorites,
    'orphaned_favorites_count', jsonb_array_length(orphaned_favorites),
    'products_missing_all_names', products_no_name,
    'products_missing_all_names_count', jsonb_array_length(products_no_name),
    'products_missing_image', products_no_image,
    'products_missing_image_count', jsonb_array_length(products_no_image),
    'draft_live_counts', draft_live_mismatch,
    'total_issues', jsonb_array_length(orphaned_order_items) + jsonb_array_length(orphaned_favorites) + jsonb_array_length(products_no_name) + jsonb_array_length(products_no_image),
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;
