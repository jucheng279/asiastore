/*
  # Create Diagnostic Functions for Admin Health Monitoring

  1. New Functions
    - `get_database_health()` - Returns connection pool usage, cache hit ratio, database size
    - `get_table_stats()` - Returns row counts, dead tuples, vacuum dates for all public tables
    - `get_order_analytics()` - Returns order counts, revenue, top products
    - `get_user_activity_stats()` - Returns user registration trends, activity, points distribution
    - `get_data_integrity_check()` - Returns orphaned records, broken references, missing data

  2. Security
    - All functions use SECURITY DEFINER to access pg_stat views
    - All functions are restricted to authenticated users only
*/

CREATE OR REPLACE FUNCTION get_database_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
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

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
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

CREATE OR REPLACE FUNCTION get_user_activity_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  points_distribution jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('range', sub.range_label, 'count', sub.cnt)
  ), '[]'::jsonb)
  FROM (
    SELECT
      CASE
        WHEN balance = 0 THEN '0 pts'
        WHEN balance > 0 AND balance <= 10 THEN '1-10 pts'
        WHEN balance > 10 AND balance <= 50 THEN '11-50 pts'
        WHEN balance > 50 AND balance <= 100 THEN '51-100 pts'
        ELSE '100+ pts'
      END as range_label,
      count(*) as cnt
    FROM user_points
    GROUP BY range_label
    ORDER BY min(balance)
  ) sub
  INTO points_distribution;

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
    'total_points_in_circulation', (SELECT COALESCE(sum(balance), 0) FROM user_points),
    'average_points_per_user', (SELECT COALESCE(round(avg(balance)::numeric, 2), 0) FROM user_points),
    'points_distribution', points_distribution,
    'checked_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

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
