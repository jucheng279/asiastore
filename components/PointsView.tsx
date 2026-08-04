import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const EARN_METHODS = [
  {
    icon: 'event_available',
    titleKey: 'points.dailyCheckin',
    descriptionKey: 'points.dailyCheckinDesc',
    highlightKey: 'points.dailyCheckinHighlight',
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    icon: 'storefront',
    titleKey: 'points.depositAtStore',
    descriptionKey: 'points.depositDesc',
    highlightKey: 'points.depositHighlight',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    address: 'Storgatan 52, 582 23 Linköping',
  },
  {
    icon: 'person_add',
    titleKey: 'points.signUpBonus',
    descriptionKey: 'points.signUpBonusDesc',
    highlightKey: 'points.signUpBonusHighlight',
    color: 'text-sky-600',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
  },
];

const PointsView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, points, checkedInToday, performDailyCheckin } = useAuth();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  const handleCheckin = async () => {
    if (isCheckingIn || checkedInToday) return;
    setIsCheckingIn(true);
    setCheckinMessage(null);
    const result = await performDailyCheckin();
    if (result.success) {
      setCheckinMessage(t('points.pointEarned'));
    } else if (result.error) {
      setCheckinMessage(
        /already checked in/i.test(result.error) ? t('points.checkedInToday') : t('points.checkinFailed')
      );
    }
    setIsCheckingIn(false);
    if (result.success) {
      setTimeout(() => setCheckinMessage(null), 3000);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-8 lg:max-w-3xl">
      <div className="sticky top-0 z-50 flex items-center bg-surface-light dark:bg-surface-dark p-4 pb-3 shadow-sm">
        <button
          className="flex items-center justify-center rounded-lg h-10 w-10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          onClick={() => navigate('/account')}
        >
          <span className="material-symbols-outlined text-text-main dark:text-white text-[24px]">arrow_back</span>
        </button>
        <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
          {t('points.title')}
        </h2>
      </div>

      <div className="px-4 pt-5 pb-2">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
          <div className="absolute top-[-20px] right-[-20px] opacity-10">
            <span className="material-symbols-outlined text-[120px]">stars</span>
          </div>
          <p className="text-white/80 text-sm font-medium mb-1">{t('points.yourBalance')}</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-extrabold tracking-tight">{isAuthenticated ? Number(points.toFixed(2)) : 0}</span>
            <span className="text-lg font-semibold opacity-90">{t('common.points')}</span>
          </div>
          <p className="text-white/70 text-xs">
            {isAuthenticated ? t('points.useAtCheckout') : t('points.signInToEarn')}
          </p>

          {isAuthenticated && (
            <div className="mt-4">
              <button
                onClick={handleCheckin}
                disabled={checkedInToday || isCheckingIn}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  checkedInToday
                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                    : isCheckingIn
                    ? 'bg-white/40 text-amber-600 cursor-wait'
                    : 'bg-white text-amber-600 hover:bg-amber-50 active:scale-95 shadow-md'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    {checkedInToday ? 'check_circle' : isCheckingIn ? 'hourglass_top' : 'event_available'}
                  </span>
                  {checkedInToday ? t('points.checkedInToday') : isCheckingIn ? t('points.checkingIn') : t('points.dailyCheckin')}
                </span>
              </button>
              {checkinMessage && (
                <p className="text-white/90 text-xs font-medium mt-2">{checkinMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
          <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">percent</span>
          </div>
          <div className="flex-1">
            <p className="text-text-main dark:text-white font-bold text-sm">{t('points.fivePercentOff')}</p>
            <p className="text-text-sub dark:text-gray-400 text-xs mt-0.5 leading-relaxed">
              {t('points.fivePercentDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-3">
        <h3 className="text-text-main dark:text-white text-base font-bold">{t('points.howToEarn')}</h3>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {EARN_METHODS.map((method, index) => (
          <div
            key={index}
            className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-white/5 p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 ${method.bg} rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
                <span className={`material-symbols-outlined ${method.color} text-[22px]`}>{method.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-text-main dark:text-white font-bold text-sm">{t(method.titleKey)}</p>
                  <span className={`${method.color} text-xs font-bold ${method.bg} px-2.5 py-1 rounded-full whitespace-nowrap`}>
                    {t(method.highlightKey)}
                  </span>
                </div>
                <p className="text-text-sub dark:text-gray-400 text-xs leading-relaxed">{t(method.descriptionKey)}</p>
                {method.address && (
                  <div className="flex items-center gap-1.5 mt-2 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-text-sub text-[16px]">location_on</span>
                    <p className="text-text-main dark:text-gray-300 text-xs font-medium">{method.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default PointsView;
