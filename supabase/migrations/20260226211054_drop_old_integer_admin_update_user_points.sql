/*
  # Drop Old Integer Overload of admin_update_user_points

  1. Changes
    - Drops the old `admin_update_user_points(uuid, integer)` function
    - Only the `admin_update_user_points(uuid, numeric)` version remains

  2. Notes
    - The previous migration created a new overload instead of replacing
      the original because PostgreSQL treats different parameter types
      as distinct functions
    - This caused an ambiguity error when calling the RPC
    - Safe to drop: the integer variant is unused and the numeric
      variant covers all use cases
*/

DROP FUNCTION IF EXISTS admin_update_user_points(uuid, integer);
