import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { getProducts, getCategories } from '../api';
import ProductCard from '../components/ProductCard';
import './ShopPage.css';

const ShopPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = { active: true };
            if (activeCategory) params.category = activeCategory;
            if (search) params.search = search;
            const res = await getProducts(params);
            setProducts(res.data.data || []);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [activeCategory, search]);

    useEffect(() => {
        getCategories().then(r => setCategories(r.data.data || [])).catch(() => { });
    }, []);

    useEffect(() => {
        const timer = setTimeout(fetchProducts, 300);
        return () => clearTimeout(timer);
    }, [fetchProducts]);

    const handleCategory = (catId) => {
        const val = activeCategory === catId ? '' : catId;
        setActiveCategory(val);
        const params = {};
        if (val) params.category = val;
        if (search) params.search = search;
        setSearchParams(params);
    };

    const handleSearch = (e) => {
        const val = e.target.value;
        setSearch(val);
        const params = {};
        if (activeCategory) params.category = activeCategory;
        if (val) params.search = val;
        setSearchParams(params);
    };

    return (
        <div className="page-wrapper">
            <div className="container">
                {/* Header */}
                <div className="shop-header">
                    <div>
                        <h1 className="shop-title">สินค้าทั้งหมด</h1>
                        <p className="shop-count">
                            {loading ? 'กำลังโหลด...' : `พบ ${products.length} สินค้า`}
                        </p>
                    </div>
                    {/* Search */}
                    <div className="shop-search-wrap">
                        <Search size={16} className="shop-search-icon" />
                        <input
                            type="text"
                            className="shop-search-input"
                            placeholder="ค้นหาสินค้า..."
                            value={search}
                            onChange={handleSearch}
                        />
                    </div>
                </div>

                {/* Category Filter */}
                <div className="shop-filters">
                    <SlidersHorizontal size={14} />
                    <button
                        className={`filter-pill ${!activeCategory ? 'active' : ''}`}
                        onClick={() => handleCategory('')}
                    >ทั้งหมด</button>
                    {categories.map(c => (
                        <button
                            key={c.category_id}
                            className={`filter-pill ${activeCategory === String(c.category_id) ? 'active' : ''}`}
                            onClick={() => handleCategory(String(c.category_id))}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="product-grid">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 320, borderRadius: 16 }} />
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="product-grid">
                        {products.map(p => <ProductCard key={p.product_id} product={p} />)}
                    </div>
                ) : (
                    <div className="shop-empty">
                        <div className="shop-empty-icon">🔍</div>
                        <h3>ไม่พบสินค้า</h3>
                        <p>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopPage;
