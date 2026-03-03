/*
  # Harden Points Security - Remove Direct User Access

  This migration removes the ability for users to directly modify
  their own points balance via INSERT or UPDATE on user_points.

  1. Security Changes
    - DROP "Users can update own points" policy (CRITICAL: users could set any balance)
    - DROP "Users can insert own points" policy (handled by trigger, users should never insert directly)
    - Points can now ONLY be modified through SECURITY DEFINER functions:
      - handle_new_profile_points (registration bonus)
      - handle_checkin_points (daily check-in)
      - deduct_user_points (spending points)
      - create_order_atomic (order with points payment)
      - admin_update_user_points (admin adjustments)

  2. Important Notes
    - Existing SECURITY DEFINER functions bypass RLS, so they continue to work
    - Users retain SELECT access to read their own points
    - Admin (anon) retains SELECT access for the admin panel
*/

DROP POLICY IF EXISTS "Users can update own points" ON user_points;
DROP POLICY IF EXISTS "Users can insert own points" ON user_points;
