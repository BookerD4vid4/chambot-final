import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api';
import toast from 'react-hot-toast';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editCat, setEditCat] = useState(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const fetch = () => {
        setLoading(true);
        getCategories().then(r => setCategories(r.data.data || [])).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const openAdd = () => { setName(''); setEditCat(null); setModalOpen(true); };
    const openEdit = (c) => { setName(c.name); setEditCat(c); setModalOpen(true); };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editCat) { await updateCategory(editCat.category_id, { name }); toast.success('แก้ไขสำเร็จ'); }
            else { await createCategory({ name }); toast.success('เพิ่มหมวดหมู่สำเร็จ'); }
            setModalOpen(false); fetch();
        } catch { toast.error('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ลบหมวดหมู่นี้?')) return;
        try { await deleteCategory(id); toast.success('ลบสำเร็จ'); fetch(); }
        catch (err) { toast.error(err.response?.data?.message || 'ไม่สามารถลบได้'); }
    };

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">หมวดหมู่สินค้า</h1>
                    <p className="admin-page-subtitle">{categories.length} หมวดหมู่</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> เพิ่มหมวดหมู่</button>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 24 }}>
                        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 8 }} />)}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>#</th><th>ชื่อหมวดหมู่</th><th>วันที่สร้าง</th><th>จัดการ</th></tr></thead>
                        <tbody>
                            {categories.map((c, idx) => (
                                <tr key={c.category_id}>
                                    <td style={{ color: '#AA5DC6', fontWeight: 700, fontSize: 13 }}>{idx + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                        {c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.category_id)}><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                                    ยังไม่มีหมวดหมู่
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h2>
                            <button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="input-group">
                                <label className="input-label">ชื่อหมวดหมู่</label>
                                <input className="input-field" value={name} onChange={e => setName(e.target.value)} required placeholder="เช่น อาหาร, เครื่องดื่ม" autoFocus />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>ยกเลิก</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : 'บันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
