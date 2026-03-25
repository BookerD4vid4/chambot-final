const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
require('dotenv').config();

// ตั้งค่า Supabase Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ตั้งค่า Multer (เก็บไว้ใน Memory แทน Disk)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // จำกัด 5MB
});

const uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์' });

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `products/${fileName}`; // ชื่อ Folder ใน Bucket

        // ─── อัปโหลดไปยัง Supabase Storage ───
        const { data, error } = await supabase.storage
            .from('products') 
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('❌ Supabase Storage Error:', error);
            return res.status(500).json({ success: false, message: 'Supabase Storage Error: ' + error.message });
        }

        console.log('✅ File uploaded to Supabase Storage:', data.path);

        // ─── ดึง Public URL มาใช้ ───
        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(filePath);

        console.log('🔗 Generated Public URL:', publicUrl);

        res.status(200).json({ 
            success: true, 
            imageUrl: publicUrl 
        });

    } catch (err) {
        console.error('❌ Upload Catch Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { upload, uploadImage };
