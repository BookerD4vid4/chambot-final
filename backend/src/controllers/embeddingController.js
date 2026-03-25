const { embedAllProducts, embedQuery } = require("../services/embeddingService");
const db = require("../config/supabaseClient");

// ── POST /api/admin/embeddings/reindex ───────────────────────────────────────
// Re-embeds all active products (long-running — responds immediately)
const reindexAll = async (req, res) => {
    res.status(202).json({
        success: true,
        message: "กำลัง re-embed สินค้าทั้งหมด ตรวจสอบ Terminal สำหรับ progress…",
    });
    // Run after response is sent
    embedAllProducts()
        .then(r => console.log(`✅  Reindex complete — done:${r.done} failed:${r.failed} / total:${r.total}`))
        .catch(err => console.error("❌  Reindex error:", err.message));
};

// ── GET /api/admin/embeddings/status ─────────────────────────────────────────
// Returns count of embedded vs total products
const getStatus = async (req, res) => {
    try {
        const [total, embedded] = await Promise.all([
            db.query("SELECT COUNT(*) AS cnt FROM public.products WHERE is_active = true"),
            db.query("SELECT COUNT(*) AS cnt FROM public.product_embeddings"),
        ]);
        res.status(200).json({
            success: true,
            data: {
                total_products: Number(total.rows[0].cnt),
                embedded_products: Number(embedded.rows[0].cnt),
                pending: Number(total.rows[0].cnt) - Number(embedded.rows[0].cnt),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── GET /api/admin/embeddings/check/:product_id ───────────────────────────────
// Returns whether a specific product has an embedding row
const checkProduct = async (req, res) => {
    const { product_id } = req.params;
    try {
        const result = await db.query(
            `SELECT pe.product_id, pe.updated_at, pe.text_used,
                    p.name AS product_name
             FROM public.product_embeddings pe
             JOIN public.products p ON p.product_id = pe.product_id
             WHERE pe.product_id = $1`,
            [product_id]
        );
        if (result.rows.length === 0) {
            return res.status(200).json({ success: true, data: { has_embedding: false } });
        }
        const row = result.rows[0];
        res.status(200).json({
            success: true,
            data: {
                has_embedding: true,
                updated_at: row.updated_at,
                text_used: row.text_used,
                product_name: row.product_name,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── POST /api/admin/embeddings/embed/:product_id ──────────────────────────────
// Trigger embedding for a single product on demand
const embedSingle = async (req, res) => {
    const { product_id } = req.params;
    try {
        const { embedProduct } = require('../services/embeddingService');
        res.status(202).json({ success: true, message: 'กำลัง embed สินค้า...' });
        await embedProduct(product_id);
        console.log(`✅  Embedded product ${product_id}`);
    } catch (err) {
        console.error(`❌  Embed failed for ${product_id}:`, err.message);
    }
};

// ── POST /api/admin/embeddings/search ────────────────────────────────────────
// Semantic search: { query, limit? } → top N matching products
const semanticSearch = async (req, res) => {
    const { query, limit = 10 } = req.body;
    if (!query || !query.trim()) {
        return res.status(400).json({ success: false, message: "กรุณาระบุ query" });
    }
    try {
        const vec = await embedQuery(query.trim());
        const vecStr = `[${vec.join(",")}]`;

        const result = await db.query(
            `SELECT
                p.product_id,
                p.name,
                p.description,
                c.name       AS category_name,
                pe.text_used,
                1 - (pe.embedding <=> $1::vector) AS similarity
             FROM public.product_embeddings pe
             JOIN public.products  p ON p.product_id  = pe.product_id
             LEFT JOIN public.categories c ON c.category_id = p.category_id
             WHERE p.is_active = true
             ORDER BY pe.embedding <=> $1::vector
             LIMIT $2`,
            [vecStr, Number(limit)]
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { reindexAll, getStatus, semanticSearch, checkProduct, embedSingle };
