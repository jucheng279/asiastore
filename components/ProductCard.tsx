import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { formatPrice, getExpiryText, formatFlashTimeRemaining } from '../lib/formatters';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  quantity: number;
  isFavorite: boolean;
  onNavigate: () => void;
  onToggleFavorite: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  isFavorite,
  onNavigate,
  onToggleFavorite,
  onIncrease,
  onDecrease,
}) => {
  const { t } = useTranslation();
  const { language } = useProductData();
  const daysUntilExpiry = product.expiryDate ? getDaysUntilExpiry(product.expiryDate) : null;
  const flashTimeText = product.flashStartDate && product.flashDays
    ? formatFlashTimeRemaining(product.flashStartDate, product.flashDays, t)
    : product.flashSaleEndsIn;

  const available = product.availableStock ?? undefined;
  const isOutOfStock = !product.hasChildren && available !== undefined && available <= 0;
  const isLowStock = !product.hasChildren && available !== undefined && available > 0 && available <= 10;
  const atMaxQty = available !== undefined && quantity >= available;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={onNavigate}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        {product.isBestSeller && (
          <div className="absolute right-2 top-2 z-10 rounded bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">
            {t('product.bestSeller')}
          </div>
        )}
        {product.discountPercentage ? (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            -{product.discountPercentage}%
          </div>
        ) : product.tags && product.tags.includes('Fresh') ? (
          <div className="absolute left-2 top-2 z-10 rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {t('product.fresh')}
          </div>
        ) : product.isSale ? (
          <div className="absolute left-2 top-2 z-10 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {t('product.sale')}
          </div>
        ) : product.isNew && !product.isNearExpiry ? (
          <div className="absolute left-2 top-2 z-10 rounded bg-blue-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {t('product.new')}
          </div>
        ) : null}
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url('${product.image}')` }}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 shadow-sm">
              {t('product.outOfStock')}
            </span>
          </div>
        )}
        {product.isFlashSale && flashTimeText && !isOutOfStock && (
          <div className="absolute bottom-10 left-2 right-2 z-10 flex items-center justify-center gap-1 rounded bg-black/70 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            <span className="material-symbols-outlined text-[12px]">timer</span>
            {t('product.endsIn', { time: flashTimeText })}
          </div>
        )}
        <button
          className={`absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform active:scale-90 ${
            isFavorite ? 'text-primary' : 'text-gray-400 hover:text-primary'
          } ${isOutOfStock ? 'z-20' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            favorite
          </span>
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-text-main dark:text-white">
          {product.name}
        </h3>
        {product.isNearExpiry && daysUntilExpiry !== null && (
          <p className={`text-[11px] font-medium mt-1 ${daysUntilExpiry <= 1 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
            {getExpiryText(daysUntilExpiry, t)}
          </p>
        )}
        {isLowStock && (
          <p className="text-[11px] font-medium mt-1 text-amber-600 dark:text-amber-400">
            {t('product.onlyXLeft', { count: available })}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex flex-row flex-wrap items-baseline gap-x-1.5 leading-none min-w-0">
            {product.originalPrice ? (
              <>
                <span className="text-[11px] text-text-sub line-through whitespace-nowrap">
                  {formatPrice(product.originalPrice, language)}
                </span>
                <span className="text-base font-bold text-red-500 whitespace-nowrap">
                  {formatPrice(product.price, language)}
                  {product.unit && (
                    <span className="text-xs font-normal text-text-sub ml-1">{product.unit}</span>
                  )}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-text-main dark:text-white whitespace-nowrap">
                {formatPrice(product.price, language)}
                {product.unit && (
                  <span className="text-xs font-normal text-text-sub ml-1">{product.unit}</span>
                )}
              </span>
            )}
          </div>
          {product.hasChildren ? (
            <span className="text-xs font-semibold text-primary whitespace-nowrap">{t('common.view')}</span>
          ) : isOutOfStock ? (
            <span className="text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap">
              {t('product.outOfStock')}
            </span>
          ) : quantity === 0 ? (
            <button
              className="flex size-8 items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-95 shadow-md shadow-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                onIncrease();
              }}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="flex size-7 items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-95 shadow-md shadow-primary/20"
                onClick={onDecrease}
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <span className="w-6 text-center text-sm font-bold text-text-main dark:text-white">
                {quantity}
              </span>
              <button
                className={`flex size-7 items-center justify-center rounded-full transition-transform active:scale-95 shadow-md ${
                  atMaxQty
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-gray-200/20'
                    : 'bg-primary text-white shadow-primary/20'
                }`}
                onClick={() => { if (!atMaxQty) onIncrease(); }}
                disabled={atMaxQty}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
