import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';

const PHONE = '0790557790';
const EMAIL = 'kontakt@asiashop.se';
const ADDRESS = 'Storgatan 52, 582 23 Linköping';
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Storgatan+52+582+23+Linköping';

const ContactUsView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 lg:pb-8">
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate('/account')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-text-main dark:text-white">{t('contact.title')}</h1>
        </div>
      </header>

      <div className="p-4 lg:px-6 lg:max-w-3xl">
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            <a
              href={`tel:${PHONE}`}
              className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-600 text-[24px]">call</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-main dark:text-white font-semibold mb-1">{t('contact.phone')}</h3>
                <p className="text-sm text-text-sub">{PHONE}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400 mt-3">chevron_right</span>
            </a>

            <a
              href={`mailto:${EMAIL}`}
              className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-600 text-[24px]">mail</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-main dark:text-white font-semibold mb-1">{t('contact.email')}</h3>
                <p className="text-sm text-text-sub">{EMAIL}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400 mt-3">chevron_right</span>
            </a>

            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600 text-[24px]">location_on</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text-main dark:text-white font-semibold mb-1">{t('contact.visitingAddress')}</h3>
                <p className="text-sm text-text-sub">{ADDRESS}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400 mt-3">chevron_right</span>
            </a>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ContactUsView;
