import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Lock, 
  Unlock, 
  Save, 
  Info, 
  ShieldCheck,
  ChevronRight,
  Settings2
} from 'lucide-react';
import { getDeliverySettings, updateDeliverySettings } from '../../api';
import './DeliverySettingsPage.css';

const DeliverySettingsPage = () => {
  const [settings, setSettings] = useState({
    province: '',
    postal_code: '',
    is_locked: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await getDeliverySettings();
      if (res.data.success) {
        setSettings(res.data.data || {
          province: '',
          postal_code: '',
          is_locked: false,
        });
      }
    } catch (error) {
      toast.error('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateDeliverySettings(settings);
      if (res.data.success) {
        toast.success('บันทึกการตั้งค่าสำเร็จ');
        setSettings(res.data.data);
      }
    } catch (error) {
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  if (loading) {
    return (
      <div className="admin-page-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="delivery-settings-glow-bg">
      <div className="delivery-settings-page">
        <header className="page-header-glass">
          <div className="header-info">
            <div className="icon-badge primary">
              <MapPin size={24} />
            </div>
            <div>
              <h1>พื้นที่จัดส่ง</h1>
              <p>กำหนดขอบเขตการให้บริการและนโยบายการจัดส่งเฉพาะ COD</p>
            </div>
          </div>
          <div className={`status-badge-glass ${settings.is_locked ? 'locked' : 'unlocked'}`}>
            {settings.is_locked ? (
              <><Lock size={16} /> ล็อคพื้นที่แล้ว</>
            ) : (
              <><Unlock size={16} /> เปิดเป็นสาธารณะ</>
            )}
          </div>
        </header>

        <main className="settings-main-grid">
          <div className="glass-card main-form-card">
            <div className="card-header">
              <Settings2 size={20} className="text-accent" />
              <h2>กำหนดพื้นที่เป้าหมาย</h2>
            </div>
            
            <form onSubmit={handleSave} className="premium-form">
              <div className="form-sections-wrapper">
                <div className="input-group-grid">
                  <div className="input-field">
                    <label>จังหวัด</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        name="province"
                        value={settings.province || ''}
                        onChange={handleChange}
                        placeholder="เช่น กรุงเทพมหานคร"
                      />
                      <ChevronRight size={14} className="input-icon" />
                    </div>
                  </div>

                  <div className="input-field">
                    <label>รหัสไปรษณีย์</label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        name="postal_code"
                        value={settings.postal_code || ''}
                        onChange={handleChange}
                        placeholder="เช่น 10330"
                      />
                      <ChevronRight size={14} className="input-icon" />
                    </div>
                  </div>
                </div>

                <div className="control-divider"></div>

                <div className="lock-control-wrapper">
                  <div className="lock-text">
                    <div className="flex-items-center gap-2">
                       <ShieldCheck size={20} className={settings.is_locked ? 'text-primary' : 'text-muted'} />
                       <h3>เปิดใช้งานการล็อคพื้นที่</h3>
                    </div>
                    <p>จำกัดให้ลูกค้าสั่งซื้อได้เฉพาะในพื้นที่ที่ระบุไว้ด้านบนเท่านั้น</p>
                  </div>
                  <label className="premium-switch">
                    <input
                      type="checkbox"
                      name="is_locked"
                      checked={settings.is_locked}
                      onChange={handleChange}
                    />
                    <span className="premium-slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="save-btn-premium" disabled={saving}>
                  {saving ? (
                    <div className="flex-items-center gap-2">
                      <div className="mini-spinner"></div> กำลังบันทึก...
                    </div>
                  ) : (
                    <div className="flex-items-center gap-2">
                      <Save size={20} /> บันทึกการตั้งค่า
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>

          <aside className="glass-card help-card-premium">
            <div className="card-header">
              <Info size={20} className="text-primary" />
              <h3>คู่มือการใช้งาน</h3>
            </div>
            <div className="help-content">
              <div className="help-item">
                <div className="dot primary"></div>
                <p><strong>การล็อคพื้นที่:</strong> เมื่อเปิดใช้งาน ลูกค้าจะสามารถใช้ได้เฉพาะพื้นที่ที่คุณกำหนดไว้ในหน้านี้เท่านั้น</p>
              </div>
              <div className="help-item">
                <div className="dot accent"></div>
                <p><strong>ความยืดหยุ่น:</strong> คุณสามารถเลือกเติมเฉพาะบางช่องได้ (เช่น ล็อคแค่จังหวัด) โดยไม่จำเป็นต้องเติมครบทุกช่อง</p>
              </div>
              <div className="help-item">
                <div className="dot warning"></div>
                <p><strong>ผลกระทบ:</strong> การตั้งค่านี้มีผลทันทีต่อทั้ง <strong>แชทบอท</strong> และ <strong>หน้าชำระเงิน</strong></p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default DeliverySettingsPage;
