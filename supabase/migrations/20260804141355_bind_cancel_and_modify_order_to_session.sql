/*
  # Bind order cancellation and order editing to the caller's session

  Both functions previously trusted the p_user_id argument, so any caller could act on
  another account's order. Their bodies are renamed to *_internal and revoked from client
  roles, and same-signature wrappers now derive the acting user from auth.uid() and reject
  a p_user_id that does not match the caller.
*/

ALTER FUNCTION public.cancel_order_atomic(uuid, uuid) RENAME TO cancel_order_atomic_internal;

REVOKE ALL ON FUNCTION public.cancel_order_atomic_internal(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_order_atomic(p_user_id UUID, p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wrap$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN cancel_order_atomic_internal(v_uid, p_order_id);
END;
$wrap$;

REVOKE ALL ON FUNCTION public.cancel_order_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_atomic(uuid, uuid) TO authenticated;

ALTER FUNCTION public.modify_order_atomic(uuid, uuid, jsonb) RENAME TO modify_order_atomic_internal;

REVOKE ALL ON FUNCTION public.modify_order_atomic_internal(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.modify_order_atomic(p_user_id UUID, p_order_id UUID, p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wrap$
DECLARE
  v_uid UUID := auth.uid();
  v_item JSONB;
  v_qty INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      BEGIN
        v_qty := (v_item->>'quantity')::INTEGER;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid quantity';
      END;
      IF v_qty IS NULL OR v_qty < 0 OR v_qty > 999 THEN
        RAISE EXCEPTION 'Invalid quantity';
      END IF;
    END LOOP;
  END IF;

  RETURN modify_order_atomic_internal(v_uid, p_order_id, p_items);
END;
$wrap$;

REVOKE ALL ON FUNCTION public.modify_order_atomic(uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modify_order_atomic(uuid, uuid, jsonb) TO authenticated;
