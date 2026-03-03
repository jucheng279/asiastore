/*
  # Fix Overly Permissive RLS Policy on user_points

  1. Security Fix
    - Remove the "Anon can update user_points" policy which allows ANY unauthenticated
      user to modify ANY user's points balance
    - This was a critical security vulnerability: anyone with the anon key could
      give themselves unlimited points
    - The admin panel should use the `admin_update_user_points` SECURITY DEFINER 
      function instead, which already exists and bypasses RLS safely

  2. Notes
    - The anon SELECT policy remains so the admin panel can still read points
    - Authenticated users retain their own UPDATE policy for legitimate operations
    - The new `deduct_user_points` and `create_order_atomic` functions use 
      SECURITY DEFINER so they bypass RLS and don't need this policy
*/

DROP POLICY IF EXISTS "Anon can update user_points" ON user_points;
