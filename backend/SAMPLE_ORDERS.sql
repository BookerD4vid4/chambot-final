-- ══════════════════════════════════════════════════════════════════════════════
-- CHAMBOT — SEED DATA (ร้านของชำตามชนบท)
-- ครอบคลุมทุก test case: สต็อกปกติ, ใกล้หมด, หมด, ราคาหลาย variant,
--   inactive product, inactive variant, หลาย category, embedding, users ทุก role
-- รันหลังจาก chambot_schema_fixed.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════
-- 1. USERS
-- ════════════════════════════════════════
-- admin 1 คน, customer 5 คน (active 4, suspended 1)

INSERT INTO public.users (phone_number, full_name, role, is_active) VALUES
('0800000001', 'สมชาย ดูแลระบบ',    'admin',    true),
('0811111111', 'มานี มีเงิน',       'customer', true),
('0822222222', 'วิไล ซื้อบ่อย',     'customer', true),
('0833333333', 'ประสิทธิ์ สั่งเยอะ','customer', true),
('0844444444', 'นงลักษณ์ ใหม่มา',   'customer', true),
('0855555555', 'แดง โดนระงับ',      'customer', false)
ON CONFLICT (phone_number) DO NOTHING;

-- ตั้ง suspended_by / suspended_at สำหรับ user ที่ถูกระงับ
UPDATE public.users
SET suspended_by = (SELECT id FROM public.users WHERE phone_number = '0800000001'),
    suspended_at = now() - INTERVAL '2 days'
WHERE phone_number = '0855555555';

-- ════════════════════════════════════════
-- 2. USER ADDRESSES
-- ════════════════════════════════════════

INSERT INTO public.user_addresses (user_id, recipient_name, address_line, tambon, amphoe, province, postal_code, is_default)
SELECT id, 'มานี มีเงิน',        '12 ม.3', 'นาดี', 'เมือง',          'ขอนแก่น', '40000', true
FROM public.users WHERE phone_number = '0811111111';

INSERT INTO public.user_addresses (user_id, recipient_name, address_line, tambon, amphoe, province, postal_code, is_default)
SELECT id, 'มานี มีเงิน (บ้านแม่)', '88 ม.7', 'บ้านทุ่ม', 'เมือง',   'ขอนแก่น', '40000', false
FROM public.users WHERE phone_number = '0811111111';

INSERT INTO public.user_addresses (user_id, recipient_name, address_line, tambon, amphoe, province, postal_code, is_default)
SELECT id, 'วิไล ซื้อบ่อย',      '45 ม.2', 'หนองแวง', 'พล',          'ขอนแก่น', '40120', true
FROM public.users WHERE phone_number = '0822222222';

INSERT INTO public.user_addresses (user_id, recipient_name, address_line, tambon, amphoe, province, postal_code, is_default)
SELECT id, 'ประสิทธิ์ สั่งเยอะ', '3/1 ม.5', 'ท่าขอนยาง', 'กันทรวิชัย','มหาสารคาม', '44150', true
FROM public.users WHERE phone_number = '0833333333';

-- ════════════════════════════════════════
-- 3. CATEGORIES
-- ════════════════════════════════════════

INSERT INTO public.categories (name) VALUES
('เครื่องดื่ม'),                  -- category_id = 1
('อาหารแห้งและเครื่องปรุง'),          -- category_id = 2
('ขนมขบเคี้ยว'),                 -- category_id = 3
('ของใช้ส่วนตัว'),                -- category_id = 4
('ผลิตภัณฑ์ทำความสะอาด'),           -- category_id = 5
('ยาสามัญประจำบ้าน'),              -- category_id = 6
('สินค้าเบ็ดเตล็ด'),               -- category_id = 7
('ของสดและอื่นๆ')                 -- category_id = 8
ON CONFLICT (name) DO NOTHING;

-- ════════════════════════════════════════
-- 4. PRODUCTS (20 รายการ)
-- ════════════════════════════════════════
-- ครอบคลุม: is_active=true(18), is_active=false(2 — soft delete)

INSERT INTO public.products (name, description, slug, category_id, is_active) VALUES

-- ── ข้าวและแป้ง ──────────────────────────────────────────────────────────────
('ข้าวสารหอมมะลิ',
 'ข้าวหอมมะลิอินทรีย์จากทุ่งทุเรียน 100% เมล็ดใส หุงขึ้นหม้อ หอมนุ่ม',
 'jasmine-rice',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

('แป้งสาลีอเนกประสงค์',
 'แป้งสาลีเนื้อละเอียด เหมาะสำหรับทำขนม ทอด และชุบ',
 'all-purpose-flour',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

-- ── เครื่องปรุงรส ─────────────────────────────────────────────────────────────
('น้ำปลาตราปลาหมึก',
 'น้ำปลาแท้จากปลาทะเล หมักนาน 18 เดือน รสชาติกลมกล่อม',
 'fish-sauce-squid',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

('ซีอิ๊วขาวเข้มข้น',
 'ซีอิ๊วขาวสูตรเข้มข้น เหมาะผัด นึ่ง และจิ้ม',
 'light-soy-sauce',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

('น้ำตาลทรายขาว',
 'น้ำตาลทรายขาวบริสุทธิ์ เนื้อละเอียด ละลายง่าย',
 'white-sugar',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

('เกลือทะเลเม็ดละเอียด',
 'เกลือทะเลธรรมชาติ ไม่ฟอกขาว เสริมไอโอดีน',
 'sea-salt',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

-- ── น้ำมันและกะทิ ────────────────────────────────────────────────────────────
('น้ำมันพืชตราจิงจอก',
 'น้ำมันพืชสกัดจากถั่วเหลือง ไม่มีคอเลสเตอรอล เหมาะสำหรับทอดและผัด',
 'vegetable-oil-jingog',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

('กะทิกล่องพร้อมปรุง',
 'กะทิสดคั้นจากมะพร้าวแก่ เนื้อกะทิข้น หอม ไม่มีสารกันบูด',
 'coconut-milk-box',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

-- ── บะหมี่และเส้น ────────────────────────────────────────────────────────────
('มาม่าต้มยำกุ้ง',
 'บะหมี่กึ่งสำเร็จรูปรสต้มยำกุ้ง สูตรต้นตำรับ เผ็ดกลมกล่อม',
 'mama-tomyum',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

('เส้นหมี่ข้าวอบแห้ง',
 'เส้นหมี่ทำจากข้าวเจ้า 100% ไม่มีแป้งสาลี เหมาะสำหรับผัดและแกง',
 'rice-vermicelli',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), true),

-- ── เครื่องดื่ม ───────────────────────────────────────────────────────────────
('น้ำดื่มบรรจุขวด',
 'น้ำดื่มบริสุทธิ์ ผ่านกระบวนการ RO ได้มาตรฐาน อย. ขนาด 600ml',
 'drinking-water-600ml',
 (SELECT category_id FROM public.categories WHERE name = 'เครื่องดื่ม'), true),

('ชาเขียวพร้อมดื่ม',
 'ชาเขียวญี่ปุ่น สูตรหวานน้อย ไม่ใส่สารกันบูด ขนาด 500ml',
 'green-tea-ready',
 (SELECT category_id FROM public.categories WHERE name = 'เครื่องดื่ม'), true),

('กาแฟสำเร็จรูป 3in1',
 'กาแฟผสมครีมเทียมและน้ำตาล สูตรเข้มข้น หอมกรุ่น',
 'instant-coffee-3in1',
 (SELECT category_id FROM public.categories WHERE name = 'เครื่องดื่ม'), true),

-- ── ขนมและของว่าง ────────────────────────────────────────────────────────────
('ขนมปังแผ่นธัญพืช',
 'ขนมปังธัญพืชรวม 7 ชนิด ไม่ใส่สีและกลิ่นสังเคราะห์ เหมาะเป็นอาหารเช้า',
 'multigrain-bread',
 (SELECT category_id FROM public.categories WHERE name = 'ขนมขบเคี้ยว'), true),

('มันฝรั่งอบกรอบ',
 'มันฝรั่งแท้ 100% อบไม่ทอด ลดไขมัน มีให้เลือกหลายรสชาติ',
 'baked-potato-chips',
 (SELECT category_id FROM public.categories WHERE name = 'ขนมขบเคี้ยว'), true),

-- ── ของใช้ในครัวเรือน ────────────────────────────────────────────────────────
('น้ำยาล้างจาน',
 'น้ำยาล้างจานสูตรมะนาว ขจัดคราบมัน ไม่ทำลายมือ ฟองเยอะ',
 'dishwashing-liquid',
 (SELECT category_id FROM public.categories WHERE name = 'ผลิตภัณฑ์ทำความสะอาด'), true),

('ถุงดำใส่ขยะ',
 'ถุงพลาสติกสีดำ ทนทาน ไม่ขาดง่าย บรรจุ 30 ใบต่อแพ็ก ขนาด 24x28 นิ้ว',
 'garbage-bag-black',
 (SELECT category_id FROM public.categories WHERE name = 'สินค้าเบ็ดเตล็ด'), true),

-- ── ยาและสุขภาพ ──────────────────────────────────────────────────────────────
('ยาดมตราอินทนิล',
 'ยาดมสมุนไพร เมนทอล การบูร พิมเสน บรรเทาอาการวิงเวียน คัดจมูก',
 'smelling-salts-inthanin',
 (SELECT category_id FROM public.categories WHERE name = 'ยาสามัญประจำบ้าน'), true),

-- ── Inactive products (soft delete) — test case ───────────────────────────────
('น้ำส้มสายชูกลั่น (ยกเลิก)',
 'สินค้าหยุดจำหน่ายแล้ว',
 'vinegar-discontinued',
 (SELECT category_id FROM public.categories WHERE name = 'อาหารแห้งและเครื่องปรุง'), false),

('ขนมเวเฟอร์ (ยกเลิก)',
 'สินค้าหยุดจำหน่ายแล้ว',
 'wafer-discontinued',
 (SELECT category_id FROM public.categories WHERE name = 'ขนมขบเคี้ยว'), false)
ON CONFLICT (slug) DO NOTHING;

-- ════════════════════════════════════════
-- 5. PRODUCT VARIANTS
-- ════════════════════════════════════════
-- ครอบคลุม: หลาย variant ต่อสินค้า, is_main, ราคาต่างกัน,
--   stock ปกติ / ใกล้หมด (≤threshold) / หมดเลย (0) / inactive variant

INSERT INTO public.product_variants
    (product_id, sku, price, stock_quantity, reserved_quantity,
     image_url, unit, low_stock_threshold, is_main, is_active)
VALUES

-- ── ข้าวสารหอมมะลิ (3 ขนาด) ──────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='jasmine-rice'),
 'RICE-HM-1KG',  35.00, 80, 0, 'https://cdn.chambot.com/rice-1kg.jpg',  'กิโลกรัม', 10, false, true),

((SELECT product_id FROM public.products WHERE slug='jasmine-rice'),
 'RICE-HM-5KG',  160.00, 30, 5, 'https://cdn.chambot.com/rice-5kg.jpg',  'ถุง',       5,  true,  true),

((SELECT product_id FROM public.products WHERE slug='jasmine-rice'),
 'RICE-HM-25KG', 720.00, 4,  0, 'https://cdn.chambot.com/rice-25kg.jpg', 'กระสอบ',   3,  false, true),
-- ^ stock=4, threshold=3 → ใกล้หมด (low stock)

-- ── แป้งสาลี (2 ขนาด) ────────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='all-purpose-flour'),
 'FLOUR-AP-500G', 22.00, 45, 0, 'https://cdn.chambot.com/flour-500g.jpg', 'ถุง', 8, true,  true),

((SELECT product_id FROM public.products WHERE slug='all-purpose-flour'),
 'FLOUR-AP-1KG',  40.00, 20, 0, 'https://cdn.chambot.com/flour-1kg.jpg',  'ถุง', 5, false, true),

-- ── น้ำปลา (2 ขนาด) ──────────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='fish-sauce-squid'),
 'FISH-SQ-200ML', 18.00, 60, 0, 'https://cdn.chambot.com/fishsauce-200.jpg', 'ขวด', 10, true,  true),

((SELECT product_id FROM public.products WHERE slug='fish-sauce-squid'),
 'FISH-SQ-700ML', 45.00, 3,  0, 'https://cdn.chambot.com/fishsauce-700.jpg', 'ขวด', 5,  false, true),
-- ^ stock=3, threshold=5 → ใกล้หมด

-- ── ซีอิ๊วขาว (1 variant) ────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='light-soy-sauce'),
 'SOY-W-300ML', 28.00, 50, 0, 'https://cdn.chambot.com/soysauce.jpg', 'ขวด', 8, true, true),

-- ── น้ำตาลทราย (2 ขนาด) ──────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='white-sugar'),
 'SUGAR-W-1KG', 25.00, 55, 0, 'https://cdn.chambot.com/sugar-1kg.jpg', 'กิโลกรัม', 10, true,  true),

((SELECT product_id FROM public.products WHERE slug='white-sugar'),
 'SUGAR-W-5KG', 118.00, 0,  0, 'https://cdn.chambot.com/sugar-5kg.jpg', 'ถุง',       3,  false, true),
-- ^ stock=0 → หมด

-- ── เกลือ (1 variant) ────────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='sea-salt'),
 'SALT-SEA-500G', 12.00, 70, 0, 'https://cdn.chambot.com/salt.jpg', 'ถุง', 10, true, true),

-- ── น้ำมันพืช (2 ขนาด) ───────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='vegetable-oil-jingog'),
 'OIL-VEG-1L',  48.00, 35, 0, 'https://cdn.chambot.com/oil-1l.jpg', 'ขวด', 8, true,  true),

((SELECT product_id FROM public.products WHERE slug='vegetable-oil-jingog'),
 'OIL-VEG-5L',  210.00, 2,  0, 'https://cdn.chambot.com/oil-5l.jpg', 'ขวด', 3, false, true),
-- ^ stock=2, threshold=3 → ใกล้หมด

-- ── กะทิกล่อง (1 variant) ────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='coconut-milk-box'),
 'COCO-BOX-250ML', 16.00, 90, 0, 'https://cdn.chambot.com/coconut.jpg', 'กล่อง', 15, true, true),

-- ── มาม่า (3 รส — is_main คือต้มยำ, 1 inactive) ──────────────────────────────
((SELECT product_id FROM public.products WHERE slug='mama-tomyum'),
 'MAMA-TY-1PC', 6.00, 200, 10, 'https://cdn.chambot.com/mama-ty.jpg', 'ซอง', 30, true,  true),

((SELECT product_id FROM public.products WHERE slug='mama-tomyum'),
 'MAMA-CR-1PC', 6.00, 150, 0,  'https://cdn.chambot.com/mama-cr.jpg', 'ซอง', 30, false, true),
-- ^ รสหมูสับ — active

((SELECT product_id FROM public.products WHERE slug='mama-tomyum'),
 'MAMA-CK-1PC', 6.00, 0,   0,  'https://cdn.chambot.com/mama-ck.jpg', 'ซอง', 30, false, false),
-- ^ รสไก่ — inactive variant (test case)

-- ── เส้นหมี่ (1 variant) ─────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='rice-vermicelli'),
 'NOODLE-RM-200G', 18.00, 40, 0, 'https://cdn.chambot.com/ricenoodle.jpg', 'ห่อ', 8, true, true),

-- ── น้ำดื่ม (แพ็ก 6 / แพ็ก 12) ──────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='drinking-water-600ml'),
 'WATER-6PK', 35.00, 25, 6, 'https://cdn.chambot.com/water-6pk.jpg', 'แพ็ก', 5, true,  true),

((SELECT product_id FROM public.products WHERE slug='drinking-water-600ml'),
 'WATER-12PK', 65.00, 12, 0, 'https://cdn.chambot.com/water-12pk.jpg', 'แพ็ก', 3, false, true),

-- ── ชาเขียว (1 variant) ──────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='green-tea-ready'),
 'TEA-GRN-500ML', 15.00, 8, 0, 'https://cdn.chambot.com/greentea.jpg', 'ขวด', 10, true, true),
-- ^ stock=8, threshold=10 → ใกล้หมด

-- ── กาแฟ 3in1 (แบบซอง / กล่อง) ──────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='instant-coffee-3in1'),
 'COFFEE-3IN1-S',  5.00, 180, 0, 'https://cdn.chambot.com/coffee-s.jpg', 'ซอง',  40, false, true),

((SELECT product_id FROM public.products WHERE slug='instant-coffee-3in1'),
 'COFFEE-3IN1-B', 85.00,  22, 0, 'https://cdn.chambot.com/coffee-b.jpg', 'กล่อง', 5, true,  true),

-- ── ขนมปัง (1 variant) ───────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='multigrain-bread'),
 'BREAD-MG-400G', 45.00, 15, 0, 'https://cdn.chambot.com/bread.jpg', 'แพ็ก', 5, true, true),

-- ── มันฝรั่งอบ (2 รส) ────────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='baked-potato-chips'),
 'CHIP-BBQ-50G',  15.00, 60, 0, 'https://cdn.chambot.com/chip-bbq.jpg',   'ถุง', 12, true,  true),

((SELECT product_id FROM public.products WHERE slug='baked-potato-chips'),
 'CHIP-SALT-50G', 15.00, 60, 0, 'https://cdn.chambot.com/chip-salt.jpg',  'ถุง', 12, false, true),

-- ── น้ำยาล้างจาน (2 ขนาด) ────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='dishwashing-liquid'),
 'DISH-500ML',  28.00, 38, 0, 'https://cdn.chambot.com/dish-500.jpg', 'ขวด', 8, true,  true),

((SELECT product_id FROM public.products WHERE slug='dishwashing-liquid'),
 'DISH-1L',     48.00,  0, 0, 'https://cdn.chambot.com/dish-1l.jpg',  'ขวด', 5, false, true),
-- ^ stock=0 → หมด

-- ── ถุงดำ (1 variant) ─────────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='garbage-bag-black'),
 'GBAG-30PC', 35.00, 45, 0, 'https://cdn.chambot.com/gbag.jpg', 'แพ็ก', 8, true, true),

-- ── ยาดม (1 variant) ──────────────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='smelling-salts-inthanin'),
 'SNIFF-IT-1PC', 15.00, 2, 0, 'https://cdn.chambot.com/smelling.jpg', 'หลอด', 5, true, true),
-- ^ stock=2, threshold=5 → ใกล้หมด

-- ── Inactive product variants ──────────────────────────────────────────────────
((SELECT product_id FROM public.products WHERE slug='vinegar-discontinued'),
 'VINEGAR-OLD-1', 15.00, 0, 0, NULL, 'ขวด', 5, true, false),

((SELECT product_id FROM public.products WHERE slug='wafer-discontinued'),
 'WAFER-OLD-1', 10.00, 0, 0, NULL, 'ห่อ', 10, true, false)
ON CONFLICT (sku) DO NOTHING;

-- ════════════════════════════════════════
-- 6. INVENTORY TRANSACTIONS (initial stock-in)
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
    (SELECT id FROM public.users WHERE phone_number = '0800000001'),
    'รับสินค้าเข้าคลังครั้งแรก (initial stock)'
FROM public.product_variants v
WHERE v.stock_quantity > 0;

-- ════════════════════════════════════════
-- 7. CARTS
-- ════════════════════════════════════════

INSERT INTO public.carts (user_id)
SELECT id FROM public.users WHERE phone_number IN
    ('0811111111','0822222222','0833333333');

-- cart items: มานี มีของในตะกร้า 3 รายการ
INSERT INTO public.cart_items (cart_id, variant_id, quantity)
VALUES
((SELECT c.cart_id FROM public.carts c JOIN public.users u ON c.user_id=u.id WHERE u.phone_number='0811111111'),
 (SELECT variant_id FROM public.product_variants WHERE sku='RICE-HM-5KG'), 2),

((SELECT c.cart_id FROM public.carts c JOIN public.users u ON c.user_id=u.id WHERE u.phone_number='0811111111'),
 (SELECT variant_id FROM public.product_variants WHERE sku='FISH-SQ-200ML'), 1),

((SELECT c.cart_id FROM public.carts c JOIN public.users u ON c.user_id=u.id WHERE u.phone_number='0811111111'),
 (SELECT variant_id FROM public.product_variants WHERE sku='MAMA-TY-1PC'), 5);

-- ════════════════════════════════════════
-- 8. ORDERS + ORDER ITEMS + PAYMENTS + SHIPMENTS
-- ════════════════════════════════════════
-- ครอบคลุม: pending, shipped, delivered, cancelled
--           payment: pending, paid, failed, refunded
--           shipment: preparing, shipped, delivered, returned

-- ── Order 1: วิไล — delivered ─────────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, address_snapshot)
SELECT id, 179.00, 'delivered', '{"recipient_name":"วิไล ซื้อบ่อย","address_line":"45 ม.2","tambon":"หนองแวง","amphoe":"พล","province":"ขอนแก่น","postal_code":"40120"}'
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

-- Order 1: No payments/shipments tables anymore. Status and history managed via orders and order_status_logs.

-- ── Order 2: ประสิทธิ์ — shipped ──────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, address_snapshot)
SELECT id, 546.00, 'shipped', '{"recipient_name":"ประสิทธิ์ สั่งเยอะ","address_line":"3/1 ม.5","tambon":"ท่าขอนยาง","amphoe":"กันทรวิชัย","province":"มหาสารคาม","postal_code":"44150"}'
FROM public.users WHERE phone_number = '0833333333';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='RICE-HM-25KG'), 720.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='OIL-VEG-1L'),    48.00, 1),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='SUGAR-W-1KG'),   25.00, 2);

-- Order 2: No payments/shipments tables anymore.

-- ── Order 3: มานี — pending ───────────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, address_snapshot)
SELECT id, 153.00, 'pending', '{"recipient_name":"มานี มีเงิน","address_line":"12 ม.3","tambon":"นาดี","amphoe":"เมือง","province":"ขอนแก่น","postal_code":"40000"}'
FROM public.users WHERE phone_number = '0811111111';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='MAMA-TY-1PC'),  6.00, 10),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='WATER-6PK'),   35.00, 2),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='DISH-500ML'),  28.00, 1);

-- Order 3: No payments table anymore.

-- stock_reservation สำหรับ order pending
INSERT INTO public.stock_reservations (order_id, variant_id, quantity, expires_at)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='MAMA-TY-1PC'), 10, now() + INTERVAL '10 minutes'),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='WATER-6PK'),   2, now() + INTERVAL '10 minutes'),
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='DISH-500ML'),  1, now() + INTERVAL '10 minutes');

-- ── Order 4: มานี — cancelled ────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, address_snapshot)
SELECT id, 48.00, 'cancelled', '{"recipient_name":"มานี มีเงิน","address_line":"12 ม.3","tambon":"นาดี","amphoe":"เมือง","province":"ขอนแก่น","postal_code":"40000"}'
FROM public.users WHERE phone_number = '0811111111';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='OIL-VEG-1L'), 48.00, 1);

-- Order 4: No payments table anymore.

-- ── Order 5: นงลักษณ์ — delivered ─────────────────────────────────
INSERT INTO public.orders (user_id, total_amount, status, address_snapshot)
SELECT id, 160.00, 'delivered', '{"recipient_name":"นงลักษณ์ ใหม่มา","address_line":"99 ม.1","tambon":"โคกสูง","amphoe":"เมือง","province":"อุดรธานี","postal_code":"41330"}'
FROM public.users WHERE phone_number = '0844444444';

INSERT INTO public.order_items (order_id, variant_id, price, quantity)
VALUES
((SELECT MAX(order_id) FROM public.orders),
 (SELECT variant_id FROM public.product_variants WHERE sku='RICE-HM-5KG'), 160.00, 1);

-- Order 5: No payments/shipments tables anymore.

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
FROM public.orders WHERE status='cancelled' LIMIT 1;

INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
SELECT order_id, 'cancelled', '0800000001', 'ลูกค้าชำระเงินไม่สำเร็จ (จำลอง)'
FROM public.orders WHERE status='cancelled' LIMIT 1;

-- ════════════════════════════════════════
-- 10. PAYMENT WEBHOOKS — Removed as table no longer exists in SETUP.sql

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
UNION ALL SELECT 'inventory_tx',         COUNT(*) FROM public.inventory_transactions
UNION ALL SELECT 'embeddings',           COUNT(*) FROM public.product_embeddings
ORDER BY tbl;