/*
  # Lock down user data tables - replace anonymous read-all with admin-only

  1. Tables Modified
    - `user_addresses` - remove anon read-all, restrict authenticated read-all to admin-only, keep own-row access
    - `user_points` - remove anon read-all, add admin-only read-all
    - `user_checkins` - remove anon read-all, add admin-only read-all
    - `points_audit_log` - remove anon view-all, add admin-only read-all
    - `user_orders` - add admin-only read-all (for diagnostics/Users panel)
    - `user_order_items` - add admin-only read-all (for diagnostics/Users panel)

  2. Security
    - Anonymous users can no longer browse user addresses, points, checkins, or audit logs
    - Regular authenticated users can still read their own data via existing own-row policies
    - Admin users can read all data across all users (needed for Users panel and Diagnostics)
*/

-- user_addresses: remove anon + overly broad authenticated read
DROP POLICY IF EXISTS "Anon can read all addresses" ON user_addresses;
DROP POLICY IF EXISTS "Authenticated users can read all addresses" ON user_addresses;

CREATE POLICY "Users can read own addresses"
  ON user_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all addresses"
  ON user_addresses FOR SELECT
  TO authenticated
  USING (is_admin());

-- user_points: remove anon read-all
DROP POLICY IF EXISTS "Anon can read all user_points" ON user_points;

CREATE POLICY "Admins can read all user_points"
  ON user_points FOR SELECT
  TO authenticated
  USING (is_admin());

-- user_checkins: remove anon read-all
DROP POLICY IF EXISTS "Anon can read all user_checkins" ON user_checkins;

CREATE POLICY "Admins can read all user_checkins"
  ON user_checkins FOR SELECT
  TO authenticated
  USING (is_admin());

-- points_audit_log: remove anon view-all
DROP POLICY IF EXISTS "Anon can view all audit logs" ON points_audit_log;

CREATE POLICY "Admins can read all audit logs"
  ON points_audit_log FOR SELECT
  TO authenticated
  USING (is_admin());

-- user_orders: add admin read-all
CREATE POLICY "Admins can read all orders"
  ON user_orders FOR SELECT
  TO authenticated
  USING (is_admin());

-- user_order_items: add admin read-all
CREATE POLICY "Admins can read all order items"
  ON user_order_items FOR SELECT
  TO authenticated
  USING (is_admin());
