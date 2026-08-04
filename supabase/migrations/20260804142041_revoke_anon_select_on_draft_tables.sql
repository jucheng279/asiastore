/*
  # Remove the anon read grant on draft tables

  Row level security already denies unauthenticated reads of the draft tables, but the
  table-level SELECT grant still made them discoverable through the Data API schema.
  Only the admin console (signed in) reads these tables.
*/

REVOKE SELECT ON public.draft_categories FROM anon;
REVOKE SELECT ON public.draft_subcategories FROM anon;
REVOKE SELECT ON public.draft_products FROM anon;
REVOKE SELECT ON public.draft_expiry_items FROM anon;
REVOKE SELECT ON public.draft_flash_sale_items FROM anon;
REVOKE SELECT ON public.draft_expiry_settings FROM anon;
REVOKE SELECT ON public.draft_flash_sale_settings FROM anon;
REVOKE SELECT ON public.draft_store_settings FROM anon;
