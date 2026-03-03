/*
  # Add Performance Indexes for Scalability

  1. New Indexes
    - `idx_user_orders_user_id` on `user_orders(user_id)` 
      - Speeds up fetching orders for a specific user
      - Used by RLS policies on user_order_items (subquery checks user_orders.user_id)
    - `idx_user_order_items_order_id` on `user_order_items(order_id)`
      - Speeds up fetching items for specific orders (IN query)
      - Used by RLS policy subquery on user_order_items
    - `idx_user_addresses_user_id` on `user_addresses(user_id)`
      - Speeds up fetching addresses for a specific user
      - Queried on every checkout and address management page
    - `idx_user_favorites_user_id` on `user_favorites(user_id)`
      - Speeds up fetching all favorites for a user (SELECT with eq filter)
      - The existing unique index on (user_id, product_id) is composite and less efficient for user_id-only lookups

  2. Notes
    - All indexes use IF NOT EXISTS for safety
    - These indexes are critical for RLS policy performance under concurrent load
    - Without these, every authenticated request triggers sequential scans on these tables
*/

CREATE INDEX IF NOT EXISTS idx_user_orders_user_id
  ON user_orders (user_id);

CREATE INDEX IF NOT EXISTS idx_user_order_items_order_id
  ON user_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
  ON user_addresses (user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON user_favorites (user_id);
