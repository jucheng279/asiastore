/*
  # Restore the full check-in points trigger body

  The previous migration in this run simplified this trigger while adding a date pin that is
  ineffective in an AFTER trigger. This restores the authoritative behaviour (balance,
  total_earned and the audit log entry) and keeps the fixed search_path. The date restriction
  is enforced by the insert policy, which requires checkin_date = CURRENT_DATE.
*/

CREATE OR REPLACE FUNCTION public.handle_checkin_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award CONSTANT INTEGER := 1;
  v_new_balance NUMERIC;
BEGIN
  INSERT INTO public.user_points (user_id, balance, total_earned, updated_at)
  VALUES (NEW.user_id, v_award, v_award, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_points.balance + v_award,
    total_earned = user_points.total_earned + v_award,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.points_audit_log (user_id, change_amount, new_balance, reason)
  VALUES (NEW.user_id, v_award, COALESCE(v_new_balance, v_award), 'checkin');

  RETURN NEW;
END;
$$;
