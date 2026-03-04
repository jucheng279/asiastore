import { useState, useRef, useEffect } from 'react';
import { Plus, Package, ImagePlus, X, Loader as Loader2 } from 'lucide-react';
import { Product, Language, SubCategory } from '../types';
import { ProductTableHeader } from './ProductTableHeader';
import { ProductRow } from './ProductRow';
import { SubProductList } from './SubProductList';

interface SubCategoryGroup {
  subCategory: SubCategory | null;
  products: Product[];
}

interface ProductTableProps {
  products: Product[];
  allProducts: Product[];
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  onAddProduct: () => void;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  onDeleteProduct: (productId: string) => void;
  onOrderChange: (productId: string, newOrder: number) => void;
  onAddSubProduct: (parentProductId: string) => void;
  onSubProductOrderChange: (subProductId: string, newOrder: number) => void;
  getSubProducts: (parentProductId: string) => Product[];
  categoryName: string;
  subCategories?: SubCategory[];
  isMainCategoryView?: boolean;
  categoryImageUrl?: string;
  categoryImageUploading?: boolean;
  onCategoryImageUpload?: (file: File) => void;
  onCategoryImageRemove?: () => void;
  highlightedProductId?: string | null;
}

export function ProductTable({
  products,
  allProducts,
  currentLanguage,
  onLanguageChange,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onOrderChange,
  onAddSubProduct,
  onSubProductOrderChange,
  getSubProducts,
  categoryName,
  subCategories = [],
  isMainCategoryView = false,
  categoryImageUrl,
  categoryImageUploading = false,
  onCategoryImageUpload,
  onCategoryImageRemove,
  highlightedProductId,
}: ProductTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  const getGroupedProducts = (): SubCategoryGroup[] => {
    if (!isMainCategoryView || subCategories.length === 0) {
      return [{ subCategory: null, products: [...products].sort((a, b) => a.order - b.order) }];
    }

    const groups: SubCategoryGroup[] = [];
    const productsWithoutSub = products.filter(p => !p.subCategoryId);

    if (productsWithoutSub.length > 0) {
      groups.push({
        subCategory: null,
        products: productsWithoutSub.sort((a, b) => a.order - b.order),
      });
    }

    subCategories.forEach(sub => {
      const subProducts = products.filter(p => p.subCategoryId === sub.id);
      if (subProducts.length > 0) {
        groups.push({
          subCategory: sub,
          products: subProducts.sort((a, b) => a.order - b.order),
        });
      }
    });

    return groups;
  };

  const toggleExpand = (productId: string) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!highlightedProductId) return;

    const variant = allProducts.find(p => p.id === highlightedProductId && p.parentProductId);
    if (variant?.parentProductId) {
      setExpandedProductIds(prev => {
        const next = new Set(prev);
        next.add(variant.parentProductId!);
        return next;
      });
    }

    const scrollTimer = setTimeout(() => {
      const el = document.querySelector(`[data-product-id="${highlightedProductId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('search-highlight');
        setTimeout(() => el.classList.remove('search-highlight'), 2500);
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [highlightedProductId, allProducts]);

  const totalProducts = allProducts.filter(
    p => products.some(mp => mp.id === p.id) || products.some(mp => p.parentProductId === mp.id)
  ).length;

  const groupedProducts = getGroupedProducts();
  const hasProducts = products.length > 0;

  const handleSettingsToggle = (productId: string | null) => {
    setOpenSettingsId(productId);
  };

  const computeVariantAggregates = (variants: Product[]) => {
    if (variants.length === 0) return undefined;
    let lowestEffective = Infinity;
    let lowestPrice = '';
    let lowestSalePrice = '';
    let totalStock = 0;
    let totalPreserve = 0;

    variants.forEach(v => {
      const price = parseFloat(v.price) || 0;
      const sale = parseFloat(v.newPrice) || 0;
      const effective = (sale > 0 && sale < price) ? sale : price;
      if (effective < lowestEffective) {
        lowestEffective = effective;
        lowestPrice = v.price;
        lowestSalePrice = v.newPrice;
      }
      totalStock += parseInt(v.stock, 10) || 0;
      totalPreserve += v.preserve;
    });

    return {
      price: lowestPrice,
      salePrice: lowestSalePrice,
      stock: totalStock,
      preserve: totalPreserve,
      available: totalStock - totalPreserve,
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">{categoryName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {products.length} {products.length === 1 ? 'product' : 'products'}
              {totalProducts > products.length && (
                <span className="text-slate-400">
                  {' '}({totalProducts - products.length} {totalProducts - products.length === 1 ? 'variant' : 'variants'})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {categoryImageUrl ? (
              <div className="relative group">
                <div
                  className="w-10 h-10 rounded-full bg-cover bg-center bg-no-repeat border-2 border-slate-200 shadow-sm"
                  style={{ backgroundImage: `url("${categoryImageUrl}")` }}
                />
                <button
                  onClick={onCategoryImageRemove}
                  className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                <ImagePlus size={16} className="text-slate-400" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={categoryImageUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {categoryImageUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ImagePlus size={12} />
              )}
              {categoryImageUrl ? 'Change' : 'Upload'} Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onCategoryImageUpload) {
                  onCategoryImageUpload(file);
                }
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <button
            onClick={onAddProduct}
            className="btn-primary"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-max bg-white rounded-xl border border-slate-200 shadow-soft">
          <ProductTableHeader
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
          />

          {!hasProducts ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Package size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No products yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">
                Get started by adding your first product
              </p>
              <button
                onClick={onAddProduct}
                className="btn-primary"
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>
          ) : (
            groupedProducts.map((group, groupIndex) => (
              <div key={group.subCategory?.id || 'uncategorized'}>
                {isMainCategoryView && subCategories.length > 0 && (
                  <div
                    className={`flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200 ${
                      groupIndex > 0 ? 'mt-2 border-t' : ''
                    }`}
                  >
                    <span className="font-medium text-slate-700 text-sm">
                      {group.subCategory?.name || 'Uncategorized'}
                    </span>
                    <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
                      {group.products.length}
                    </span>
                  </div>
                )}
                {group.products.map(product => {
                  const subProducts = getSubProducts(product.id);
                  const isExpanded = expandedProductIds.has(product.id);
                  const hasVariants = subProducts.length > 0;
                  const variantAggregates = hasVariants ? computeVariantAggregates(subProducts) : undefined;
                  return (
                    <div key={product.id}>
                      <ProductRow
                        product={product}
                        currentLanguage={currentLanguage}
                        onUpdate={onUpdateProduct}
                        onDelete={onDeleteProduct}
                        onOrderChange={onOrderChange}
                        isSettingsOpen={openSettingsId === product.id}
                        onSettingsToggle={handleSettingsToggle}
                        isExpanded={isExpanded}
                        onToggleExpand={toggleExpand}
                        subProductCount={subProducts.length}
                        hasVariants={hasVariants}
                        variantAggregates={variantAggregates}
                      />
                      {isExpanded && (
                        <SubProductList
                          subProducts={subProducts}
                          parentProductId={product.id}
                          currentLanguage={currentLanguage}
                          onUpdate={onUpdateProduct}
                          onDelete={onDeleteProduct}
                          onOrderChange={onSubProductOrderChange}
                          onAddSubProduct={onAddSubProduct}
                          openSettingsId={openSettingsId}
                          onSettingsToggle={handleSettingsToggle}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
