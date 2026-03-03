import React from 'react';
import { useTranslation } from 'react-i18next';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const { t } = useTranslation();

  const getButtonClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-white'}`;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface-light dark:bg-surface-dark border-t border-gray-100 dark:border-white/5 pb-safe pt-2 px-2 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        <button
          className={getButtonClass(currentView === 'HOME')}
          onClick={() => onNavigate('HOME')}
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[10px] font-bold">{t('nav.home')}</span>
        </button>
        <button
          className={getButtonClass(currentView === 'LISTING')}
          onClick={() => onNavigate('LISTING')}
        >
          <span className="material-symbols-outlined text-[24px]">category</span>
          <span className="text-[10px] font-medium">{t('nav.catalog')}</span>
        </button>
        <button
          className={getButtonClass(currentView === 'DEALS')}
          onClick={() => onNavigate('DEALS')}
        >
          <span className="material-symbols-outlined text-[24px]">local_offer</span>
          <span className="text-[10px] font-medium">{t('nav.deals')}</span>
        </button>
        <button
          className={getButtonClass(currentView === 'ACCOUNT')}
          onClick={() => onNavigate('ACCOUNT')}
        >
          <span className="material-symbols-outlined text-[24px]">person</span>
          <span className="text-[10px] font-medium">{t('nav.account')}</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
