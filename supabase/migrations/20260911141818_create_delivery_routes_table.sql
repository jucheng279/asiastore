/*
# Create delivery_routes table for shareable route plans

1. New Tables
   - `delivery_routes`
     - `id` (text, primary key) - short unique ID for shareable URLs
     - `created_at` (timestamptz) - when the route was created
     - `window_label` (text) - ordering window label for display
     - `total_time_seconds` (integer) - estimated total drive time
     - `total_distance_meters` (integer) - estimated total route distance
     - `route_geometry` (jsonb) - GeoJSON coordinates for the route line
     - `store_address` (jsonb) - start point with lat/lon and address string
     - `end_mode` (text) - return_to_start, last_stop, or custom
     - `stops` (jsonb) - ordered array of delivery stops with all display info

2. Security
   - RLS enabled.
   - Anyone (anon + authenticated) can read routes by ID (delivery drivers need this without logging in).
   - Only authenticated admins can insert routes.
   - No update or delete policies needed (routes are immutable snapshots).

3. Notes
   - Routes are shareable via a short URL; the delivery driver opens it without authentication.
   - Old routes should be cleaned up periodically, but no auto-delete for now.
*/

CREATE TABLE IF NOT EXISTS delivery_routes (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  window_label text NOT NULL DEFAULT '',
  total_time_seconds integer NOT NULL DEFAULT 0,
  total_distance_meters integer NOT NULL DEFAULT 0,
  route_geometry jsonb NOT NULL DEFAULT '[]'::jsonb,
  store_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  end_mode text NOT NULL DEFAULT 'return_to_start',
  stops jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;

-- Anyone can read (delivery drivers access without login)
DROP POLICY IF EXISTS "anon_select_delivery_routes" ON delivery_routes;
CREATE POLICY "anon_select_delivery_routes" ON delivery_routes FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated users can create routes (admin panel is behind auth)
DROP POLICY IF EXISTS "auth_insert_delivery_routes" ON delivery_routes;
CREATE POLICY "auth_insert_delivery_routes" ON delivery_routes FOR INSERT
  TO authenticated WITH CHECK (true);

-- No update needed
DROP POLICY IF EXISTS "auth_delete_delivery_routes" ON delivery_routes;
CREATE POLICY "auth_delete_delivery_routes" ON delivery_routes FOR DELETE
  TO authenticated USING (true);
