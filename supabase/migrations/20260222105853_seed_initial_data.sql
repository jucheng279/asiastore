/*
  # Seed Initial Data

  Migrates all hardcoded placeholder products from the frontend app into the database.

  1. Categories (7)
    - vegetables, seasoning, sauce, convenient, frozen, snacks, beverage
    - Each with image_url for the circular thumbnail on the frontend home page

  2. Subcategories (28 total, 4 per category)
    - vegetables: leafy-greens, root-vegetables, mushrooms, fresh-herbs
    - seasoning: salt-pepper, spice-blends, msg, dried-herbs
    - sauce: soy-sauce, chili-sauce, fish-sauce, oyster-sauce
    - convenient: instant-noodles, ready-meals, canned-goods, rice-bowls
    - frozen: dumplings, seafood, frozen-vegetables, ice-cream
    - snacks: chips, crackers, cookies, candy
    - beverage: tea, soda, juice, milk-tea

  3. Products (9 parent + 10 variants = 19 total)
    - Mapped to appropriate categories/subcategories
    - Includes all pricing, ratings, images, tags, flags

  4. Expiry Items (6) - near-expiry deals
  5. Flash Sale Items (6) - limited time flash sales
*/

-- Categories
INSERT INTO categories (id, name, image_url, display_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Vegetables', 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=200', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Seasoning', 'https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=200', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Sauce', 'https://images.pexels.com/photos/4198019/pexels-photo-4198019.jpeg?auto=compress&cs=tinysrgb&w=200', 3),
  ('a0000000-0000-0000-0000-000000000004', 'Convenient', 'https://images.pexels.com/photos/5718026/pexels-photo-5718026.jpeg?auto=compress&cs=tinysrgb&w=200', 4),
  ('a0000000-0000-0000-0000-000000000005', 'Frozen', 'https://images.pexels.com/photos/6646359/pexels-photo-6646359.jpeg?auto=compress&cs=tinysrgb&w=200', 5),
  ('a0000000-0000-0000-0000-000000000006', 'Snacks', 'https://images.pexels.com/photos/5848584/pexels-photo-5848584.jpeg?auto=compress&cs=tinysrgb&w=200', 6),
  ('a0000000-0000-0000-0000-000000000007', 'Beverage', 'https://images.pexels.com/photos/1337825/pexels-photo-1337825.jpeg?auto=compress&cs=tinysrgb&w=200', 7);

-- Subcategories
-- Vegetables
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Leafy Greens', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Root Vegetables', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Mushrooms', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Fresh Herbs', 4);
-- Seasoning
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Salt & Pepper', 1),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Spice Blends', 2),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'MSG', 3),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Dried Herbs', 4);
-- Sauce
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'Soy Sauce', 1),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'Chili Sauce', 2),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 'Fish Sauce', 3),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 'Oyster Sauce', 4);
-- Convenient
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000004', 'Instant Noodles', 1),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000004', 'Ready Meals', 2),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000004', 'Canned Goods', 3),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000004', 'Rice Bowls', 4);
-- Frozen
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000005', 'Dumplings', 1),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000005', 'Seafood', 2),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000005', 'Vegetables', 3),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000005', 'Ice Cream', 4);
-- Snacks
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000006', 'Chips', 1),
  ('b0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000006', 'Crackers', 2),
  ('b0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000006', 'Cookies', 3),
  ('b0000000-0000-0000-0000-000000000024', 'a0000000-0000-0000-0000-000000000006', 'Candy', 4);
-- Beverage
INSERT INTO subcategories (id, category_id, name, display_order) VALUES
  ('b0000000-0000-0000-0000-000000000025', 'a0000000-0000-0000-0000-000000000007', 'Tea', 1),
  ('b0000000-0000-0000-0000-000000000026', 'a0000000-0000-0000-0000-000000000007', 'Soda', 2),
  ('b0000000-0000-0000-0000-000000000027', 'a0000000-0000-0000-0000-000000000007', 'Juice', 3),
  ('b0000000-0000-0000-0000-000000000028', 'a0000000-0000-0000-0000-000000000007', 'Milk Tea', 4);

-- Products (parent products first)
-- Shin Ramyun -> Convenient / Instant Noodles
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, tags, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', NULL,
   'Shin Ramyun Spicy Noodles', 'Shin Ramyun Kryddiga Nudlar', '辛拉面辣味面条',
   'Korea''s iconic spicy noodle soup, loved worldwide for its rich, bold broth and perfectly chewy noodles. A comforting bowl of heat and flavor in every bite.', 'Koreas ikoniska kryddiga nudelsoppa.', '韩国标志性辣味方便面。',
   7.50, 5.99,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDtzeMoUPDesJY_T3RI1PrJ4CaTQ_yKkfJZNnd5mc7IWehaTKLxJnsIc5iyw_YYYmW4lAKDgatWUd1sUwAt2lSHONwFJdasTvGneZrih75x82EcMc65jBaglen9sJq9N0wIW49UbGlYfgKjfVKl6K5uJAfh7qWtUWqCWsh_dDsmUAyI5JReEjFtrUk0xccYknfxdJD_eClRbKq7l5EFDXusbp81hEebQ_MImO0-RYnc7B41PrO4nY2mk9ANot4ufLNOOty_EzU0F5Q',
   'Nongshim', 1, true, false, false, '{}', 4.9, 1200);

-- Hello Panda -> Snacks / Cookies
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, is_best_seller, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', NULL,
   'Hello Panda Biscuits', 'Hello Panda Kex', '小熊饼干',
   'Adorable panda-shaped biscuits filled with creamy flavored filling. A fun and delicious snack loved by kids and adults alike.', 'Pandaformade kex med krämig fyllning.', '可爱的熊猫形饼干。',
   2.50, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9MeVoCu94TeiyZCOkdBteoe5tAvYx5475uCnEvYQURxD9WensFOrtOn7CszIfK_IMoW5tW9evYmDXUKqWPMweo46FK-i9CZpzrRDutU5LX-7UsG6DFuuizEDOuQrzbyDAa_oZEu2WL5H_gcX_EQqsiBo-6hzu1PzVqdyKq2egcZYtlywlioCL-0dA3R8ssYhkE9ZU79YseqndPkVOt8i_eSq27Uk8Z1d-AB2_5tDmAwjhFo5HTbqX2xF3F-grjZyv-BbwivhgKw',
   'Meiji', 2, true, false, false, true, 4.7, 850);

-- Premium Soy Sauce -> Sauce / Soy Sauce
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000009', NULL,
   'Premium Soy Sauce', 'Premium Sojasås', '优质酱油',
   'Naturally brewed soy sauce with a deep umami flavor. Perfect for marinades, stir-fries, and dipping sauces.', 'Naturligt bryggd sojasås.', '天然酿造酱油。',
   4.20, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuD8-BTI3_pDfaQP_jAhm2F9zo_-Ee5OOq8bWhMRH_J1E4iavP4J15hlm1nRj5-w6S_MyH6Zm8vRl5S1HkVm7bamNXtw3HKMjJknN_Jbr07lumnX1Mv4POZTx8lkNIPmfy1AFDXorlTVam_ugi4YbFfuSRFXctPQVyaq-OKlQe5l-WX4EXSCVhh_XN2cos0h3DasIBWDk-s-iPIaxQO7n1109ZwjfrmvXtTR3IOT2pjOcH3gDI11G92Ke4MAJy_aSb5x5Px6fK-lMvM',
   NULL, 3, true, false, false, 4.8, 320);

-- Fresh Bok Choy -> Vegetables / Leafy Greens
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, unit, tags, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', NULL,
   'Fresh Bok Choy (lb)', 'Färsk Bok Choy (lb)', '新鲜小白菜 (磅)',
   'Crisp, tender bok choy freshly sourced for your kitchen. Great in soups, stir-fries, or steamed as a side.', 'Krispig, mör bok choy.', '新鲜脆嫩的小白菜。',
   1.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDrPG6C6ad2wMeeqJLK_kGjtC9A02-ISJfg5JnUXXNCPAaXKIPSME1DPOBEyU6Eg8S4ed5O1voTYhaTmqWn5QMm29BlIuG4fx6gcqOqqLDkcK2VNFmwk8Cvx_L5Yu38Iovy-1GWcS9LbW-VPIiKK3qVN2DZM6Hf_AdwN_RweSybHePeZAAsl58zRH8I_AmCwEIB-mArMfl2g8B5ukz_DJPM9wEjEOTUYuTrhh93_hGuZVaV_N27Uv045W4lGxGzU6ZcrKnav31_gU0',
   NULL, 4, true, false, false, '/ lb', '{Fresh}', 4.9, 56);

-- KitKat Matcha -> Snacks / Candy
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, is_best_seller, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000024', NULL,
   'KitKat Mini - Matcha Green Tea', 'KitKat Mini - Matcha Grönt Te', 'KitKat迷你 - 抹茶绿茶',
   'Japan-exclusive matcha-flavored KitKat minis with a perfect balance of bitter green tea and sweet white chocolate.', 'Japan-exklusiva matcha-smaksatta KitKat.', '日本限定抹茶味KitKat。',
   6.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuA1ZH2icpFCwaJc43AyhudlroyhKjawTJ7F7SAfCA3Rujs46opPPPHPUkA0PsUvL0xTq7VqD2taWitBeDYswom5P7VqVCk-a5rxFnOtaNUjfDpTUXSguktYaJpxgipojtvQwSmLCQCXHF4qV-mPB4SELV7wIG-ih1zMJHnzg4GYyka6R7-nUlpRU6608R9RJtmeeK5GPpQA4LI_-tgnaJ3bzaXJhDfGg5mErg04CqOHMIotfzzsLMQXWipMZ2iQFe0fsaov4HW3W7c',
   'Nestle', 5, true, false, false, true, 4.8, 120);

-- Potato Chips Seaweed -> Snacks / Chips
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000021', NULL,
   'Potato Chips - Seaweed Salt', 'Potatischips - Sjögräs Salt', '薯片 - 海苔盐味',
   'Light and crispy potato chips seasoned with savory seaweed and sea salt. A beloved Japanese snack staple.', 'Lätta och krispiga chips med sjögräs.', '轻脆薯片配海苔盐。',
   2.49, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuANT9vJJA5aLfySPNyACJ4sbSOyUkzLw3gHFab9L59-Z6-1kg9IZXGBb9tPaWkrvZXOeajaZSjJl0aqZbs1vZu8hUceVxZdDOxqg7NlrXQPxM7FHLfiDmSLAvuBBmpqrFtdFsGYIkGmyGsxm3-OQ5Adn17wV1lKyQQadytOfCUxf8IFQOMcSle19j8o_-oKPWqEAaqeqBfw1rOH08Yhe_0QyFN_RoIo3PYE06uGIFCjsDP5aGIGzzbi9UTU1i_Jq7cg1e9108vqRic',
   'Calbee', 6, true, false, false, 4.6, 45);

-- Ramune Soda -> Beverage / Soda
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, is_new, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000026', NULL,
   'Ramune Soda - Melon Flavor', 'Ramune Läsk - Melonsmak', '弹珠汽水 - 蜜瓜味',
   'Classic Japanese marble soda in melon flavor. Fun to open and refreshingly sweet with every sip.', 'Klassisk japansk kulläsk med melonsmak.', '经典日本弹珠汽水蜜瓜味。',
   2.19, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDBvIf2IwvkD6kONGyU_gHTnfwq70QCKMsSMAn2HO5jtTWoERRKEecLQIMso8DEi34c7krQwYxEsndticZMJ4dPFPrO-JqHwyiAAoxA3OMU3mf9msymvLYR_60CDpH0w1IvcBw9MzaSoXSGbV5SNnY5z393cYvwdaZWhm85yeuKfbRkyt0Ih7pa23hwmoik62clXKpzv6wnq860VQmWu9Kob1LpoQvB1ifYLbI4UOaCRb_edfjeaaM9uV2lteHzH4z_q_wH-DCvAt4',
   'Shirakiku', 7, true, false, false, true, 4.5, 23);

-- Pocky -> Snacks / Cookies
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', NULL,
   'Pocky - Strawberry Cream', 'Pocky - Jordgubbskräm', 'Pocky - 草莓奶油',
   'Thin pretzel sticks coated in luscious cream. A shareable treat that has been a favorite across Asia for decades.', 'Tunna kringlor doppade i krämig glasyr.', '涂满奶油的细棒饼干。',
   1.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAKAD_rjaWaWzitnGSjbywIdsy-DLecoSRVPa-fPtexmwaBmVRXbgHyzdLtMFaxwHzwC_A-vB5MuF6rJbngvz4VA9WzARSv7B8MUfzTISI1pE-LvNK7U_Kx70jDkFUUL3k1hQIBEF1SgxgEKFaPKXCp45oYwCZWxgRlUeJhs3vtcNxsfC1C6jmuEcF5qnZzWeLWJXxNqttnfbB9oi_mvvWHVubPplEdxh8_hAJFgHmvKvLnyrTmaWQKjEh5FqblDQmNJoqdolnR0U4',
   'Glico', 8, true, false, false, 4.8, 234);

-- Raoh Ramen -> Convenient / Instant Noodles
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, trending, flash, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', NULL,
   'Raoh Ramen - Tonkotsu Flavor', 'Raoh Ramen - Tonkotsusmak', '拉王拉面 - 豚骨味',
   'Premium instant ramen with a rich, creamy pork bone broth. Restaurant-quality taste in just minutes.', 'Premium instant-ramen med krämig fläskbuljong.', '高级方便面配浓郁猪骨汤。',
   2.89, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCu3K1I_ZERt0WSx4-uaMhM0IxP6RcfyKikXqL-zEH-QCgrIoGaAMrjoNrTafLwOSbPAE74uyujI03gsKQ8L0uJ7bg1efdq9htEx9g_KC43gkPucXJmfGAcjezXRc1WhDi8A0Ltn1tvuQOSjX-AwnWNzgGjc0i31D99frtJyHVLqUzfeOboY9-7mzbFEbmCZYaQjZcDhZovdlcMlzPwwQcpaKrtG4wUOALVsD2wDXWsmhPKxLdSRyxk8eh0VYBHGMfRvBN0yrLNq-o',
   'Nissin', 9, true, false, false, 4.9, 156);

-- Variant children for Shin Ramyun
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, price, sale_price, image_url, brand, display_order, internal_order, visible, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000101', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001',
   'Shin Ramyun Original 120g', 'Shin Ramyun Original 120g', '辛拉面原味 120g', '',
   7.50, 5.99,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDtzeMoUPDesJY_T3RI1PrJ4CaTQ_yKkfJZNnd5mc7IWehaTKLxJnsIc5iyw_YYYmW4lAKDgatWUd1sUwAt2lSHONwFJdasTvGneZrih75x82EcMc65jBaglen9sJq9N0wIW49UbGlYfgKjfVKl6K5uJAfh7qWtUWqCWsh_dDsmUAyI5JReEjFtrUk0xccYknfxdJD_eClRbKq7l5EFDXusbp81hEebQ_MImO0-RYnc7B41PrO4nY2mk9ANot4ufLNOOty_EzU0F5Q',
   'Nongshim', 1, 1, true, 4.9, 1200),
  ('c0000000-0000-0000-0000-000000000102', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001',
   'Shin Ramyun Kimchi 120g', 'Shin Ramyun Kimchi 120g', '辛拉面泡菜味 120g', '',
   6.49, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDtzeMoUPDesJY_T3RI1PrJ4CaTQ_yKkfJZNnd5mc7IWehaTKLxJnsIc5iyw_YYYmW4lAKDgatWUd1sUwAt2lSHONwFJdasTvGneZrih75x82EcMc65jBaglen9sJq9N0wIW49UbGlYfgKjfVKl6K5uJAfh7qWtUWqCWsh_dDsmUAyI5JReEjFtrUk0xccYknfxdJD_eClRbKq7l5EFDXusbp81hEebQ_MImO0-RYnc7B41PrO4nY2mk9ANot4ufLNOOty_EzU0F5Q',
   'Nongshim', 1, 2, true, 4.7, 890),
  ('c0000000-0000-0000-0000-000000000103', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001',
   'Shin Ramyun Tom Yum 123g', 'Shin Ramyun Tom Yum 123g', '辛拉面冬阴功味 123g', '',
   6.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDtzeMoUPDesJY_T3RI1PrJ4CaTQ_yKkfJZNnd5mc7IWehaTKLxJnsIc5iyw_YYYmW4lAKDgatWUd1sUwAt2lSHONwFJdasTvGneZrih75x82EcMc65jBaglen9sJq9N0wIW49UbGlYfgKjfVKl6K5uJAfh7qWtUWqCWsh_dDsmUAyI5JReEjFtrUk0xccYknfxdJD_eClRbKq7l5EFDXusbp81hEebQ_MImO0-RYnc7B41PrO4nY2mk9ANot4ufLNOOty_EzU0F5Q',
   'Nongshim', 1, 3, true, 4.6, 340),
  ('c0000000-0000-0000-0000-000000000104', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000001',
   'Shin Ramyun Cup 68g', 'Shin Ramyun Kopp 68g', '辛拉面杯面 68g', '',
   2.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDtzeMoUPDesJY_T3RI1PrJ4CaTQ_yKkfJZNnd5mc7IWehaTKLxJnsIc5iyw_YYYmW4lAKDgatWUd1sUwAt2lSHONwFJdasTvGneZrih75x82EcMc65jBaglen9sJq9N0wIW49UbGlYfgKjfVKl6K5uJAfh7qWtUWqCWsh_dDsmUAyI5JReEjFtrUk0xccYknfxdJD_eClRbKq7l5EFDXusbp81hEebQ_MImO0-RYnc7B41PrO4nY2mk9ANot4ufLNOOty_EzU0F5Q',
   'Nongshim', 1, 4, true, 4.5, 560);

-- Variant children for Hello Panda
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, price, sale_price, image_url, brand, display_order, internal_order, visible, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000201', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000002',
   'Hello Panda Chocolate 50g', 'Hello Panda Choklad 50g', '小熊饼干巧克力味 50g', '',
   2.50, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9MeVoCu94TeiyZCOkdBteoe5tAvYx5475uCnEvYQURxD9WensFOrtOn7CszIfK_IMoW5tW9evYmDXUKqWPMweo46FK-i9CZpzrRDutU5LX-7UsG6DFuuizEDOuQrzbyDAa_oZEu2WL5H_gcX_EQqsiBo-6hzu1PzVqdyKq2egcZYtlywlioCL-0dA3R8ssYhkE9ZU79YseqndPkVOt8i_eSq27Uk8Z1d-AB2_5tDmAwjhFo5HTbqX2xF3F-grjZyv-BbwivhgKw',
   'Meiji', 2, 1, true, 4.7, 850),
  ('c0000000-0000-0000-0000-000000000202', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000002',
   'Hello Panda Strawberry 50g', 'Hello Panda Jordgubb 50g', '小熊饼干草莓味 50g', '',
   2.50, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9MeVoCu94TeiyZCOkdBteoe5tAvYx5475uCnEvYQURxD9WensFOrtOn7CszIfK_IMoW5tW9evYmDXUKqWPMweo46FK-i9CZpzrRDutU5LX-7UsG6DFuuizEDOuQrzbyDAa_oZEu2WL5H_gcX_EQqsiBo-6hzu1PzVqdyKq2egcZYtlywlioCL-0dA3R8ssYhkE9ZU79YseqndPkVOt8i_eSq27Uk8Z1d-AB2_5tDmAwjhFo5HTbqX2xF3F-grjZyv-BbwivhgKw',
   'Meiji', 2, 2, true, 4.6, 620),
  ('c0000000-0000-0000-0000-000000000203', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000002',
   'Hello Panda Milk 50g', 'Hello Panda Mjölk 50g', '小熊饼干牛奶味 50g', '',
   2.50, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBv9MeVoCu94TeiyZCOkdBteoe5tAvYx5475uCnEvYQURxD9WensFOrtOn7CszIfK_IMoW5tW9evYmDXUKqWPMweo46FK-i9CZpzrRDutU5LX-7UsG6DFuuizEDOuQrzbyDAa_oZEu2WL5H_gcX_EQqsiBo-6hzu1PzVqdyKq2egcZYtlywlioCL-0dA3R8ssYhkE9ZU79YseqndPkVOt8i_eSq27Uk8Z1d-AB2_5tDmAwjhFo5HTbqX2xF3F-grjZyv-BbwivhgKw',
   'Meiji', 2, 3, true, 4.5, 410);

-- Variant children for Pocky
INSERT INTO products (id, category_id, subcategory_id, parent_product_id, name_en, name_sv, name_zh, description_en, price, sale_price, image_url, brand, display_order, internal_order, visible, rating, reviews) VALUES
  ('c0000000-0000-0000-0000-000000000901', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000009',
   'Pocky Strawberry Cream 45g', 'Pocky Jordgubbskräm 45g', 'Pocky草莓奶油 45g', '',
   1.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAKAD_rjaWaWzitnGSjbywIdsy-DLecoSRVPa-fPtexmwaBmVRXbgHyzdLtMFaxwHzwC_A-vB5MuF6rJbngvz4VA9WzARSv7B8MUfzTISI1pE-LvNK7U_Kx70jDkFUUL3k1hQIBEF1SgxgEKFaPKXCp45oYwCZWxgRlUeJhs3vtcNxsfC1C6jmuEcF5qnZzWeLWJXxNqttnfbB9oi_mvvWHVubPplEdxh8_hAJFgHmvKvLnyrTmaWQKjEh5FqblDQmNJoqdolnR0U4',
   'Glico', 8, 1, true, 4.8, 234),
  ('c0000000-0000-0000-0000-000000000902', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000009',
   'Pocky Matcha 35g', 'Pocky Matcha 35g', 'Pocky抹茶 35g', '',
   2.29, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAKAD_rjaWaWzitnGSjbywIdsy-DLecoSRVPa-fPtexmwaBmVRXbgHyzdLtMFaxwHzwC_A-vB5MuF6rJbngvz4VA9WzARSv7B8MUfzTISI1pE-LvNK7U_Kx70jDkFUUL3k1hQIBEF1SgxgEKFaPKXCp45oYwCZWxgRlUeJhs3vtcNxsfC1C6jmuEcF5qnZzWeLWJXxNqttnfbB9oi_mvvWHVubPplEdxh8_hAJFgHmvKvLnyrTmaWQKjEh5FqblDQmNJoqdolnR0U4',
   'Glico', 8, 2, true, 4.7, 189),
  ('c0000000-0000-0000-0000-000000000903', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000023', 'c0000000-0000-0000-0000-000000000009',
   'Pocky Chocolate 47g', 'Pocky Choklad 47g', 'Pocky巧克力 47g', '',
   1.99, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAKAD_rjaWaWzitnGSjbywIdsy-DLecoSRVPa-fPtexmwaBmVRXbgHyzdLtMFaxwHzwC_A-vB5MuF6rJbngvz4VA9WzARSv7B8MUfzTISI1pE-LvNK7U_Kx70jDkFUUL3k1hQIBEF1SgxgEKFaPKXCp45oYwCZWxgRlUeJhs3vtcNxsfC1C6jmuEcF5qnZzWeLWJXxNqttnfbB9oi_mvvWHVubPplEdxh8_hAJFgHmvKvLnyrTmaWQKjEh5FqblDQmNJoqdolnR0U4',
   'Glico', 8, 3, true, 4.9, 312);

-- Expiry Items
INSERT INTO expiry_items (id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, expiration, display_order, visible, discount_percentage, rating, reviews) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'Fresh Tofu - Silken', 'Färsk Tofu - Silke', '新鲜丝绸豆腐',
   'Smooth, delicate silken tofu perfect for soups, smoothies, and desserts. Made with non-GMO soybeans.', 'Slät, delikat silkestofu.', '细腻嫩滑的丝绸豆腐。',
   2.99, 1.49,
   'https://images.pexels.com/photos/4518609/pexels-photo-4518609.jpeg?auto=compress&cs=tinysrgb&w=400',
   'House Foods', CURRENT_DATE + INTERVAL '2 days', 1, true, 50, 4.6, 89),
  ('e0000000-0000-0000-0000-000000000002',
   'Kimchi - Traditional', 'Kimchi - Traditionell', '传统泡菜',
   'Authentic Korean kimchi made with traditional fermentation methods. Tangy, spicy, and full of probiotics.', 'Autentisk koreansk kimchi.', '正宗韩国泡菜。',
   7.99, 3.99,
   'https://images.pexels.com/photos/5737580/pexels-photo-5737580.jpeg?auto=compress&cs=tinysrgb&w=400',
   'Chongga', CURRENT_DATE + INTERVAL '4 days', 2, true, 50, 4.8, 234),
  ('e0000000-0000-0000-0000-000000000003',
   'Fresh Rice Cakes', 'Färska Riskakor', '新鲜年糕',
   'Soft, chewy Korean rice cakes ideal for tteokbokki and soups. Ready to cook straight from the package.', 'Mjuka, sega koreanska riskakor.', '软糯韩国年糕。',
   4.99, 2.49,
   'https://images.pexels.com/photos/6646069/pexels-photo-6646069.jpeg?auto=compress&cs=tinysrgb&w=400',
   'Wang', CURRENT_DATE + INTERVAL '3 days', 3, true, 50, 4.5, 67),
  ('e0000000-0000-0000-0000-000000000004',
   'Miso Paste - White', 'Misopasta - Vit', '白味噌酱',
   'Mild and sweet white miso paste for soups, dressings, and glazes. A pantry essential for Japanese cooking.', 'Mild och söt vit misopasta.', '温和甜白味噌。',
   8.99, 4.49,
   'https://images.pexels.com/photos/5737247/pexels-photo-5737247.jpeg?auto=compress&cs=tinysrgb&w=400',
   'Marukome', CURRENT_DATE + INTERVAL '5 days', 4, true, 50, 4.9, 156),
  ('e0000000-0000-0000-0000-000000000005',
   'Fresh Gyoza - Pork', 'Färska Gyoza - Fläsk', '新鲜猪肉饺子',
   'Juicy pork-filled dumplings with a thin, crispy wrapper. Pan-fry, steam, or boil for a quick meal.', 'Saftiga fläskfyllda dumplings.', '多汁猪肉饺子。',
   9.99, 4.99,
   'https://images.pexels.com/photos/6646359/pexels-photo-6646359.jpeg?auto=compress&cs=tinysrgb&w=400',
   'Ajinomoto', CURRENT_DATE + INTERVAL '2 days', 5, true, 50, 4.7, 198),
  ('e0000000-0000-0000-0000-000000000006',
   'Fresh Spring Rolls', 'Färska Vårrullar', '新鲜春卷',
   'Ready-to-fry spring rolls packed with vegetables. Crispy on the outside, savory on the inside.', 'Friterfärdiga vårrullar.', '即炸蔬菜春卷。',
   6.99, 3.49,
   'https://images.pexels.com/photos/6646019/pexels-photo-6646019.jpeg?auto=compress&cs=tinysrgb&w=400',
   'Wei-Chuan', CURRENT_DATE + INTERVAL '1 day', 6, true, 50, 4.4, 45);

-- Flash Sale Items
INSERT INTO flash_sale_items (id, name_en, name_sv, name_zh, description_en, description_sv, description_zh, price, sale_price, image_url, brand, display_order, visible, flash_days, flash_start_date, flash_discount_percentage, rating, reviews) VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'Shin Ramyun 5-Pack', 'Shin Ramyun 5-Pack', '辛拉面5连包',
   'Stock up on five packs of Korea''s favorite spicy noodles at an unbeatable price.', 'Fem paket av Koreas favoritnudlar.', '五连包韩国辣面。',
   7.99, 4.99,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDtzeMoUPDesJY_T3RI1PrJ4CaTQ_yKkfJZNnd5mc7IWehaTKLxJnsIc5iyw_YYYmW4lAKDgatWUd1sUwAt2lSHONwFJdasTvGneZrih75x82EcMc65jBaglen9sJq9N0wIW49UbGlYfgKjfVKl6K5uJAfh7qWtUWqCWsh_dDsmUAyI5JReEjFtrUk0xccYknfxdJD_eClRbKq7l5EFDXusbp81hEebQ_MImO0-RYnc7B41PrO4nY2mk9ANot4ufLNOOty_EzU0F5Q',
   'Nongshim', 1, true, 7, CURRENT_DATE, 38, 4.9, 1200),
  ('f0000000-0000-0000-0000-000000000002',
   'Matcha KitKat Box', 'Matcha KitKat Box', '抹茶KitKat盒装',
   'A full box of Japan''s beloved matcha-flavored KitKat minis. Perfect for gifting or enjoying yourself.', 'En hel låda matcha KitKat.', '一整盒日本抹茶KitKat。',
   9.99, 6.99,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuA1ZH2icpFCwaJc43AyhudlroyhKjawTJ7F7SAfCA3Rujs46opPPPHPUkA0PsUvL0xTq7VqD2taWitBeDYswom5P7VqVCk-a5rxFnOtaNUjfDpTUXSguktYaJpxgipojtvQwSmLCQCXHF4qV-mPB4SELV7wIG-ih1zMJHnzg4GYyka6R7-nUlpRU6608R9RJtmeeK5GPpQA4LI_-tgnaJ3bzaXJhDfGg5mErg04CqOHMIotfzzsLMQXWipMZ2iQFe0fsaov4HW3W7c',
   'Nestle', 2, true, 7, CURRENT_DATE, 30, 4.8, 120),
  ('f0000000-0000-0000-0000-000000000003',
   'Premium Soy Sauce', 'Premium Sojasås', '优质酱油',
   'Naturally brewed soy sauce at a steep discount. Stock your pantry while supplies last.', 'Naturligt bryggd sojasås till rabatt.', '天然酿造酱油特价。',
   5.99, 3.49,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDfBWD3wLkHvaQ_lOxZe8FbWkLz-BLhdZt6pl7ktPExUEwWK99Wu3L6bm3I-iFK_A78ZuPzkW0W4GIKylubOS2IGHJKTYMO0X-YTQKnXwWq5njhyGgaYy0TuHPzH6949Mf1Zda1nK3TaNQwA5S_CYON_o7O95VwBufsEjTuY7z-zuIKRkBz06wKFVPZTB0KafZHT_x7FMXSSi3j9jdYgEfbcJu7Ba2RCUh7PGKr0jP4rJgS4JxMSPnlOS356zxiu5xUKQvg0sMYaaU',
   NULL, 3, true, 7, CURRENT_DATE, 42, 4.8, 320),
  ('f0000000-0000-0000-0000-000000000004',
   'Pocky Party Pack', 'Pocky Festpaket', 'Pocky派对装',
   'A party-sized assortment of Pocky sticks in multiple flavors. Great for sharing.', 'Festsortiment av Pocky-pinnar.', 'Pocky多口味派对装。',
   12.99, 8.49,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuAKAD_rjaWaWzitnGSjbywIdsy-DLecoSRVPa-fPtexmwaBmVRXbgHyzdLtMFaxwHzwC_A-vB5MuF6rJbngvz4VA9WzARSv7B8MUfzTISI1pE-LvNK7U_Kx70jDkFUUL3k1hQIBEF1SgxgEKFaPKXCp45oYwCZWxgRlUeJhs3vtcNxsfC1C6jmuEcF5qnZzWeLWJXxNqttnfbB9oi_mvvWHVubPplEdxh8_hAJFgHmvKvLnyrTmaWQKjEh5FqblDQmNJoqdolnR0U4',
   'Glico', 4, true, 7, CURRENT_DATE, 35, 4.8, 234),
  ('f0000000-0000-0000-0000-000000000005',
   'Rice Paper Rolls', 'Rispappersrullar', '米纸卷',
   'Translucent rice paper wrappers for fresh rolls and wraps. Light, healthy, and versatile.', 'Genomskinligt rispapper för rullar.', '透明米纸皮。',
   6.49, 3.99,
   'https://images.pexels.com/photos/6646019/pexels-photo-6646019.jpeg?auto=compress&cs=tinysrgb&w=400',
   NULL, 5, true, 7, CURRENT_DATE, 39, 4.4, 45),
  ('f0000000-0000-0000-0000-000000000006',
   'Mochi Ice Cream 6pk', 'Mochi Glass 6-pack', '麻薯冰淇淋6个装',
   'Six delicious mochi ice cream balls in assorted flavors. A sweet, chewy frozen treat.', 'Sex mochi-glassbollar i blandade smaker.', '六颗多口味麻薯冰淇淋。',
   8.99, 5.99,
   'https://images.pexels.com/photos/6646069/pexels-photo-6646069.jpeg?auto=compress&cs=tinysrgb&w=400',
   NULL, 6, true, 7, CURRENT_DATE, 33, 4.5, 67);
