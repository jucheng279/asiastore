/*
  # Restrict RPC Function Execution Permissions

  Tightens who can call each points-related function using REVOKE/GRANT.

  1. Changes
    - `deduct_user_points`: only callable by authenticated users (revoke from anon and public)
    - `create_order_atomic`: only callable by authenticated users (revoke from anon and public)
    - `admin_update_user_points`: remains callable by anon (for admin panel) and service_role
    - `handle_checkin_points` and `handle_new_profile_points`: triggers, no change needed

  2. Important Notes
    - Prevents anonymous/unauthenticated callers from invoking user-facing RPC functions
    - Admin function kept accessible via anon for the admin panel's current auth pattern
*/

REVOKE EXECUTE ON FUNCTION deduct_user_points(UUID, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, NUMERIC) TO authenticated;

REVOKE EXECUTE ON FUNCTION create_order_atomic(UUID, NUMERIC, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, JSONB) FROM anon, public;
GRANT EXECUTE ON FUNCTION create_order_atomic(UUID, NUMERIC, TEXT, TEXT, JSONB, TEXT, BOOLEAN, NUMERIC, JSONB) TO authenticated;
