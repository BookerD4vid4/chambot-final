import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import './OrderSuccessPage.css';

const OrderSuccessPage = () => (
    <div className="success-page">
        <div className="success-card glass">
            <div className="success-icon">
                <CheckCircle size={56} />
            </div>
            <h1 className="success-title">สั่งซื้อสำเร็จ!</h1>
            <p className="success-desc">
                ขอบคุณที่เลือกซื้อกับ Chambot Store<br />
                เราจะดำเนินการจัดส่งสินค้าโดยเร็วที่สุด
            </p>
            <div className="success-actions">
                <Link to="/shop" className="btn btn-primary btn-lg">
                    <ShoppingBag size={18} /> ช้อปต่อ
                </Link>
                <Link to="/" className="btn btn-secondary">
                    กลับหน้าหลัก <ArrowRight size={16} />
                </Link>
            </div>
        </div>
        <div className="success-bg-orb" />
    </div>
);

export default OrderSuccessPage;
