import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, User, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { requestOtp, verifyOtp } from '../api';
import toast from 'react-hot-toast';
import './LoginPage.css';

const LoginPage = () => {
    const { loginWithToken } = useAuth();
    const navigate = useNavigate();

    // Step 1: phone | Step 2: otp
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    // ─── Step 1: Request OTP ─────────────────────────────
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        const cleaned = phone.replace(/[-\s]/g, '');
        if (!/^[0-9]{10}$/.test(cleaned)) {
            return toast.error('กรุณากรอกเบอร์โทร 10 หลัก');
        }
        setLoading(true);
        try {
            await requestOtp(cleaned);
            toast.success('ส่ง OTP แล้ว! ตรวจสอบ Terminal ของ backend');
            setStep('otp');
        } catch (err) {
            toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 2: Verify OTP ──────────────────────────────
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) return toast.error('OTP ต้องมี 6 หลัก');
        const cleaned = phone.replace(/[-\s]/g, '');
        setLoading(true);
        try {
            const res = await verifyOtp(cleaned, otp);
            const { token, user, isNewUser } = res.data;

            // ── Suspended account check ───────────────────
            if (user.is_active === false) {
                // Store admin phone so SuspendedPage can display it
                if (user.suspended_by_phone) {
                    localStorage.setItem('chambot_suspended_by_phone', user.suspended_by_phone);
                } else {
                    localStorage.removeItem('chambot_suspended_by_phone');
                }
                // Still store user so SuspendedPage can show their phone
                loginWithToken(user, token);
                navigate('/suspended', { replace: true });
                return;
            }

            // Clear any leftover suspension data
            localStorage.removeItem('chambot_suspended_by_phone');

            loginWithToken(user, token);
            toast.success(`ยินดีต้อนรับ! 🎉`);

            if (user.role === 'admin') {
                navigate('/admin/dashboard');
            } else if (isNewUser) {
                navigate('/profile-setup');
            } else {
                navigate('/');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'OTP ไม่ถูกต้อง');
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
                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-icon"><Zap size={22} fill="currentColor" /></div>
                    <span>Chambot</span>
                </div>

                {/* Step Indicator */}
                <div className="otp-steps">
                    <div className={`otp-step ${step === 'phone' ? 'active' : 'done'}`}>
                        <div className="otp-step-circle">
                            {step === 'otp' ? '✓' : <Phone size={14} />}
                        </div>
                        <span>เบอร์โทร</span>
                    </div>
                    <div className="otp-step-line" />
                    <div className={`otp-step ${step === 'otp' ? 'active' : ''}`}>
                        <div className="otp-step-circle">
                            <Shield size={14} />
                        </div>
                        <span>OTP</span>
                    </div>
                </div>

                {/* ─── Step 1 ─── */}
                {step === 'phone' && (
                    <>
                        <h2 className="login-title">ยินดีต้อนรับ!</h2>
                        <p className="login-subtitle">กรอกเบอร์โทรเพื่อรับ OTP</p>
                        <form onSubmit={handleRequestOtp} className="login-form">
                            <div className="input-group">
                                <label className="input-label">เบอร์โทรศัพท์</label>
                                <div className="login-input-wrap">
                                    <Phone size={16} className="login-input-icon" />
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        className="input-field login-input"
                                        placeholder="0X-XXXX-XXXX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        maxLength={10}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : <><ArrowRight size={16} /> ขอ OTP</>}
                            </button>
                        </form>
                    </>
                )}

                {/* ─── Step 2 ─── */}
                {step === 'otp' && (
                    <>
                        <h2 className="login-title">ยืนยัน OTP</h2>
                        <p className="login-subtitle">
                            กรอกรหัส 6 หลักจาก Terminal ของ backend<br />
                            <span className="otp-phone-hint">📱 {phone}</span>
                        </p>
                        <form onSubmit={handleVerifyOtp} className="login-form">
                            <div className="input-group">
                                <label className="input-label">รหัส OTP (6 หลัก)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="input-field otp-input"
                                    placeholder="_ _ _ _ _ _"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    required
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                                {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : '✅ ยืนยัน OTP'}
                            </button>
                            <button type="button" className="btn btn-secondary btn-full" style={{ marginTop: 8 }}
                                onClick={() => { setStep('phone'); setOtp(''); }}>
                                ← เปลี่ยนเบอร์โทร
                            </button>
                        </form>
                        <p className="otp-resend-note">
                            ไม่ได้รับ?&nbsp;
                            <button className="link-btn" onClick={handleRequestOtp} disabled={loading}>ขอ OTP ใหม่</button>
                        </p>
                    </>
                )}

                <p className="login-note">
                    <User size={12} /> ผู้ใช้ใหม่จะถูกสร้างบัญชีให้อัตโนมัติ
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
