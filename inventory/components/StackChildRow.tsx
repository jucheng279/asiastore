import { useState } from 'react';
import { EyeOff, Zap, Flame, FileText } from 'lucide-react';
import { Product, Language } from '../types';
import { InfoModal } from './InfoModal';

interface StackChildRowProps {
  product: Product;
  currentLanguage: Language;
  isReadOnly?: boolean;
  onUpdate?: (productId: string, updates: Partial<Product>) => void;
}

export function StackChildRow({
  product,
  currentLanguage,
  isReadOnly = true,
  onUpdate,
}: StackChildRowProps) {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const hasInfo =
    product.photos.length > 0 ||
    Object.values(product.descriptions).some(d => d.trim() !== '');

  const inputClass = isReadOnly
    ? 'w-full px-2.5 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 cursor-default'
    : 'w-full px-2.5 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 placeholder:text-slate-400 transition-all hover:border-slate-200 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/10';

  const handleUpdate = (updates: Partial<Product>) => {
    if (onUpdate) {
      onUpdate(product.id, updates);
    }
  };

  return (
    <>
      <div className={`group flex items-center border-b border-slate-100 text-sm transition-colors hover:bg-white/60 ${
        !product.visible ? 'bg-slate-100/50' : ''
      }`}>
        <div className="w-7 flex items-center justify-center flex-shrink-0">
          <div className="w-px h-full bg-teal-200" />
        </div>
        <div className="w-1 h-8 border-l-2 border-teal-300 flex-shrink-0" />
        <div className={`flex items-center flex-1 transition-opacity ${!product.visible ? 'opacity-50' : ''}`}>
          <div className="min-w-[12.75rem] flex-1 px-1.5 py-1 border-r border-slate-100">
            <div className="flex items-center gap-1">
              {!product.visible && (
                <EyeOff size={14} className="text-slate-500 flex-shrink-0" />
              )}
              {product.flash && (
                <Zap size={14} className="text-orange-500 flex-shrink-0" />
              )}
              {product.trending && (
                <Flame size={14} className="text-red-500 flex-shrink-0" />
              )}
              <input
                type="text"
                value={product.names[currentLanguage]}
                onChange={e => handleUpdate({ names: { ...product.names, [currentLanguage]: e.target.value } })}
                readOnly={isReadOnly}
                className={inputClass}
                placeholder="Variant name"
              />
            </div>
          </div>
          <div className="w-20 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={product.price}
              onChange={e => handleUpdate({ price: e.target.value })}
              onWheel={e => e.currentTarget.blur()}
              readOnly={isReadOnly}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div className="w-20 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={product.newPrice}
              onChange={e => handleUpdate({ newPrice: e.target.value })}
              onWheel={e => e.currentTarget.blur()}
              readOnly={isReadOnly}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
          <div className="w-14 px-1.5 py-1 border-r border-slate-100">
            <input
              type="number"
              value={product.stock}
              readOnly={isReadOnly}
              className={inputClass}
              placeholder="0"
            />
          </div>
          <div className="w-[5.5rem] px-4 py-1 border-r border-slate-100 flex items-center justify-center">
            <span className="text-sm text-slate-500">{product.preserve}</span>
          </div>
          <div className="w-[5.5rem] px-4 py-1 border-r border-slate-100 flex items-center justify-center">
            {(() => {
              const avail = (parseInt(product.stock, 10) || 0) - product.preserve;
              const color = avail <= 0 ? 'text-red-600 font-bold' : avail <= 10 ? 'text-amber-600 font-semibold' : 'text-slate-700 font-medium';
              return <span className={`text-sm ${color}`}>{avail}</span>;
            })()}
          </div>
          <div className="w-36 px-1.5 py-1 border-r border-slate-100">
            <input
              type="date"
              value={product.expiration}
              readOnly={isReadOnly}
              className={`w-full px-2 py-1.5 bg-transparent border border-transparent rounded-md text-sm text-slate-700 ${isReadOnly ? 'cursor-default' : ''}`}
            />
          </div>
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
            <span className="flex items-center justify-center text-sm text-slate-400">--</span>
          </div>
        </div>
        <div className="w-14 px-1.5 py-1 flex justify-center">
          <span className="text-slate-300 text-xs">--</span>
        </div>
      </div>

      {isInfoModalOpen && (
        <InfoModal
          isOpen={isInfoModalOpen}
          product={product}
          onClose={() => setIsInfoModalOpen(false)}
          onUpdate={onUpdate || (() => {})}
        />
      )}
    </>
  );
}
