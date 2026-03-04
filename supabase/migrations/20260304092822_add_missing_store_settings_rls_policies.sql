/*
  # Add missing RLS policies to store settings tables

  Both `store_settings` and `draft_store_settings` were missing INSERT, DELETE,
  and service-role ALL policies. This caused Supabase `.upsert()` calls to
  silently fail because upsert requires an INSERT policy even when the row
  already exists.

  1. Changes
    - `draft_store_settings`: add INSERT, DELETE (admin-only) and ALL (service_role) policies
    - `store_settings`: add INSERT, DELETE (admin-only) and ALL (service_role) policies
  2. Security
    - All new policies restrict writes to authenticated admin users
    - Service-role ALL policy allows backend/migration operations
*/

-- draft_store_settings: INSERT
CREATE POLICY "Admins can insert draft store settings"
  ON draft_store_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- draft_store_settings: DELETE
CREATE POLICY "Admins can delete draft store settings"
  ON draft_store_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- draft_store_settings: ALL for service_role
CREATE POLICY "Service role can manage draft_store_settings"
  ON draft_store_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- store_settings: INSERT
CREATE POLICY "Admins can insert store settings"
  ON store_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- store_settings: DELETE
CREATE POLICY "Admins can delete store settings"
  ON store_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- store_settings: ALL for service_role
CREATE POLICY "Service role can manage store_settings"
  ON store_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
