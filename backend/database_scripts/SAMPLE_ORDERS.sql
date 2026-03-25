-- ══════════════════════════════════════════════════════════════════════════════
-- CHAMBOT — SEED DATA (SAMPLE ORDERS)
-- รันหลังจาก seedData.sql (ใช้ข้อมูล user และ product จาก seedData)
-- สต็อกเริ่มต้น, การทำรายการ, ออเดอร์, การชำระเงิน, webhooks และ embeddings
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════
-- 1. INVENTORY TRANSACTIONS (initial stock-in)
-- ════════════════════════════════════════
-- บันทึก restock ครั้งแรกให้ทุก variant ที่ stock > 0

INSERT INTO public.inventory_transactions
    (variant_id, quantity_changed, quantity_before, quantity_after,
     transaction_type, performed_by, notes)
SELECT
    v.variant_id,
    v.stock_quantity,
    0,
    v.stock_quantity,
    'restock',
    (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1),
    'รับสินค้าเข้าคลังครั้งแรก (initial stock)'
FROM public.product_variants v
WHERE v.stock_quantity > 0;

-- ════════════════════════════════════════
-- 2. CARTS
-- ════════════════════════════════════════

INSERT INTO public.carts (user_id)
SELECT id FROM public.users WHERE role = 'customer' LIMIT 3;

-- cart items: นภาพร มีของในตะกร้า 3 รายการ
INSERT INTO public.cart_items (cart_id, variant_id, quantity)
VALUES
((SELECT c.cart_id FROM public.carts c JOIN public.users u ON c.user_id=u.id WHERE u.phone_number='0891234567'),
 (SELECT variant_id FROM public.product_variants WHERE sku='COFFEE-DOI-500G'), 2),

((SELECT c.cart_id FROM public.carts c JOIN public.users u ON c.user_id=u.id WHERE u.phone_number='0891234567'),
 (SELECT variant_id FROM public.product_variants WHERE sku='TEA-OLONG-100G'), 1),

((SELECT c.cart_id FROM public.carts c JOIN public.users u ON c.user_id=u.id WHERE u.phone_number='0891234567'),
 (SELECT variant_id FROM public.product_variants WHERE sku='CREAM-HERB-30ML'), 5);

-- ════════════════════════════════════════
-- 3. ORDERS + ORDER ITEMS + PAYMENTS + SHIPMENTS
-- ════════════════════════════════════════
-- ครอบคลุม: pending, shipped, delivered, cancelled
--           payment: pending, paid, failed, refunded
--           shipment: preparing, shipped, delivered, returned

-- ── Order 1: วิชัย — delivered + paid ─────────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 860.00, 'delivered', 'paid'
FROM public.users WHERE phone_number = '0856781234';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='COFFEE-DOI-250G'),  220.00, 2),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='TEA-OLONG-200G'),   320.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='PEN-GEL-SET10-BLK'), 120.00, 1) -- คุยส่วนลด -20 (ค่าสมมุติ) รวมยอดเป็น 860
;

INSERT INTO public.payments (order_id, method, transaction_ref, paid_at, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'qr', 'TXN-QR-00001', now() - INTERVAL '5 days', 'paid');

INSERT INTO public.shipments (order_id, address_snapshot, status, shipped_at)
VALUES (
    (SELECT MAX(order_id) FROM public.orders),
    '{"recipient_name":"วิชัย มีสุข","address_line":"89/12 ถ.ห้วยแก้ว","province":"เชียงใหม่","postal_code":"50300"}',
    'delivered',
    now() - INTERVAL '4 days'
);

-- ── Order 2: พิมพ์ใจ — shipped + paid ──────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 1080.00, 'shipped', 'paid'
FROM public.users WHERE phone_number = '0823456789';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='TWS-BT-BLACK'), 590.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='PWRBANK-10K-BLK'), 490.00, 1);

INSERT INTO public.payments (order_id, method, transaction_ref, paid_at, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'transfer', 'TXN-TR-00002', now() - INTERVAL '1 day', 'paid');

INSERT INTO public.shipments (order_id, address_snapshot, status, shipped_at)
VALUES (
    (SELECT MAX(order_id) FROM public.orders),
    '{"recipient_name":"พิมพ์ใจ ดวงแก้ว","address_line":"456 ม.3 ต.หนองหอย","province":"เชียงใหม่","postal_code":"50000"}',
    'shipped',
    now() - INTERVAL '12 hours'
);

-- ── Order 3: นภาพร — pending + pending payment (รอจ่าย) ───────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 440.00, 'pending', 'pending'
FROM public.users WHERE phone_number = '0891234567';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='CANDLE-JASMINE'),  220.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='CANDLE-LAVENDER'), 220.00, 1);

INSERT INTO public.payments (order_id, method, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'qr', 'pending');

-- stock_reservation สำหรับ order pending
INSERT INTO public.stock_reservations (order_id, variant_id, quantity, expires_at)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='CANDLE-JASMINE'), 1, now() + INTERVAL '10 minutes'),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='CANDLE-LAVENDER'), 1, now() + INTERVAL '10 minutes');

-- ── Order 4: นภาพร — cancelled + failed payment ────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 190.00, 'cancelled', 'failed'
FROM public.users WHERE phone_number = '0891234567';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='COCONUT-OIL-250ML'), 190.00, 1);

INSERT INTO public.payments (order_id, method, transaction_ref, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'qr', 'TXN-QR-FAIL-003', 'failed');

-- ── Order 5: ธนพล — delivered + refunded ─────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 290.00, 'delivered', 'refunded'
FROM public.users WHERE phone_number = '0878901234';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='TSHIRT-LANNA-M-WHT'), 290.00, 1);

INSERT INTO public.payments (order_id, method, transaction_ref, paid_at, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'cod', 'COD-00005', now() - INTERVAL '3 days', 'refunded');

INSERT INTO public.shipments (order_id, address_snapshot, status, shipped_at)
VALUES (
    (SELECT MAX(order_id) FROM public.orders),
    '{"recipient_name":"ธนพล สว่างใจ","address_line":"78/3 ถ.เชียงใหม่-ลำพูน","province":"เชียงใหม่","postal_code":"50100"}',
    'returned',
    now() - INTERVAL '3 days'
);

-- ════════════════════════════════════════
-- 4. ORDER STATUS LOGS
-- ════════════════════════════════════════

-- Order 1 (delivered)
INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
VALUES
((SELECT order_id FROM public.orders o JOIN public.users u ON o.user_id=u.id WHERE u.phone_number='0856781234' LIMIT 1),
 'pending',   'system',      'สร้าง order'),
((SELECT order_id FROM public.orders o JOIN public.users u ON o.user_id=u.id WHERE u.phone_number='0856781234' LIMIT 1),
 'shipped',   '(SELECT id FROM public.users WHERE role = ''admin'' LIMIT 1)',  'แพ็คสินค้าและส่งออก'),
((SELECT order_id FROM public.orders o JOIN public.users u ON o.user_id=u.id WHERE u.phone_number='0856781234' LIMIT 1),
 'delivered', 'system',      'ลูกค้าได้รับสินค้าแล้ว');

-- Order 4 (cancelled)
INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
SELECT order_id, 'pending',   'system',     'สร้าง order'
FROM public.orders WHERE payment_status='failed' LIMIT 1;

INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
SELECT order_id, 'cancelled', '(SELECT id FROM public.users WHERE role = ''admin'' LIMIT 1)', 'ลูกค้าชำระเงินไม่สำเร็จ ยกเลิกอัตโนมัติ'
FROM public.orders WHERE payment_status='failed' LIMIT 1;

-- ════════════════════════════════════════
-- 5. PAYMENT WEBHOOKS (ตัวอย่าง log)
-- ════════════════════════════════════════

INSERT INTO public.payment_webhooks (event_type, payload, processed) VALUES
('charge.complete',
 '{"id":"chrg_001","amount":86000,"currency":"thb","status":"successful","metadata":{"order_id":1}}',
 true),
('charge.fail',
 '{"id":"chrg_003","amount":19000,"currency":"thb","status":"failed","failure_code":"insufficient_fund"}',
 true),
('transfer.complete',
 '{"id":"trsf_001","amount":108000,"currency":"thb","status":"paid"}',
 false);

-- ════════════════════════════════════════
-- 6. PRODUCT EMBEDDINGS (placeholder vectors)
-- ════════════════════════════════════════
-- ใช้ vector สุ่มเป็น placeholder — ในระบบจริงให้ generate จาก embedding model

INSERT INTO public.product_embeddings (product_id, text_used, embedding)
SELECT
    p.product_id,
    p.name || ' ' || COALESCE(p.description, ''),
    (
        SELECT array_agg(round(random()::numeric, 4))::float4[]::vector(768)
        FROM generate_series(1, 768)
    )
FROM public.products p
WHERE p.is_active = true
ON CONFLICT (product_id) DO NOTHING;

-- ════════════════════════════════════════
-- VERIFY: quick sanity check
-- ════════════════════════════════════════

SELECT 'users'                  AS tbl, COUNT(*) FROM public.users
UNION ALL SELECT 'categories',          COUNT(*) FROM public.categories
UNION ALL SELECT 'products (total)',     COUNT(*) FROM public.products
UNION ALL SELECT 'products (active)',    COUNT(*) FROM public.products    WHERE is_active=true
UNION ALL SELECT 'variants (total)',     COUNT(*) FROM public.product_variants
UNION ALL SELECT 'variants (active)',    COUNT(*) FROM public.product_variants WHERE is_active=true
UNION ALL SELECT 'variants (out-stock)', COUNT(*) FROM public.product_variants WHERE stock_quantity=0 AND is_active=true
UNION ALL SELECT 'variants (low-stock)', COUNT(*) FROM public.product_variants WHERE stock_quantity>0 AND stock_quantity<=low_stock_threshold AND is_active=true
UNION ALL SELECT 'orders',               COUNT(*) FROM public.orders
UNION ALL SELECT 'order_items',          COUNT(*) FROM public.order_items
UNION ALL SELECT 'payments',             COUNT(*) FROM public.payments
UNION ALL SELECT 'shipments',            COUNT(*) FROM public.shipments
UNION ALL SELECT 'reservations (active)',COUNT(*) FROM public.stock_reservations WHERE released_at IS NULL
UNION ALL SELECT 'inventory_tx',         COUNT(*) FROM public.inventory_transactions
UNION ALL SELECT 'embeddings',           COUNT(*) FROM public.product_embeddings
ORDER BY tbl;════════
-- 8. ORDERS + ORDER ITEMS + PAYMENTS + SHIPMENTS
-- ════════════════════════════════════════
-- ครอบคลุม: pending, shipped, delivered, cancelled
--           payment: pending, paid, failed, refunded
--           shipment: preparing, shipped, delivered, returned

-- ── Order 1: วิไล — delivered + paid ─────────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 179.00, 'delivered', 'paid'
FROM public.users WHERE phone_number = '0822222222';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='RICE-HM-5KG'),  160.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='SALT-SEA-500G'), 12.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='SOY-W-300ML'),    28.00, 1) -- รวม 200 แต่ test ส่วนลด
;

INSERT INTO public.payments (order_id, method, transaction_ref, paid_at, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'qr', 'TXN-QR-00001', now() - INTERVAL '5 days', 'paid');

INSERT INTO public.shipments (order_id, address_snapshot, status, shipped_at)
VALUES (
    (SELECT MAX(order_id) FROM public.orders),
    '{"recipient_name":"วิไล ซื้อบ่อย","address_line":"45 ม.2 ต.หนองแวง อ.พล","province":"ขอนแก่น","postal_code":"40120"}',
    'delivered',
    now() - INTERVAL '4 days'
);

-- ── Order 2: ประสิทธิ์ — shipped + paid ──────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 546.00, 'shipped', 'paid'
FROM public.users WHERE phone_number = '0833333333';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='RICE-HM-25KG'), 720.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='OIL-VEG-1L'),    48.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='SUGAR-W-1KG'),   25.00, 2);

INSERT INTO public.payments (order_id, method, transaction_ref, paid_at, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'transfer', 'TXN-TR-00002', now() - INTERVAL '1 day', 'paid');

INSERT INTO public.shipments (order_id, address_snapshot, status, shipped_at)
VALUES (
    (SELECT MAX(order_id) FROM public.orders),
    '{"recipient_name":"ประสิทธิ์ สั่งเยอะ","address_line":"3/1 ม.5 ต.ท่าขอนยาง","province":"มหาสารคาม","postal_code":"44150"}',
    'shipped',
    now() - INTERVAL '12 hours'
);

-- ── Order 3: มานี — pending + pending payment (รอจ่าย) ───────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 153.00, 'pending', 'pending'
FROM public.users WHERE phone_number = '0811111111';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='MAMA-TY-1PC'),  6.00, 10),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='WATER-6PK'),   35.00, 2),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='DISH-500ML'),  28.00, 1);

INSERT INTO public.payments (order_id, method, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'qr', 'pending');

-- stock_reservation สำหรับ order pending
INSERT INTO public.stock_reservations (order_id, variant_id, quantity, expires_at)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='MAMA-TY-1PC'), 10, now() + INTERVAL '10 minutes'),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='WATER-6PK'),   2, now() + INTERVAL '10 minutes'),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='DISH-500ML'),  1, now() + INTERVAL '10 minutes');

-- ── Order 4: มานี — cancelled + failed payment ────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 48.00, 'cancelled', 'failed'
FROM public.users WHERE phone_number = '0811111111';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='OIL-VEG-1L'), 48.00, 1);

INSERT INTO public.payments (order_id, method, transaction_ref, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'qr', 'TXN-QR-FAIL-003', 'failed');

-- ── Order 5: นงลักษณ์ — delivered + refunded ─────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, payment_status)
SELECT id, 160.00, 'delivered', 'refunded'
FROM public.users WHERE phone_number = '0844444444';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='RICE-HM-5KG'), 160.00, 1);

INSERT INTO public.payments (order_id, method, transaction_ref, paid_at, status)
VALUES ((SELECT MAX(order_id) FROM public.orders), 'cod', 'COD-00005', now() - INTERVAL '3 days', 'refunded');

INSERT INTO public.shipments (order_id, address_snapshot, status, shipped_at)
VALUES (
    (SELECT MAX(order_id) FROM public.orders),
    '{"recipient_name":"นงลักษณ์ ใหม่มา","address_line":"99 ม.1 ต.โคกสูง","province":"อุดรธานี","postal_code":"41330"}',
    'returned',
    now() - INTERVAL '3 days'
);

-- ════════════════════════════════════════
-- 9. ORDER STATUS LOGS
-- ════════════════════════════════════════

-- Order 1 (delivered)
INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
VALUES
((SELECT order_id FROM public.orders o JOIN public.users u ON o.user_id=u.id WHERE u.phone_number='0822222222' LIMIT 1),
 'pending',   'system',      'สร้าง order'),
((SELECT order_id FROM public.orders o JOIN public.users u ON o.user_id=u.id WHERE u.phone_number='0822222222' LIMIT 1),
 'shipped',   '0800000001',  'แพ็คสินค้าและส่งออก'),
((SELECT order_id FROM public.orders o JOIN public.users u ON o.user_id=u.id WHERE u.phone_number='0822222222' LIMIT 1),
 'delivered', 'system',      'ลูกค้าได้รับสินค้าแล้ว');

-- Order 4 (cancelled)
INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
SELECT order_id, 'pending',   'system',     'สร้าง order'
FROM public.orders WHERE payment_status='failed' LIMIT 1;

INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
SELECT order_id, 'cancelled', '0800000001', 'ลูกค้าชำระเงินไม่สำเร็จ ยกเลิกอัตโนมัติ'
FROM public.orders WHERE payment_status='failed' LIMIT 1;

-- ════════════════════════════════════════
-- 10. PAYMENT WEBHOOKS (ตัวอย่าง log)
-- ════════════════════════════════════════

INSERT INTO public.payment_webhooks (event_type, payload, processed) VALUES
('charge.complete',
 '{"id":"chrg_001","amount":17900,"currency":"thb","status":"successful","metadata":{"order_id":1}}',
 true),
('charge.fail',
 '{"id":"chrg_003","amount":4800,"currency":"thb","status":"failed","failure_code":"insufficient_fund"}',
 true),
('transfer.complete',
 '{"id":"trsf_001","amount":54600,"currency":"thb","status":"paid"}',
 false);

-- ════════════════════════════════════════
-- 11. PRODUCT EMBEDDINGS (placeholder vectors)
-- ════════════════════════════════════════
-- ใช้ vector สุ่มเป็น placeholder — ในระบบจริงให้ generate จาก embedding model

INSERT INTO public.product_embeddings (product_id, text_used, embedding)
SELECT
    p.product_id,
    p.name || ' ' || COALESCE(p.description, ''),
    (
        SELECT array_agg(round(random()::numeric, 4))::float4[]::vector(768)
        FROM generate_series(1, 768)
    )
FROM public.products p
WHERE p.is_active = true;

-- ════════════════════════════════════════
-- VERIFY: quick sanity check
-- ════════════════════════════════════════

SELECT 'users'                  AS tbl, COUNT(*) FROM public.users
UNION ALL SELECT 'categories',          COUNT(*) FROM public.categories
UNION ALL SELECT 'products (total)',     COUNT(*) FROM public.products
UNION ALL SELECT 'products (active)',    COUNT(*) FROM public.products    WHERE is_active=true
UNION ALL SELECT 'variants (total)',     COUNT(*) FROM public.product_variants
UNION ALL SELECT 'variants (active)',    COUNT(*) FROM public.product_variants WHERE is_active=true
UNION ALL SELECT 'variants (out-stock)', COUNT(*) FROM public.product_variants WHERE stock_quantity=0 AND is_active=true
UNION ALL SELECT 'variants (low-stock)', COUNT(*) FROM public.product_variants WHERE stock_quantity>0 AND stock_quantity<=low_stock_threshold AND is_active=true
UNION ALL SELECT 'orders',               COUNT(*) FROM public.orders
UNION ALL SELECT 'order_items',          COUNT(*) FROM public.order_items
UNION ALL SELECT 'payments',             COUNT(*) FROM public.payments
UNION ALL SELECT 'shipments',            COUNT(*) FROM public.shipments
UNION ALL SELECT 'reservations (active)',COUNT(*) FROM public.stock_reservations WHERE released_at IS NULL
UNION ALL SELECT 'inventory_tx',         COUNT(*) FROM public.inventory_transactions
UNION ALL SELECT 'embeddings',           COUNT(*) FROM public.product_embeddings
ORDER BY tbl;