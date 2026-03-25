import React from 'react';
import { ShieldOff, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SuspendedPage.css';

const SuspendedPage = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    // Admin phone is stored in localStorage when login detects suspension
    const adminPhone = localStorage.getItem('chambot_suspended_by_phone') || null;

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="suspended-page">
            <div className="suspended-card">
                {/* Icon */}
                <div className="suspended-icon-wrap">
                    <ShieldOff size={40} />
                </div>

                {/* Title */}
                <h1 className="suspended-title">บัญชีถูกระงับการใช้งาน</h1>
                <p className="suspended-desc">
                    บัญชีของคุณ (<strong>{user?.phone || 'ไม่ทราบเบอร์'}</strong>) ถูกระงับโดยผู้ดูแลระบบ<br />
                    หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแล
                </p>

                {/* Admin Contact */}
                {adminPhone && (
                    <div className="suspended-contact">
                        <div className="contact-label">ติดต่อผู้ดูแลระบบที่ระงับบัญชีของคุณ</div>
                        <a href={`tel:${adminPhone}`} className="contact-phone">
                            <Phone size={18} />
                            {adminPhone}
                        </a>
                        <p className="contact-hint">กดที่เบอร์เพื่อโทรหาผู้ดูแล</p>
                    </div>
                )}

                {/* No admin reference */}
                {!adminPhone && (
                    <div className="suspended-contact no-contact">
                        <p>กรุณาติดต่อผู้ดูแลระบบเพื่อขอรับการช่วยเหลือ</p>
                    </div>
                )}

                {/* Logout */}
                <button className="suspended-logout" onClick={handleLogout}>
                    <LogOut size={15} />
                    ออกจากระบบ
                </button>
            </div>

            {/* Background bubbles */}
            <div className="suspended-blob blob-1" />
            <div className="suspended-blob blob-2" />
        </div>
    );
};

export default SuspendedPage;
