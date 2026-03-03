/*
  # Re-tighten diagnostic function execute permissions

  The restore migration (20260301220246) used CREATE OR REPLACE which reset
  execute permissions to PUBLIC default. This migration restores the correct
  grant-level restrictions so that only authenticated and service_role can
  call these functions. The functions also have is_admin() body checks for
  defense-in-depth.

  1. Security Changes
    - Revoke PUBLIC execute on all 5 diagnostic functions
    - Grant execute only to authenticated and service_role
    - Affected functions:
      - get_database_health
      - get_table_stats
      - get_order_analytics
      - get_user_activity_stats
      - get_data_integrity_check
*/

REVOKE ALL ON FUNCTION get_database_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_database_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_health() TO service_role;

REVOKE ALL ON FUNCTION get_table_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_stats() TO service_role;

REVOKE ALL ON FUNCTION get_order_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_order_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_analytics() TO service_role;

REVOKE ALL ON FUNCTION get_user_activity_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_activity_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_stats() TO service_role;

REVOKE ALL ON FUNCTION get_data_integrity_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_data_integrity_check() TO authenticated;
GRANT EXECUTE ON FUNCTION get_data_integrity_check() TO service_role;
