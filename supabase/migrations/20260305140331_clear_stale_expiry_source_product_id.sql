/*
  # Clear stale source_product_id on expiry items

  1. Changes
    - Sets `source_product_id` to NULL on all `expiry_items` rows
    - Expiry items are fully independent from catalog products and should not reference them
    - These stale references were causing productMap key collisions in the storefront,
      leading to cart quantity controls malfunctioning for best-seller products

  2. Important Notes
    - Only affects `expiry_items` table
    - Does NOT touch `flash_sale_items` -- flash sale references to catalog products are
      intentional and used by the inventory sync system
*/

UPDATE expiry_items
SET source_product_id = NULL
WHERE source_product_id IS NOT NULL;
