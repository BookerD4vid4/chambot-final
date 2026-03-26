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
            return res.json({
                success: true,
                data: {
                    province: "",
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
    const { province, postal_code, is_locked, amphoe, tambon } = req.body;
    try {
        const check = await db.query("SELECT id FROM delivery_settings LIMIT 1");
        
        let result;
        if (check.rows.length > 0) {
            result = await db.query(
                `UPDATE delivery_settings 
                 SET province = $1, postal_code = $2, is_locked = $3, amphoe = $4, tambon = $5, updated_at = NOW()
                 WHERE id = $6 RETURNING *`,
                [province, postal_code, is_locked, amphoe || null, tambon || null, check.rows[0].id]
            );
        } else {
            result = await db.query(
                `INSERT INTO delivery_settings (province, postal_code, is_locked, amphoe, tambon)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [province, postal_code, is_locked, amphoe || null, tambon || null]
            );
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getSettings, updateSettings };
