import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicyView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 lg:pb-8">
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-text-main dark:text-white">{t('privacy.title')}</h1>
        </div>
      </header>

      <div className="p-4 lg:px-6 lg:max-w-3xl">
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5 shadow-sm space-y-6">
          <p className="text-sm text-text-sub leading-relaxed">{t('privacy.lastUpdated')}</p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main dark:text-white">{t('privacy.whatWeCollectTitle')}</h2>
            <p className="text-sm text-text-sub leading-relaxed">{t('privacy.whatWeCollectIntro')}</p>
            <ul className="list-disc list-inside text-sm text-text-sub leading-relaxed space-y-1 pl-1">
              <li>{t('privacy.collectEmail')}</li>
              <li>{t('privacy.collectName')}</li>
              <li>{t('privacy.collectPhone')}</li>
              <li>{t('privacy.collectAddress')}</li>
              <li>{t('privacy.collectOrders')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main dark:text-white">{t('privacy.whyWeCollectTitle')}</h2>
            <ul className="list-disc list-inside text-sm text-text-sub leading-relaxed space-y-1 pl-1">
              <li>{t('privacy.whyDeliver')}</li>
              <li>{t('privacy.whyContact')}</li>
              <li>{t('privacy.whyPoints')}</li>
              <li>{t('privacy.whyImprove')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main dark:text-white">{t('privacy.sharingTitle')}</h2>
            <p className="text-sm text-text-sub leading-relaxed">{t('privacy.sharingDesc')}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main dark:text-white">{t('privacy.retentionTitle')}</h2>
            <p className="text-sm text-text-sub leading-relaxed">{t('privacy.retentionDesc')}</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main dark:text-white">{t('privacy.yourRightsTitle')}</h2>
            <p className="text-sm text-text-sub leading-relaxed">{t('privacy.yourRightsDesc')}</p>
            <ul className="list-disc list-inside text-sm text-text-sub leading-relaxed space-y-1 pl-1">
              <li>{t('privacy.rightAccess')}</li>
              <li>{t('privacy.rightCorrect')}</li>
              <li>{t('privacy.rightDelete')}</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main dark:text-white">{t('privacy.contactTitle')}</h2>
            <p className="text-sm text-text-sub leading-relaxed">{t('privacy.contactDesc')}</p>
            <p className="text-sm text-text-main dark:text-white font-medium">kontakt@asiashop.se</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
