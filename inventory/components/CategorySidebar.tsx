import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, FolderTree, Store, Clock, Zap, ArrowUpFromLine, Users, Activity, Search, LogOut, Settings } from 'lucide-react';
import { Category, SubCategory, Product, ProductNames, ActiveView, ExpiryItem, FlashSaleItem } from '../types';
import { CategoryNameModal } from './CategoryNameModal';

export type SearchResultType = 'product' | 'expiry' | 'flash';

export interface SearchResult {
  id: string;
  names: { en: string; sv: string; zh: string };
  categoryId: string;
  subCategoryId: string | null;
  parentProductId: string | null;
  type: SearchResultType;
}

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  selectedSubCategoryId: string | null;
  activeView: ActiveView;
  expiryItemCount: number;
  flashSaleItemCount: number;
  pushStatus: 'idle' | 'pushing' | 'success' | 'error';
  pushError?: string;
  draftSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSelectCategory: (categoryId: string) => void;
  onSelectSubCategory: (categoryId: string, subCategoryId: string) => void;
  onSelectExpiryView: () => void;
  onSelectFlashSalesView: () => void;
  onSelectUsersView: () => void;
  onSelectDiagnosticsView: () => void;
  onSelectStoreSettingsView: () => void;
  userCount: number;
  onAddCategory: (name: string) => void;
  onAddSubCategory: (categoryId: string, name: string) => void;
  onRenameCategory: (categoryId: string, names: ProductNames) => void;
  onRenameSubCategory: (categoryId: string, subCategoryId: string, names: ProductNames) => void;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteSubCategory: (categoryId: string, subCategoryId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleSubCategory: (categoryId: string, subCategoryId: string) => void;
  onPushUpdate: () => void;
  products: Product[];
  expiryItems: ExpiryItem[];
  flashSaleItems: FlashSaleItem[];
  onSearchNavigate: (result: SearchResult) => void;
  onSignOut: () => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  selectedSubCategoryId,
  activeView,
  expiryItemCount,
  flashSaleItemCount,
  pushStatus,
  pushError,
  draftSaveStatus,
  onSelectCategory,
  onSelectSubCategory,
  onSelectExpiryView,
  onSelectFlashSalesView,
  onSelectUsersView,
  onSelectDiagnosticsView,
  onSelectStoreSettingsView,
  userCount,
  onAddCategory,
  onAddSubCategory,
  onRenameCategory,
  onRenameSubCategory,
  onDeleteCategory,
  onDeleteSubCategory,
  onToggleCategory,
  onPushUpdate,
  products,
  expiryItems,
  flashSaleItems,
  onSearchNavigate,
  onSignOut,
}: CategorySidebarProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState<Record<string, string>>({});
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [editModal, setEditModal] = useState<{
    type: 'category' | 'subcategory';
    categoryId: string;
    subCategoryId?: string;
    names: ProductNames;
    displayName: string;
  } | null>(null);

  const categoryMap = useMemo(() => {
    const map: Record<string, { catName: string; subs: Record<string, string> }> = {};
    for (const cat of categories) {
      const subs: Record<string, string> = {};
      for (const sub of cat.subCategories) {
        subs[sub.id] = sub.name;
      }
      map[cat.id] = { catName: cat.name, subs };
    }
    return map;
  }, [categories]);

  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const matchesQuery = (names: { en: string; sv: string; zh: string }) =>
      names.en.toLowerCase().includes(q) ||
      names.sv.toLowerCase().includes(q) ||
      names.zh.toLowerCase().includes(q);

    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const item of expiryItems) {
      if (matchesQuery(item.names)) {
        seen.add(item.id);
        results.push({
          id: item.id,
          names: item.names,
          categoryId: item.categoryId,
          subCategoryId: item.subCategoryId,
          parentProductId: item.parentProductId,
          type: 'expiry',
        });
      }
      if (item.isStackParent && item.childItems) {
        for (const child of item.childItems) {
          if (matchesQuery(child.names) && !seen.has(child.id)) {
            seen.add(child.id);
            results.push({
              id: child.id,
              names: child.names,
              categoryId: child.categoryId,
              subCategoryId: child.subCategoryId,
              parentProductId: child.parentProductId,
              type: 'expiry',
            });
          }
        }
      }
    }

    for (const item of flashSaleItems) {
      if (matchesQuery(item.names) && !seen.has(item.id)) {
        seen.add(item.id);
        results.push({
          id: item.id,
          names: item.names,
          categoryId: item.categoryId,
          subCategoryId: item.subCategoryId,
          parentProductId: item.parentProductId,
          type: 'flash',
        });
      }
      if (item.isStackParent && item.childItems) {
        for (const child of item.childItems) {
          if (matchesQuery(child.names) && !seen.has(child.id)) {
            seen.add(child.id);
            results.push({
              id: child.id,
              names: child.names,
              categoryId: child.categoryId,
              subCategoryId: child.subCategoryId,
              parentProductId: child.parentProductId,
              type: 'flash',
            });
          }
        }
      }
    }

    for (const p of products) {
      if (matchesQuery(p.names) && !seen.has(p.id)) {
        seen.add(p.id);
        results.push({
          id: p.id,
          names: p.names,
          categoryId: p.categoryId,
          subCategoryId: p.subCategoryId,
          parentProductId: p.parentProductId,
          type: 'product',
        });
      }
    }

    return results.slice(0, 50);
  }, [searchQuery, products, expiryItems, flashSaleItems]);

  const getBreadcrumb = (result: SearchResult): string => {
    if (result.type === 'expiry') return 'Expiry Items';
    if (result.type === 'flash') return 'Flash Sales';

    const cat = categoryMap[result.categoryId];
    const catName = cat?.catName || '';
    const subName = result.subCategoryId ? cat?.subs[result.subCategoryId] || '' : '';

    if (result.parentProductId) {
      const parent = products.find(p => p.id === result.parentProductId);
      const parentName = parent?.names.en || '';
      const parts = [catName, subName, parentName].filter(Boolean);
      return parts.join(' > ');
    }

    const parts = [catName, subName].filter(Boolean);
    return parts.join(' > ');
  };

  const getTypeBadge = (type: SearchResultType) => {
    if (type === 'expiry') return { label: 'Expiry', className: 'bg-amber-100 text-amber-700' };
    if (type === 'flash') return { label: 'Flash', className: 'bg-orange-100 text-orange-700' };
    return null;
  };

  const handleResultClick = (result: SearchResult) => {
    onSearchNavigate(result);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!searchQuery) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const handleAddSubCategory = (categoryId: string) => {
    const name = newSubCategoryName[categoryId]?.trim();
    if (name) {
      onAddSubCategory(categoryId, name);
      setNewSubCategoryName(prev => ({ ...prev, [categoryId]: '' }));
    }
  };

  const openEditCategory = (category: Category) => {
    setEditModal({
      type: 'category',
      categoryId: category.id,
      names: { ...category.names },
      displayName: category.names.en || category.name,
    });
  };

  const openEditSubCategory = (categoryId: string, sub: SubCategory) => {
    setEditModal({
      type: 'subcategory',
      categoryId,
      subCategoryId: sub.id,
      names: { ...sub.names },
      displayName: sub.names.en || sub.name,
    });
  };

  const handleModalSave = (names: ProductNames) => {
    if (!editModal) return;
    if (editModal.type === 'category') {
      onRenameCategory(editModal.categoryId, names);
    } else if (editModal.subCategoryId) {
      onRenameSubCategory(editModal.categoryId, editModal.subCategoryId, names);
    }
  };

  return (
    <div className="w-72 bg-white border-r border-slate-200 h-full flex flex-col">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Store size={18} className="text-primary-600" />
          </div>
          <h1 className="font-semibold text-slate-800">Asia Shop Inventory</h1>
        </div>
        <div ref={searchRef} className="relative mt-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  searchInputRef.current?.blur();
                }
              }}
              placeholder="Search products..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/10 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="absolute left-0 top-full mt-1 min-w-[360px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  No products found
                </div>
              ) : (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </div>
                  {searchResults.map(result => {
                    const badge = getTypeBadge(result.type);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-700">
                            {result.names.en || result.names.sv || result.names.zh || 'Unnamed'}
                          </span>
                          {badge && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {getBreadcrumb(result)}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-1">
          <div
            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
            className="flex items-center gap-1.5 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-all duration-150"
          >
            {isCategoriesExpanded ? (
              <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
            )}
            <FolderTree size={16} className="text-slate-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium text-slate-700">Categories</span>
            {categories.length > 0 && (
              <span className="text-xs text-slate-400">{categories.length}</span>
            )}
          </div>

          {isCategoriesExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-100">
              <div className="flex gap-2 py-1.5 mb-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  placeholder="New category..."
                  className="input-field-compact flex-1"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="p-2 bg-primary-600 text-white rounded-lg transition-all duration-150 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-slate-500">No categories yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add one above to get started</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {categories.map(category => (
                    <CategoryItem
                      key={category.id}
                      category={category}
                      selectedCategoryId={selectedCategoryId}
                      selectedSubCategoryId={selectedSubCategoryId}
                      activeView={activeView}
                      newSubCategoryName={newSubCategoryName[category.id] || ''}
                      onSelectCategory={onSelectCategory}
                      onSelectSubCategory={onSelectSubCategory}
                      onToggleCategory={onToggleCategory}
                      onStartEditCategory={() => openEditCategory(category)}
                      onDeleteCategory={() => onDeleteCategory(category.id)}
                      onAddSubCategory={() => handleAddSubCategory(category.id)}
                      onSubCategoryNameChange={(val) =>
                        setNewSubCategoryName(prev => ({ ...prev, [category.id]: val }))
                      }
                      onStartEditSubCategory={(sub) => openEditSubCategory(category.id, sub)}
                      onDeleteSubCategory={(subId) => onDeleteSubCategory(category.id, subId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          onClick={onSelectExpiryView}
          className={`flex items-center gap-1.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
            activeView === 'expiry'
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-slate-50 border border-transparent'
          }`}
        >
          <span className="w-4 flex-shrink-0" />
          <Clock size={16} className={`flex-shrink-0 ${activeView === 'expiry' ? 'text-primary-600' : 'text-slate-500'}`} />
          <span className={`flex-1 text-sm font-medium ${
            activeView === 'expiry' ? 'text-primary-700' : 'text-slate-700'
          }`}>
            Expiry Items
          </span>
          {expiryItemCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
              {expiryItemCount}
            </span>
          )}
        </div>

        <div
          onClick={onSelectFlashSalesView}
          className={`flex items-center gap-1.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 mt-1 ${
            activeView === 'flashSales'
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-slate-50 border border-transparent'
          }`}
        >
          <span className="w-4 flex-shrink-0" />
          <Zap size={16} className={`flex-shrink-0 ${activeView === 'flashSales' ? 'text-orange-500' : 'text-slate-500'}`} />
          <span className={`flex-1 text-sm font-medium ${
            activeView === 'flashSales' ? 'text-primary-700' : 'text-slate-700'
          }`}>
            Flash Sales
          </span>
          {flashSaleItemCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
              {flashSaleItemCount}
            </span>
          )}
        </div>

        <div
          onClick={onSelectUsersView}
          className={`flex items-center gap-1.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 mt-1 ${
            activeView === 'users'
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-slate-50 border border-transparent'
          }`}
        >
          <span className="w-4 flex-shrink-0" />
          <Users size={16} className={`flex-shrink-0 ${activeView === 'users' ? 'text-primary-600' : 'text-slate-500'}`} />
          <span className={`flex-1 text-sm font-medium ${
            activeView === 'users' ? 'text-primary-700' : 'text-slate-700'
          }`}>
            Users
          </span>
          {userCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              {userCount}
            </span>
          )}
        </div>

        <div
          onClick={onSelectDiagnosticsView}
          className={`flex items-center gap-1.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 mt-1 ${
            activeView === 'diagnostics'
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-slate-50 border border-transparent'
          }`}
        >
          <span className="w-4 flex-shrink-0" />
          <Activity size={16} className={`flex-shrink-0 ${activeView === 'diagnostics' ? 'text-primary-600' : 'text-slate-500'}`} />
          <span className={`flex-1 text-sm font-medium ${
            activeView === 'diagnostics' ? 'text-primary-700' : 'text-slate-700'
          }`}>
            Diagnostics
          </span>
        </div>

        <div
          onClick={onSelectStoreSettingsView}
          className={`flex items-center gap-1.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 mt-1 ${
            activeView === 'storeSettings'
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-slate-50 border border-transparent'
          }`}
        >
          <span className="w-4 flex-shrink-0" />
          <Settings size={16} className={`flex-shrink-0 ${activeView === 'storeSettings' ? 'text-primary-600' : 'text-slate-500'}`} />
          <span className={`flex-1 text-sm font-medium ${
            activeView === 'storeSettings' ? 'text-primary-700' : 'text-slate-700'
          }`}>
            Store Settings
          </span>
        </div>
      </div>

      <div className="p-3 border-t border-slate-200 space-y-2">
        {draftSaveStatus !== 'idle' && (
          <div className={`text-center text-xs font-medium transition-opacity duration-300 ${
            draftSaveStatus === 'saving' ? 'text-slate-400' :
            draftSaveStatus === 'saved' ? 'text-emerald-500' :
            'text-red-500'
          }`}>
            {draftSaveStatus === 'saving' && 'Saving draft...'}
            {draftSaveStatus === 'saved' && 'All changes saved'}
            {draftSaveStatus === 'error' && 'Draft save failed'}
          </div>
        )}
        {pushStatus === 'success' && (
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 text-center font-medium">
            Update pushed successfully
          </div>
        )}
        {pushStatus === 'error' && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 text-center font-medium">
            {pushError || 'Push failed'}
          </div>
        )}
        <button
          onClick={onPushUpdate}
          disabled={pushStatus === 'pushing'}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <ArrowUpFromLine size={16} className={pushStatus === 'pushing' ? 'animate-pulse' : ''} />
          {pushStatus === 'pushing' ? 'Pushing...' : 'Push Update'}
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-500 text-xs font-medium rounded-lg transition-all duration-150 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      <CategoryNameModal
        isOpen={editModal !== null}
        title={editModal?.displayName || ''}
        names={editModal?.names || { en: '', sv: '', zh: '' }}
        onSave={handleModalSave}
        onClose={() => setEditModal(null)}
      />
    </div>
  );
}

interface CategoryItemProps {
  category: Category;
  selectedCategoryId: string | null;
  selectedSubCategoryId: string | null;
  activeView: ActiveView;
  newSubCategoryName: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectSubCategory: (categoryId: string, subCategoryId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onStartEditCategory: () => void;
  onDeleteCategory: () => void;
  onAddSubCategory: () => void;
  onSubCategoryNameChange: (val: string) => void;
  onStartEditSubCategory: (sub: SubCategory) => void;
  onDeleteSubCategory: (subId: string) => void;
}

function CategoryItem({
  category,
  selectedCategoryId,
  selectedSubCategoryId,
  activeView,
  newSubCategoryName,
  onSelectCategory,
  onSelectSubCategory,
  onToggleCategory,
  onStartEditCategory,
  onDeleteCategory,
  onAddSubCategory,
  onSubCategoryNameChange,
  onStartEditSubCategory,
  onDeleteSubCategory,
}: CategoryItemProps) {
  const isSelected = selectedCategoryId === category.id && !selectedSubCategoryId && activeView === 'categories';

  return (
    <div className="animate-fade-in">
      <div
        onClick={() => onSelectCategory(category.id)}
        className={`group flex items-center gap-1 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'bg-primary-50 border border-primary-200'
            : 'hover:bg-slate-50 border border-transparent'
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCategory(category.id); }}
          className="p-0.5 hover:bg-slate-200/50 rounded transition-colors"
        >
          {category.isCollapsed ? (
            <ChevronRight size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </button>

        <span
          className={`flex-1 text-sm font-medium truncate ${
            isSelected ? 'text-primary-700' : 'text-slate-700'
          }`}
        >
          {category.name}
        </span>
        <span className="text-xs text-slate-400 mr-1">
          {category.subCategories.length > 0 && `${category.subCategories.length}`}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onStartEditCategory(); }}
          className="p-1 text-slate-400 hover:bg-slate-200/50 rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteCategory(); }}
          className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {!category.isCollapsed && (
        <div className="ml-3 pl-3 border-l border-slate-100 mt-1 space-y-1">
          <div className="flex gap-1.5 py-1">
            <input
              type="text"
              value={newSubCategoryName}
              onChange={e => onSubCategoryNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAddSubCategory()}
              placeholder="Add subcategory..."
              className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:border-primary-300 focus:outline-none transition-all"
            />
            <button
              onClick={onAddSubCategory}
              disabled={!newSubCategoryName.trim()}
              className="p-1 bg-slate-200 text-slate-600 rounded transition-all hover:bg-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
            </button>
          </div>

          {category.subCategories.map(sub => (
            <div
              key={sub.id}
              onClick={() => onSelectSubCategory(category.id, sub.id)}
              className={`group flex items-center gap-1 p-2 rounded-md cursor-pointer transition-all duration-150 ${
                selectedSubCategoryId === sub.id && activeView === 'categories'
                  ? 'bg-primary-50 border border-primary-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <span
                className={`flex-1 text-xs truncate ${
                  selectedSubCategoryId === sub.id && activeView === 'categories'
                    ? 'text-primary-700 font-medium'
                    : 'text-slate-600'
                }`}
              >
                {sub.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onStartEditSubCategory(sub); }}
                className="p-0.5 text-slate-400 hover:bg-slate-200/50 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSubCategory(sub.id); }}
                className="p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
