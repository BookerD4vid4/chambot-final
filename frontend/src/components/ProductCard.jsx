import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../api';
import './ProductCard.css';

const formatPrice = (price) =>
    new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(price);

const ProductCard = ({ product }) => {
    const { addItem } = useCart();
    const {
        product_id,
        product_name,
        description,
        category_name,
        image_url,
        min_price,
        max_price,
        total_stock,
    } = product;

    const priceText = min_price === max_price
        ? formatPrice(min_price)
        : `${formatPrice(min_price)} – ${formatPrice(max_price)}`;

    const inStock = total_stock > 0;

    const handleQuickAdd = (e) => {
        e.preventDefault();
        // Quick add uses the product data — full add happens on detail page
    };

    return (
        <Link to={`/product/${product_id}`} className="product-card">
            {/* Image */}
            <div className="product-card-image">
                {image_url ? (
                    <img src={getImageUrl(image_url)} alt={product_name} loading="lazy" />
                ) : (
                    <div className="product-card-placeholder">
                        <span>🛍️</span>
                    </div>
                )}

                {category_name && (
                    <span className="product-card-category">{category_name}</span>
                )}
            </div>

            {/* Info */}
            <div className="product-card-body">
                <h3 className="product-card-name">{product_name}</h3>
                {description && (
                    <p className="product-card-desc">{description}</p>
                )}
                <div className="product-card-footer">
                    <span className="product-card-price">{priceText}</span>

                </div>
            </div>

            {/* Hover CTA */}
            <div className="product-card-cta">
                <ShoppingCart size={16} />
                <span>ดูสินค้า</span>
            </div>
        </Link>
    );
};

export default ProductCard;
