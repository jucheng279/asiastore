/*
  # Limit the daily check-in to the current date

  checkin_date was client-writable and only unique per (user_id, checkin_date), so a caller
  could insert one row per past or future date and have the points trigger award a point for
  each. The insert policy now requires today's date, and the trigger overrides the value as a
  second barrier. The trigger also gets a fixed search_path.
*/

DROP POLICY IF EXISTS "Users can insert own checkins" ON public.user_checkins;

CREATE POLICY "Users can insert own checkins"
  ON public.user_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND checkin_date = CURRENT_DATE);

CREATE OR REPLACE FUNCTION public.handle_checkin_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.checkin_date := CURRENT_DATE;
  NEW.points_awarded := 1;

  INSERT INTO user_points (user_id, balance)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = user_points.balance + 1, updated_at = now();

  RETURN NEW;
END;
$$;
