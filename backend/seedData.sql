-- ══════════════════════════════════════════════════════════════════════════════
-- CHAMBOT — SEED DATA สำหรับทดสอบระบบ E-Commerce (EXTENDED)
-- สร้างเมื่อ: มีนาคม 2026
-- ══════════════════════════════════════════════════════════════════════════════
 
-- ════════════════════════════════════════
-- SECTION 0: CLEANUP DATA & RESET IDs
-- ════════════════════════════════════════
TRUNCATE TABLE 
    public.users,
    public.categories,
    public.products,
    public.product_variants,
    public.carts,
    public.orders,
    public.user_addresses,
    public.order_items,
    public.order_status_logs,
    public.inventory_transactions,
    public.stock_reservations,
    public.product_embeddings
RESTART IDENTITY CASCADE;

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
 
-- ════════════════════════════════════════
-- SECTION 2: USER ADDRESSES
-- ════════════════════════════════════════
 
INSERT INTO public.user_addresses (user_id, recipient_name, address_line, tambon, amphoe, province, postal_code, is_default) VALUES
(2, 'นภาพร รักไทย',    '123/45 ถ.นิมมานเหมินท์ ซ.1', 'สุเทพ', 'เมืองเชียงใหม่',    'เชียงใหม่', '50200', true),
(3, 'วิชัย มีสุข',      '89/12 ถ.ห้วยแก้ว',              'ช้างเผือก', 'เมืองเชียงใหม่',    'เชียงใหม่', '50300', true),
(4, 'พิมพ์ใจ ดวงแก้ว', '456 ม.3',             'หนองหอย', 'เมืองเชียงใหม่',    'เชียงใหม่', '50000', true),
(5, 'ธนพล สว่างใจ',    '78/3 ถ.เชียงใหม่-ลำพูน',         'ป่าแดด', 'เมืองเชียงใหม่',    'เชียงใหม่', '50100', true),
(6, 'อรุณี ทองดี',      '22/7 ถ.สนามบิน',                'สุเทพ', 'เมืองเชียงใหม่',    'เชียงใหม่', '50200', true);
 
-- ════════════════════════════════════════
-- SECTION 3: CATEGORIES (8 หมวดหมู่)
-- ════════════════════════════════════════
 
INSERT INTO public.categories (name) VALUES
('เครื่องดื่ม'),                  -- category_id = 1
('อาหารแห้งและเครื่องปรุง'),          -- category_id = 2
('ขนมขบเคี้ยว'),                 -- category_id = 3
('ของใช้ส่วนตัว'),                -- category_id = 4
('ผลิตภัณฑ์ทำความสะอาด'),           -- category_id = 5
('ยาสามัญประจำบ้าน'),              -- category_id = 6
('สินค้าเบ็ดเตล็ด'),               -- category_id = 7
('ของสดและอื่นๆ');                -- category_id = 8
 
-- ════════════════════════════════════════
-- SECTION 4: PRODUCTS (35 สินค้า)
-- ════════════════════════════════════════
 
INSERT INTO public.products (name, description, slug, category_id, is_active) VALUES
-- เครื่องดื่ม (category_id = 1)
('กาแฟดอยช้าง อาราบิก้า',    'กาแฟคั่วกลาง 100% อาราบิก้า จากดอยช้าง เชียงราย', 'doi-chang-arabica',    1, true),
('ชาอู่หลง เชียงราย',         'ชาอู่หลงระดับพรีเมียม ปลูกบนดอยสูง กลิ่นหอม',      'oolong-tea-chiangrai', 1, true),
('น้ำดื่ม 1.5L',              'น้ำดื่มสะอาดมาตรฐานสากล รสชาติดี สดชื่น',        'drinking-water-15l',  1, true),
('นมจืดไทย-เดนมาร์ค 200ml',   'น้ำนมโคแท้ 100% ไม่ผสมนมผง แคลเซียมสูง',         'thai-denmark-milk',    1, true),

-- อาหารแห้งและเครื่องปรุง (category_id = 2)
('ข้าวหอมมะลิ',             'ข้าวถุงใหม่ หอม นุ่ม เมล็ดสวย คัดเกรดพิเศษ',      'jasmine-rice-5kg',     2, true),
('น้ำปลาแท้',               'น้ำปลาแท้จากปลาไส้ตัน หมักธรรมชาตินาน 12 เดือน',   'fish-sauce-700ml',     2, true),
('น้ำมันพืชองุ่น',            'น้ำมันพืชสกัดจากถั่วเหลือง 100% ไม่มีคอเลสเตอรอล', 'soy-oil-1l',           2, true),
('ซีอิ๊วขาวตราเด็กสมบูรณ์',    'ซีอิ๊วขาวสูตร 1 รสชาติกลมกล่อม หอมถั่วเหลือง',     'soy-sauce-healthy-boy',2, true),

-- ขนมขบเคี้ยว (category_id = 3)
('เลย์ รสมันฝรั่งแท้',        'มันฝรั่งทอดกรอบแผ่นเรียบ รสออริจินัล 50g',       'lays-original-50g',    3, true),
('ปาปริก้า รสดั้งเดิม',       'มันฝรั่งทอดกรอบ รสปาปริก้า จัดจ้าน 45g',          'paprika-snack-45g',    3, true),
('แครกเกอร์รสนม',           'แครกเกอร์อบกรอบสอดไส้ครีมนม เข้มข้น หวานหอม',    'milk-crackers',        3, true),
('ถั่วลิสงอบเกลือ',           'ถั่วลิสงคุณภาพดี อบเกลือ กรอบ มัน ทานเพลิน',      'salted-peanuts',       3, true),

-- ของใช้ส่วนตัว (category_id = 4)
('ครีมทาหน้า สมุนไพรไทย',     'ครีมบำรุงผิวหน้าสูตรสมุนไพร ขมิ้น+ว่านหางจระเข้', 'thai-herb-face-cream', 4, true),
('น้ำมันมะพร้าวสกัดเย็น',     'น้ำมันมะพร้าวบริสุทธิ์ Virgin Coconut Oil 250ml',  'virgin-coconut-oil',   4, true),
('แชมพูสระผมดอกอัญชัน',      'แชมพูสูตรสมุนไพรดอกอัญชัน บำรุงรากผมให้แข็งแรง', 'butterfly-pea-shampoo',4, true),
('สบู่เหลวนกแก้ว',           'สบู่เหลวอาบน้ำ กลิ่นหอมพฤกษานานาพรรณ 450ml',     'parrots-body-wash',    4, true),

-- ผลิตภัณฑ์ทำความสะอาด (category_id = 5)
('น้ำยาล้างจานซันไลต์',       'น้ำยาล้างจานสูตรเลมอน ขจัดคราบมันได้สะอาด 800ml', 'sunlight-lemon-800ml', 5, true),
('ผงซักฟอกบรีส เอกเซล',      'ผงซักฟอกสูตรเข้มข้น พลังซักสะอาดล้ำลึก 800g',    'breeze-excel-800g',    5, true),
('น้ำยาถูพื้นมาจิคลีน',       'น้ำยาทำความสะอาดพื้น กลิ่นหอม แห้งเร็ว ไม่เหนียวตัว', 'magiclean-floor-clean',5, true),

-- ยาสามัญประจำบ้าน (category_id = 6)
('ยาพาราเซตามอล 500mg',     'ยาบรรเทาอาการปวดและลดไข้ แผง 10 เม็ด',           'paracetamol-500mg',    6, true),
('ยาแก้ไอชวนป๋วย',           'ยาน้ำแก้ไอ ขับเสมหะ บรรเทาอาการระคายคอ 60ml',    'cough-syrup-60ml',     6, true),
('ยาหม่อตราถ้วยทอง',        'ยาหม่องขาว ใช้ทาถูนวด บรรเทาอาการวิงเวียน/แมลงกัด', 'golden-cup-balm',      6, true),

-- สินค้าเบ็ดเตล็ด (category_id = 7)
('เสื้อยืด Cotton ลายล้านนา', 'เสื้อยืด 100% Cotton ลายศิลปะล้านนา',              'lanna-cotton-tshirt',  7, true),
('กระเป๋าผ้าทอลายไทย',        'กระเป๋าสะพายทำจากผ้าทอมือ ลายดอกเชียงใหม่',       'thai-woven-bag',       7, true),
('หูฟังบลูทูธ TWS',            'หูฟังไร้สาย True Wireless กันน้ำ IPX5',          'tws-bluetooth-earbuds',7, true),
('พาวเวอร์แบงค์ 10000 mAh',   'พาวเวอร์แบงค์ 10000mAh ชาร์จเร็ว 22.5W',           'powerbank-10000mah',   7, true),
('กล่องถนอมอาหาร แก้ว',       'กล่องแก้วทนความร้อน ฝาซิลิโคน ชุด 3 ชิ้น',         'glass-food-container', 7, true),
('เทียนหอมอโรมา',              'เทียนหอม Soy Wax กลิ่นมะลิและลาเวนเดอร์',         'aroma-soy-candle',     7, true),
('รองเท้าวิ่ง Trail',          'รองเท้าวิ่งเทรลน้ำหนักเบา พื้น Grip ดีเยี่ยม',     'trail-running-shoes',  7, true),
('กระติกน้ำ Stainless 750ml',  'กระติกสแตนเลส 750ml เก็บอุณหภูมิได้นาน',        'stainless-bottle-750', 7, true),

-- ของสดและอื่นๆ (category_id = 8)
('ไข่ไก่',                  'ไข่ไก่สดจากฟาร์ม คัดไซส์เบอร์ 2 คุณภาพดี',        'eggs-pack-10',         8, true),
('ผักบุ้งจีนสด',             'ผักบุ้งจีนปลอดสารพิษ สดจากมือเกษตรกร 1 กำ',       'morning-glory-fresh',  8, true),
('อกไก่สดปลอดสาร',           'เนื้ออกไก่สดจากเล้ามาตรฐาน ไม่ใช้สารเร่งโต 500g',  'chicken-breast-500g',  8, true),

-- Back to Misc for completeness of previous 14
('หนังสือ "เส้นทางล้านนา"',   'หนังสือท่องเที่ยวเชิงประวัติศาสตร์ล้านนา',        'lanna-travel-book',    7, true),
('ปากกา Gel 0.5mm ชุด 10 แท่ง','ปากกาเจลหมึกดำ เขียนลื่น ไม่เลอะ',                'gel-pen-set-10',       7, true);

-- ════════════════════════════════════════
-- SECTION 5: PRODUCT VARIANTS
-- ════════════════════════════════════════
 
INSERT INTO public.product_variants
  (product_id, sku, price, stock_quantity, unit, is_main, is_active) VALUES
-- Drink (P: 1-4)
(1, 'COFFEE-DOI', 220.0, 50, 'ถุง', true, true),
(2, 'TEA-OLONG', 180.0, 40, 'กล่อง', true, true),
(3, 'WATER-15L-6', 75.0, 100, 'แพ็ค 6 ขวด', true, true),
(3, 'WATER-15L-12', 130.0, 50, 'แพ็ค 12 ขวด', false, true),
(4, 'MILK-DMRK', 12.0, 200, 'กล่อง', true, true),
-- Dry Food (P: 5-8)
(5, 'RICE-5KG', 250.0, 30, 'ถุง 5kg', true, true),
(6, 'FISH-SAUCE', 35.0, 60, 'ขวด 700ml', true, true),
(7, 'SOY-OIL-1L', 65.0, 45, 'ขวด 1L', true, true),
(8, 'SOY-SAUCE', 42.0, 50, 'ขวด', true, true),
-- Snack (P: 9-12)
(9, 'LAYS-50G', 30.0, 80, 'ห่อ', true, true),
(10, 'PAPRIKA-45G', 25.0, 70, 'ห่อ', true, true),
(11, 'CRACKER-MLK', 45.0, 40, 'ซอง', true, true),
(12, 'SALT-PEANUT', 20.0, 100, 'ห่อ', true, true),
-- Personal Care (P: 13-16)
(13, 'CREAM-HERB', 150.0, 50, 'หลอด', true, true),
(14, 'COCONUT-OIL', 190.0, 30, 'ขวด', true, true),
(15, 'SHAMPOO-BFP', 120.0, 45, 'ขวด', true, true),
(16, 'PARROT-WASH', 95.0, 60, 'ขวด', true, true),
-- Cleaning (P: 17-19)
(17, 'SUNLIGHT-800', 45.0, 80, 'ถุง', true, true),
(18, 'BREEZE-800G', 85.0, 50, 'ถุง', true, true),
(19, 'MAGIC-FLOOR', 110.0, 40, 'แกลลอน', true, true),
-- Medicine (P: 20-22)
(20, 'PARA-500', 25.0, 150, 'แผง', true, true),
(21, 'COUGH-SYR', 65.0, 50, 'ขวด 60ml', true, true),
(22, 'BALM-GOLDEN', 45.0, 80, 'ตลับ', true, true),
-- Misc (P: 23-30)
(23, 'TSHIRT-LANN', 290.0, 30, 'ตัว', true, true),
(24, 'BAG-WOVEN', 450.0, 15, 'ใบ', true, true),
(25, 'TWS-EARBUD', 590.0, 25, 'กล่อง', true, true),
(26, 'PWR-10000', 490.0, 30, 'ชิ้น', true, true),
(27, 'GLS-BOX-3', 380.0, 25, 'ชุด', true, true),
(28, 'AROMA-CNDL', 220.0, 20, 'ชิ้น', true, true),
(29, 'TRAIL-SHOE', 1290.0, 10, 'คู่', true, true),
(30, 'BOTTLE-750', 320.0, 40, 'ใบ', true, true),
-- Fresh (P: 31-33)
(31, 'EGGS-P10', 65.0, 30, 'แพ็ค 10 ฟอง', true, true),
(32, 'VEG-MORNING', 15.0, 20, 'กำ', true, true),
(33, 'CHICK-BREAST', 95.0, 15, 'ชิ้น', true, true),
-- Back to Misc
(34, 'BOOK-LANNA', 350.0, 20, 'เล่ม', true, true),
(35, 'PEN-GEL-SET', 120.0, 80, 'ชุด', true, true);