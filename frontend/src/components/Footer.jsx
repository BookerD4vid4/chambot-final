import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Facebook, Instagram, Twitter } from 'lucide-react';
import './Footer.css';

const Footer = () => (
    <footer className="footer">
        <div className="container footer-inner">
            <div className="footer-brand">
                <Link to="/" className="footer-logo">
                    <div className="footer-logo-icon"><Zap size={16} fill="currentColor" /></div>
                    <span>Chambot</span>
                </Link>
                <p className="footer-tagline">ร้านค้าออนไลน์ที่คุณไว้วางใจ<br />สินค้าคุณภาพ ราคาพอใจ</p>
                <div className="footer-social">
                    <a href="#" className="social-btn"><Facebook size={16} /></a>
                    <a href="#" className="social-btn"><Instagram size={16} /></a>
                    <a href="#" className="social-btn"><Twitter size={16} /></a>
                </div>
            </div>

            <div className="footer-links">
                <div className="footer-col">
                    <h4>ร้านค้า</h4>
                    <Link to="/shop">สินค้าทั้งหมด</Link>
                    <Link to="/shop">โปรโมชัน</Link>
                    <Link to="/shop">สินค้าใหม่</Link>
                </div>
                <div className="footer-col">
                    <h4>บัญชี</h4>
                    <Link to="/login">เข้าสู่ระบบ</Link>
                    <Link to="/cart">ตะกร้าสินค้า</Link>
                    <Link to="/checkout">สั่งซื้อ</Link>
                </div>
                <div className="footer-col">
                    <h4>ติดต่อ</h4>
                    <span>chambot@example.com</span>
                    <span>02-000-0000</span>
                    <span>จันทร์-ศุกร์ 9:00–18:00</span>
                </div>
            </div>
        </div>
        <div className="footer-bottom">
            <div className="container">
                <span>© 2026 Chambot Store. All rights reserved.</span>
            </div>
        </div>
    </footer>
);

export default Footer;
