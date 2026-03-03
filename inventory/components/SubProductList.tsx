import { Plus } from 'lucide-react';
import { Product, Language } from '../types';
import { SubProductRow } from './SubProductRow';

interface SubProductListProps {
  subProducts: Product[];
  parentProductId: string;
  currentLanguage: Language;
  onUpdate: (productId: string, updates: Partial<Product>) => void;
  onDelete: (productId: string) => void;
  onOrderChange: (subProductId: string, newOrder: number) => void;
  onAddSubProduct: (parentProductId: string) => void;
  openSettingsId: string | null;
  onSettingsToggle: (productId: string | null) => void;
}

export function SubProductList({
  subProducts,
  parentProductId,
  currentLanguage,
  onUpdate,
  onDelete,
  onOrderChange,
  onAddSubProduct,
  openSettingsId,
  onSettingsToggle,
}: SubProductListProps) {
  return (
    <div className="bg-slate-50/60">
      {subProducts.map(subProduct => (
        <SubProductRow
          key={subProduct.id}
          product={subProduct}
          currentLanguage={currentLanguage}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onOrderChange={onOrderChange}
          isSettingsOpen={openSettingsId === subProduct.id}
          onSettingsToggle={onSettingsToggle}
        />
      ))}
      <div className="border-b border-slate-100">
        <button
          onClick={() => onAddSubProduct(parentProductId)}
          className="flex items-center gap-1.5 ml-8 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Plus size={12} />
          <span>Add variant</span>
        </button>
      </div>
    </div>
  );
}
