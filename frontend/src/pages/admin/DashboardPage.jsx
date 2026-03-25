import React, { useEffect, useState } from 'react';
import {
    Package, ShoppingBag, AlertTriangle,
    ArrowUp, ChevronRight, DollarSign, Eye, Plus, Clock,
    TrendingUp, Archive, Users
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
    getProducts, getAdminOrders, getLowStockProducts,
    getSalesReport, getProductReport, getCustomerReport, getFinancialReport
} from '../../api';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import ProductImage from '../../components/ProductImage';
import './DashboardPage.css';

const MiniChart = ({ data, color }) => (
    <div style={{ width: '100%', height: 40, marginTop: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

const StatCard = ({ icon, label, value, color, sub, trend, trendUp, onClick, chartData }) => (
    <div className={`stat-card card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
        <div className="stat-card-top">
            <div className="stat-card-icon" style={{ background: color }}>
                {icon}
            </div>
            {onClick && <ChevronRight size={14} className="stat-card-arrow" />}
        </div>
        <div className="stat-card-info">
            <p className="stat-card-label">{label}</p>
            <p className="stat-card-value">{value}</p>
            {trend && (
                <p className={`stat-card-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
                    <ArrowUp size={11} style={{ transform: trendUp ? 'none' : 'rotate(180deg)' }} />
                    {trend}
                </p>
            )}
            {sub && !trend && <p className="stat-card-sub">{sub}</p>}
            {chartData && <MiniChart data={chartData} color={color.replace('0.15', '0.5').replace('0.12', '0.5')} />}
        </div>
    </div>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        products: 0,
        orders: 0,
        lowStock: 0,
        pending: 0,
        revenue: 0,
        revenueData: [],
        orderData: [],
    });
    const [lowStockItems, setLowStockItems] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const today = new Date().toISOString().slice(0, 10);
                const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

                const [prodRes, adminOrdersRes, lowRes, salesRes, todaySalesRes] = await Promise.allSettled([
                    getProducts(),
                    getAdminOrders({ limit: 6 }),
                    getLowStockProducts(),
                    getSalesReport({ startDate: lastWeek, endDate: today, groupBy: 'day' }),
                    getSalesReport({ startDate: today, endDate: today, groupBy: 'hour' }),
                ]);

                const products = prodRes.status === 'fulfilled' ? prodRes.value.data.data || [] : [];
                const recentData = adminOrdersRes.status === 'fulfilled' ? adminOrdersRes.value.data : {};
                const orders = recentData.data || [];
                const orderTotal = recentData.total ?? orders.length;
                const low = lowRes.status === 'fulfilled' ? lowRes.value.data.data || [] : [];

                const salesTrend = salesRes.status === 'fulfilled' ? salesRes.value.data.data : { by_period: [] };

                const todaySales = todaySalesRes.status === 'fulfilled' ? todaySalesRes.value.data.data : { summary: { total_revenue: 0, total_orders: 0 } };

                setStats({
                    products: products.length,
                    orders: todaySales.summary.total_orders, // Change to today's orders
                    lowStock: low.length,
                    pending: orders.filter(o => o.status === 'pending').length,
                    revenue: todaySales.summary.total_revenue, // Change to today's revenue
                    revenueData: salesTrend.by_period.map(p => ({ value: Number(p.revenue) })),
                    orderData: salesTrend.by_period.map(p => ({ value: Number(p.orders) })),
                });
                setLowStockItems(low.slice(0, 6));
                setRecentOrders(orders);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const fmt = (n) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
    const num = (n) => new Intl.NumberFormat('th-TH').format(n || 0);

    const getStatusBadge = (status) => {
        const map = {
            pending: 'badge-orange',
            processing: 'badge-cyan',
            shipped: 'badge-blue',
            in_transit: 'badge-purple',
            delivered: 'badge-green',
            completed: 'badge-green',
            cancelled: 'badge-red'
        };
        return `badge ${map[status] || 'badge-gray'}`;
    };

    const statusLabel = {
        pending: 'รอดำเนินการ', processing: 'กำลังเตรียม', shipped: 'จัดส่งแล้ว',
        in_transit: 'อยู่ระหว่างขนส่ง', delivered: 'ส่งมอบแล้ว',
        completed: 'สำเร็จ', cancelled: 'ยกเลิก'
    };

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">Dashboard</h1>
                    <p className="admin-page-subtitle">ภาพรวมร้านค้า Chambot — อัปเดตล่าสุดวันนี้</p>
                </div>
                <div className="quick-actions">
                    <Link to="/admin/products" className="quick-action-btn">
                        <Plus size={14} /> เพิ่มสินค้า
                    </Link>
                    <Link to="/admin/orders" className="quick-action-btn">
                        <Eye size={14} /> ดูคำสั่งซื้อ
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card card clickable" onClick={() => navigate('/admin/reports?tab=sales')}>
                    <div className="stat-card-top">
                        <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                            <DollarSign size={22} color="#10b981" />
                        </div>
                        <ChevronRight size={14} className="stat-card-arrow" />
                    </div>
                    <div className="stat-card-info">
                        <p className="stat-card-label">ยอดขายรวม (วันนี้)</p>
                        {loading
                            ? <div className="skeleton" style={{ height: 32, width: 140, marginTop: 4 }} />
                            : <p className="revenue-highlight" style={{ color: '#059669' }}>{fmt(stats.revenue)}</p>
                        }
                        {stats.revenueData.length > 0 && <MiniChart data={stats.revenueData} color="#10b981" />}
                    </div>
                </div>

                <StatCard
                    icon={<ShoppingBag size={22} color="#6366f1" />}
                    label="คำสั่งซื้อ (วันนี้)"
                    value={loading ? '—' : num(stats.orders)}
                    color="rgba(99, 102, 241, 0.12)"
                    sub="ออเดอร์รายวัน"
                    onClick={() => navigate('/admin/reports?tab=sales')}
                    chartData={stats.orderData}
                />

                <StatCard
                    icon={<Package size={22} color="#22d3ee" />}
                    label="สินค้าทั้งหมด"
                    value={loading ? '—' : num(stats.products)}
                    color="rgba(34, 211, 238, 0.12)"
                    sub="รายการสินค้าในระบบ"
                    onClick={() => navigate('/admin/reports?tab=products')}
                />
            </div>

            {/* Low Stock Alert banner */}
            {stats.lowStock > 0 && !loading && (
                <div style={{
                    background: 'rgba(251,146,60,0.08)',
                    border: '1px solid rgba(251,146,60,0.2)',
                    borderRadius: 12,
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertTriangle size={16} color="#fb923c" />
                        <span style={{ color: '#fb923c', fontWeight: 600, fontSize: 14 }}>
                            มี {stats.lowStock} รายการที่สต็อกใกล้หมด — ควรเติมสต็อกเพิ่ม
                        </span>
                    </div>
                    <Link to="/admin/stock" className="view-all-link">
                        จัดการสต็อก <ChevronRight size={14} />
                    </Link>
                </div>
            )}

            {/* Tables Grid */}
            <div className="dashboard-grid">
                {/* Low Stock Table */}
                <div className="card dashboard-card">
                    <div className="dashboard-card-header">
                        <h3><AlertTriangle size={15} color="#fb923c" /> สินค้าสต็อกต่ำ</h3>
                        <Link to="/admin/stock" className="view-all-link">
                            จัดการทั้งหมด <ChevronRight size={13} />
                        </Link>
                    </div>
                    {loading ? (
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}
                        </div>
                    ) : lowStockItems.length === 0 ? (
                        <div className="empty-state">
                            <Package size={40} />
                            <p>สต็อกปกติทุกรายการ 🎉</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>รูป</th><th>สินค้า</th><th>SKU</th><th>สต็อก</th></tr></thead>
                            <tbody>
                                {lowStockItems.map(i => (
                                    <tr key={i.variant_id}>
                                        <td>
                                            <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-surface)' }}>
                                                <ProductImage src={i.image_url} alt={i.product_name} size={14} />
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.product_name}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{i.sku}</td>
                                        <td><span className="badge badge-orange">{i.stock_quantity}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Recent Orders Table */}
                <div className="card dashboard-card">
                    <div className="dashboard-card-header">
                        <h3><ShoppingBag size={15} color="#22d3ee" /> คำสั่งซื้อล่าสุด</h3>
                        <Link to="/admin/orders" className="view-all-link">
                            ดูทั้งหมด <ChevronRight size={13} />
                        </Link>
                    </div>
                    {loading ? (
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <div className="empty-state">
                            <ShoppingBag size={40} />
                            <p>ยังไม่มีคำสั่งซื้อ</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead><tr><th>Order</th><th>ลูกค้า</th><th>ยอด</th><th>สถานะ</th><th>วันที่</th></tr></thead>
                            <tbody>
                                {recentOrders.map(o => (
                                    <tr key={o.order_id}>
                                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                                            #{String(o.order_id).slice(-8)}
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                            {o.customer_name || o.phone_number || '—'}
                                        </td>
                                        <td style={{ color: 'var(--accent-dark)', fontWeight: 700, fontSize: 13 }}>
                                            {fmt(o.total_amount || 0)}
                                        </td>
                                        <td><span className={getStatusBadge(o.status)}>{statusLabel[o.status] || o.status}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                            <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                            {o.created_at
                                                ? new Date(o.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
