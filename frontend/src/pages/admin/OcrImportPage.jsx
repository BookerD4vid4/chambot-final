import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, ScanLine, CheckCircle, XCircle, AlertTriangle, Edit3, Save, Trash2, ChevronRight, ChevronLeft, RotateCcw, Eye } from 'lucide-react';
import { ocrScan, createProduct, adjustStock, getCategories } from '../../api';
import API from '../../api';
import toast from 'react-hot-toast';
import './OcrImportPage.css';

const formatPrice = (p) => p != null
    ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(p)
    : '—';

// ─── Status badges ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        idle: null,
        saving: <span className="ocr-item-status saving"><div className="spinner" style={{ width: 12, height: 12 }} /> กำลังบันทึก...</span>,
        success: <span className="ocr-item-status success"><CheckCircle size={13} /> บันทึกแล้ว</span>,
        error: (msg) => <span className="ocr-item-status error"><XCircle size={13} /> {msg}</span>,
    };
    if (!status || status.status === 'idle') return null;
    if (status.status === 'error') return map.error(status.msg);
    return map[status.status] || null;
};

const OcrImportPage = () => {
    const [step, setStep] = useState(1); // 1=upload, 2=review, 3=saving
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [items, setItems] = useState([]); // extracted products
    const [itemStatuses, setItemStatuses] = useState({}); // { idx: { status, msg } }
    const [editingIdx, setEditingIdx] = useState(null);
    const [saveResults, setSaveResults] = useState({ done: 0, success: 0, failed: 0 });
    const [saving, setSaving] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [categories, setCategories] = useState([]);
    const fileInputRef = useRef();

    useEffect(() => {
        getCategories().then(r => setCategories(r.data.data || [])).catch(() => {});
    }, []);

    // ─── File handling ─────────────────────────────────────────────────────
    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            toast.error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 20 MB) กรุณาลดขนาดรูปภาพก่อนอัปโหลด', { duration: 5000 });
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setItems([]);
        setItemStatuses({});
        setStep(1);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    }, []);

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);

    // ─── Scan ──────────────────────────────────────────────────────────────
    const handleScan = async () => {
        if (!imageFile) return;
        setScanning(true);
        try {
            const res = await ocrScan(imageFile);
            const data = res.data.data || [];
            if (data.length === 0) {
                toast('ไม่พบรายการสินค้าในรูปภาพ', { icon: '🔍' });
                return;
            }
            setItems(data.map((item, i) => ({ ...item, _id: i, _skip: false })));
            setItemStatuses({});
            setStep(2);
            toast.success(`พบ ${data.length} รายการสินค้า`);
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message;
            if (status === 413) {
                toast.error(msg || 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 20 MB) กรุณาลดขนาดรูปภาพก่อนอัปโหลด', { duration: 6000 });
            } else {
                toast.error(msg || 'วิเคราะห์รูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            }
        } finally {
            setScanning(false);
        }
    };

    // ─── Item editing ──────────────────────────────────────────────────────
    const updateItem = (idx, key, val) =>
        setItems(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));

    const toggleSkip = (idx) =>
        setItems(prev => prev.map((p, i) => i === idx ? { ...p, _skip: !p._skip } : p));

    // ─── Validation ─────────────────────────────────────────────────────────
    const getMissingPrice = () => items.filter(i => !i._skip && i.is_new && !(parseFloat(i.price) > 0));

    // ─── Save all ──────────────────────────────────────────────────────────
    const handleSaveAll = async () => {
        const toSave = items.filter(i => !i._skip);
        if (toSave.length === 0) { toast.error('เลือกสินค้าอย่างน้อย 1 รายการ'); return; }

        // Block save if any new item has no price
        const noPrice = getMissingPrice();
        if (noPrice.length > 0) {
            toast.error(`กรุณาใส่ราคาขายก่อนบันทึก (${noPrice.length} รายการ)`, { duration: 4000 });
            // Highlight problem items by auto-opening their edit form
            setEditingIdx(items.findIndex(i => i._id === noPrice[0]._id));
            return;
        }

        setSaving(true);
        setStep(3);
        let success = 0, failed = 0;

        for (const item of toSave) {
            const idx = item._id;
            setItemStatuses(prev => ({ ...prev, [idx]: { status: 'saving' } }));

            try {
                if (item.is_new) {
                    // Create new product + variant
                    await createProduct({
                        name: item.name,
                        description: item.description || '',
                        category_id: item.category_id ? Number(item.category_id) : null,
                        is_active: true,
                        variants: [{
                            sku: item.sku || '',
                            price: parseFloat(item.price) || 0,
                            stock_quantity: parseInt(item.stock_quantity) || 1,
                            unit: item.unit || '',
                            low_stock_threshold: 5,
                        }]
                    });
                } else {
                    // Adjust stock on existing variant
                    await adjustStock(
                        item.existing_variant_id,
                        parseInt(item.stock_quantity) || 1,
                        'OCR Import'
                    );
                }
                setItemStatuses(prev => ({ ...prev, [idx]: { status: 'success' } }));
                success++;
            } catch (err) {
                const msg = err.response?.data?.message || 'บันทึกไม่สำเร็จ';
                setItemStatuses(prev => ({ ...prev, [idx]: { status: 'error', msg } }));
                failed++;
            }

            setSaveResults(prev => ({ ...prev, done: prev.done + 1, success, failed }));
        }

        setSaving(false);
        if (failed === 0) {
            toast.success(`บันทึกสำเร็จทั้งหมด ${success} รายการ! 🎉`);
        } else {
            toast(`บันทึกสำเร็จ ${success} รายการ, ล้มเหลว ${failed} รายการ`, { icon: '⚠️' });
        }
    };

    const reset = () => {
        setStep(1); setImageFile(null); setImagePreview(null);
        setItems([]); setItemStatuses({}); setSaveResults({ done: 0, success: 0, failed: 0 });
        setSaving(false); setEditingIdx(null);
    };

    const activeItems = items.filter(i => !i._skip);

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div>
            <div className="admin-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link to="/admin/products" className="btn btn-secondary btn-sm" style={{ padding: 8 }}>
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="admin-page-title">📷 OCR นำเข้าสินค้า</h1>
                        <p className="admin-page-subtitle">วิเคราะห์รูปภาพด้วย Gemini AI เพื่อเพิ่มสินค้าอัตโนมัติ</p>
                    </div>
                </div>
                {step > 1 && (
                    <button className="btn btn-secondary" onClick={reset}><RotateCcw size={14} /> เริ่มใหม่</button>
                )}
            </div>

            {/* Progress Steps */}
            <div className="ocr-steps">
                {['อัปโหลดรูปภาพ', 'ตรวจสอบรายการ', 'บันทึกข้อมูล'].map((label, i) => (
                    <div key={i} className={`ocr-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                        <div className="ocr-step-circle">
                            {step > i + 1 ? <CheckCircle size={16} /> : i + 1}
                        </div>
                        <span>{label}</span>
                        {i < 2 && <ChevronRight size={16} className="ocr-step-arrow" />}
                    </div>
                ))}
            </div>

            {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
            {step === 1 && (
                <div className="ocr-upload-section">
                    <div
                        className={`ocr-dropzone ${dragOver ? 'drag-over' : ''} ${imagePreview ? 'has-image' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="preview" className="ocr-preview-img" />
                        ) : (
                            <div className="ocr-dropzone-inner">
                                <div className="ocr-drop-icon"><Upload size={36} /></div>
                                <p>ลากรูปมาวางหรือคลิกเพื่อเลือกไฟล์</p>
                                <span>รองรับ JPG, PNG, WEBP — สูงสุด 10MB</span>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => handleFile(e.target.files[0])}
                        />
                    </div>

                    {imagePreview && (
                        <div className="ocr-upload-actions">
                            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={14} /> เปลี่ยนรูป
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={handleScan} disabled={scanning}>
                                {scanning ? (
                                    <><div className="spinner" style={{ width: 18, height: 18 }} /> กำลังวิเคราะห์...</>
                                ) : (
                                    <><ScanLine size={18} /> วิเคราะห์ด้วย AI</>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="ocr-tips card">
                        <h4>💡 เคล็ดลับเพื่อให้ได้ผลดีที่สุด</h4>
                        <ul>
                            <li>รูปรายการสินค้า / ใบเสร็จ / คาตาล็อก — AI จะอ่านทีละรายการ</li>
                            <li>รูปสินค้าเดี่ยว — AI จะอ่านชื่อ ราคา และรายละเอียดจากป้าย</li>
                            <li>ภาพชัด ไม่เบลอ ได้ผลแม่นยำกว่า</li>
                            <li>รองรับทั้งภาษาไทยและอังกฤษ</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Review ────────────────────────────────────────────── */}
            {step === 2 && (
                <div className="ocr-review-section">
                    <div className="ocr-review-header card">
                        <div className="ocr-review-stats">
                            <div className="ocr-stat"><span>{items.length}</span><label>รายการทั้งหมด</label></div>
                            <div className="ocr-stat accent"><span>{activeItems.length}</span><label>จะบันทึก</label></div>
                            <div className="ocr-stat muted"><span>{items.filter(i => i._skip).length}</span><label>ข้ามรายการ</label></div>
                            <div className="ocr-stat new"><span>{activeItems.filter(i => i.is_new).length}</span><label>สินค้าใหม่</label></div>
                            <div className="ocr-stat stock"><span>{activeItems.filter(i => !i.is_new).length}</span><label>เพิ่มสต็อก</label></div>
                        </div>
                        <div>
                            <img src={imagePreview} alt="scanned" className="ocr-thumb" />
                        </div>
                    </div>

                    <div className="ocr-items-list">
                        {items.map((item, idx) => (
                            <div key={idx} className={`ocr-item-card card ${item._skip ? 'skipped' : ''} ${!item._skip && item.is_new && !(parseFloat(item.price) > 0) ? 'price-required' : ''}`}>
                                {/* Item Header */}
                                <div className="ocr-item-header">
                                    <div className="ocr-item-meta">
                                        <span className={`badge ${item.is_new ? 'badge-green' : 'badge-cyan'}`}>
                                            {item.is_new ? '✨ สินค้าใหม่' : '📦 เพิ่มสต็อก'}
                                        </span>
                                        {item.confidence === 'low' && (
                                            <span className="badge badge-orange"><AlertTriangle size={11} /> ความมั่นใจต่ำ</span>
                                        )}
                                        {!item.is_new && item.existing_product_name && (
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                ตรงกับ: {item.existing_product_name}
                                            </span>
                                        )}
                                        {/* Price required warning */}
                                        {!item._skip && item.is_new && !(parseFloat(item.price) > 0) && (
                                            <span className="badge badge-red"><AlertTriangle size={11} /> ต้องใส่ราคาขาย</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                                        >
                                            <Edit3 size={13} /> {editingIdx === idx ? 'ปิด' : 'แก้ไข'}
                                        </button>
                                        <button
                                            className={`btn btn-sm ${item._skip ? 'btn-primary' : 'btn-danger'}`}
                                            onClick={() => toggleSkip(idx)}
                                        >
                                            {item._skip ? '↩ ยกเลิกข้าม' : '✕ ข้ามรายการ'}
                                        </button>
                                    </div>
                                </div>

                                {/* ── EXISTING: show only stock ── */}
                                {!item.is_new && editingIdx !== idx && (
                                    <div className="ocr-item-summary">
                                        <div className="ocr-item-field-row">
                                            <div><label>สินค้า</label><p>{item.existing_product_name || item.name}</p></div>
                                            <div><label>ราคาปัจจุบัน</label><p style={{ color: '#AA5DC6', fontWeight: 700 }}>{item.existing_variant_price != null ? `฿${Number(item.existing_variant_price).toLocaleString()}` : '—'}</p></div>
                                            <div><label>สต็อกปัจจุบัน</label><p>{item.existing_variant_stock ?? '—'} {item.existing_variant_unit || ''}</p></div>
                                            <div><label>จำนวนที่จะเพิ่ม</label><p style={{ color: 'var(--cyan)', fontWeight: 700 }}>+{item.stock_quantity || 1}</p></div>
                                            <div><label>หลังเพิ่ม</label><p style={{ color: 'var(--accent)' }}>{(item.existing_variant_stock || 0) + (parseInt(item.stock_quantity) || 0)}</p></div>
                                        </div>
                                    </div>
                                )}

                                {/* ── NEW: show key info + price warning ── */}
                                {item.is_new && editingIdx !== idx && (
                                    <div className="ocr-item-summary">
                                        <div className="ocr-item-field-row">
                                            <div><label>ชื่อสินค้า</label><p>{item.name || '—'}</p></div>
                                            <div><label>SKU</label><p>{item.sku || '—'}</p></div>
                                            <div>
                                                <label>ราคาขาย *</label>
                                                <p className={!(parseFloat(item.price) > 0) ? 'price-missing' : ''} style={{ color: parseFloat(item.price) > 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>
                                                    {parseFloat(item.price) > 0 ? formatPrice(item.price) : '⚠ ยังไม่ได้ระบุ'}
                                                </p>
                                            </div>
                                            <div><label>จำนวนสต็อก</label><p>{item.stock_quantity} {item.unit || ''}</p></div>
                                        </div>
                                        {item.description && (
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{item.description}</p>
                                        )}
                                    </div>
                                )}

                                {/* Edit Form */}
                                {editingIdx === idx && (
                                    <div className="ocr-edit-form">
                                        {/* Existing product: stock qty only */}
                                        {!item.is_new ? (
                                            <div className="ocr-existing-stock-edit">
                                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    สินค้านี้มีในระบบแล้ว — ระบุจำนวนที่ต้องการเพิ่ม
                                                </p>
                                                <div className="input-group" style={{ maxWidth: 200 }}>
                                                    <label className="input-label">จำนวนที่จะเพิ่ม *</label>
                                                    <input type="number" className="input-field" min={1}
                                                        value={item.stock_quantity || 1}
                                                        onChange={e => updateItem(idx, 'stock_quantity', e.target.value)} />
                                                </div>
                                                <p style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 8 }}>
                                                    สต็อกหลังเพิ่ม: {(item.existing_variant_stock || 0) + (parseInt(item.stock_quantity) || 0)}
                                                </p>
                                            </div>
                                        ) : (
                                            /* New product: full form, price required */
                                            <>
                                                <div className="form-row">
                                                    <div className="input-group">
                                                        <label className="input-label">ชื่อสินค้า *</label>
                                                        <input className="input-field" value={item.name || ''} onChange={e => updateItem(idx, 'name', e.target.value)} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">SKU</label>
                                                        <input className="input-field" value={item.sku || ''} onChange={e => updateItem(idx, 'sku', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="form-row">
                                                    <div className="input-group">
                                                        <label className="input-label">หมวดหมู่</label>
                                                        <select className="input-field" value={item.category_id || ''} onChange={e => updateItem(idx, 'category_id', e.target.value)}>
                                                            <option value="">-- ไม่ระบุ --</option>
                                                            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">แบรนด์</label>
                                                        <input className="input-field" value={item.brand || ''} onChange={e => updateItem(idx, 'brand', e.target.value)} placeholder="เช่น Olay, Unilever" />
                                                    </div>
                                                </div>
                                                <div className="form-row">
                                                    <div className="input-group">
                                                        <label className="input-label price-required-label">ราคาขาย (บาท) <span className="required-star">*</span></label>
                                                        <input
                                                            type="number" min={0}
                                                            className={`input-field ${!(parseFloat(item.price) > 0) ? 'input-error' : ''}`}
                                                            placeholder="ต้องระบุ"
                                                            value={item.price || ''}
                                                            onChange={e => updateItem(idx, 'price', e.target.value)}
                                                        />
                                                        {!(parseFloat(item.price) > 0) && (
                                                            <span className="input-hint-error">⚠ กรุณาระบุราคาขายก่อนบันทึก</span>
                                                        )}
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">จำนวนสต็อกเริ่มต้น</label>
                                                        <input type="number" className="input-field" min={1}
                                                            value={item.stock_quantity || 1}
                                                            onChange={e => updateItem(idx, 'stock_quantity', e.target.value)} />
                                                    </div>
                                                    <div className="input-group">
                                                        <label className="input-label">หน่วย</label>
                                                        <input className="input-field" value={item.unit || ''} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="ชิ้น / กล่อง / kg" />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label className="input-label">รายละเอียด</label>
                                                    <textarea className="input-field" rows={2} value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="ocr-review-footer">
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>← กลับ</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {getMissingPrice().length > 0 && (
                                <span className="ocr-save-block-hint">
                                    <AlertTriangle size={14} /> ยังมี {getMissingPrice().length} รายการที่ยังไม่ได้ใส่ราคาขาย
                                </span>
                            )}
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleSaveAll}
                                disabled={activeItems.length === 0 || getMissingPrice().length > 0}
                            >
                                <Save size={16} /> บันทึก {activeItems.length} รายการ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Saving / Results ──────────────────────────────────── */}
            {step === 3 && (
                <div className="ocr-results-section">
                    {/* Progress */}
                    {saving && (
                        <div className="ocr-progress-bar-wrap card">
                            <div className="ocr-progress-info">
                                <span>กำลังบันทึก... {saveResults.done} / {activeItems.length}</span>
                                <span>{Math.round((saveResults.done / activeItems.length) * 100)}%</span>
                            </div>
                            <div className="ocr-progress-track">
                                <div
                                    className="ocr-progress-fill"
                                    style={{ width: `${(saveResults.done / activeItems.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {!saving && (
                        <div className="ocr-result-summary card">
                            <div className="ocr-result-summary-stats">
                                <div className="ocr-stat success">
                                    <span>{saveResults.success}</span><label>บันทึกสำเร็จ</label>
                                </div>
                                <div className="ocr-stat error">
                                    <span>{saveResults.failed}</span><label>ล้มเหลว</label>
                                </div>
                                <div className="ocr-stat muted">
                                    <span>{items.filter(i => i._skip).length}</span><label>ข้ามรายการ</label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                                <button className="btn btn-secondary" onClick={reset}><RotateCcw size={14} /> นำเข้าใหม่</button>
                                <Link to="/admin/products" className="btn btn-primary">ดูรายการสินค้า →</Link>
                            </div>
                        </div>
                    )}

                    {/* Per-item result list */}
                    <div className="ocr-items-list">
                        {items.filter(i => !i._skip).map((item, idx) => {
                            const st = itemStatuses[item._id];
                            return (
                                <div key={idx} className={`ocr-item-card card ${st?.status === 'error' ? 'item-error' : st?.status === 'success' ? 'item-success' : ''}`}>
                                    <div className="ocr-item-header">
                                        <div>
                                            <p style={{ fontWeight: 600 }}>{item.name}</p>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {item.sku && `SKU: ${item.sku} · `}
                                                {formatPrice(item.price)} · {item.stock_quantity} {item.unit || ''}
                                            </p>
                                        </div>
                                        <StatusBadge status={st} />
                                    </div>
                                    {st?.status === 'error' && (
                                        <div className="ocr-error-detail">
                                            <AlertTriangle size={13} /> {st.msg}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OcrImportPage;
