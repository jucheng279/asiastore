/*
  # Restrict unpublished draft content to admins, and pin function search paths

  1. Draft tables were readable by anon with USING (true), publishing unreleased products,
     prices and discount settings. Reads are now limited to admins, matching
     draft_store_settings which was already restricted. Only the admin console reads these.

  2. Four remaining functions had a mutable search_path; each is pinned to public.
*/

DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'draft_categories','draft_subcategories','draft_products',
    'draft_expiry_items','draft_flash_sale_items',
    'draft_expiry_settings','draft_flash_sale_settings'
  ])
  LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "Admins can read %s" ON public.%I FOR SELECT TO authenticated USING (is_admin())',
      t, t
    );
  END LOOP;
END $$;

ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_profile_points() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_flash_sales() SET search_path = public;
ALTER FUNCTION public.deduct_user_points(uuid, numeric) SET search_path = public;
