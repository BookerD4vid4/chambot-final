import React, { useEffect, useState, useCallback } from 'react';
import {
    Users, ShieldCheck, UserX, UserCheck, UserPlus,
    Search, RefreshCw, Phone, Calendar, ChevronRight, X,
    AlertTriangle, Check, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getAdminMembers,
    suspendMember,
    unsuspendMember,
    initiateAddAdmin,
    confirmAddAdmin,
} from '../../api';
import './MembersPage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// ─── Component ────────────────────────────────────────────────────────────────
const MembersPage = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | active | suspended | admin

    // Suspend confirm dialog
    const [confirmDialog, setConfirmDialog] = useState(null); // { id, phone, action }
    const [actionLoading, setActionLoading] = useState(false);

    // Add-admin modal
    const [addAdminModal, setAddAdminModal] = useState(false);
    const [addStep, setAddStep] = useState(1); // 1=enter phone, 2=enter OTPs
    const [newPhone, setNewPhone] = useState('');
    const [reqOtp, setReqOtp] = useState('');
    const [newOtp, setNewOtp] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAdminMembers();
            setMembers(res.data.data || []);
        } catch {
            toast.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = members.filter(m => {
        const matchSearch =
            m.phone_number?.includes(search) ||
            (m.full_name || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all' ? true :
                filter === 'active' ? (m.is_active && m.role !== 'admin') :
                    filter === 'suspended' ? !m.is_active :
                        filter === 'admin' ? m.role === 'admin' : true;
        return matchSearch && matchFilter;
    });

    // ── Suspend / Unsuspend ───────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!confirmDialog) return;
        setActionLoading(true);
        try {
            if (confirmDialog.action === 'suspend') {
                await suspendMember(confirmDialog.id);
                toast.success(`ระงับบัญชี ${confirmDialog.phone} สำเร็จ`);
            } else {
                await unsuspendMember(confirmDialog.id);
                toast.success(`เปิดใช้งานบัญชี ${confirmDialog.phone} สำเร็จ`);
            }
            await fetchMembers();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(false);
            setConfirmDialog(null);
        }
    };

    // ── Add Admin — Step 1: send OTP ──────────────────────────────────────────
    const handleInitiate = async () => {
        if (!newPhone.trim()) return toast.error('กรุณากรอกเบอร์โทร');
        setAddLoading(true);
        try {
            await initiateAddAdmin(newPhone.trim());
            toast.success('ส่ง OTP สำเร็จ! กรุณาตรวจสอบ Terminal');
            setAddStep(2);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setAddLoading(false);
        }
    };

    // ── Add Admin — Step 2: confirm OTPs ─────────────────────────────────────
    const handleConfirmAdmin = async () => {
        if (!reqOtp.trim() || !newOtp.trim()) return toast.error('กรุณากรอก OTP ทั้ง 2 ชุด');
        setAddLoading(true);
        try {
            await confirmAddAdmin(newPhone.trim(), reqOtp.trim(), newOtp.trim());
            toast.success('เพิ่มผู้ดูแลสำเร็จ!');
            closeAddAdminModal();
            await fetchMembers();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'OTP ไม่ถูกต้อง');
        } finally {
            setAddLoading(false);
        }
    };

    const closeAddAdminModal = () => {
        setAddAdminModal(false);
        setAddStep(1);
        setNewPhone('');
        setReqOtp('');
        setNewOtp('');
        setAddLoading(false);
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    const stats = {
        total: members.length,
        active: members.filter(m => m.is_active && m.role !== 'admin').length,
        suspended: members.filter(m => !m.is_active).length,
        admins: members.filter(m => m.role === 'admin').length,
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="members-page">
            {/* ── Header ── */}
            <div className="members-header">
                <div className="members-header-left">
                    <h1 className="members-title">
                        <Users size={22} /> จัดการสมาชิก
                    </h1>
                    <p className="members-subtitle">ดูแลบัญชีผู้ใช้และผู้ดูแลระบบ</p>
                </div>
                <div className="members-header-actions">
                    <button className="btn-refresh" onClick={fetchMembers} disabled={loading}>
                        <RefreshCw size={15} className={loading ? 'spin' : ''} />
                        รีเฟรช
                    </button>
                    <button className="btn-add-admin" onClick={() => setAddAdminModal(true)}>
                        <UserPlus size={15} />
                        เพิ่มผู้ดูแล
                    </button>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="members-stats">
                {[
                    { label: 'สมาชิกทั้งหมด', value: stats.total, icon: <Users size={18} />, cls: 'stat-total' },
                    { label: 'ใช้งานอยู่', value: stats.active, icon: <UserCheck size={18} />, cls: 'stat-active' },
                    { label: 'ถูกระงับ', value: stats.suspended, icon: <UserX size={18} />, cls: 'stat-suspended' },
                    { label: 'ผู้ดูแล', value: stats.admins, icon: <ShieldCheck size={18} />, cls: 'stat-admin' },
                ].map(s => (
                    <div key={s.label} className={`stat-card ${s.cls}`}>
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-body">
                            <span className="stat-value">{s.value}</span>
                            <span className="stat-label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Toolbar ── */}
            <div className="members-toolbar">
                <div className="search-box">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ หรือ เบอร์โทร…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="filter-tabs">
                    {[
                        { key: 'all', label: 'ทั้งหมด' },
                        { key: 'active', label: 'ใช้งานได้' },
                        { key: 'suspended', label: 'ถูกระงับ' },
                        { key: 'admin', label: 'ผู้ดูแล' },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="members-table-wrap">
                {loading ? (
                    <div className="members-loading">
                        <Loader2 size={28} className="spin" />
                        <span>กำลังโหลด…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="members-empty">
                        <Users size={40} />
                        <p>ไม่พบสมาชิก</p>
                    </div>
                ) : (
                    <table className="members-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>เบอร์โทร</th>
                                <th>ชื่อ</th>
                                <th>บทบาท</th>
                                <th>สถานะ</th>
                                <th>วันที่สมัคร</th>
                                <th>ระงับโดย</th>
                                <th>การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((m, i) => (
                                <tr key={m.id} className={!m.is_active ? 'row-suspended' : ''}>
                                    <td className="td-index">{i + 1}</td>
                                    <td className="td-phone">
                                        <Phone size={13} />
                                        {m.phone_number}
                                    </td>
                                    <td className="td-name">{m.full_name || <span className="no-name">—</span>}</td>
                                    <td>
                                        {m.role === 'admin' ? (
                                            <span className="badge badge-admin">
                                                <ShieldCheck size={11} /> ผู้ดูแล
                                            </span>
                                        ) : (
                                            <span className="badge badge-customer">สมาชิก</span>
                                        )}
                                    </td>
                                    <td>
                                        {m.is_active ? (
                                            <span className="badge badge-active">ใช้งานได้</span>
                                        ) : (
                                            <span className="badge badge-suspended">ถูกระงับ</span>
                                        )}
                                    </td>
                                    <td className="td-date">
                                        <Calendar size={12} />
                                        {formatDate(m.created_at)}
                                    </td>
                                    <td className="td-suspended-by">
                                        {m.suspended_by_phone ? (
                                            <span className="suspended-by-info">
                                                <Phone size={11} />
                                                {m.suspended_by_phone}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="td-actions">
                                        {m.role !== 'admin' && (
                                            m.is_active ? (
                                                <button
                                                    className="action-btn suspend-btn"
                                                    onClick={() => setConfirmDialog({ id: m.id, phone: m.phone_number, action: 'suspend' })}
                                                >
                                                    <UserX size={13} /> ระงับ
                                                </button>
                                            ) : (
                                                <button
                                                    className="action-btn unsuspend-btn"
                                                    onClick={() => setConfirmDialog({ id: m.id, phone: m.phone_number, action: 'unsuspend' })}
                                                >
                                                    <UserCheck size={13} /> เปิดใช้
                                                </button>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Confirm Dialog ── */}
            {confirmDialog && (
                <div className="modal-overlay" onClick={() => !actionLoading && setConfirmDialog(null)}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className={`confirm-icon ${confirmDialog.action === 'suspend' ? 'icon-warn' : 'icon-success'}`}>
                            {confirmDialog.action === 'suspend'
                                ? <AlertTriangle size={26} />
                                : <UserCheck size={26} />
                            }
                        </div>
                        <h3>{confirmDialog.action === 'suspend' ? 'ยืนยันการระงับบัญชี' : 'ยืนยันการเปิดใช้งาน'}</h3>
                        <p>
                            {confirmDialog.action === 'suspend'
                                ? <>คุณต้องการระงับบัญชี <strong>{confirmDialog.phone}</strong> หรือไม่?</>
                                : <>คุณต้องการเปิดใช้งานบัญชี <strong>{confirmDialog.phone}</strong> หรือไม่?</>
                            }
                        </p>
                        <div className="confirm-actions">
                            <button className="btn-cancel" onClick={() => setConfirmDialog(null)} disabled={actionLoading}>
                                ยกเลิก
                            </button>
                            <button
                                className={`btn-confirm ${confirmDialog.action === 'suspend' ? 'btn-danger' : 'btn-success'}`}
                                onClick={handleConfirm}
                                disabled={actionLoading}
                            >
                                {actionLoading
                                    ? <Loader2 size={14} className="spin" />
                                    : confirmDialog.action === 'suspend' ? 'ระงับบัญชี' : 'เปิดใช้งาน'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Admin Modal ── */}
            {addAdminModal && (
                <div className="modal-overlay" onClick={() => !addLoading && closeAddAdminModal()}>
                    <div className="add-admin-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeAddAdminModal} disabled={addLoading}>
                            <X size={18} />
                        </button>

                        {/* Step Indicator */}
                        <div className="step-indicator">
                            <div className={`step ${addStep >= 1 ? 'active' : ''}`}>
                                <span className="step-num">1</span>
                                <span className="step-label">กรอกเบอร์</span>
                            </div>
                            <ChevronRight size={14} className="step-arrow" />
                            <div className={`step ${addStep >= 2 ? 'active' : ''}`}>
                                <span className="step-num">2</span>
                                <span className="step-label">ยืนยัน OTP</span>
                            </div>
                        </div>

                        {addStep === 1 ? (
                            <>
                                <div className="modal-icon-wrap">
                                    <ShieldCheck size={30} />
                                </div>
                                <h3 className="modal-title">เพิ่มผู้ดูแลระบบ</h3>
                                <p className="modal-desc">
                                    กรอกเบอร์โทรศัพท์ของผู้ดูแลใหม่<br />
                                    ระบบจะส่ง OTP ไปยังทั้ง 2 ฝ่าย
                                </p>
                                <div className="modal-field">
                                    <label>เบอร์โทรผู้ดูแลใหม่</label>
                                    <div className="input-with-icon">
                                        <Phone size={14} />
                                        <input
                                            type="tel"
                                            placeholder="0812345678"
                                            value={newPhone}
                                            onChange={e => setNewPhone(e.target.value)}
                                            disabled={addLoading}
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                                <button
                                    className="btn-primary full-width"
                                    onClick={handleInitiate}
                                    disabled={addLoading || !newPhone.trim()}
                                >
                                    {addLoading ? <Loader2 size={15} className="spin" /> : null}
                                    ส่ง OTP
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="modal-icon-wrap success">
                                    <Check size={30} />
                                </div>
                                <h3 className="modal-title">ยืนยัน OTP ทั้ง 2 ชุด</h3>
                                <p className="modal-desc">
                                    OTP ถูกส่งไปยัง <strong>{newPhone}</strong> และเบอร์ของคุณแล้ว<br />
                                    กรุณาตรวจสอบ Terminal สำหรับ OTP
                                </p>
                                <div className="modal-field">
                                    <label>OTP ของคุณ (ผู้ดูแลปัจจุบัน)</label>
                                    <input
                                        type="text"
                                        placeholder="000000"
                                        value={reqOtp}
                                        onChange={e => setReqOtp(e.target.value)}
                                        disabled={addLoading}
                                        maxLength={6}
                                        className="otp-input"
                                    />
                                </div>
                                <div className="modal-field">
                                    <label>OTP ของผู้ดูแลใหม่ ({newPhone})</label>
                                    <input
                                        type="text"
                                        placeholder="000000"
                                        value={newOtp}
                                        onChange={e => setNewOtp(e.target.value)}
                                        disabled={addLoading}
                                        maxLength={6}
                                        className="otp-input"
                                    />
                                </div>
                                <div className="modal-2-actions">
                                    <button
                                        className="btn-secondary"
                                        onClick={() => { setAddStep(1); setReqOtp(''); setNewOtp(''); }}
                                        disabled={addLoading}
                                    >
                                        ย้อนกลับ
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleConfirmAdmin}
                                        disabled={addLoading || !reqOtp.trim() || !newOtp.trim()}
                                    >
                                        {addLoading ? <Loader2 size={15} className="spin" /> : null}
                                        ยืนยัน
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembersPage;
