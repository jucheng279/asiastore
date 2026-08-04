import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../lib/CartContext';
import LanguageSwitcher from './LanguageSwitcher';

const NAV_ITEMS = [
  { path: '/', icon: 'home', labelKey: 'nav.home' },
  { path: '/products', icon: 'category', labelKey: 'nav.catalog' },
  { path: '/deals', icon: 'local_offer', labelKey: 'nav.deals' },
];

const ACCOUNT_ITEMS = [
  { path: '/account', icon: 'person', labelKey: 'nav.account' },
  { path: '/favorites', icon: 'favorite', labelKey: 'nav.favorites' },
  { path: '/orders', icon: 'receipt_long', labelKey: 'nav.orders' },
];

const DesktopSidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed top-0 left-0 bg-surface-light dark:bg-surface-dark border-r border-gray-100 dark:border-white/5 shrink-0 z-50">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5">
        <button
          onClick={() => navigate('/')}
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
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : undefined}
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
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : undefined}
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
          onClick={() => navigate('/cart')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
            isActive('/cart')
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
