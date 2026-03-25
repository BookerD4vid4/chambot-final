"use strict";
/**
 * embeddingService.js
 * -------------------
 * Generates 768-dim embeddings using intfloat/multilingual-e5-base
 * via @xenova/transformers (ONNX runtime — no Python required).
 *
 * The pipeline is loaded once as a singleton on first use.
 * All embed calls are non-blocking from the caller's perspective.
 */

const db = require("../config/supabaseClient");

// ── Lazy-loaded pipeline singleton ───────────────────────────────────────────
let _pipeline = null;

const getPipeline = async () => {
    if (_pipeline) return _pipeline;

    // Dynamic import because @xenova/transformers is ESM-first
    const { pipeline, env } = await import("@xenova/transformers");

    // Disable local model check — always use HuggingFace Hub cache
    env.allowLocalModels = false;

    console.log("⏳  Loading embedding model: Xenova/multilingual-e5-base …");
    _pipeline = await pipeline("feature-extraction", "Xenova/multilingual-e5-base");
    console.log("✅  Embedding model loaded (multilingual-e5-base, 768-dim)");
    return _pipeline;
};

// ── Build text for embedding ─────────────────────────────────────────────────
/**
 * Formats product data into a single string for embedding.
 * Uses "passage:" prefix as required by E5 models.
 */
const buildText = (product) => {
    const parts = [
        `passage: ${product.name || ""}`,
    ];
    if (product.description) parts.push(product.description);
    if (product.category_name) parts.push(`หมวดหมู่: ${product.category_name}`);
    if (Array.isArray(product.variants) && product.variants.length > 0) {
        const variantText = product.variants
            .map(v => [v.sku, v.unit, v.price ? `฿${v.price}` : null].filter(Boolean).join(" "))
            .join(", ");
        if (variantText) parts.push(`รุ่น: ${variantText}`);
    }
    return parts.join("\n").slice(0, 2048); // cap at 2048 chars
};

// ── Mean pooling helper ───────────────────────────────────────────────────────
const meanPool = (tensor) => {
    // tensor.data is Float32Array, tensor.dims = [1, seq_len, 768]
    const [, seqLen, hiddenSize] = tensor.dims;
    const result = new Float32Array(hiddenSize);
    for (let h = 0; h < hiddenSize; h++) {
        let sum = 0;
        for (let s = 0; s < seqLen; s++) {
            sum += tensor.data[s * hiddenSize + h];
        }
        result[h] = sum / seqLen;
    }
    return result;
};

// ── L2 normalise ─────────────────────────────────────────────────────────────
const l2Norm = (vec) => {
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    return norm > 0 ? vec.map(v => v / norm) : vec;
};

// ── Core embed function ───────────────────────────────────────────────────────
/**
 * Embed a text string → Float32Array of 768 values.
 */
const embedText = async (text) => {
    const extractor = await getPipeline();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    // output.data is already mean-pooled + normalised by the pipeline options,
    // but we do it manually too for safety with this model variant.
    let vec;
    if (output.dims.length === 2) {
        // shape [1, 768]
        vec = Array.from(output.data);
    } else {
        // shape [1, seq_len, 768] — manual mean pool
        vec = Array.from(l2Norm(meanPool(output)));
    }
    return vec;
};

// ── Upsert vector into DB ─────────────────────────────────────────────────────
const upsertEmbedding = async (productId, vec, textUsed) => {
    // pgvector expects the array as '[0.1,0.2,...]' string
    const vecStr = `[${vec.join(",")}]`;
    await db.query(
        `INSERT INTO public.product_embeddings (product_id, embedding, text_used, updated_at)
         VALUES ($1, $2::vector, $3, NOW())
         ON CONFLICT (product_id) DO UPDATE
             SET embedding  = EXCLUDED.embedding,
                 text_used  = EXCLUDED.text_used,
                 updated_at = NOW()`,
        [productId, vecStr, textUsed]
    );
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Embed a single product by ID and store in product_embeddings.
 * SAFE to call without await — errors are caught and logged.
 */
const embedProduct = async (productId) => {
    try {
        // Fetch product with category name and variants
        const [pr, vr] = await Promise.all([
            db.query(
                `SELECT p.product_id, p.name, p.description, c.name AS category_name
                 FROM public.products p
                 LEFT JOIN public.categories c ON c.category_id = p.category_id
                 WHERE p.product_id = $1`, [productId]
            ),
            db.query(
                `SELECT sku, unit, price FROM public.product_variants
                 WHERE product_id = $1 AND is_active = true`, [productId]
            ),
        ]);
        if (pr.rows.length === 0) return;

        const product = { ...pr.rows[0], variants: vr.rows };
        const text = buildText(product);
        const vec = await embedText(text);
        await upsertEmbedding(productId, vec, text);

        console.log(`🔵  Embedded product #${productId}: "${product.name}"`);
    } catch (err) {
        console.error(`❌  embedProduct(${productId}) failed:`, err.message);
    }
};

/**
 * Re-embed ALL active products (used by /api/admin/embeddings/reindex).
 * Returns { total, done, failed }.
 */
const embedAllProducts = async () => {
    const { rows } = await db.query(
        "SELECT product_id FROM public.products WHERE is_active = true ORDER BY product_id"
    );

    let done = 0, failed = 0;
    for (const { product_id } of rows) {
        try {
            await embedProduct(product_id);
            done++;
        } catch (err) {
            failed++;
        }
    }
    return { total: rows.length, done, failed };
};

/**
 * Embed a query string (prefix "query:" for E5 models) and return vector.
 * Used for semantic search from API.
 */
const embedQuery = async (queryText) => {
    const text = `query: ${queryText}`;
    return embedText(text);
};

module.exports = { embedProduct, embedAllProducts, embedQuery, buildText };
