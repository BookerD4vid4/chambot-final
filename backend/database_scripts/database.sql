-- ══════════════════════════════════════════════════════════════════════════════
-- CHAMBOT — SUPABASE COMPLETE SETUP (FINAL)
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════
-- SECTION 1: EXTENSIONS
-- ════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ════════════════════════════════════════
-- SECTION 2: ENUM TYPES
-- ════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin','customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending','shipped','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- [FIX ข้อ1] ลบ payment_status ENUM ออก เพราะไม่มี payments table แล้ว

DO $$ BEGIN
    CREATE TYPE inventory_transaction_type AS ENUM (
        'purchase','restock','adjustment','cancel','return','damage'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════
-- SECTION 3: CORE TABLES
-- ════════════════════════════════════════

-- 3.1 USERS
CREATE TABLE IF NOT EXISTS public.users (
    id              INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    phone_number    VARCHAR(20) NOT NULL UNIQUE,
    full_name       VARCHAR(255),
    role            user_role NOT NULL DEFAULT 'customer',
    is_active       BOOLEAN DEFAULT true,
    suspended_by    INT REFERENCES public.users(id) ON DELETE SET NULL,
    suspended_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3.2 USER ADDRESSES
CREATE TABLE IF NOT EXISTS public.user_addresses (
    address_id      INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id         INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_name  VARCHAR(255) NOT NULL,
    address_line    TEXT NOT NULL,     -- customer กรอกเสมอ (บ้านเลขที่)
    province        VARCHAR(150),      -- กรอกเองได้ถ้า admin ไม่ lock
    district        VARCHAR(150),      -- กรอกเองได้ถ้า admin ไม่ lock
    tambon          VARCHAR(150),      -- กรอกเองได้ถ้า admin ไม่ lock
    postal_code     VARCHAR(20),       -- กรอกเองได้ถ้า admin ไม่ lock
    is_default      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);
-- admin ตั้งค่าพื้นที่จัดส่งที่ lock ไว้
CREATE TABLE IF NOT EXISTS public.delivery_settings (
    id          INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    province    VARCHAR(150),   -- NULL = ไม่ lock ให้ customer กรอกเอง
    district      VARCHAR(150),   -- NULL = ไม่ lock
    tambon      VARCHAR(150),   -- NULL = ไม่ lock
    postal_code VARCHAR(20),    -- NULL = ไม่ lock
    is_locked   BOOLEAN DEFAULT false, -- เพิ่ม column นี้
    updated_by  INT REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- seed ค่าเริ่มต้น (ทุก field = NULL = ยังไม่ lock อะไร)
INSERT INTO public.delivery_settings (province, district, tambon, postal_code, is_locked)
VALUES (NULL, NULL, NULL, NULL, false);
-- 3.3 CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    category_id     INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3.4 PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    product_id      INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name            VARCHAR(255) NOT NULL CHECK (name <> ''),
    description     TEXT,
    slug            VARCHAR(255) UNIQUE,
    category_id     INT REFERENCES public.categories(category_id) ON DELETE SET NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3.5 PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS public.product_variants (
    variant_id          INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id          INT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
    sku                 VARCHAR(100) UNIQUE NOT NULL,
    price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock_quantity      INT DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_quantity   INT DEFAULT 0 CHECK (reserved_quantity >= 0),
    image_url           TEXT,
    unit                VARCHAR(50),
    low_stock_threshold INT DEFAULT 5 CHECK (low_stock_threshold >= 0),
    is_main             BOOLEAN DEFAULT false,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_reserved_lte_stock CHECK (reserved_quantity <= stock_quantity)
);

-- 3.6 CARTS
CREATE TABLE IF NOT EXISTS public.carts (
    cart_id     INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id     INT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    cart_item_id    INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    cart_id         INT NOT NULL REFERENCES public.carts(cart_id) ON DELETE CASCADE,
    variant_id      INT NOT NULL REFERENCES public.product_variants(variant_id) ON DELETE CASCADE,
    quantity        INT NOT NULL CHECK (quantity > 0),
    UNIQUE(cart_id, variant_id)
);

-- 3.7 ORDERS
-- [FIX ข้อ1] ลบ payment_status ออก
-- [FIX ข้อ2] ลบ shipped_at ออก (ซ้ำกับ order_status_logs)
CREATE TABLE IF NOT EXISTS public.orders (
    order_id            INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id             INT REFERENCES public.users(id) ON DELETE SET NULL,
    total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status              order_status DEFAULT 'pending',
    address_snapshot    JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 3.8 ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    order_item_id   INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id        INT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    variant_id      INT REFERENCES public.product_variants(variant_id) ON DELETE SET NULL,
    price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    quantity        INT NOT NULL CHECK (quantity > 0)
);

-- partial unique index รองรับ variant_id = NULL
CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_id_variant_id_unique
    ON public.order_items (order_id, variant_id)
    WHERE variant_id IS NOT NULL;

-- 3.9 ORDER STATUS LOGS
-- [FIX ข้อ3] เปลี่ยน status จาก VARCHAR(50) → order_status ENUM
CREATE TABLE IF NOT EXISTS public.order_status_logs (
    log_id      INT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
    order_id    INT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    status      order_status NOT NULL,
    changed_by  VARCHAR(100) DEFAULT 'system',
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3.10 INVENTORY TRANSACTIONS
-- [FIX ข้อ4] เพิ่ม CHECK quantity_after >= 0
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    transaction_id      INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    variant_id          INT NOT NULL REFERENCES public.product_variants(variant_id) ON DELETE RESTRICT,
    quantity_changed    INT NOT NULL CHECK (quantity_changed <> 0),
    quantity_before     INT NOT NULL CHECK (quantity_before >= 0),
    quantity_after      INT NOT NULL CHECK (quantity_after >= 0),
    transaction_type    inventory_transaction_type NOT NULL,
    reference_order_id  INT REFERENCES public.orders(order_id) ON DELETE SET NULL,
    performed_by        INT REFERENCES public.users(id) ON DELETE SET NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- 3.11 STOCK RESERVATIONS
CREATE TABLE IF NOT EXISTS public.stock_reservations (
    reservation_id  INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    order_id        INT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    variant_id      INT NOT NULL REFERENCES public.product_variants(variant_id) ON DELETE RESTRICT,
    quantity        INT NOT NULL CHECK (quantity > 0),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '15 minutes',
    released_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(order_id, variant_id)
);

-- 3.12 PRODUCT EMBEDDINGS
CREATE TABLE IF NOT EXISTS public.product_embeddings (
    product_id  INT PRIMARY KEY REFERENCES public.products(product_id) ON DELETE CASCADE,
    embedding   vector(768) NOT NULL,
    text_used   TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════
-- SECTION 4: TRIGGERS (updated_at)
-- ════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DO $$ DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users','categories','products','product_variants','carts','orders'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t
        );
    END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════
-- SECTION 5: FUNCTIONS
-- ════════════════════════════════════════

-- 5.1 update_order_status — เปลี่ยน status + log พร้อมกันเสมอ
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id   INT,
    p_status     order_status,
    p_changed_by VARCHAR DEFAULT 'system',
    p_note       TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.orders
    SET status = p_status, updated_at = now()
    WHERE order_id = p_order_id;

    INSERT INTO public.order_status_logs (order_id, status, changed_by, note)
    VALUES (p_order_id, p_status, p_changed_by, p_note);
END;
$$;

-- 5.2 release_expired_reservations — คืน stock ที่หมดเวลา
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.product_variants pv
    SET reserved_quantity = reserved_quantity - sub.total
    FROM (
        SELECT variant_id, SUM(quantity) AS total
        FROM public.stock_reservations
        WHERE expires_at < now()
          AND released_at IS NULL
        GROUP BY variant_id
    ) sub
    WHERE pv.variant_id = sub.variant_id;

    UPDATE public.stock_reservations
    SET released_at = now()
    WHERE expires_at < now()
      AND released_at IS NULL;
END;
$$;

-- 5.3 search_products_by_embedding — semantic search
CREATE OR REPLACE FUNCTION search_products_by_embedding(
    query_embedding vector(768),
    match_count     INT DEFAULT 10
)
RETURNS TABLE (
    product_id  INT,
    similarity  FLOAT
)
LANGUAGE sql STABLE AS $$
    SELECT
        pe.product_id,
        1 - (pe.embedding <=> query_embedding) AS similarity
    FROM public.product_embeddings pe
    JOIN public.products p ON p.product_id = pe.product_id
    WHERE p.is_active = true
    ORDER BY pe.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ════════════════════════════════════════
-- SECTION 6: CRON JOB
-- ════════════════════════════════════════

SELECT cron.schedule(
    'release-expired-reservations',
    '*/5 * * * *',
    'SELECT release_expired_reservations()'
);

-- ════════════════════════════════════════
-- SECTION 7: VIEWS
-- ════════════════════════════════════════

-- product_list_view
CREATE OR REPLACE VIEW public.product_list_view AS
SELECT
    p.product_id,
    p.name          AS product_name,
    p.description,
    p.slug,
    p.is_active,
    p.category_id,
    p.created_at,
    p.updated_at,
    c.name          AS category_name,
    COUNT(pv.variant_id)::int                                   AS variant_count,
    COALESCE(SUM(pv.stock_quantity), 0)::int                    AS total_stock,
    COALESCE(SUM(pv.stock_quantity - pv.reserved_quantity), 0)::int AS available_stock,
    MIN(pv.price)                                               AS min_price,
    MAX(pv.price)                                               AS max_price,
    MIN(pv.low_stock_threshold)                                 AS low_stock_threshold,
    (
        SELECT pv2.image_url
        FROM   product_variants pv2
        WHERE  pv2.product_id = p.product_id
          AND  pv2.is_main    = true
          AND  pv2.is_active  = true
        LIMIT 1
    ) AS image_url
FROM       public.products p
LEFT JOIN  public.categories c      ON p.category_id   = c.category_id
LEFT JOIN  public.product_variants pv
               ON  pv.product_id = p.product_id
               AND pv.is_active  = true
GROUP BY p.product_id, c.name, c.category_id;

-- order_list_view
-- [FIX ข้อ1] ลบ payment_status ออก
-- [FIX ข้อ2] ลบ shipped_at ออก
CREATE OR REPLACE VIEW public.order_list_view AS
SELECT
    o.order_id,
    o.user_id,
    o.total_amount,
    o.status,
    o.address_snapshot,
    o.created_at,
    o.updated_at,
    u.full_name     AS customer_name,
    u.phone_number,
    -- shipped_at ดึงจาก order_status_logs แทน
    (
        SELECT l.created_at
        FROM   public.order_status_logs l
        WHERE  l.order_id = o.order_id
          AND  l.status   = 'shipped'
        ORDER  BY l.created_at DESC
        LIMIT  1
    ) AS shipped_at
FROM       public.orders o
LEFT JOIN  public.users u ON o.user_id = u.id;