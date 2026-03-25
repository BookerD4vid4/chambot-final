import React from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../api';
import './CartDrawer.css';

const formatPrice = (price) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(price);

const CartDrawer = () => {
    const { items, removeItem, updateQty, totalPrice, totalItems, isOpen, setIsOpen } = useCart();

    if (!isOpen) return null;

    return (
        <>
            <div className="cart-overlay" onClick={() => setIsOpen(false)} />
            <div className="cart-drawer">
                {/* Header */}
                <div className="cart-header">
                    <div className="cart-title">
                        <ShoppingCart size={20} />
                        <span>ตะกร้าสินค้า</span>
                        {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                    </div>
                    <button className="cart-close" onClick={() => setIsOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                {/* Items */}
                <div className="cart-items">
                    {items.length === 0 ? (
                        <div className="cart-empty">
                            <div className="cart-empty-icon">🛒</div>
                            <p>ยังไม่มีสินค้าในตะกร้า</p>
                            <button className="btn btn-outline" onClick={() => setIsOpen(false)}>
                                เลือกซื้อสินค้า
                            </button>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.key} className="cart-item">
                                <div className="cart-item-image">
                                    {item.image_url ? (
                                        <img src={getImageUrl(item.image_url)} alt={item.product_name} />
                                    ) : (
                                        <span>🛍️</span>
                                    )}
                                </div>
                                <div className="cart-item-info">
                                    <p className="cart-item-name">{item.product_name}</p>
                                    <p className="cart-item-sku">{item.sku}{item.unit && ` · ${item.unit}`}</p>
                                    <p className="cart-item-price">{formatPrice(item.price)}</p>
                                </div>
                                <div className="cart-item-actions">
                                    <div className="qty-control">
                                        <button onClick={() => updateQty(item.key, item.quantity - 1)}><Minus size={12} /></button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQty(item.key, item.quantity + 1)}><Plus size={12} /></button>
                                    </div>
                                    <button className="remove-btn" onClick={() => removeItem(item.key)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total">
                            <span>รวมทั้งหมด</span>
                            <span className="total-price">{formatPrice(totalPrice)}</span>
                        </div>
                        <Link
                            to="/checkout"
                            className="btn btn-primary btn-full btn-lg"
                            onClick={() => setIsOpen(false)}
                        >
                            ดำเนินการชำระเงิน <ArrowRight size={18} />
                        </Link>
                        <Link
                            to="/cart"
                            className="btn btn-secondary btn-full"
                            onClick={() => setIsOpen(false)}
                        >
                            ดูตะกร้า
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
