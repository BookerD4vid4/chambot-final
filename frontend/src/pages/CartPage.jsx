import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../api';
import './CartPage.css';

const formatPrice = (p) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(p);

const CartPage = () => {
    const { items, removeItem, updateQty, totalPrice, clearCart } = useCart();
    const navigate = useNavigate();

    if (items.length === 0) return (
        <div className="page-wrapper">
            <div className="container cart-empty-page">
                <div className="cart-empty-icon">🛒</div>
                <h2>ตะกร้าของคุณว่างเปล่า</h2>
                <p>เพิ่มสินค้าเพื่อดำเนินการต่อ</p>
                <Link to="/shop" className="btn btn-primary btn-lg">
                    <ShoppingBag size={18} /> เลือกซื้อสินค้า
                </Link>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="container">
                <div className="cart-page-header">
                    <h1>ตะกร้าสินค้า</h1>
                    <button className="btn btn-secondary btn-sm" onClick={clearCart}>ล้างตะกร้า</button>
                </div>
                <div className="cart-page-layout">
                    {/* Items */}
                    <div className="cart-items-section">
                        {items.map(item => (
                            <div key={item.key} className="cart-row">
                                <div className="cart-row-image">
                                    {item.image_url ? <img src={getImageUrl(item.image_url)} alt={item.product_name} /> : <span>🛍️</span>}
                                </div>
                                <div className="cart-row-info">
                                    <p className="cart-row-name">{item.product_name}</p>
                                    <p className="cart-row-meta">{item.sku}{item.unit && ` · ${item.unit}`}</p>
                                    <p className="cart-row-price">{formatPrice(item.price)}</p>
                                </div>
                                <div className="cart-row-controls">
                                    <div className="qty-control qty-control-lg">
                                        <button onClick={() => updateQty(item.key, item.quantity - 1)}><Minus size={14} /></button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQty(item.key, item.quantity + 1)}><Plus size={14} /></button>
                                    </div>
                                    <p className="cart-row-subtotal">{formatPrice(item.price * item.quantity)}</p>
                                    <button className="remove-btn" onClick={() => removeItem(item.key)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Summary */}
                    <div className="cart-summary-box card">
                        <h3>สรุปคำสั่งซื้อ</h3>
                        <div className="divider" />
                        <div className="summary-rows">
                            <div className="summary-row"><span>สินค้า ({items.length} รายการ)</span><span>{formatPrice(totalPrice)}</span></div>
                            <div className="summary-row"><span>ค่าจัดส่ง</span><span style={{ color: 'var(--accent)' }}>ฟรี</span></div>
                        </div>
                        <div className="divider" />
                        <div className="summary-total">
                            <span>ยอดรวม</span>
                            <span className="summary-total-price">{formatPrice(totalPrice)}</span>
                        </div>
                        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/checkout')}>
                            ดำเนินการชำระเงิน <ArrowRight size={18} />
                        </button>
                        <Link to="/shop" className="btn btn-secondary btn-full">ช้อปต่อ</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
