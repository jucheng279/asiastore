/*
  # Tighten Read Policies to Own-Row Only

  Previously, authenticated users could read ALL user_points and
  ALL user_checkins rows. This leaked other users' data unnecessarily.

  1. Changes
    - Replace "Authenticated users can read all user_points" with own-row-only policy
    - Replace "Authenticated users can read all user_checkins" with own-row-only policy

  2. Security
    - Authenticated users can now only see their own points and check-in records
    - Anon read policies remain for admin panel access
    - No data is lost; users just can't see other users' data anymore
*/

DROP POLICY IF EXISTS "Authenticated users can read all user_points" ON user_points;
CREATE POLICY "Users can read own points"
  ON user_points
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read all user_checkins" ON user_checkins;
CREATE POLICY "Users can read own checkins"
  ON user_checkins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
