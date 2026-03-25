const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "chambot_dev_secret_change_in_prod";

/**
 * Extract user from Bearer token. Sets req.user if valid.
 * Does NOT block — use requireAuth or requireAdmin after this.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch {
            req.user = null;
        }
    }
    next();
};

/** Block unauthenticated requests */
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized — please log in" });
    }
    next();
};

/** Block non-admin requests */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Forbidden — admin only" });
    }
    next();
};

/** Sign a token (utility for login route) */
const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

module.exports = { authenticate, requireAuth, requireAdmin, signToken };
