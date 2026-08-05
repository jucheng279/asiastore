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
  const { cartQuantities, cartCount, addQuantityToCart } = useCart();
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
    if (!cartProductId || isOutOfStock || orderingClosed) return;
    if (resolvedProduct?.hasChildren && !actualChildId) return;
    const cartQty = cartQuantities.get(cartProductId) || 0;
    const canAdd = available !== undefined ? Math.min(localQty, available - cartQty) : localQty;
    if (canAdd > 0) {
      addQuantityToCart(cartProductId, canAdd);
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
        <h3 className="text-text-main dark:text-white font-bold text-lg mb-2">{t('product.productNotFound')}</h3>
        <p className="text-text-sub text-sm text-center mb-6">{t('product.productNotFoundDesc')}</p>
        <button
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
          onClick={handleGoBack}
        >
          {t('common.goBack')}
        </button>
      </div>
    );
  }

  const totalPrice = displayProduct.price * localQty;
  const cartQty = cartQuantities.get(cartProductId) || 0;
  const remainingAvailable = available !== undefined ? Math.max(0, available - cartQty) : Infinity;

  const renderQuantityControls = () => (
    <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-lg h-12 p-1">
      <button
        className={`size-10 flex items-center justify-center active:scale-95 transition ${
          localQty <= 1 || isOutOfStock
            ? 'text-gray-300 dark:text-white/20 cursor-not-allowed'
            : 'text-gray-600 dark:text-gray-300 hover:text-primary'
        }`}
        onClick={() => setLocalQty(q => Math.max(1, q - 1))}
        disabled={localQty <= 1 || isOutOfStock}
      >
        <span className="material-symbols-outlined">remove</span>
      </button>
      <div className="w-8 text-center font-bold text-text-main dark:text-white">{localQty}</div>
      <button
        className={`size-10 flex items-center justify-center active:scale-95 transition ${
          localQty >= remainingAvailable
            ? 'text-gray-300 dark:text-white/20 cursor-not-allowed'
            : 'text-gray-600 dark:text-gray-300 hover:text-primary'
        }`}
        onClick={() => setLocalQty(q => Math.min(q + 1, remainingAvailable))}
        disabled={localQty >= remainingAvailable || isOutOfStock}
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );

  const renderAddButton = () => {
    if (isOutOfStock) {
      return (
        <button
          className="flex-1 h-12 bg-gray-300 text-gray-500 font-bold rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
          disabled
        >
          <span className="material-symbols-outlined text-[20px]">remove_shopping_cart</span>
          <span>{t('product.outOfStock')}</span>
        </button>
      );
    }
    if (orderingClosed) {
      return (
        <button
          className="flex-1 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
          disabled
        >
          <span className="material-symbols-outlined text-[20px]">schedule</span>
          <span>{t('store.closedCheckout')}</span>
        </button>
      );
    }
    return (
      <button
        className="flex-1 h-12 bg-primary hover:bg-red-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 active:scale-[0.98] transition-all"
        onClick={handleAddToCart}
      >
        <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
        <span>{t('product.addToCart')}</span>
        <span className="text-sm">{formatPrice(totalPrice, language)}</span>
      </button>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-32 lg:pb-8">
      <nav className="sticky top-0 z-50 flex items-center justify-between bg-surface-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-gray-100 dark:border-white/10">
        <button
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-text-main dark:text-white"
          onClick={handleGoBack}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center truncate px-4">
          {t('product.productDetails')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              isFavorite ? 'text-primary' : 'text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
            onClick={() => toggleFavorite(favoriteId)}
          >
            <span
              className="material-symbols-outlined"
              style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              favorite
            </span>
          </button>
          <button
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-text-main dark:text-white lg:hidden"
            onClick={() => navigate('/cart')}
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            {cartCount > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-primary border-2 border-white dark:border-background-dark"></span>}
          </button>
        </div>
      </nav>

      <div className="lg:flex lg:gap-8 lg:px-6 lg:pt-6 lg:max-w-5xl lg:mx-auto">
        <div className="relative w-full lg:w-1/2 lg:shrink-0 bg-surface-light dark:bg-surface-dark lg:rounded-2xl lg:overflow-hidden lg:sticky lg:top-20 lg:self-start">
          <div className="w-full aspect-square relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url("${displayProduct.image}")`,
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:from-black/20"></div>
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                <span className="rounded-xl bg-white/95 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-gray-700 shadow-md">
                  {t('product.outOfStock')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-6 lg:px-0 lg:pt-0 flex flex-col gap-6 lg:flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl lg:text-3xl font-bold text-text-main dark:text-white leading-tight transition-opacity duration-300"
                  style={{ opacity: isTransitioning ? 0 : 1 }}
                >
                  {displayProduct.name}
                </h1>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span
                  className="text-xl lg:text-2xl font-bold text-primary transition-opacity duration-300"
                  style={{ opacity: isTransitioning ? 0 : 1 }}
                >
                  {formatPrice(displayProduct.price, language)}
                </span>
                {displayProduct.originalPrice && (
                  <span className="text-xs text-gray-500 line-through">{formatPrice(displayProduct.originalPrice, language)}</span>
                )}
              </div>
            </div>
            {isOutOfStock && (
              <p className="text-sm font-semibold text-red-500">{t('product.outOfStock')}</p>
            )}
            {isLowStock && (
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {t('product.onlyXLeft', { count: available })}
              </p>
            )}
          </div>

          {resolvedProduct.hasChildren && resolvedProduct.children && (
            <div className="flex flex-wrap gap-2">
                {resolvedProduct.children.map((child) => {
                  const childAvail = child.availableStock ?? undefined;
                  const childOos = childAvail !== undefined && childAvail <= 0;
                  return (
                    <button
                      key={child.id}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        childOos
                          ? 'bg-gray-100 dark:bg-white/5 text-gray-400 line-through cursor-not-allowed'
                          : actualChildId === child.id
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-gray-100 dark:bg-white/10 text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                      }`}
                      onClick={() => !childOos && handleChildSelect(child.id)}
                      disabled={childOos}
                    >
                      {child.name}
                    </button>
                  );
                })}
              </div>
          )}

          {resolvedProduct.description && (
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-bold text-text-main dark:text-white">{t('product.description')}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                {resolvedProduct.description}
              </p>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-4 pt-4">
            {renderQuantityControls()}
            {renderAddButton()}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white dark:bg-[#1a0c0c] border-t border-gray-100 dark:border-white/5 p-4 pb-8 lg:pb-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          {renderQuantityControls()}
          {renderAddButton()}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailView;
