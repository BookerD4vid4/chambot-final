import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, MapPin, Phone, User, CheckCircle } from 'lucide-react';
import { createOrder, getImageUrl, getMyAddresses, addMyAddress, getDeliverySettings } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

const formatPrice = (p) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(p);

// [DELETED] PAYMENT_METHODS (COD Only)

const CheckoutPage = () => {
    const { items, totalPrice, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: user?.name || user?.full_name || '', phone: user?.phone || user?.phone_number || '',
        payment_method: 'cod'
    });
    
    // Address management
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [isAddingAddr, setIsAddingAddr] = useState(false);
    const [newAddr, setNewAddr] = useState({ recipient_name: '', address_line: '', district: '', province: '', postal_code: '' });
    const [loading, setLoading] = useState(false);
    const [deliverySettings, setDeliverySettings] = useState(null);
    const checkoutSuccessRef = useRef(false);

    const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    // Address validation helper
    const isAddressAllowed = (addr, settings) => {
        if (!settings || !settings.is_locked) return true;
        if (settings.province && addr.province !== settings.province) return false;
        if (settings.postal_code && addr.postal_code !== settings.postal_code) return false;
        return true;
    };

    // Load addresses and settings
    useEffect(() => {
        const fetchData = async () => {
            try {
                const settingsRes = await getDeliverySettings();
                const settingsData = settingsRes.data.success ? settingsRes.data.data : null;
                setDeliverySettings(settingsData);

                if (user) {
                    const addrRes = await getMyAddresses();
                    const addrs = addrRes.data.data || [];
                    setAddresses(addrs);
                    
                    // Auto-select first VALID address
                    const validAddr = addrs.find(a => isAddressAllowed(a, settingsData));
                    if (validAddr) setSelectedAddressId(validAddr.address_id);
                    else setSelectedAddressId(null);
                }
            } catch (err) {
                console.error("Failed to load checkout data", err);
            }
        };
        fetchData();
    }, [user]);

    const handleAddAddress = async () => {
        if (!newAddr.recipient_name.trim() || !newAddr.address_line.trim())
            return toast.error('กรุณากรอกชื่อผู้รับและที่อยู่');
        try {
            const res = await addMyAddress(newAddr);
            const added = res.data.data;
            setAddresses(prev => [added, ...prev]);
            setSelectedAddressId(added.address_id);
            setIsAddingAddr(false);
            setNewAddr({ recipient_name: '', address_line: '', district: '', province: '', postal_code: '' });
            toast.success('เพิ่มที่อยู่แล้ว');
        } catch {
            toast.error('ไม่สามารถเพิ่มที่อยู่ได้');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 1. Validate Delivery Info (Phone/Name)
        if (!form.name || !form.phone) return toast.error('กรุณากรอกชื่อและเบอร์โทรศัพท์');

        // 2. Resolve final address string
        let addressString = '';
        if (selectedAddressId) {
            // Existing DB address
            const selected = addresses.find(a => a.address_id === selectedAddressId);
            if (!selected) return toast.error('กรุณาเลือกที่อยู่จัดส่ง');
            
            // Re-verify validity before submit
            if (!isAddressAllowed(selected, deliverySettings)) {
                return toast.error('ที่อยู่นี้อยู่นอกพื้นที่จัดส่ง กรุณาเลือกที่อยู่อื่น');
            }

            addressString = `${selected.recipient_name} | ${form.phone} | ${selected.address_line} ${selected.district || ''} ${selected.province} ${selected.postal_code}`.trim();
        } else {
            // New address validation
            if (!isAddressAllowed(newAddr, deliverySettings)) {
                return toast.error('ที่อยู่ใหม่ที่ระบุอยู่นอกพื้นที่จัดส่ง');
            }
            if (!newAddr.address_line) {
                if (isAddingAddr) return toast.error('กรุณาบันทึกที่อยู่จัดส่งใหม่ก่อน');
                return toast.error('กรุณาเลือกหรือเพิ่มที่อยู่จัดส่ง');
            }
            addressString = `${newAddr.recipient_name} | ${form.phone} | ${newAddr.address_line} ${newAddr.district} ${newAddr.province} ${newAddr.postal_code}`.trim();
        }

        setLoading(true);
        try {
            const orderRes = await createOrder({
                user_id: user?.id || null,
                total_amount: totalPrice,
                payment_method: form.payment_method,
                address_id: selectedAddressId,
                address: addressString,
                items: items.map(i => ({ variant_id: i.variant_id, price: i.price, quantity: i.quantity })),
            });
            const newOrderId = orderRes.data?.data?.order_id || orderRes.data?.order?.order_id || orderRes.data?.orderId;
            
            if (!newOrderId) {
                throw new Error("Cannot retrieve order ID from response");
            }

            // COD ONLY: No secondary payment step needed.
            // Backend createOrder handles initial setup for COD.
            checkoutSuccessRef.current = true;
            clearCart();
            navigate(`/orders/${newOrderId}/track`);
        } catch (err) {
            console.error("Checkout error:", err);
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (items.length === 0 && !loading && !checkoutSuccessRef.current) {
            navigate('/cart');
        }
    }, [items.length, navigate, loading]);

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="page-wrapper">
            <div className="container checkout-layout">
                {/* Form */}
                <form className="checkout-form" onSubmit={handleSubmit}>
                    <h1 className="checkout-title">ชำระเงิน</h1>

                    {/* Delivery Info */}
                    <div className="checkout-section">
                        <h3 className="checkout-section-title"><Truck size={18} /> ข้อมูลการจัดส่ง</h3>
                        <div className="form-grid">
                            <div className="input-group">
                                <label className="input-label"><User size={13} /> ชื่อ-นามสกุล</label>
                                <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="กรอกชื่อ-นามสกุล" required />
                            </div>
                            <div className="input-group">
                                <label className="input-label"><Phone size={13} /> เบอร์โทรศัพท์</label>
                                <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="08X-XXX-XXXX" required />
                            </div>
                        </div>
                        <div className="input-group" style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="input-label" style={{ margin: 0 }}><MapPin size={13} /> ที่อยู่จัดส่ง</label>
                                {!isAddingAddr && (
                                    <button type="button" className="profile-add-addr-btn" onClick={() => {
                                        setIsAddingAddr(true);
                                        if (deliverySettings?.is_locked) {
                                            setNewAddr({
                                                recipient_name: '',
                                                address_line: '',
                                                district: '',
                                                province: deliverySettings.province,
                                                postal_code: deliverySettings.postal_code
                                            });
                                        }
                                    }} style={{ padding: '4px 8px' }}>
                                        + เพิ่มที่อยู่ใหม่
                                    </button>
                                )}
                            </div>

                            {/* Saved Addresses List */}
                            {addresses.length > 0 && !isAddingAddr && (
                                <div className="checkout-address-list">
                                    {addresses.map(addr => {
                                        const allowed = isAddressAllowed(addr, deliverySettings);
                                        return (
                                            <div 
                                                key={addr.address_id} 
                                                className={`checkout-addr-card ${selectedAddressId === addr.address_id ? 'selected' : ''} ${!allowed ? 'invalid' : ''}`} 
                                                onClick={() => allowed && setSelectedAddressId(addr.address_id)} 
                                                style={{ cursor: allowed ? 'pointer' : 'not-allowed' }}
                                            >
                                                <div className="checkout-addr-info">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong>{addr.recipient_name}</strong>
                                                        {!allowed && <span className="addr-invalid-badge">นอกเขตจัดส่ง</span>}
                                                    </div>
                                                    <p>{addr.address_line}</p>
                                                    <p>{[addr.district, addr.province, addr.postal_code].filter(Boolean).join(' ')}</p>
                                                    {!allowed && <p className="addr-invalid-text">ขออภัยค่ะ พื้นที่นี้ยังไม่เปิดให้บริการจัดส่งในขณะนี้</p>}
                                                </div>
                                                {selectedAddressId === addr.address_id && allowed && <CheckCircle size={18} className="payment-check" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add New Address Form (Inline) */}
                            {(isAddingAddr || addresses.length === 0) && (
                                <div className="checkout-new-addr">
                                    <div className="form-grid">
                                        <input className="input-field" placeholder="ชื่อผู้รับ *" value={newAddr.recipient_name} onChange={e => setNewAddr(p => ({ ...p, recipient_name: e.target.value }))} />
                                        <input className="input-field" placeholder="รหัสไปรษณีย์" maxLength={5} value={newAddr.postal_code} onChange={e => setNewAddr(p => ({ ...p, postal_code: e.target.value.replace(/\D/g, '') }))} disabled={deliverySettings?.is_locked} />
                                    </div>
                                    <textarea className="input-field checkout-textarea" placeholder="บ้านเลขที่ ซอย ถนน *" rows={2} value={newAddr.address_line} onChange={e => setNewAddr(p => ({ ...p, address_line: e.target.value }))} style={{ marginTop: 10 }} />
                                    <div className="form-grid" style={{ marginTop: 10 }}>
                                        <input 
                                            className="input-field" 
                                            placeholder="อำเภอ" 
                                            value={newAddr.district} 
                                            onChange={e => setNewAddr(p => ({ ...p, district: e.target.value }))} 
                                        />
                                        <input 
                                            className="input-field" 
                                            placeholder="จังหวัด" 
                                            value={newAddr.province} 
                                            onChange={e => setNewAddr(p => ({ ...p, province: e.target.value }))} 
                                            disabled={deliverySettings?.is_locked && !!deliverySettings.province} 
                                        />
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        {user && (
                                            <button type="button" className="btn btn-primary" onClick={handleAddAddress} style={{ flex: 1, padding: '8px' }}>บันทึกที่อยู่</button>
                                        )}
                                        {addresses.length > 0 && isAddingAddr && (
                                            <button type="button" className="btn btn-secondary" onClick={() => setIsAddingAddr(false)} style={{ flex: 1, padding: '8px' }}>ยกเลิก</button>
                                        )}
                                    </div>
                                    {!user && <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 8 }}>สมัครสมาชิกเพื่อบันทึกที่อยู่สำหรับการสั่งซื้อครั้งต่อไป</p>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment (COD Information) */}
                    <div className="checkout-section">
                        <h3 className="checkout-section-title"><CreditCard size={18} /> วิธีชำระเงิน</h3>
                        <div style={{ padding: '0.5rem 1rem', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: '1.2rem' }}>💵</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>เก็บเงินปลายทาง (COD)</div>
                                    <div style={{ fontSize: 13, color: '#6b7280' }}>ชำระเงินสดหรือโอนกับพนักงานเมื่อรับสินค้า</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> กำลังดำเนินการ...</> : `ยืนยันคำสั่งซื้อ • ${formatPrice(totalPrice)}`}
                    </button>
                </form>

                {/* Order Summary */}
                <div className="checkout-summary card">
                    <h3>รายการสินค้า</h3>
                    <div className="divider" />
                    {items.map(item => (
                        <div key={item.key} className="checkout-item">
                            <div className="checkout-item-image">
                                {item.image_url ? <img src={getImageUrl(item.image_url)} alt={item.product_name} /> : <span>🛍️</span>}
                            </div>
                            <div className="checkout-item-info">
                                <p>{item.product_name}</p>
                                <p className="checkout-item-meta">{item.sku} × {item.quantity}</p>
                            </div>
                            <p className="checkout-item-price">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                    ))}
                    <div className="divider" />
                    <div className="checkout-total">
                        <span>ยอดรวม</span>
                        <span className="checkout-total-price">{formatPrice(totalPrice)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
