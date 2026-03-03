import { useState, useEffect } from 'react';
import { MoveHorizontal as MoreHorizontal, EyeOff, Zap, Award, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { Product, Language } from '../types';
import { InfoModal } from './InfoModal';
import { ProductSettingsPopover } from './ProductSettingsPopover';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface ProductRowProps {
  product: Product;
  currentLanguage: Language;
  onUpdate: (productId: string, updates: Partial<Product>) => void;
  onOrderChange: (productId: string, newOrder: number) => void;
  onDelete: (productId: string) => void;
  isSettingsOpen: boolean;
  onSettingsToggle: (productId: string | null) => void;
  isReadOnly?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (productId: string) => void;
  subProductCount?: number;
  isExpiryItem?: boolean;
}

export function ProductRow({
  product,
  currentLanguage,
  onUpdate,
  onOrderChange,
  onDelete,
  isSettingsOpen,
  onSettingsToggle,
  isReadOnly,
  isExpanded,
  onToggleExpand,
  subProductCount = 0,
  isExpiryItem,
}: ProductRowProps) {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderInput, setOrderInput] = useState(String(product.order));

  useEffect(() => {
    setOrderInput(String(product.order));
  }, [product.order]);

  const handleNameChange = (value: string) => {
    onUpdate(product.id, {
      names: {
        ...product.names,
        [currentLanguage]: value,
      },
    });
  };

  const handleStockChange = (value: string) => {
    const intValue = value === '' ? '' : String(parseInt(value, 10) || 0);
    onUpdate(product.id, { stock: intValue });
  };

  const handleOrderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      const newOrder = parseInt(orderInput, 10);
      if (!isNaN(newOrder) && newOrder > 0 && newOrder !== product.order) {
        onOrderChange(product.id, newOrder);
      } else {
        setOrderInput(String(product.order));
      }
    } else if (e.key === 'Escape') {
      setOrderInput(String(product.order));
      e.currentTarget.blur();
    }
  };

  const handleOrderBlur = () => {
    setOrderInput(String(product.order));
  };

  const handleToggleVisibility = () => {
    onUpdate(product.id, { visible: !product.visible });
  };

  const handleToggleTrending = () => {
    onUpdate(product.id, { trending: !product.trending });
  };

  const handleToggleFlash = () => {
    onUpdate(product.id, { flash: !product.flash });
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleSettingsClick = () => {
    onSettingsToggle(isSettingsOpen ? null : product.id);
  };

  const handleConfirmDelete = () => {
    setIsDeleteModalOpen(false);
    onSettingsToggle(null);
    onDelete(product.id);
  };

  const hasInfo =
    product.photos.length > 0 ||
    Object.values(product.descriptions).some(d => d.trim() !== '');

  return (
    <>
      <div
        data-product-id={product.id}
        className={`group flex items-center border-b border-slate-100 text-sm transition-colors hover:bg-slate-50/50 ${
        !product.visible ? 'bg-slate-50' : ''
      }`}>
        <div className="w-7 flex items-center justify-center flex-shrink-0">
          {onToggleExpand ? (
            <button
              onClick={() => onToggleExpand(product.id)}
              className={`p-0.5 rounded transition-colors ${
                subProductCount > 0
                  ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-300'
              }`}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : null}
        </div>
        <div className={`flex items-center flex-1 transition-opacity ${!product.visible ? 'opacity-50' : ''}`}>
          <div className="w-52 px-1.5 py-1 border-r border-slate-100">
            <div className="flex items-center gap-1">
              {!product.visible && (
                <EyeOff size={14} className="text-slate-500 flex-shrink-0" />
              )}
              {product.flash && (
                <Zap size={14} className="text-orange-500 flex-shrink-0" />
              )}
              {product.trending && (
                <Award size={14} className="text-amber-500 flex-shrink-0" />
              )}
              <input
                type="text"
                value={product.names[currentLanguage]}
                onChange={e => handleNameChange(e.target.value)}
                readOnly={isReadOnly}
                className={`w-full px-2.5 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 placeholder:text-slate-400 transition-all ${
                  isReadOnly ? 'cursor-default' : 'hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10'
                }`}
                placeholder="Product name"
              />
              {subProductCount > 0 && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-teal-50 text-teal-600 text-[10px] font-medium rounded-full whitespace-nowrap">
                  {subProductCount}
                </span>
              )}
            </div>
          </div>
          <div className="w-20 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={product.price}
              onChange={e => onUpdate(product.id, { price: e.target.value })}
              onWheel={e => e.currentTarget.blur()}
              readOnly={isReadOnly}
              className={`w-full px-2.5 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 placeholder:text-slate-400 transition-all ${
                isReadOnly ? 'cursor-default' : 'hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10'
              }`}
              placeholder="0.00"
            />
          </div>
          <div className="w-20 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={product.newPrice}
              onChange={e => onUpdate(product.id, { newPrice: e.target.value })}
              onWheel={e => e.currentTarget.blur()}
              readOnly={isReadOnly || isExpiryItem}
              className={`w-full px-2.5 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 placeholder:text-slate-400 transition-all ${
                (isReadOnly || isExpiryItem) ? 'cursor-default' : 'hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10'
              }`}
              placeholder="0.00"
            />
          </div>
          <div className="w-14 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={product.stock}
              onChange={e => handleStockChange(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              readOnly={isReadOnly}
              className={`w-full px-2.5 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 placeholder:text-slate-400 transition-all ${
                isReadOnly ? 'cursor-default' : 'hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10'
              }`}
              placeholder="0"
            />
          </div>
          <div className="w-[4.5rem] px-1.5 py-1 border-r border-slate-100 flex items-center justify-center">
            <span className="text-sm text-slate-500">{product.preserve}</span>
          </div>
          <div className="w-[4.5rem] px-1.5 py-1 border-r border-slate-100 flex items-center justify-center">
            {(() => {
              const avail = (parseInt(product.stock, 10) || 0) - product.preserve;
              const color = avail <= 0 ? 'text-red-600 font-bold' : avail <= 10 ? 'text-amber-600 font-semibold' : 'text-slate-700 font-medium';
              return <span className={`text-sm ${color}`}>{avail}</span>;
            })()}
          </div>
          {isExpiryItem && (
            <div className="w-36 px-1.5 py-1 border-r border-slate-100">
              <input
                type="date"
                value={product.expiration}
                onChange={e => onUpdate(product.id, { expiration: e.target.value })}
                className="w-full px-2 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 placeholder:text-slate-400 transition-all hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10"
              />
            </div>
          )}
          <div className="w-16 px-1.5 py-1 border-r border-slate-100 flex items-center justify-center">
            <button
              onClick={() => setIsInfoModalOpen(true)}
              className={`relative p-1.5 rounded-md transition-all ${
                hasInfo
                  ? 'text-primary-600 hover:bg-primary-50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="View product info"
            >
              <FileText size={16} />
              {hasInfo && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </button>
          </div>
          <div className="w-14 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={orderInput}
              onChange={e => setOrderInput(e.target.value)}
              onKeyDown={handleOrderKeyDown}
              onBlur={handleOrderBlur}
              onWheel={e => e.currentTarget.blur()}
              className={`w-full px-2.5 py-1.5 rounded-md text-sm transition-all ${
                orderInput !== String(product.order)
                  ? 'border-primary-400 bg-primary-50 text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                  : 'bg-transparent border border-transparent text-slate-700 placeholder:text-slate-400 hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10'
              }`}
            />
          </div>
        </div>
        <div className="w-14 px-1.5 py-1 flex items-center justify-center relative">
          <button
            data-settings-button
            onClick={handleSettingsClick}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
          >
            <MoreHorizontal size={16} />
          </button>
          {isSettingsOpen && (
            <ProductSettingsPopover
              isVisible={product.visible}
              isFlash={product.flash}
              isTrending={product.trending}
              onToggleVisibility={handleToggleVisibility}
              onToggleFlash={handleToggleFlash}
              onToggleTrending={handleToggleTrending}
              onDelete={handleDeleteClick}
              onClose={() => onSettingsToggle(null)}
              hideFlashTrending={isExpiryItem}
            />
          )}
        </div>
      </div>

      <InfoModal
        isOpen={isInfoModalOpen}
        product={product}
        onClose={() => setIsInfoModalOpen(false)}
        onUpdate={onUpdate}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        productName={product.names[currentLanguage]}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
