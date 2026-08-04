import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', icon: 'home', labelKey: 'nav.home' },
  { path: '/products', icon: 'category', labelKey: 'nav.catalog' },
  { path: '/deals', icon: 'local_offer', labelKey: 'nav.deals' },
  { path: '/account', icon: 'person', labelKey: 'nav.account' },
];

const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getButtonClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 w-16 transition-colors ${active ? 'text-primary' : 'text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-white'}`;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface-light dark:bg-surface-dark border-t border-gray-100 dark:border-white/5 pb-safe pt-2 px-2 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={getButtonClass(isActive(item.path))}
            onClick={() => navigate(item.path)}
          >
            <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
            <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;
