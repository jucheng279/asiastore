/*
# Revoke anonymous write privileges on live inventory tables

## Summary
Removes the INSERT, UPDATE, and DELETE table-level privileges from the `anon`
role on the 7 live inventory-related tables. RLS policies already block
anonymous writes (only admin-authenticated users can modify these tables),
but revoking the underlying privilege adds defense-in-depth — matching the
pattern already applied to order tables and draft tables.

## Modified Tables
- categories
- subcategories
- products
- expiry_items
- expiry_settings
- flash_sale_items
- flash_sale_settings

## Security Changes
- REVOKE INSERT, UPDATE, DELETE from `anon` on all 7 tables listed above.
- No functional change for end-users: RLS already blocked anonymous writes.
- Prevents future exposure if a SECURITY DEFINER function or view were
  accidentally created on these tables without proper guards.

## Important Notes
1. SELECT remains granted to `anon` — the customer storefront reads these
   tables via the anon key and that must continue working.
2. The `authenticated` role retains full privileges — admin users (checked
   via RLS `is_admin()`) still write through PostgREST.
3. The `service_role` is unaffected (superuser-like, bypasses grants).
*/

REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subcategories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.expiry_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.expiry_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.flash_sale_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.flash_sale_settings FROM anon;
