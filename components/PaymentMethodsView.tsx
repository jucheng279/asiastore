import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationProps } from '../types';

const PaymentMethodsView: React.FC<NavigationProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen">
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => onNavigate('ACCOUNT')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-text-main dark:text-white">{t('payment.title')}</h1>
        </div>
      </header>

      <div className="p-4 lg:px-6 lg:max-w-3xl">
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[24px]">store</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-text-main dark:text-white font-semibold mb-1">{t('payment.payAtStore')}</h3>
                  <p className="text-sm text-text-sub mb-3">{t('payment.payAtStoreDesc')}</p>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
                      <span className="text-sm font-medium text-text-main dark:text-white">{t('payment.storeAddress')}</span>
                    </div>
                    <p className="text-sm text-text-sub ml-6">Storgatan 52</p>
                    <p className="text-sm text-text-sub ml-6">582 23 Linkoping</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-600 text-[24px]">phone_iphone</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-text-main dark:text-white font-semibold mb-1">{t('payment.payWithSwish')}</h3>
                  <p className="text-sm text-text-sub mb-3">{t('payment.payWithSwishDesc')}</p>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-[18px]">call</span>
                      <span className="text-sm font-medium text-text-main dark:text-white">{t('payment.swishNumber')}</span>
                    </div>
                    <p className="text-sm text-text-sub ml-6 font-mono">0790557790</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-600 text-[24px]">stars</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-text-main dark:text-white font-semibold mb-1">{t('payment.payWithPoints')}</h3>
                  <p className="text-sm text-text-sub mb-3">{t('payment.payWithPointsDesc')}</p>
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">info</span>
                      <span className="text-sm text-text-sub">{t('payment.pointsInfo')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsView;
