import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, RotateCcw, AlertTriangle, TrendingDown, TrendingUp,
    X, Minus, Plus, Layers, Package, History, CheckSquare, Square,
    PackageX, Filter
} from 'lucide-react';
import { getAllVariants, adjustStock, getCategories, getStockHistory } from '../../api';
import ProductImage from '../../components/ProductImage';
import toast from 'react-hot-toast';
import './StockPage.css';

/* ─── Helpers ────────────────────────────────────────────── */
const stockLevel = (qty, threshold) => {
    if (qty === 0) return 'empty';
    if (qty <= threshold) return 'low';
    return 'ok';
};

const StockBadge = ({ qty, threshold }) => {
    const level = stockLevel(qty, threshold);
    const cfg = {
        ok: { cls: 'badge badge-green', label: qty },
        low: { cls: 'badge badge-orange', label: `${qty} ⚠` },
        empty: { cls: 'badge badge-red', label: '0 (หมด)' },
    };
    return <span className={cfg[level].cls}>{cfg[level].label}</span>;
};

const REASONS = [
    { value: 'add', label: '📥 เพิ่มสต็อก (รับสินค้าเข้า)', sign: 'positive' },
    { value: 'set', label: '🔧 ปรับจำนวน (นับจำนวนใหม่)', sign: 'any' },
    { value: 'remove', label: '📤 นำสินค้าออก (สูญหาย/ชำรุด)', sign: 'negative' },
];

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ─── History Drawer ─────────────────────────────────────── */
const HistoryDrawer = ({ variant, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStockHistory(variant.variant_id)
            .then(r => setHistory(r.data.data || []))
            .catch(() => toast.error('โหลดประวัติไม่สำเร็จ'))
            .finally(() => setLoading(false));
    }, [variant.variant_id]);

    return (
        <div className="history-drawer-overlay" onClick={onClose}>
            <div className="history-drawer" onClick={e => e.stopPropagation()}>
                <div className="history-drawer-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <History size={18} style={{ color: 'var(--accent)' }} />
                        <div>
                            <div className="history-drawer-title">ประวัติสต็อก</div>
                            <div className="history-drawer-sub">{variant.product_name} · {variant.sku}</div>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="history-drawer-body">
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 58, borderRadius: 10, marginBottom: 8 }} />
                        ))
                    ) : history.length === 0 ? (
                        <div className="history-empty">
                            <History size={36} />
                            <p>ยังไม่มีประวัติการปรับสต็อก</p>
                        </div>
                    ) : (
                        history.filter(h => h.transaction_type !== 'purchase').map(h => (
                            <div key={h.id} className={`history-item ${h.quantity_change >= 0 ? 'pos' : 'neg'}`}>
                                <div className={`history-delta ${h.quantity_change >= 0 ? 'pos' : 'neg'}`}>
                                    {h.quantity_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {h.quantity_change >= 0 ? '+' : ''}{h.quantity_change}
                                </div>
                                <div className="history-info">
                                    <div className="history-notes">{h.notes || h.transaction_type}</div>
                                    <div className="history-meta">
                                        <span>{h.quantity_before} → {h.quantity_after}</span>
                                        <span className="dot">·</span>
                                        <span>{formatDate(h.created_at)}</span>
                                        {(h.performed_by_name || h.performed_by_phone) && (
                                            <span className="history-admin-badge" title={h.performed_by_phone}>
                                                👤 {h.performed_by_name || h.performed_by_phone}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Adjust Modal (single item) ────────────────────── */
const AdjustModal = ({ variant, onClose, onSuccess }) => {
    const [inputValue, setInputValue] = useState(0);
    const [reason, setReason] = useState('add');
    const [saving, setSaving] = useState(false);
    const [summaryResult, setSummaryResult] = useState(null);
    const [inputError, setInputError] = useState('');

    const currentQty = variant.stock_quantity ?? 0;

    const calculateDelta = () => {
        const val = Number(inputValue);
        if (reason === 'set') {
            return val - currentQty;
        }
        if (reason === 'remove') {
            return -Math.abs(val);
        }
        return Math.abs(val);
    };

    const handleSave = async () => {
        const val = Number(inputValue);
        if (val < 0 && (reason === 'restock' || reason === 'lost' || reason === 'return')) {
             setInputError('กรุณากรอกเป็นบวก ระบบจะจัดการทิศทางให้เอง');
             return;
        }
        
        const delta = calculateDelta();
        if (delta === 0 && reason !== 'set') {
            setInputError('กรุณาระบุจำนวนที่ต้องการปรับ');
            return;
        }

        setInputError('');
        setSaving(true);
        const reasonLabel = REASONS.find(r => r.value === reason)?.label || reason;
        try {
            await adjustStock(variant.variant_id, delta, reasonLabel);
            setSummaryResult([{
                product_name: variant.product_name,
                sku: variant.sku,
                before: currentQty,
                delta,
                after: Math.max(0, currentQty + delta),
                ok: true,
            }]);
            onSuccess();
        } catch (err) {
            const errMsg = err.response?.data?.message || 'เกิดข้อผิดพลาด';
            setSummaryResult([{
                product_name: variant.product_name,
                sku: variant.sku,
                before: currentQty,
                delta,
                after: null,
                ok: false,
                error: errMsg
            }]);
        } finally {
            setSaving(false);
        }
    };

    if (summaryResult) {
        return <SummaryModal results={summaryResult} onClose={onClose} />;
    }

    const delta = calculateDelta();
    const newQty = Math.max(0, currentQty + delta);

    // Dynamic labels based on reason
    const getLabels = () => {
        switch(reason) {
            case 'set': return { input: 'จำนวนที่นับได้จริง (สต็อกใหม่)', btn: 'ปรับเป็น', icon: <History size={15} /> };
            case 'remove': return { input: 'จำนวนที่นำออก (-)', btn: 'บันทึกการนำออก', icon: <TrendingDown size={15} /> };
            default: return { input: 'จำนวนที่เพิ่มเข้า (+)', btn: 'บันทึกรับเข้า', icon: <TrendingUp size={15} /> };
        }
    };
    const labels = getLabels();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box stock-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="stock-modal-title">
                        <Layers size={18} style={{ color: 'var(--accent)' }} />
                        <h2>จัดการสต็อก</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* Product Info */}
                    <div className="stock-modal-info">
                        <div className="stock-modal-img">
                            <ProductImage src={variant.image_url} alt={variant.product_name} size={22} />
                        </div>
                        <div>
                            <p className="stock-modal-name">{variant.product_name}</p>
                            <p className="stock-modal-sku">{variant.sku}{variant.unit ? ` · ${variant.unit}` : ''}</p>
                        </div>
                    </div>

                    {/* Before → After */}
                    <div className="stock-qty-summary">
                        <div className="stock-qty-item">
                            <span className="stock-qty-label">เดิม</span>
                            <span className="stock-qty-value">{currentQty}</span>
                        </div>
                        <div className="stock-qty-arrow">→</div>
                        <div className="stock-qty-item">
                            <span className="stock-qty-label">สต็อกใหม่</span>
                            <span className={`stock-qty-value ${newQty !== currentQty ? 'changed' : ''}`}>{newQty}</span>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="input-group">
                        <label className="input-label" style={{ fontSize: 12, textTransform: 'uppercase' }}>เลือกประเภทการทำรายการ</label>
                        <select className="input-field" value={reason} onChange={e => { setReason(e.target.value); setInputValue(0); setInputError(''); }}>
                            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {/* Value Input */}
                    <div className="input-group" style={{ marginTop: 8 }}>
                        <label className="input-label">{labels.input}</label>
                        <div className="stock-delta-row">
                            <button type="button" className="btn btn-secondary stock-delta-btn"
                                onClick={() => { setInputValue(v => Math.max(0, v - 1)); setInputError(''); }}><Minus size={16} /></button>
                            <input type="number" className="input-field stock-delta-input"
                                style={inputError ? { borderColor: '#f87171' } : {}}
                                value={inputValue}
                                onChange={e => { setInputValue(Number(e.target.value)); setInputError(''); }} />
                            <button type="button" className="btn btn-secondary stock-delta-btn"
                                onClick={() => { setInputValue(v => v + 1); setInputError(''); }}><Plus size={16} /></button>
                        </div>
                        {inputError && <div className="error-text" style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>{inputError}</div>}
                    </div>

                    {/* Quick Presets */}
                    <div className="stock-preset-section">
                        <div className="stock-preset-label">ทางลัดตัวเลข</div>
                        <div className="stock-preset-row">
                            {[1, 5, 10, 20, 50, 100].map(n => (
                                <button key={n} type="button" className="btn btn-outline btn-sm" onClick={() => setInputValue(n)}>{reason === 'adjustment' ? n : `+${n}`}</button>
                            ))}
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setInputValue(0)}>รีเซ็ต</button>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
                        <button type="button"
                            className={`btn ${reason === 'lost' ? 'btn-danger' : 'btn-primary'}`}
                            onClick={handleSave} disabled={saving}>
                            {saving
                                ? <div className="spinner" style={{ width: 16, height: 16 }} />
                                : <>{labels.icon} {labels.btn} {reason === 'set' ? inputValue : (reason === 'remove' ? `-${inputValue}` : `+${inputValue}`)}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Summary Modal (shown after save) ──────────────────── */
const SummaryModal = ({ results, onClose }) => {
    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box summary-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '22px 28px 18px' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                        {failed.length === 0 ? '✅ บันทึกสำเร็จทั้งหมด' : `⚠️ บันทึกแล้ว ${succeeded.length}/${results.length} รายการ`}
                    </h2>
                    <button className="modal-close" onClick={onClose}><X size={22} /></button>
                </div>
                <div className="modal-body" style={{ padding: '0 28px 8px', maxHeight: '60vh', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 14 }}>
                        <thead>
                            <tr>
                                <th>สินค้า</th>
                                <th style={{ textAlign: 'center' }}>ก่อน</th>
                                <th style={{ textAlign: 'center' }}>ปรับ</th>
                                <th style={{ textAlign: 'center' }}>หลัง</th>
                                <th style={{ textAlign: 'center' }}>ผลลัพธ์</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.product_name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.sku}</div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.before}</td>
                                    <td style={{
                                        textAlign: 'center', fontWeight: 800,
                                        color: r.delta > 0 ? '#4ade80' : r.delta < 0 ? '#f87171' : 'var(--text-muted)'
                                    }}>
                                        {r.delta > 0 ? `+${r.delta}` : r.delta}
                                    </td>
                                    <td style={{
                                        textAlign: 'center', fontWeight: 800,
                                        color: r.ok ? 'rgba(31, 30, 30, 0.9)' : '#f87171'
                                    }}>
                                        {r.ok ? r.after : '—'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {r.ok
                                            ? <span className="badge badge-green">สำเร็จ</span>
                                            : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                    <span className="badge badge-red">ผิดพลาด</span>
                                                    {r.error && (
                                                        <div style={{ 
                                                            fontSize: 11, 
                                                            color: '#f87171', 
                                                            maxWidth: 240, 
                                                            lineHeight: 1.4,
                                                            textAlign: 'center',
                                                            wordBreak: 'break-word',
                                                            background: 'rgba(248, 113, 113, 0.05)',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            marginTop: '4px'
                                                        }}>
                                                            {r.error}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="modal-footer" style={{ padding: '16px 28px 22px' }}>
                    <button className="btn btn-primary" style={{ minHeight: 48, fontSize: 16, flex: 1 }}
                        onClick={onClose}>ปิด</button>
                </div>
            </div>
        </div>
    );
};

/* ─── Bulk Adjust Modal (per-item editing) ────────────── */
const BulkModal = ({ selected, onClose, onSuccess }) => {
    // deltas[variant_id] = number
    const [deltas, setDeltas] = useState(() => {
        const init = {};
        selected.forEach(v => { init[v.variant_id] = 0; });
        return init;
    });
    const [reason, setReason] = useState('add');
    const [saving, setSaving] = useState(false);
    const [summaryResults, setSummaryResults] = useState(null);

    const affectedCount = Object.values(deltas).filter(d => d !== 0).length;

    // Quick-set all items the same delta
    const applyAll = (d) => {
        const next = {};
        selected.forEach(v => { next[v.variant_id] = d; });
        setDeltas(next);
    };

    const handleSave = async () => {
        // ★ UAT: all deltas = 0 must be blocked — no API call
        if (affectedCount === 0 && reason !== 'set') {
            toast.error('กรุณาระบุจำนวนที่ต้องการปรับอย่างน้อย 1 รายการ');
            return; // no API call
        }
        setSaving(true);
        const reasonLabel = REASONS.find(r => r.value === reason)?.label || reason;
        const results = [];
        await Promise.all(
            selected.map(async v => {
                const d = deltas[v.variant_id];
                if (d === undefined || (d === 0 && reason !== 'set')) {
                    results.push({ product_name: v.product_name, sku: v.sku, before: v.stock_quantity, delta: 0, after: v.stock_quantity, ok: true });
                    return;
                }
                try {
                    const finalDelta = reason === 'set' ? (d - (v.stock_quantity || 0)) : d;
                    if (finalDelta === 0 && reason !== 'set') {
                        results.push({ product_name: v.product_name, sku: v.sku, before: v.stock_quantity, delta: 0, after: v.stock_quantity, ok: true });
                        return;
                    }
                    await adjustStock(v.variant_id, finalDelta, reasonLabel);
                    results.push({ product_name: v.product_name, sku: v.sku, before: v.stock_quantity, delta: finalDelta, after: Math.max(0, (v.stock_quantity ?? 0) + finalDelta), ok: true });
                } catch (err) {
                    const errMsg = err.response?.data?.message || 'เกิดข้อผิดพลาด';
                    results.push({ product_name: v.product_name, sku: v.sku, before: v.stock_quantity, delta: d, after: null, ok: false, error: errMsg });
                }
            })
        );
        setSaving(false);
        setSummaryResults(results.filter(r => r.delta !== 0 || reason === 'set'));
        onSuccess();
    };

    if (summaryResults) {
        return <SummaryModal results={summaryResults} onClose={onClose} />;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box bulk-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '20px 24px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckSquare size={20} style={{ color: 'var(--accent)' }} />
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                            ปรับสต็อก {selected.length} รายการ
                        </h2>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ padding: '0 24px 8px' }}>
                    {/* Reason */}
                    <div className="input-group" style={{ marginBottom: 14 }}>
                        <label className="input-label">เหตุผลการปรับสต็อก</label>
                        <select className="input-field" value={reason} onChange={e => setReason(e.target.value)}>
                            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {/* Quick Apply All */}
                    <div style={{ marginBottom: 14 }}>
                        <div className="stock-preset-label" style={{ marginBottom: 6 }}>
                            {reason === 'set' ? 'ตั้งค่าจำนวนทั้งหมดเป็น' : reason === 'remove' ? 'นำออกทั้งหมดรายการละ' : 'เพิ่มเข้าทั้งหมดรายการละ'}
                        </div>
                        <div className="stock-preset-row" style={{ flexWrap: 'wrap' }}>
                            {[1, 5, 10, 20, 50, 100].map(n => (
                                <button key={n} type="button" className="btn btn-outline btn-sm" onClick={() => applyAll(reason === 'remove' ? -n : n)}>
                                    {reason === 'set' ? n : (reason === 'remove' ? `-${n}` : `+${n}`)}
                                </button>
                            ))}
                            {reason !== 'set' && [-1, -5, -10].map(n => (
                                <button key={n} type="button" className="btn btn-outline btn-sm stock-preset-minus" onClick={() => applyAll(reason === 'remove' ? Math.abs(n) : n)}>
                                    {reason === 'remove' ? `+${Math.abs(n)}` : n}
                                </button>
                            ))}
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyAll(0)}>รีเซ็ตทั้งหมด</button>
                        </div>
                    </div>

                    {/* Per-item table */}
                    <div style={{ maxHeight: '50vh', overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(170,93,198,0.12)' }}>
                        <table className="data-table" style={{ fontSize: 14 }}>
                            <thead>
                                <tr>
                                    <th>สินค้า</th>
                                    <th style={{ textAlign: 'center', width: 90 }}>สต็อกปัจจุบัน</th>
                                    <th style={{ textAlign: 'center', width: 160 }}>{reason === 'set' ? 'กำหนดจำนวน' : 'ปรับจำนวน'}</th>
                                    <th style={{ textAlign: 'center', width: 100 }}>หลังปรับ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.map(v => {
                                    const d = deltas[v.variant_id] ?? 0;
                                    const after = Math.max(0, (v.stock_quantity ?? 0) + d);
                                    return (
                                        <tr key={v.variant_id} style={{ background: d !== 0 ? 'rgba(170,93,198,0.06)' : undefined }}>
                                            <td>
                                                <div style={{ fontWeight: 700, fontSize: 14 }}>{v.product_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.sku}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
                                                {v.stock_quantity ?? 0}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                                    <button type="button" className="threshold-btn"
                                                        onClick={() => setDeltas(prev => ({ ...prev, [v.variant_id]: (prev[v.variant_id] ?? 0) - 1 }))}>−</button>
                                                    <input
                                                        type="number"
                                                        value={d}
                                                        onChange={e => setDeltas(prev => ({ ...prev, [v.variant_id]: Number(e.target.value) }))}
                                                        style={{ width: 64, textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(170,93,198,0.2)', borderRadius: 8, color: d > 0 ? '#4ade80' : d < 0 ? '#f87171' : 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 700, padding: '4px 0', fontFamily: 'inherit' }}
                                                    />
                                                    <button type="button" className="threshold-btn"
                                                        onClick={() => setDeltas(prev => ({ ...prev, [v.variant_id]: (prev[v.variant_id] ?? 0) + 1 }))}>+</button>
                                                </div>
                                            </td>
                                            <td style={{
                                                textAlign: 'center', fontWeight: 800, fontSize: 16,
                                                color: d > 0 ? '#4ade80' : d < 0 ? '#f87171' : 'rgba(255,255,255,0.5)'
                                            }}>
                                                {after}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: '16px 24px 22px', gap: 12 }}>
                    <button className="btn btn-secondary" style={{ minHeight: 48, fontSize: 15 }}
                        onClick={onClose}>ยกเลิก</button>
                    <button
                        className={`btn ${affectedCount > 0 ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ minHeight: 48, fontSize: 15, flex: 1, gap: 8 }}
                        onClick={handleSave}
                        disabled={saving || affectedCount === 0}>
                        {saving
                            ? <><div className="spinner" style={{ width: 18, height: 18 }} /> กำลังบันทึก...</>
                            : <>{affectedCount > 0 ? `💾 บันทึก ${affectedCount} รายการ` : 'กรุณาระบุจำนวน'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Page ─────────────────────────────────────────── */
const StockPage = () => {
    const [variants, setVariants] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStockState, setFilterStockState] = useState('all'); // all, low, out
    const [filterCategory, setFilterCategory] = useState('');
    const [adjustTarget, setAdjustTarget] = useState(null);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [bulkOpen, setBulkOpen] = useState(false);

    const fetchVariants = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterCategory) params.category = filterCategory;
            const res = await getAllVariants(params);
            setVariants(res.data.data || []);
        } catch {
            toast.error('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    }, [filterCategory]);

    useEffect(() => {
        getCategories().then(r => setCategories(r.data.data || [])).catch(() => { });
    }, []);

    useEffect(() => {
        fetchVariants();
        setSelected(new Set());
    }, [fetchVariants]);

    const filtered = variants.filter(v => {
        const q = search.toLowerCase();
        const matchSearch =
            (v.product_name || '').toLowerCase().includes(q) ||
            (v.sku || '').toLowerCase().includes(q);
        const matchStock = (() => {
            if (filterStockState === 'low') return stockLevel(v.stock_quantity, v.low_stock_threshold) === 'low';
            if (filterStockState === 'out') return v.stock_quantity === 0;
            return true;
        })();
        return matchSearch && matchStock;
    });

    // Stats
    const totalSku = variants.length;
    const outOfStock = variants.filter(v => v.stock_quantity === 0).length;
    const lowStock = variants.filter(v => stockLevel(v.stock_quantity, v.low_stock_threshold) === 'low').length;

    // Selection
    const toggleSelect = (v) => setSelected(prev => {
        const s = new Set(prev);
        s.has(v.variant_id) ? s.delete(v.variant_id) : s.add(v.variant_id);
        return s;
    });
    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map(v => v.variant_id)));
    };

    const selectedVariants = variants.filter(v => selected.has(v.variant_id));

    return (
        <div>
            {/* ── Header ── */}
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">จัดการสต็อก</h1>
                    <p className="admin-page-subtitle">
                        {totalSku} SKU
                        {lowStock > 0 && (
                            <span className="stock-low-badge">
                                <AlertTriangle size={12} /> {lowStock} สต็อกต่ำ
                            </span>
                        )}
                        {outOfStock > 0 && (
                            <span className="stock-empty-badge">
                                <PackageX size={12} /> {outOfStock} หมด
                            </span>
                        )}
                    </p>
                </div>
                <div className="products-actions">
                    {/* Category Filter */}
                    <div className="admin-search-wrap" style={{ gap: 6, padding: '6px 12px' }}>
                        <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <select
                            className="admin-search-input"
                            value={filterCategory}
                            onChange={e => { setFilterCategory(e.target.value); setSelected(new Set()); }}
                            style={{ width: 140, cursor: 'pointer' }}
                        >
                            <option value="">ทุกหมวดหมู่</option>
                            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                        </select>
                    </div>
                    {/* Search */}
                    <div className="admin-search-wrap">
                        <Search size={14} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นหาสินค้า / SKU..."
                            className="admin-search-input"
                        />
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={fetchVariants} title="รีเฟรช">
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* ── Stats Bar ── */}
            <div className="stock-stats-bar">
                <div className={`stock-stat-card ${filterStockState === 'all' ? 'active' : ''}`}
                    onClick={() => { setFilterStockState('all'); setSelected(new Set()); }}
                    style={{ cursor: 'pointer' }}>
                    <Package size={20} className="stat-icon stat-icon-blue" />
                    <div>
                        <div className="stat-val">{totalSku}</div>
                        <div className="stat-lbl">Total SKUs</div>
                    </div>
                </div>
                <div className={`stock-stat-card ${filterStockState === 'low' ? 'active' : ''}`}
                    onClick={() => { setFilterStockState('low'); setSelected(new Set()); }}
                    style={{ cursor: 'pointer' }}>
                    <AlertTriangle size={20} className="stat-icon stat-icon-orange" />
                    <div>
                        <div className="stat-val" style={{ color: lowStock > 0 ? '#fb923c' : 'inherit' }}>{lowStock}</div>
                        <div className="stat-lbl">Low Stock</div>
                    </div>
                </div>
                <div className={`stock-stat-card ${filterStockState === 'out' ? 'active' : ''}`}
                    onClick={() => { setFilterStockState('out'); setSelected(new Set()); }}
                    style={{ cursor: 'pointer' }}>
                    <PackageX size={20} className="stat-icon stat-icon-red" />
                    <div>
                        <div className="stat-val" style={{ color: outOfStock > 0 ? '#f87171' : 'inherit' }}>{outOfStock}</div>
                        <div className="stat-lbl">Out of Stock</div>
                    </div>
                </div>
                <div className="stock-stat-card" style={{ cursor: 'default' }}>
                    <TrendingUp size={20} className="stat-icon stat-icon-green" />
                    <div>
                        <div className="stat-val">{variants.reduce((s, v) => s + (v.stock_quantity || 0), 0).toLocaleString()}</div>
                        <div className="stat-lbl">Total Units</div>
                    </div>
                </div>
            </div>

            {/* ── Bulk Toolbar ── */}
            {selected.size > 0 && (
                <div className="bulk-toolbar">
                    <span className="bulk-count">{selected.size} รายการที่เลือก</span>
                    <button className="btn btn-primary btn-sm" onClick={() => setBulkOpen(true)}>
                        <Layers size={14} /> Bulk Adjust
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
                        <X size={14} /> ยกเลิก
                    </button>
                </div>
            )}

            {/* ── Table ── */}
            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 24 }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />
                        ))}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>
                                    <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                        {selected.size === filtered.length && filtered.length > 0
                                            ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                                            : <Square size={16} />}
                                    </button>
                                </th>
                                <th>รูป</th>
                                <th>ชื่อสินค้า / SKU</th>
                                <th>หน่วย</th>
                                <th>หมวดหมู่</th>
                                <th>สต็อก</th>
                                <th>เกณฑ์ต่ำสุด</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(v => {
                                const level = stockLevel(v.stock_quantity, v.low_stock_threshold);
                                const isSelected = selected.has(v.variant_id);
                                return (
                                    <tr key={v.variant_id}
                                        className={`stock-row stock-row-${level} ${isSelected ? 'stock-row-selected' : ''}`}
                                        onClick={() => toggleSelect(v)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td onClick={e => e.stopPropagation()}>
                                            <button onClick={() => toggleSelect(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                                {isSelected
                                                    ? <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                                                    : <Square size={16} />}
                                            </button>
                                        </td>
                                        <td>
                                            <div className="product-thumb">
                                                <ProductImage src={v.image_url} alt={v.product_name} />
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{v.product_name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.sku}</div>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{v.unit || '—'}</td>
                                        <td>
                                            {v.category_name
                                                ? <span className="badge badge-cyan">{v.category_name}</span>
                                                : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td>
                                            <StockBadge qty={v.stock_quantity} threshold={v.low_stock_threshold} />
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{v.low_stock_threshold}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                                <button className="btn btn-secondary btn-sm"
                                                    onClick={() => setAdjustTarget(v)}
                                                    title="ปรับสต็อก">
                                                    <Layers size={13} /> ปรับ
                                                </button>
                                                <button className="btn btn-secondary btn-sm"
                                                    onClick={() => setHistoryTarget(v)}
                                                    title="ประวัติ">
                                                    <History size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
                                        <Package size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                                        ไม่พบข้อมูลสต็อก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Modals ── */}
            {adjustTarget && (
                <AdjustModal
                    variant={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={fetchVariants}
                />
            )}
            {historyTarget && (
                <HistoryDrawer
                    variant={historyTarget}
                    onClose={() => setHistoryTarget(null)}
                />
            )}
            {bulkOpen && (
                <BulkModal
                    selected={selectedVariants}
                    onClose={() => setBulkOpen(false)}
                    onSuccess={() => { fetchVariants(); setSelected(new Set()); }}
                />
            )}
        </div>
    );
};

export default StockPage;
