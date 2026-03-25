const db = require("../config/supabaseClient");

const getAllCategories = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM categories 
            ORDER BY name ASC
        `);
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query(
            "INSERT INTO categories (name) VALUES ($1) RETURNING *",
            [name]
        );
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await db.query(
            "UPDATE categories SET name = $1 WHERE category_id = $2 RETURNING *",
            [name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any products use this category
        const products = await db.query("SELECT * FROM products WHERE category_id = $1", [id]);
        if (products.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete category that is attached to products. Please reassign or delete products first."
            });
        }

        await db.query("DELETE FROM categories WHERE category_id = $1", [id]);
        res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
};
