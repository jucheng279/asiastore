import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import BottomNav from './BottomNav';

const MENU_ITEMS = [
  { icon: 'receipt_long', labelKey: 'account.myOrders', path: '/orders' },
  { icon: 'favorite', labelKey: 'nav.favorites', path: '/favorites' },
  { icon: 'local_shipping', labelKey: 'account.deliveryInfo', path: '/addresses' },
  { icon: 'credit_card', labelKey: 'account.payment', path: '/payment-methods' },
  { icon: 'notifications', labelKey: 'account.notifications', path: '/notifications' },
];

const AccountView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, updateProfile, points, isAdmin, signOut } = useAuth();
  const { itemCount: cartCount } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const emailPrefix = profile?.email?.split('@')[0] || 'User';
  const displayName = profile?.nickname || emailPrefix;
  const email = profile?.email || '';

  const startEditing = () => {
    setEditNickname(profile?.nickname || '');
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setEditLoading(true);
    setEditError(null);
    const err = await updateProfile({
      nickname: editNickname.trim() || undefined,
    });
    setEditLoading(false);
    if (err) {
      setEditError(err);
    } else {
      setIsEditing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-text-main placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm";

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 lg:pb-8">
      <div className="sticky top-0 z-50 flex items-center bg-surface-light dark:bg-surface-dark p-4 pb-3 lg:px-6 justify-between shadow-sm">
        <div className="w-12 lg:hidden"></div>
        <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center lg:text-left">
          {t('account.myAccount')}
        </h2>
        <div className="flex w-12 items-center justify-end lg:hidden">
          <button
            className="flex relative max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-text-main dark:text-white gap-2 min-w-0 p-0"
            onClick={() => navigate('/cart')}
          >
            <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute top-2 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-2 ring-white dark:ring-surface-dark"></span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary to-red-700 px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
            <span className="material-symbols-outlined text-white text-[40px]">person</span>
          </div>
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold mb-0.5">{displayName}</h2>
            <p className="text-white/80 text-sm mb-3">{email}</p>
            <button
              onClick={startEditing}
              className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
            >
              {t('account.editProfile')}
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">{t('account.editProfile')}</h3>

            {editError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-1.5">{t('account.nickname')}</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className={inputClass}
                  placeholder={t('account.displayName')}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-text-main font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {editLoading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 bg-surface-light dark:bg-surface-dark">
        <button
          className="w-full flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/30 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700/40 transition-colors"
          onClick={() => navigate('/points')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">stars</span>
            </div>
            <div className="text-left">
              <p className="text-text-main dark:text-white font-bold">{t('account.pointsLabel', { count: Number(points.toFixed(2)) })}</p>
              <p className="text-text-sub text-sm">{t('account.tapToEarn')}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-amber-600">arrow_forward</span>
        </button>
      </div>

      <div className="h-2 bg-background-light dark:bg-background-dark"></div>

      <div className="bg-surface-light dark:bg-surface-dark">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-text-main dark:text-white text-base font-bold">{t('account.quickActions')}</h3>
        </div>
        <div className="flex flex-col">
          {MENU_ITEMS.map((item, index) => (
            <button
              key={index}
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-b-0"
              onClick={() => navigate(item.path)}
            >
              <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[22px]">{item.icon}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-text-main dark:text-white font-semibold">{t(item.labelKey)}</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-2 bg-background-light dark:bg-background-dark"></div>

      <div className="bg-surface-light dark:bg-surface-dark">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-text-main dark:text-white text-base font-bold">{t('account.support')}</h3>
        </div>
        <div className="flex flex-col">
          <button
            className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            onClick={() => navigate('/contact')}
          >
            <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-text-sub text-[22px]">chat</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-text-main dark:text-white font-semibold">{t('account.contactUs')}</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="h-2 bg-background-light dark:bg-background-dark"></div>

      {isAdmin && (
        <>
          <div className="px-4 py-4 bg-surface-light dark:bg-surface-dark">
            <button
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 transition-colors"
              onClick={() => window.open('/inventory.html', '_blank')}
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              {t('account.inventoryManagement')}
            </button>
          </div>

          <div className="h-2 bg-background-light dark:bg-background-dark"></div>
        </>
      )}

      <div className="px-4 py-6 bg-surface-light dark:bg-surface-dark">
        <button
          className="w-full py-3 text-gray-500 dark:text-gray-400 font-medium text-center hover:text-primary transition-colors"
          onClick={handleSignOut}
        >
          {t('common.signOut')}
        </button>
        <p className="text-center text-text-sub text-xs mt-4">Asia Shop <span className="italic">Linkoping</span> {t('common.version')}</p>
      </div>

      <BottomNav />
    </div>
  );
};

export default AccountView;
