/*
  # Create user_orders and user_order_items tables

  1. New Tables
    - `user_orders`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, FK to profiles.id)
      - `total` (numeric, order total amount)
      - `contact_email` (text, customer email at time of order)
      - `contact_phone` (text, customer phone at time of order)
      - `shipping_address` (jsonb, full address snapshot)
      - `delivery_instructions` (text, nullable)
      - `created_at` (timestamptz, default now())
    - `user_order_items`
      - `id` (uuid, primary key, auto-generated)
      - `order_id` (uuid, FK to user_orders.id with CASCADE)
      - `product_id` (text, product identifier at time of order)
      - `name` (text, product name snapshot)
      - `image` (text, product image URL snapshot)
      - `price` (numeric, price at time of order)
      - `quantity` (integer, number of units ordered)
  2. Security
    - Enable RLS on both tables
    - Authenticated users can SELECT and INSERT their own orders
    - Authenticated users can SELECT and INSERT items belonging to their own orders
*/

CREATE TABLE IF NOT EXISTS user_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total numeric NOT NULL DEFAULT 0,
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_instructions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON user_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON user_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES user_orders(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);

ALTER TABLE user_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON user_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_orders
      WHERE user_orders.id = user_order_items.order_id
      AND user_orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own order items"
  ON user_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_orders
      WHERE user_orders.id = user_order_items.order_id
      AND user_orders.user_id = auth.uid()
    )
  );
