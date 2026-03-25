import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api';
import toast from 'react-hot-toast';
import { User, MapPin, ArrowRight } from 'lucide-react';

const ProfileSetupPage = () => {
    const { user, loginWithToken, token } = useAuth();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) return toast.error('กรุณากรอกชื่อ');
        setLoading(true);
        try {
            const res = await updateProfile({ full_name: fullName });
            const updatedUser = { ...user, full_name: fullName };
            loginWithToken(updatedUser, token);
            toast.success('บันทึกข้อมูลสำเร็จ!');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg">
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
            </div>
            <div className="login-card glass">
                <div className="login-logo">
                    <div className="login-logo-icon"><User size={22} /></div>
                    <span>ตั้งค่าโปรไฟล์</span>
                </div>
                <h2 className="login-title">ยินดีต้อนรับสมาชิกใหม่! 🎉</h2>
                <p className="login-subtitle">กรอกชื่อและข้อมูลของคุณเพื่อเริ่มต้น</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label className="input-label">ชื่อ-นามสกุล</label>
                        <div className="login-input-wrap">
                            <User size={16} className="login-input-icon" />
                            <input
                                type="text"
                                className="input-field login-input"
                                placeholder="กรอกชื่อของคุณ"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary btn-full" onClick={() => navigate('/')}>
                            ข้ามไปก่อน
                        </button>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <><ArrowRight size={16} /> บันทึก</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetupPage;
