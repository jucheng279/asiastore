import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice } from '../lib/formatters';

const ProductDetailView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { productId: selectedProductId } = useParams<{ productId: string }>();
  const { productMap, language, orderingOpen } = useProductData();
  const { cartQuantities, cartCount, addToCart } = useCart();
  const { favorites, toggleFavorite } = useAuth();

  const orderingClosed = !orderingOpen;

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [localQty, setLocalQty] = useState(1);

  const resolvedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    const product = productMap.get(selectedProductId);
    if (!product) return null;
    if (product.parentProductId) {
      return productMap.get(product.parentProductId) || product;
    }
    return product;
  }, [selectedProductId, productMap]);

  const initialChildId = useMemo(() => {
    if (!selectedProductId) return null;
    const directProduct = productMap.get(selectedProductId);
    if (directProduct?.parentProductId && resolvedProduct?.children) {
      return selectedProductId;
    }
    if (resolvedProduct?.hasChildren && resolvedProduct.children?.length) {
      return resolvedProduct.children[0].id;
    }
    return null;
  }, [selectedProductId, resolvedProduct, productMap]);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(initialChildId);

  const actualChildId = selectedChildId ?? initialChildId;

  const displayProduct = useMemo(() => {
    if (!resolvedProduct) return null;
    if (resolvedProduct.hasChildren && resolvedProduct.children && actualChildId) {
      const child = resolvedProduct.children.find(c => c.id === actualChildId);
      return child || resolvedProduct;
    }
    return resolvedProduct;
  }, [resolvedProduct, actualChildId]);

  const cartProductId = resolvedProduct?.hasChildren
    ? (actualChildId || '')
    : (actualChildId || resolvedProduct?.id || '');
  const favoriteId = resolvedProduct?.sourceProductId || resolvedProduct?.id || '';
  const isFavorite = favorites.has(favoriteId);

  const available = displayProduct?.availableStock ?? undefined;
  const isOutOfStock = available !== undefined && available <= 0;
  const isLowStock = available !== undefined && available > 0 && available <= 10;

  useEffect(() => {
    setLocalQty(1);
  }, [actualChildId]);

  const handleChildSelect = (childId: string) => {
    if (childId === actualChildId) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedChildId(childId);
      setIsTransitioning(false);
    }, 150);
  };

  const handleAddToCart = () => {
    if (!displayProduct || !cartProductId || isOutOfStock || orderingClosed) return;
    if (resolvedProduct?.hasChildren && !actualChildId) return;
    const cartQty = cartQuantities.get(cartProductId) || 0;
    const canAdd = available !== undefined ? Math.min(localQty, available - cartQty) : localQty;
    if (canAdd > 0) {
      addToCart(displayProduct, canAdd);
      setLocalQty(1);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (!resolvedProduct || !displayProduct) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col items-center justify-center px-8">
        <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-gray-400 text-[40px]">search_off</span>
        </div>
        <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">{t('product.notFound')}</h3>
        <button
          className="mt-4 px-6 py-2 bg-primary text-white font-bold rounded-xl"
          onClick={() => navigate('/')}
        >
          {t('common.goHome')}
        </button>
      </div>
    );
  }

  const cartQty = cartQuantities.get(cartProductId) || 0;
  const atMaxQty = available !== undefined && (cartQty + localQty) > available;
  const maxLocalQty = available !== undefined ? Math.max(1, available - cartQty) : 99;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-28 lg:pb-8">
      <div className="relative">
        <div className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-white/5 lg:max-w-lg lg:mx-auto lg:rounded-2xl lg:mt-6">
          <img
            alt={displayProduct.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            src={displayProduct.image}
          />
        </div>

        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <button
            className="flex size-10 items-center justify-center rounded-full bg-white/80 dark:bg-black/50 text-text-main dark:text-white backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors"
            onClick={handleGoBack}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex gap-2">
            <button
              className="flex size-10 items-center justify-center rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors"
              onClick={() => toggleFavorite(favoriteId)}
            >
              <span className={`material-symbols-outlined ${isFavorite ? 'text-red-500' : 'text-text-main dark:text-white'}`}>
                {isFavorite ? 'favorite' : 'favorite_border'}
              </span>
            </button>
            <button
              className="relative flex size-10 items-center justify-center rounded-full bg-white/80 dark:bg-black/50 text-text-main dark:text-white backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-black/70 transition-colors"
              onClick={() => navigate('/cart')}
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-6 py-6 lg:max-w-lg lg:mx-auto">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold text-text-main dark:text-white leading-tight flex-1 mr-4">{displayProduct.name}</h1>
          <p className="text-2xl font-bold text-primary whitespace-nowrap">{formatPrice(displayProduct.price, language)}</p>
        </div>

        {displayProduct.originalPrice && displayProduct.originalPrice > displayProduct.price && (
          <p className="text-sm text-text-sub line-through mb-1">{formatPrice(displayProduct.originalPrice, language)}</p>
        )}

        {displayProduct.brand && (
          <p className="text-sm text-text-sub mb-3">{displayProduct.brand}</p>
        )}

        {displayProduct.unit && (
          <p className="text-xs text-text-sub mb-3">{displayProduct.unit}</p>
        )}

        {isOutOfStock && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
            <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">{t('product.outOfStock')}</span>
          </div>
        )}

        {isLowStock && !isOutOfStock && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
            <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{t('product.lowStock', { count: available })}</span>
          </div>
        )}

        {displayProduct.description && (
          <p className="text-sm text-text-sub leading-relaxed mb-6">{displayProduct.description}</p>
        )}

        {resolvedProduct.hasChildren && resolvedProduct.children && resolvedProduct.children.length > 1 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-text-main dark:text-white mb-3">{t('product.selectVariant')}</h3>
            <div className="flex flex-wrap gap-2">
              {resolvedProduct.children.map(child => (
                <button
                  key={child.id}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    child.id === actualChildId
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-white/10 text-text-main dark:text-white hover:border-primary/50'
                  }`}
                  onClick={() => handleChildSelect(child.id)}
                >
                  {child.name}
                  <span className="ml-2 text-text-sub">{formatPrice(child.price, language)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isOutOfStock && !orderingClosed && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-xl overflow-hidden">
              <button
                className="w-10 h-10 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
                onClick={() => setLocalQty(q => Math.max(1, q - 1))}
                disabled={localQty <= 1}
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <span className="w-10 text-center font-bold text-text-main dark:text-white">{localQty}</span>
              <button
                className="w-10 h-10 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
                onClick={() => setLocalQty(q => Math.min(maxLocalQty, q + 1))}
                disabled={localQty >= maxLocalQty}
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            <button
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAddToCart}
              disabled={isOutOfStock || atMaxQty}
            >
              <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
              <span>{t('product.addToCart')}</span>
            </button>
          </div>
        )}

        {cartQty > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3 mb-4">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[18px]">check_circle</span>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('product.inCart', { count: cartQty })}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailView;
