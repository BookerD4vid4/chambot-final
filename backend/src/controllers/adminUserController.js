const db = require("../config/supabaseClient");

// ─── In-memory OTP store for add-admin flow ──────────────────────────────────
// Key: newAdminPhone, Value: { requesterOtp, newAdminOtp, requesterPhone, expiresAt }
const addAdminOtpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Returns all users (customers + admins) with suspended_by admin info
const getMembers = async (req, res) => {
    try {
        // Try full query with suspended_by columns (requires migration)
        let result;
        try {
            result = await db.query(`
                SELECT
                    u.id,
                    u.phone_number,
                    u.full_name,
                    u.role,
                    u.is_active,
                    u.created_at,
                    u.suspended_at,
                    a.phone_number AS suspended_by_phone,
                    a.full_name    AS suspended_by_name
                FROM public.users u
                LEFT JOIN public.users a ON a.id = u.suspended_by
                ORDER BY u.created_at DESC
            `);
        } catch (joinErr) {
            // Fallback: migration not yet run — query without suspended_by columns
            console.warn("[adminUserController] suspended_by column missing, using fallback query. Run MEMBER_MANAGEMENT_MIGRATION.sql to enable full functionality.");
            result = await db.query(`
                SELECT
                    id,
                    phone_number,
                    full_name,
                    role,
                    is_active,
                    created_at,
                    NULL AS suspended_at,
                    NULL AS suspended_by_phone,
                    NULL AS suspended_by_name
                FROM public.users
                ORDER BY created_at DESC
            `);
        }
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── PATCH /api/admin/users/:id/suspend ──────────────────────────────────────
const suspendMember = async (req, res) => {
    const { id } = req.params;
    try {
        // Cannot suspend another admin
        const check = await db.query("SELECT role FROM public.users WHERE id = $1", [id]);
        if (check.rows.length === 0)
            return res.status(404).json({ success: false, message: "ไม่พบสมาชิก" });
        if (check.rows[0].role === "admin")
            return res.status(403).json({ success: false, message: "ไม่สามารถระงับบัญชีผู้ดูแลได้" });

        const result = await db.query(
            `UPDATE public.users
             SET is_active = false, suspended_by = $1, suspended_at = NOW()
             WHERE id = $2
             RETURNING id, phone_number, full_name, is_active`,
            [req.user.id, id]
        );
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── PATCH /api/admin/users/:id/unsuspend ────────────────────────────────────
const unsuspendMember = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `UPDATE public.users
             SET is_active = true, suspended_by = NULL, suspended_at = NULL
             WHERE id = $1
             RETURNING id, phone_number, full_name, is_active`,
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: "ไม่พบสมาชิก" });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── POST /api/admin/users/add-admin/initiate ─────────────────────────────────
// Sends OTP to both the requester admin and the new admin phone
const initiateAddAdmin = async (req, res) => {
    const { newAdminPhone } = req.body;
    const requesterPhone = req.user.phone;

    if (!newAdminPhone || !/^[0-9]{9,10}$/.test(newAdminPhone.replace(/[-\s]/g, ""))) {
        return res.status(400).json({ success: false, message: "กรุณากรอกเบอร์โทรที่ถูกต้อง" });
    }
    if (newAdminPhone === requesterPhone) {
        return res.status(400).json({ success: false, message: "ไม่สามารถเพิ่มตัวเองเป็นผู้ดูแลได้" });
    }

    // Check if phone already has admin role
    const existing = await db.query(
        "SELECT role FROM public.users WHERE phone_number = $1",
        [newAdminPhone]
    );
    if (existing.rows.length > 0 && existing.rows[0].role === "admin") {
        return res.status(400).json({ success: false, message: "เบอร์นี้เป็นผู้ดูแลอยู่แล้ว" });
    }

    // Generate 2 separate OTPs
    const requesterOtp = String(Math.floor(100000 + Math.random() * 900000));
    const newAdminOtp = String(Math.floor(100000 + Math.random() * 900000));

    addAdminOtpStore.set(newAdminPhone, {
        requesterOtp,
        newAdminOtp,
        requesterPhone,
        expiresAt: Date.now() + OTP_TTL_MS,
    });

    // Log both OTPs to terminal (no SMS integration)
    console.log("\n╔══════════════════════════════════════════╗");
    console.log(`  🔐 ADD ADMIN OTP — เบอร์ใหม่: ${newAdminPhone}`);
    console.log(`  📱 OTP สำหรับผู้ดูแลปัจจุบัน (${requesterPhone}): ${requesterOtp}`);
    console.log(`  📱 OTP สำหรับผู้ดูแลใหม่    (${newAdminPhone}):  ${newAdminOtp}`);
    console.log("╚══════════════════════════════════════════╝\n");

    res.status(200).json({
        success: true,
        message: "ส่ง OTP สำเร็จ กรุณาตรวจสอบ Terminal สำหรับทั้ง 2 ชุด",
    });
};

// ─── POST /api/admin/users/add-admin/confirm ──────────────────────────────────
// Verifies both OTPs then promotes the user to admin
const confirmAddAdmin = async (req, res) => {
    const { newAdminPhone, requesterOtp, newAdminOtp } = req.body;
    const requesterPhone = req.user.phone;

    const record = addAdminOtpStore.get(newAdminPhone);
    if (!record) {
        return res.status(400).json({ success: false, message: "ไม่พบ OTP — กรุณาขอใหม่" });
    }
    if (Date.now() > record.expiresAt) {
        addAdminOtpStore.delete(newAdminPhone);
        return res.status(400).json({ success: false, message: "OTP หมดอายุแล้ว กรุณาขอใหม่" });
    }
    if (record.requesterPhone !== requesterPhone) {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ดำเนินการนี้" });
    }
    if (record.requesterOtp !== requesterOtp.trim()) {
        return res.status(400).json({ success: false, message: "OTP ของคุณไม่ถูกต้อง" });
    }
    if (record.newAdminOtp !== newAdminOtp.trim()) {
        return res.status(400).json({ success: false, message: "OTP ของผู้ดูแลใหม่ไม่ถูกต้อง" });
    }

    addAdminOtpStore.delete(newAdminPhone); // one-time use

    try {
        // Upsert: if user exists, promote; if not, create as admin
        const existing = await db.query(
            "SELECT id FROM public.users WHERE phone_number = $1",
            [newAdminPhone]
        );
        let updatedUser;
        if (existing.rows.length > 0) {
            const result = await db.query(
                "UPDATE public.users SET role = 'admin', is_active = true WHERE phone_number = $1 RETURNING id, phone_number, role",
                [newAdminPhone]
            );
            updatedUser = result.rows[0];
        } else {
            const result = await db.query(
                "INSERT INTO public.users (phone_number, role) VALUES ($1, 'admin') RETURNING id, phone_number, role",
                [newAdminPhone]
            );
            updatedUser = result.rows[0];
        }

        console.log(`✅  ${newAdminPhone} ถูกเพิ่มเป็นผู้ดูแลระบบแล้ว`);
        res.status(200).json({ success: true, message: "เพิ่มผู้ดูแลสำเร็จ", data: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { getMembers, suspendMember, unsuspendMember, initiateAddAdmin, confirmAddAdmin };
