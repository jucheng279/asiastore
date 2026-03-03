import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationProps } from '../types';

interface NotificationsViewProps extends NavigationProps {
  emailNewsletter: boolean;
  onToggleEmailNewsletter: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({
  onNavigate,
  cartCount,
  emailNewsletter,
  onToggleEmailNewsletter
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => onNavigate('ACCOUNT')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('notifications.title')}</h1>
        </div>
        <button
          className="flex relative items-center justify-center text-text-main dark:text-white"
          onClick={() => onNavigate('CART')}
        >
          <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">{cartCount}</span>
          )}
        </button>
      </header>

      <div className="px-5 lg:px-6 py-6 lg:max-w-2xl">
        <div className="bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[24px]">mail</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-main dark:text-white font-bold mb-2">{t('notifications.emailNewsletter')}</h3>
                <p className="text-text-sub text-sm leading-relaxed">
                  {t('notifications.emailDesc')}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-text-main dark:text-white font-medium">
                {emailNewsletter ? t('notifications.subscribed') : t('notifications.notSubscribed')}
              </span>
              <button
                onClick={onToggleEmailNewsletter}
                className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
                  emailNewsletter ? 'bg-primary' : 'bg-gray-300 dark:bg-white/20'
                }`}
              >
                <span
                  className={`absolute left-0 top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                    emailNewsletter ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
