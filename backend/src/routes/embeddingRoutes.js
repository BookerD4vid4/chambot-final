const express = require("express");
const router = express.Router();
const { reindexAll, getStatus, semanticSearch, checkProduct, embedSingle } = require("../controllers/embeddingController");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.use(authenticate, requireAdmin);

// Status — how many products have embeddings
router.get("/status", getStatus);

// Check if a specific product has embedding
router.get("/check/:product_id", checkProduct);

// Re-embed all active products
router.post("/reindex", reindexAll);

// Re-embed a single product on demand
router.post("/embed/:product_id", embedSingle);

// Semantic search (test endpoint for admin)
router.post("/search", semanticSearch);

module.exports = router;
