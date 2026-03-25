import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { getImageUrl } from '../api';

const ProductImage = ({ src, alt, className, size = 18 }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className={`product-thumb-fallback ${className}`}>
                <Package size={size} style={{ color: 'var(--text-muted)' }} />
            </div>
        );
    }

    return (
        <img
            src={getImageUrl(src)}
            alt={alt}
            className={className}
            onError={() => setError(true)}
        />
    );
};

export default ProductImage;
