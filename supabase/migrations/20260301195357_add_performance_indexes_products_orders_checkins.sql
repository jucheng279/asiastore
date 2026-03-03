/*
  # Add performance indexes for frequently queried columns

  1. New Indexes
    - `products.category_id` - Used for filtering products by category
    - `products.subcategory_id` - Used for filtering products by subcategory
    - `products.parent_product_id` - Used for loading child/variant products
    - `products.visible` and `products.trending` - Used for storefront filtering
    - `user_orders.created_at` - Used in analytics queries with date ranges
    - `user_checkins.checkin_date` - Used for daily check-in lookup and analytics
    - `profiles.created_at` - Used in user activity analytics
    - `points_audit_log.reason` - Used in analytics aggregation queries

  2. Important Notes
    - All indexes use IF NOT EXISTS for safe re-runs
    - These complement the existing indexes on user_points, user_favorites, user_orders(user_id), and user_order_items(order_id)
*/

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products (subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id ON products (parent_product_id) WHERE parent_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_visible_trending ON products (visible, trending) WHERE visible = true;

CREATE INDEX IF NOT EXISTS idx_user_orders_created_at ON user_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_user_checkins_checkin_date ON user_checkins (checkin_date);
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_date ON user_checkins (user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_points_audit_log_reason ON points_audit_log (reason);

CREATE INDEX IF NOT EXISTS idx_draft_products_category_id ON draft_products (category_id);
CREATE INDEX IF NOT EXISTS idx_draft_products_subcategory_id ON draft_products (subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_draft_products_parent_product_id ON draft_products (parent_product_id) WHERE parent_product_id IS NOT NULL;
