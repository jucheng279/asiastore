import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { useProductData } from '../lib/ProductDataContext';
import ProductCard from './ProductCard';
import type { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  useFavoriteSourceId?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, useFavoriteSourceId = false }) => {
  const navigate = useNavigate();
  const { cartQuantities, addToWeeklyOrder, removeFromWeeklyOrder } = useCart();
  const { favorites, toggleFavorite } = useAuth();
  const { orderingOpen } = useProductData();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(160px,200px))]">
      {products.map((product) => {
        const favoriteId = useFavoriteSourceId ? (product.sourceProductId || product.id) : product.id;
        return (
          <ProductCard
            key={product.id}
            product={product}
            quantity={cartQuantities.get(product.id) || 0}
            isFavorite={favorites.has(favoriteId)}
            onNavigate={() => navigate('/product/' + product.id)}
            onToggleFavorite={() => toggleFavorite(favoriteId)}
            onIncrease={() => addToWeeklyOrder(product, 1)}
            onDecrease={() => removeFromWeeklyOrder(product.id, 1)}
            orderingClosed={!orderingOpen}
          />
        );
      })}
    </div>
  );
};

interface ProductCarouselProps {
  products: Product[];
  useFavoriteSourceId?: boolean;
  itemWidth?: string;
}

const ProductCarousel: React.FC<ProductCarouselProps> = ({ products, useFavoriteSourceId = false, itemWidth = '160px' }) => {
  const navigate = useNavigate();
  const { cartQuantities, addToWeeklyOrder, removeFromWeeklyOrder } = useCart();
  const { favorites, toggleFavorite } = useAuth();
  const { orderingOpen } = useProductData();

  const lgWidth = itemWidth === '160px' ? 'lg:w-[200px]' : '';

  return (
    <div className="flex gap-4" style={{ width: 'max-content' }}>
      {products.map((product) => {
        const favoriteId = useFavoriteSourceId ? (product.sourceProductId || product.id) : product.id;
        return (
          <div key={product.id} className={`w-[${itemWidth}] ${lgWidth} shrink-0`}>
            <ProductCard
              product={product}
              quantity={cartQuantities.get(product.id) || 0}
              isFavorite={favorites.has(favoriteId)}
              onNavigate={() => navigate('/product/' + product.id)}
              onToggleFavorite={() => toggleFavorite(favoriteId)}
              onIncrease={() => addToWeeklyOrder(product, 1)}
              onDecrease={() => removeFromWeeklyOrder(product.id, 1)}
              orderingClosed={!orderingOpen}
            />
          </div>
        );
      })}
    </div>
  );
};

export { ProductGrid, ProductCarousel };
