"use strict";

const db = require("../config/supabaseClient");

/**
 * deliveryController.js
 * Handles fetching and updating delivery settings (locked area).
 */

const getSettings = async (req, res) => {
    try {
        const { rows } = await db.query("SELECT * FROM delivery_settings LIMIT 1");
        if (rows.length === 0) {
            // Default empty settings if none exist
            return res.json({
                success: true,
                data: {
                    province: "",
                    amphoe: "",
                    tambon: "",
                    postal_code: "",
                    is_locked: false
                }
            });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateSettings = async (req, res) => {
    const { province, amphoe, tambon, postal_code, is_locked } = req.body;
    try {
        // Upsert logic (always update the first row or insert if empty)
        const check = await db.query("SELECT id FROM delivery_settings LIMIT 1");
        
        let result;
        if (check.rows.length > 0) {
            result = await db.query(
                `UPDATE delivery_settings 
                 SET province = $1, amphoe = $2, tambon = $3, postal_code = $4, is_locked = $5, updated_at = NOW()
                 WHERE id = $6 RETURNING *`,
                [province, amphoe, tambon, postal_code, is_locked, check.rows[0].id]
            );
        } else {
            result = await db.query(
                `INSERT INTO delivery_settings (province, amphoe, tambon, postal_code, is_locked)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [province, amphoe, tambon, postal_code, is_locked]
            );
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getSettings, updateSettings };
