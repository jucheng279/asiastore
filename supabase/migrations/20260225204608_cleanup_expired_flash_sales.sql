/*
  # Cleanup Expired Flash Sales Function
  
  1. New Functions
    - `cleanup_expired_flash_sales()`: Removes expired flash sale items and updates source products
      - Finds flash sale items where (flash_start_date + flash_days) < current date
      - Sets the `flash` flag to false on the corresponding source product in the products table
      - Deletes the expired flash sale item from flash_sale_items table
      - Also cleans up corresponding draft_flash_sale_items for consistency
  
  2. Behavior
    - When a flash sale expires, the product returns to normal catalog state
    - The source product's `flash` boolean is set to false
    - The flash_sale_items record is removed
    - This can be called manually or via a scheduled job
  
  3. Security
    - Function is owned by postgres and executes with elevated privileges
    - Only affects expired flash sales based on date calculation
*/

CREATE OR REPLACE FUNCTION cleanup_expired_flash_sales()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_item RECORD;
BEGIN
  FOR expired_item IN
    SELECT id, source_product_id
    FROM flash_sale_items
    WHERE (flash_start_date + (flash_days || ' days')::interval) < CURRENT_TIMESTAMP
  LOOP
    IF expired_item.source_product_id IS NOT NULL THEN
      UPDATE products
      SET flash = false
      WHERE id = expired_item.source_product_id;

      UPDATE draft_products
      SET flash = false
      WHERE id = expired_item.source_product_id;
    END IF;

    DELETE FROM flash_sale_items WHERE id = expired_item.id;

    DELETE FROM draft_flash_sale_items 
    WHERE source_product_id = expired_item.source_product_id;
  END LOOP;
END;
$$;