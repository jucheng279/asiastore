import React from 'react';
import { useTranslation } from 'react-i18next';
import { ViewState } from '../types';
import LanguageSwitcher from './LanguageSwitcher';

interface DesktopSidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  cartCount: number;
}

const NAV_ITEMS: { view: ViewState; icon: string; labelKey: string }[] = [
  { view: 'HOME', icon: 'home', labelKey: 'nav.home' },
  { view: 'LISTING', icon: 'category', labelKey: 'nav.catalog' },
  { view: 'DEALS', icon: 'local_offer', labelKey: 'nav.deals' },
];

const ACCOUNT_ITEMS: { view: ViewState; icon: string; labelKey: string }[] = [
  { view: 'ACCOUNT', icon: 'person', labelKey: 'nav.account' },
  { view: 'FAVORITES', icon: 'favorite', labelKey: 'nav.favorites' },
  { view: 'ORDERS', icon: 'receipt_long', labelKey: 'nav.orders' },
];

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ currentView, onNavigate, cartCount }) => {
  const { t } = useTranslation();
  const isActive = (view: ViewState) => currentView === view;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-surface-light dark:bg-surface-dark border-r border-gray-100 dark:border-white/5 shrink-0 z-50">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5">
        <button
          onClick={() => onNavigate('HOME')}
          className="flex items-baseline gap-1 hover:opacity-80 transition-opacity"
        >
          <h1 className="text-xl font-bold text-text-main dark:text-white tracking-tight">
            Asia Shop
          </h1>
          <span className="text-sm font-medium italic text-text-sub">Linkoping</span>
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive(item.view)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive(item.view) ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        <div className="h-px bg-gray-100 dark:bg-white/5 my-3 mx-2" />

        <div className="space-y-1">
          {ACCOUNT_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive(item.view)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive(item.view) ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-gray-100 dark:border-white/5">
        <button
          onClick={() => onNavigate('CART')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            isActive('CART')
              ? 'bg-primary/10 text-primary'
              : 'text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
          {t('nav.cart')}
          {cartCount > 0 && (
            <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <LanguageSwitcher />
        <p className="text-text-sub text-xs">{t('common.version')}</p>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
