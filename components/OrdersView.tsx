import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { useAuth } from '../lib/AuthContext';

import { formatPrice } from '../lib/formatters';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, POINTS_DISCOUNT_RATE } from '../lib/businessConstants';
import type { Address } from '../types';
import BottomNav from './BottomNav';
import AddressAutocomplete from './AddressAutocomplete';

const OrdersView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, refreshData, orderingOpen } = useProductData();
  const { orders, cancelOrder, modifyOrder, addresses, saveAddress, updateOrderAddress, setPaymentMethod, refreshOrders } = useAuth();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [settingPayment, setSettingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [modifyingItemId, setModifyingItemId] = useState<string | null>(null);
  // Address form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLabel, setAddressLabel] = useState('Apartment');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<'saved' | 'manual'>('saved');

  const currentOrder = orders.find(o => o.status === 'active' || o.status === 'confirmed') || null;
  const pastOrders = orders.filter(o => o.id !== currentOrder?.id);
  const sortedPastOrders = [...pastOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const subtotal = currentOrder?.total || 0;
  const belowThreshold = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD;
  const deliveryFee = belowThreshold ? SHIPPING_FEE : 0;
  const estimatedTotal = subtotal + deliveryFee;

  const canModifyCurrentOrder = orderingOpen && currentOrder?.status === 'active';
  const isConfirmed = currentOrder?.status === 'confirmed';
  const roundClosed = isConfirmed || (!orderingOpen && currentOrder?.status === 'active');

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    await cancelOrder(orderId);
    refreshData();
    setCancellingId(null);
    setConfirmingCancelId(null);
  };

  const handleChangeItemQty = async (targetItemId: string, delta: number) => {
    if (!currentOrder || modifyingItemId) return;
    setModifyingItemId(targetItemId);

    const updatedItems = currentOrder.items.map(item => ({
      product_id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.id === targetItemId ? Math.max(0, item.qty + delta) : item.qty,
    }));

    await modifyOrder(currentOrder.id, updatedItems);
    refreshData();
    setModifyingItemId(null);
  };

  const startEditAddress = () => {
    if (!currentOrder) return;
    const addr = currentOrder.shippingAddress;
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setStreetAddress(addr.streetAddress);
    setPostalCode(addr.postalCode);
    setAddressLabel(addr.label || 'Apartment');
    setEditingAddress(true);
    setAddressMode(addresses.length > 0 ? 'saved' : 'manual');
    const match = addresses.find(a =>
      a.streetAddress === addr.streetAddress && a.postalCode === addr.postalCode
    );
    setSelectedAddressId(match?.id || addresses[0]?.id || null);
  };

  const handleSaveAddress = async () => {
    if (!currentOrder) return;

    let address: Address;
    if (addressMode === 'saved') {
      const saved = addresses.find(a => a.id === selectedAddressId);
      if (!saved) return;
      address = saved;
    } else {
      address = {
        id: Date.now().toString(),
        label: addressLabel,
        fullName: fullName.trim(),
        phone: phone.trim(),
        streetAddress: streetAddress.trim(),
        postalCode: postalCode.trim(),
        city: t('checkout.defaultCity'),
        country: t('checkout.defaultCountry'),
        isDefault: false,
        email: undefined,
      };
    }

    await updateOrderAddress(currentOrder.id, address, address.phone, address.email);
    setEditingAddress(false);
  };

  const handleSetPayment = async (method: string) => {
    if (!currentOrder) return;
    setSettingPayment(true);
    setPaymentError(null);
    const result = await setPaymentMethod(currentOrder.id, method);
    setSettingPayment(false);
    if (result.error) {
      setPaymentError(result.error);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 lg:pb-8">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate('/account')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('orders.myOrders')}</h1>
        </div>
      </header>

      <div className="px-5 lg:px-6 lg:max-w-2xl lg:mx-auto">
        {/* Current Weekly Order */}
        {currentOrder ? (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-text-main dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">pending_actions</span>
              {t('orders.currentOrder')}
            </h2>

            <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
              {/* Delivery fee warning */}
              {belowThreshold && (
                <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-700/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">local_shipping</span>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t('cart.deliveryFeeWarning', { fee: formatPrice(SHIPPING_FEE, language) })}
                      {' '}
                      <span className="font-medium">{t('cart.addMoreToAvoid', { amount: formatPrice(FREE_SHIPPING_THRESHOLD - subtotal, language) })}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="p-4">
                <div className="space-y-3">
                  {currentOrder.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} loading="lazy" className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-white/10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-main dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-text-sub">{formatPrice(item.price, language)}</p>
                      </div>

                      {canModifyCurrentOrder ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/15 text-text-sub hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                            onClick={() => handleChangeItemQty(item.id, -1)}
                            disabled={!!modifyingItemId}
                          >
                            <span className="material-symbols-outlined text-[16px]">{item.qty <= 1 ? 'delete' : 'remove'}</span>
                          </button>
                          <span className={`text-sm font-semibold w-6 text-center ${modifyingItemId === item.id ? 'text-text-sub animate-pulse' : 'text-text-main dark:text-white'}`}>
                            {item.qty}
                          </span>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/15 text-text-sub hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                            onClick={() => handleChangeItemQty(item.id, 1)}
                            disabled={!!modifyingItemId}
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                          <p className="text-sm font-semibold text-text-main dark:text-white ml-2 w-16 text-right">{formatPrice(item.price * item.qty, language)}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-sub">{item.qty}x</span>
                          <p className="text-sm font-semibold text-text-main dark:text-white">{formatPrice(item.price * item.qty, language)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-100 dark:border-white/10 mt-4 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-sub">{t('cart.subtotal')}</span>
                    <span className="text-text-main dark:text-white">{formatPrice(subtotal, language)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-sub">{t('cart.deliveryFee')}</span>
                    <span className={deliveryFee > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}>
                      {deliveryFee > 0 ? formatPrice(deliveryFee, language) : t('cart.free')}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100 dark:border-white/10">
                    <span className="text-text-main dark:text-white">{t('cart.estimatedTotal')}</span>
                    <span className="text-primary">{formatPrice(estimatedTotal, language)}</span>
                  </div>
                  {!roundClosed && (
                    <p className="text-xs text-text-sub">{t('cart.finalTotalNote')}</p>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="border-t border-slate-100 dark:border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-main dark:text-white">{t('orders.deliveryAddress')}</h3>
                  {canModifyCurrentOrder && !editingAddress && (
                    <button
                      className="text-xs font-medium text-primary hover:text-red-700 transition-colors"
                      onClick={startEditAddress}
                    >
                      {t('common.change')}
                    </button>
                  )}
                </div>

                {editingAddress ? (
                  <div className="space-y-3">
                    {addresses.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        <button
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${addressMode === 'saved' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-text-main dark:text-white'}`}
                          onClick={() => setAddressMode('saved')}
                        >{t('checkout.savedAddress')}</button>
                        <button
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium ${addressMode === 'manual' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-text-main dark:text-white'}`}
                          onClick={() => setAddressMode('manual')}
                        >{t('checkout.newAddress')}</button>
                      </div>
                    )}

                    {addressMode === 'saved' ? (
                      <div className="space-y-2">
                        {addresses.map(addr => (
                          <button
                            key={addr.id}
                            className={`w-full text-left p-3 rounded-xl border transition-colors ${
                              selectedAddressId === addr.id
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-white/10'
                            }`}
                            onClick={() => setSelectedAddressId(addr.id)}
                          >
                            <p className="text-sm font-medium text-text-main dark:text-white">{addr.fullName}</p>
                            <p className="text-xs text-text-sub">{addr.streetAddress}, {addr.postalCode}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-text-main dark:text-white"
                          placeholder={t('checkout.fullName')}
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent text-sm text-text-main dark:text-white"
                          placeholder={t('checkout.phone')}
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                        />
                        <AddressAutocomplete
                          compact
                          onSelect={(addr) => {
                            setStreetAddress(addr.streetAddress);
                            setPostalCode(addr.postalCode);
                          }}
                          initialValue={streetAddress}
                        />
                        {streetAddress && postalCode && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            {streetAddress}, {postalCode}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-lg"
                        onClick={handleSaveAddress}
                      >{t('common.save')}</button>
                      <button
                        className="flex-1 py-2 bg-gray-100 dark:bg-white/10 text-text-main dark:text-white text-sm font-semibold rounded-lg"
                        onClick={() => setEditingAddress(false)}
                      >{t('common.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-text-main dark:text-white font-medium">{currentOrder.shippingAddress.fullName}</p>
                    <p className="text-text-sub">{currentOrder.shippingAddress.streetAddress}</p>
                    <p className="text-text-sub">{currentOrder.shippingAddress.postalCode} {currentOrder.shippingAddress.city}</p>
                    {currentOrder.contactPhone && (
                      <p className="text-text-sub mt-1">{currentOrder.contactPhone}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method - only after round closes */}
              {roundClosed && (
                <div className="border-t border-slate-100 dark:border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-text-main dark:text-white mb-3">{t('orders.choosePayment')}</h3>

                  {currentOrder.paymentMethod && currentOrder.paymentMethod !== '' ? (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3">
                      <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        {currentOrder.paymentMethod === 'cashOrSwish' && t('orders.paymentCashSwish')}
                        {currentOrder.paymentMethod === 'payAtStore' && t('orders.paymentAtStore')}
                        {currentOrder.paymentMethod === 'points' && t('orders.paymentPoints')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[
                        { id: 'cashOrSwish', label: t('orders.paymentCashSwish'), icon: 'payments' },
                        { id: 'payAtStore', label: t('orders.paymentAtStore'), icon: 'store' },
                        { id: 'points', label: t('orders.paymentPoints'), icon: 'star' },
                      ].map(option => (
                        <button
                          key={option.id}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                          onClick={() => handleSetPayment(option.id)}
                          disabled={settingPayment}
                        >
                          <span className="material-symbols-outlined text-text-sub text-[20px]">{option.icon}</span>
                          <span className="text-sm font-medium text-text-main dark:text-white">{option.label}</span>
                        </button>
                      ))}
                      {paymentError && (
                        <p className="text-xs text-red-500 mt-1">{paymentError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {canModifyCurrentOrder && (
                <div className="border-t border-slate-100 dark:border-white/10 p-4 flex gap-3">
                  <button
                    className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
                    onClick={() => navigate('/')}
                  >
                    {t('common.continueShopping')}
                  </button>
                  <button
                    className="py-2.5 px-4 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    onClick={() => setConfirmingCancelId(currentOrder.id)}
                    disabled={!!cancellingId}
                  >
                    {t('orders.cancel')}
                  </button>
                </div>
              )}

              {/* Cancel confirmation */}
              {confirmingCancelId === currentOrder.id && (
                <div className="border-t border-slate-100 dark:border-white/10 p-4 bg-red-50 dark:bg-red-900/10">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">{t('orders.cancelConfirm')}</p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                      onClick={() => handleCancelOrder(currentOrder.id)}
                      disabled={!!cancellingId}
                    >
                      {cancellingId === currentOrder.id ? t('common.processing') : t('orders.yesCancelOrder')}
                    </button>
                    <button
                      className="flex-1 py-2 bg-gray-100 dark:bg-white/10 text-text-main dark:text-white text-sm font-semibold rounded-lg"
                      onClick={() => setConfirmingCancelId(null)}
                    >
                      {t('orders.keepOrder')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-gray-400 text-[32px]">receipt_long</span>
              </div>
              <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">{t('orders.noCurrentOrder')}</h3>
              <p className="text-sm text-text-sub mb-4">{t('orders.startShopping')}</p>
              {orderingOpen && (
                <button
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                  onClick={() => navigate('/')}
                >
                  {t('common.continueShopping')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Past Orders */}
        {sortedPastOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text-main dark:text-white mb-4">{t('orders.pastOrders')}</h2>
            <div className="space-y-4">
              {sortedPastOrders.map(order => (
                <div key={order.id} className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-text-main dark:text-white">{order.date}</p>
                      <p className="text-xs text-text-sub">{order.items.length} {t('orders.items')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-text-main dark:text-white">{formatPrice(order.total, language)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        order.status === 'confirmed' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}>
                        {t(`orders.status.${order.status}`)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {order.items.slice(0, 4).map(item => (
                      <img key={item.id} src={item.image} alt={item.name} loading="lazy" className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-white/10 shrink-0" />
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-text-sub">+{order.items.length - 4}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default OrdersView;
