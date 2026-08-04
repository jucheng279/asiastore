/*
  # Prevent a user from granting themselves the admin flag

  The self-insert policy constrained only the id, so a user could delete their own profile
  row and re-insert it with is_admin = true. The insert policy now pins is_admin to false,
  and the column privilege for INSERT/UPDATE is revoked from client roles as a second layer
  (no client code writes this column; admins change it through admin policies as postgres/
  service role or via the existing admin UPDATE policy, which is unaffected because that
  policy is evaluated for the admin's own session and the column grant is what we narrow).
*/

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND COALESCE(is_admin, false) = false);

REVOKE INSERT (is_admin) ON public.profiles FROM anon, authenticated;
