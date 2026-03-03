/*
  # Create Points Audit Log

  Adds a tamper-resistant audit trail for all points changes.
  Users cannot modify this table directly -- only SECURITY DEFINER
  functions can write to it.

  1. New Tables
    - `points_audit_log`
      - `id` (uuid, primary key) - unique log entry ID
      - `user_id` (uuid, NOT NULL) - the user whose points changed
      - `change_amount` (numeric) - positive for earning, negative for spending
      - `new_balance` (numeric) - balance after the change
      - `reason` (text) - category: 'registration', 'checkin', 'order_payment', 'admin_adjustment'
      - `reference_id` (text) - optional reference (e.g., order ID)
      - `created_at` (timestamptz) - when the change occurred

  2. Security
    - RLS enabled
    - Users can only SELECT their own audit log entries
    - Anon can SELECT all (for admin panel)
    - No INSERT/UPDATE/DELETE policies for any user role
    - Only SECURITY DEFINER functions write to this table

  3. Indexes
    - Index on user_id for fast lookups
    - Index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS points_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_amount numeric(10,2) NOT NULL DEFAULT 0,
  new_balance numeric(10,2) NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE points_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
  ON points_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anon can view all audit logs"
  ON points_audit_log
  FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_points_audit_log_user_id ON points_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_points_audit_log_created_at ON points_audit_log(created_at);
