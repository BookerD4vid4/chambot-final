-- ══════════════════════════════════════════════════════════════════════════════
-- CHAMBOT — SEED DATA สำหรับทดสอบระบบ E-Commerce
-- สร้างเมื่อ: มีนาคม 2026
-- ══════════════════════════════════════════════════════════════════════════════
 
-- ════════════════════════════════════════
-- SECTION 1: USERS (สมาชิก 5 คน + admin 1 คน)
-- ════════════════════════════════════════
 
INSERT INTO public.users (phone_number, full_name, role, is_active) VALUES
('0812345678', 'สมชาย ใจดี',       'admin',    true),
('0891234567', 'นภาพร รักไทย',    'customer', true),
('0856781234', 'วิชัย มีสุข',      'customer', true),
('0823456789', 'พิมพ์ใจ ดวงแก้ว', 'customer', true),
('0878901234', 'ธนพล สว่างใจ',     'customer', true),
('0845678901', 'อรุณี ทองดี',      'customer', true);
-- user id: 1=admin, 2=นภาพร, 3=วิชัย, 4=พิมพ์ใจ, 5=ธนพล, 6=อรุณี
 
-- ════════════════════════════════════════
-- SECTION 2: USER ADDRESSES
-- ════════════════════════════════════════
 
INSERT INTO public.user_addresses (user_id, recipient_name, address_line, province, amphoe, tambon, postal_code, is_default) VALUES
-- นภาพร (user_id=2)
(2, 'นภาพร รักไทย',    '123/45 ถ.นิมมานเหมินท์ ซ.1',    'เชียงใหม่', 'เมืองเชียงใหม่', 'สุเทพ',     '50200', true),
-- วิชัย (user_id=3)
(3, 'วิชัย มีสุข',      '89/12 ถ.ห้วยแก้ว',              'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างเผือก',  '50300', true),
-- พิมพ์ใจ (user_id=4)
(4, 'พิมพ์ใจ ดวงแก้ว', '456 ม.3 ต.หนองหอย',             'เชียงใหม่', 'เมืองเชียงใหม่', 'หนองหอย',   '50000', true),
-- ธนพล (user_id=5)
(5, 'ธนพล สว่างใจ',    '78/3 ถ.เชียงใหม่-ลำพูน',         'เชียงใหม่', 'เมืองเชียงใหม่', 'ป่าแดด',     '50100', true),
(5, 'บริษัท ธนพล จำกัด','99 อาคารออฟฟิศพาร์ค ชั้น 3',    'เชียงใหม่', 'เมืองเชียงใหม่', 'ช้างคลาน',  '50100', false),
-- อรุณี (user_id=6)
(6, 'อรุณี ทองดี',      '22/7 ถ.สนามบิน',                'เชียงใหม่', 'เมืองเชียงใหม่', 'สุเทพ',     '50200', true);
 
-- ════════════════════════════════════════
-- SECTION 3: DELIVERY SETTINGS (ล็อคจังหวัด เชียงใหม่)
-- ════════════════════════════════════════
 
UPDATE public.delivery_settings
SET province = 'เชียงใหม่', updated_by = 1, updated_at = now()
WHERE id = 1;
 
-- ════════════════════════════════════════
-- SECTION 4: CATEGORIES (7 หมวดหมู่)
-- ════════════════════════════════════════
 
INSERT INTO public.categories (name) VALUES
('อาหารและเครื่องดื่ม'),      -- category_id = 1
('ความงามและสุขภาพ'),          -- category_id = 2
('เสื้อผ้าและแฟชั่น'),          -- category_id = 3
('อิเล็กทรอนิกส์'),             -- category_id = 4
('ของใช้ในบ้าน'),               -- category_id = 5
('กีฬาและกลางแจ้ง'),            -- category_id = 6
('หนังสือและเครื่องเขียน');    -- category_id = 7
 
-- ════════════════════════════════════════
-- SECTION 5: PRODUCTS (7 หมวดหมู่ × 2 สินค้า = 14 สินค้า)
-- ════════════════════════════════════════
 
INSERT INTO public.products (name, description, slug, category_id, is_active) VALUES
-- [1] อาหารและเครื่องดื่ม
('กาแฟดอยช้าง อาราบิก้า',    'กาแฟคั่วกลาง 100% อาราบิก้า จากดอยช้าง เชียงราย หอมกลมกล่อม',      'doi-chang-arabica',    1, true),
('ชาอู่หลง เชียงราย',         'ชาอู่หลงระดับพรีเมียม ปลูกบนดอยสูง มีกลิ่นหอมดอกไม้ธรรมชาติ',      'oolong-tea-chiangrai', 1, true),
-- [2] ความงามและสุขภาพ
('ครีมทาหน้า สมุนไพรไทย',     'ครีมบำรุงผิวหน้าสูตรสมุนไพร ขมิ้น+ว่านหางจระเข้ เหมาะทุกสภาพผิว', 'thai-herb-face-cream', 2, true),
('น้ำมันมะพร้าวสกัดเย็น',     'น้ำมันมะพร้าวบริสุทธิ์ Virgin Coconut Oil ขนาด 250 ml',            'virgin-coconut-oil',   2, true),
-- [3] เสื้อผ้าและแฟชั่น
('เสื้อยืด Cotton ลายล้านนา', 'เสื้อยืด 100% Cotton ลายศิลปะล้านนา สีไม่ตก ซักง่าย',              'lanna-cotton-tshirt',  3, true),
('กระเป๋าผ้าทอลายไทย',        'กระเป๋าสะพายทำจากผ้าทอมือ ลายดอกเชียงใหม่ มีซิปด้านใน',            'thai-woven-bag',       3, true),
-- [4] อิเล็กทรอนิกส์
('หูฟังบลูทูธ TWS',            'หูฟังไร้สาย True Wireless กันน้ำ IPX5 แบตฯ 30 ชม. ราคาประหยัด',   'tws-bluetooth-earbuds',4, true),
('พาวเวอร์แบงค์ 10000 mAh',   'พาวเวอร์แบงค์ 10000mAh ชาร์จเร็ว 22.5W มี 2 พอร์ต USB',           'powerbank-10000mah',   4, true),
-- [5] ของใช้ในบ้าน
('กล่องถนอมอาหาร แก้ว',       'กล่องแก้วทนความร้อน ฝาซิลิโคน ไมโครเวฟได้ ชุด 3 ชิ้น',             'glass-food-container', 5, true),
('เทียนหอมอโรมา',              'เทียนหอม Soy Wax กลิ่นมะลิและลาเวนเดอร์ เผาไหม้สม่ำเสมอ 40 ชม.',  'aroma-soy-candle',     5, true),
-- [6] กีฬาและกลางแจ้ง
('รองเท้าวิ่ง Trail',          'รองเท้าวิ่งเทรลน้ำหนักเบา พื้น Grip เกาะถนนดีเยี่ยม มี 3 สี',     'trail-running-shoes',  6, true),
('กระติกน้ำ Stainless 750ml',  'กระติกสแตนเลส 750ml เก็บเย็น 24 ชม. เก็บร้อน 12 ชม. ปากกว้าง',   'stainless-bottle-750', 6, true),
-- [7] หนังสือและเครื่องเขียน
('หนังสือ "เส้นทางล้านนา"',   'หนังสือท่องเที่ยวเชิงประวัติศาสตร์ล้านนา ภาพประกอบสวยงาม 200 หน้า','lanna-travel-book',    7, true),
('ปากกา Gel 0.5mm ชุด 10 แท่ง','ปากกาเจลหมึกดำ เขียนลื่น ไม่เลอะ เหมาะงานเขียน/วาดภาพ',           'gel-pen-set-10',       7, true);
-- product_id: 1-14 ตามลำดับ
 
-- ════════════════════════════════════════
-- SECTION 6: PRODUCT VARIANTS
-- ════════════════════════════════════════
 
INSERT INTO public.product_variants
  (product_id, sku, price, stock_quantity, reserved_quantity, image_url, unit, low_stock_threshold, is_main, is_active) VALUES
 
-- ── [1] กาแฟดอยช้าง (product_id=1) ──────────────────
(1, 'COFFEE-DOI-250G', 220.00, 50, 0, 'https://cdn.chambot.com/coffee-doi-250g.jpg', 'ถุง', 5, true,  true),
(1, 'COFFEE-DOI-500G', 390.00, 30, 0, 'https://cdn.chambot.com/coffee-doi-500g.jpg', 'ถุง', 3, false, true),
 
-- ── [2] ชาอู่หลง (product_id=2) ──────────────────────
(2, 'TEA-OLONG-100G',  180.00, 40, 0, 'https://cdn.chambot.com/oolong-100g.jpg', 'กล่อง', 5, true,  true),
(2, 'TEA-OLONG-200G',  320.00, 25, 0, 'https://cdn.chambot.com/oolong-200g.jpg', 'กล่อง', 3, false, true),
 
-- ── [3] ครีมทาหน้า (product_id=3) ─────────────────────
(3, 'CREAM-HERB-30ML',  150.00, 60, 0, 'https://cdn.chambot.com/herb-cream-30ml.jpg', 'หลอด', 10, true,  true),
(3, 'CREAM-HERB-60ML',  250.00, 40, 0, 'https://cdn.chambot.com/herb-cream-60ml.jpg', 'หลอด', 5,  false, true),
 
-- ── [4] น้ำมันมะพร้าว (product_id=4) ──────────────────
(4, 'COCONUT-OIL-250ML', 190.00, 35, 0, 'https://cdn.chambot.com/coconut-oil-250ml.jpg', 'ขวด', 5, true,  true),
(4, 'COCONUT-OIL-500ML', 340.00, 20, 0, 'https://cdn.chambot.com/coconut-oil-500ml.jpg', 'ขวด', 3, false, true),
 
-- ── [5] เสื้อยืด Cotton (product_id=5) ─────────────────
(5, 'TSHIRT-LANNA-S-WHT',  290.00, 20, 0, 'https://cdn.chambot.com/tshirt-lanna-s-wht.jpg', 'ตัว', 3, false, true),
(5, 'TSHIRT-LANNA-M-WHT',  290.00, 30, 0, 'https://cdn.chambot.com/tshirt-lanna-m-wht.jpg', 'ตัว', 5, true,  true),
(5, 'TSHIRT-LANNA-L-BLK',  290.00, 25, 0, 'https://cdn.chambot.com/tshirt-lanna-l-blk.jpg', 'ตัว', 5, false, true),
(5, 'TSHIRT-LANNA-XL-BLK', 300.00, 15, 0, 'https://cdn.chambot.com/tshirt-lanna-xl-blk.jpg','ตัว', 3, false, true),
 
-- ── [6] กระเป๋าผ้าทอ (product_id=6) ───────────────────
(6, 'BAG-WOVEN-RED',  450.00, 15, 0, 'https://cdn.chambot.com/bag-woven-red.jpg',  'ใบ', 3, true,  true),
(6, 'BAG-WOVEN-BLUE', 450.00, 12, 0, 'https://cdn.chambot.com/bag-woven-blue.jpg', 'ใบ', 3, false, true),
 
-- ── [7] หูฟังบลูทูธ (product_id=7) ────────────────────
(7, 'TWS-BT-BLACK', 590.00, 25, 0, 'https://cdn.chambot.com/tws-black.jpg', 'กล่อง', 5, true,  true),
(7, 'TWS-BT-WHITE', 590.00, 20, 0, 'https://cdn.chambot.com/tws-white.jpg', 'กล่อง', 5, false, true),
 
-- ── [8] พาวเวอร์แบงค์ (product_id=8) ──────────────────
(8, 'PWRBANK-10K-BLK', 490.00, 30, 0, 'https://cdn.chambot.com/pwrbank-10k-blk.jpg', 'ชิ้น', 5, true,  true),
(8, 'PWRBANK-10K-WHT', 490.00, 20, 0, 'https://cdn.chambot.com/pwrbank-10k-wht.jpg', 'ชิ้น', 5, false, true),
 
-- ── [9] กล่องถนอมอาหาร (product_id=9) ─────────────────
(9, 'GLASS-BOX-SET3', 380.00, 25, 0, 'https://cdn.chambot.com/glass-box-set3.jpg', 'ชุด', 5, true,  true),
(9, 'GLASS-BOX-SET5', 560.00, 15, 0, 'https://cdn.chambot.com/glass-box-set5.jpg', 'ชุด', 3, false, true),
 
-- ── [10] เทียนหอม (product_id=10) ─────────────────────
(10, 'CANDLE-JASMINE', 220.00, 40, 0, 'https://cdn.chambot.com/candle-jasmine.jpg',  'กระปุก', 5, true,  true),
(10, 'CANDLE-LAVENDER',220.00, 35, 0, 'https://cdn.chambot.com/candle-lavender.jpg', 'กระปุก', 5, false, true),
 
-- ── [11] รองเท้าวิ่ง (product_id=11) ──────────────────
(11, 'TRAIL-SHOE-39-BLU', 1290.00, 8,  0, 'https://cdn.chambot.com/trail-39-blu.jpg', 'คู่', 2, false, true),
(11, 'TRAIL-SHOE-41-BLU', 1290.00, 10, 0, 'https://cdn.chambot.com/trail-41-blu.jpg', 'คู่', 2, true,  true),
(11, 'TRAIL-SHOE-42-RED', 1290.00, 8,  0, 'https://cdn.chambot.com/trail-42-red.jpg', 'คู่', 2, false, true),
(11, 'TRAIL-SHOE-43-BLK', 1290.00, 6,  0, 'https://cdn.chambot.com/trail-43-blk.jpg', 'คู่', 2, false, true),
 
-- ── [12] กระติกน้ำ (product_id=12) ────────────────────
(12, 'BOTTLE-750-BLK', 320.00, 45, 0, 'https://cdn.chambot.com/bottle-750-blk.jpg', 'ใบ', 5, true,  true),
(12, 'BOTTLE-750-SLV', 320.00, 40, 0, 'https://cdn.chambot.com/bottle-750-slv.jpg', 'ใบ', 5, false, true),
(12, 'BOTTLE-750-PNK', 320.00, 30, 0, 'https://cdn.chambot.com/bottle-750-pnk.jpg', 'ใบ', 5, false, true),
 
-- ── [13] หนังสือล้านนา (product_id=13) ────────────────
(13, 'BOOK-LANNA-STD', 350.00, 20, 0, 'https://cdn.chambot.com/book-lanna.jpg', 'เล่ม', 3, true,  true),
 
-- ── [14] ปากกาเจล (product_id=14) ─────────────────────
(14, 'PEN-GEL-SET10-BLK', 120.00, 80, 0, 'https://cdn.chambot.com/pen-gel-10blk.jpg', 'ชุด', 10, true,  true);
 