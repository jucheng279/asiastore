import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { formatPrice } from '../lib/formatters';
import { NavigationProps, CartItem, Address } from '../types';
import { LABEL_OPTIONS, getLabelIcon } from '../lib/addressLabels';
import { useVerifiedTotal } from '../lib/useVerifiedTotal';

interface CheckoutViewProps extends NavigationProps {
  cartItems: CartItem[];
  addresses: Address[];
  userPoints: number;
  onConfirmOrder: (address: Address, instructions?: string, payWithPoints?: boolean) => void;
  onSaveAddress: (address: Omit<Address, 'id'> & { id?: string }) => void;
  isSubmitting?: boolean;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({
  onNavigate,
  cartItems,
  addresses,
  userPoints,
  onConfirmOrder,
  onSaveAddress,
  isSubmitting = false,
}) => {
  const { t } = useTranslation();
  const { language } = useProductData();

  const [addressMode, setAddressMode] = useState<'saved' | 'manual'>(
    addresses.length > 0 ? 'saved' : 'manual'
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    () => {
      const defaultAddr = addresses.find((a) => a.isDefault);
      return defaultAddr?.id || addresses[0]?.id || null;
    }
  );

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLabel, setAddressLabel] = useState('Apartment');
  const [saveToBook, setSaveToBook] = useState(false);

  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cashOrSwish' | 'points' | 'payAtStore'>('cashOrSwish');
  const payWithPoints = paymentMethod === 'points';

  const [attempted, setAttempted] = useState(false);

  const verified = useVerifiedTotal(cartItems, payWithPoints);
  const subtotal = verified.subtotal;
  const shipping = verified.shipping;
  const tax = verified.tax;
  const pointsDiscount = verified.pointsDiscount;
  const totalRounded = verified.total;
  const totalBeforeDiscount = subtotal + shipping + tax;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const insufficientPoints = payWithPoints && userPoints < totalRounded;

  const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  const manualValid =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    streetAddress.trim().length > 0 &&
    postalCode.trim().length > 0 &&
    emailValid;

  const formValid =
    addressMode === 'saved' ? !!selectedAddress : manualValid;

  const handleConfirm = () => {
    setAttempted(true);
    if (!formValid) return;

    let address: Address;

    if (addressMode === 'saved' && selectedAddress) {
      address = { ...selectedAddress };
    } else {
      address = {
        id: Date.now().toString(),
        label: addressLabel,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        streetAddress: streetAddress.trim(),
        city: t('checkout.defaultCity'),
        postalCode: postalCode.trim(),
        country: t('checkout.defaultCountry'),
        isDefault: false,
      };

      if (saveToBook) {
        onSaveAddress({
          label: addressLabel,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          streetAddress: streetAddress.trim(),
          city: t('checkout.defaultCity'),
          postalCode: postalCode.trim(),
          country: t('checkout.defaultCountry'),
          isDefault: addresses.length === 0,
        });
      }
    }

    onConfirmOrder(
      address,
      deliveryInstructions.trim() || undefined,
      payWithPoints
    );
  };

  const inputClass = (valid: boolean) =>
    `w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border rounded-xl text-text-main dark:text-white placeholder:text-text-sub/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
      attempted && !valid
        ? 'border-red-400 dark:border-red-500'
        : 'border-gray-200 dark:border-white/10'
    }`;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-8">
      <div className="sticky top-0 z-50 flex items-center bg-surface-light dark:bg-surface-dark p-4 pb-3 justify-between border-b border-gray-100 dark:border-gray-800">
        <button
          className="text-text-main dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => onNavigate('CART')}
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
          {t('checkout.title')}
        </h2>
      </div>

      <div className="px-4 lg:px-6 pt-5 space-y-6 lg:max-w-3xl lg:mx-auto">
        <OrderSummarySection cartItems={cartItems} />

        <DeliveryInfoSection
          addresses={addresses}
          addressMode={addressMode}
          selectedAddressId={selectedAddressId}
          onSelectAddress={setSelectedAddressId}
          onSwitchMode={setAddressMode}
          fullName={fullName}
          phone={phone}
          email={email}
          streetAddress={streetAddress}
          postalCode={postalCode}
          addressLabel={addressLabel}
          saveToBook={saveToBook}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onEmailChange={setEmail}
          onStreetAddressChange={setStreetAddress}
          onPostalCodeChange={setPostalCode}
          onAddressLabelChange={setAddressLabel}
          onSaveToBookChange={setSaveToBook}
          attempted={attempted}
          manualValid={manualValid}
          emailValid={emailValid}
          inputClass={inputClass}
        />

        <section>
          <h3 className="text-text-main dark:text-white text-base font-bold pb-3">
            {t('checkout.deliveryInstructions')}
          </h3>
          <textarea
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-text-main dark:text-white placeholder:text-text-sub/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all min-h-[80px] resize-none text-sm"
            placeholder={t('checkout.deliveryPlaceholder')}
          />
        </section>

        <section>
          <h3 className="text-text-main dark:text-white text-base font-bold pb-3">
            {t('checkout.paymentMethod')}
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod('cashOrSwish')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'cashOrSwish'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  paymentMethod === 'cashOrSwish' ? 'border-primary bg-primary' : 'border-gray-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'cashOrSwish' && (
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-main dark:text-white">{t('checkout.cashOnDelivery')}</p>
                  <p className="text-xs text-text-sub mt-0.5">{t('checkout.cashOnDeliveryDesc')}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('points')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'points'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  paymentMethod === 'points' ? 'border-amber-500 bg-amber-500' : 'border-gray-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'points' && (
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-main dark:text-white">{t('checkout.payWithPoints')}</p>
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">
                      {t('checkout.fivePercentOff')}
                    </span>
                  </div>
                  <p className="text-xs text-text-sub mt-0.5">
                    {t('checkout.yourBalance', { points: Number(userPoints.toFixed(2)) })}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('payAtStore')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'payAtStore'
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  paymentMethod === 'payAtStore' ? 'border-primary bg-primary' : 'border-gray-300 dark:border-white/30'
                }`}>
                  {paymentMethod === 'payAtStore' && (
                    <span className="material-symbols-outlined text-white text-[14px]">check</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-[20px]">store</span>
                    <p className="text-sm font-semibold text-text-main dark:text-white">{t('checkout.payAtStore')}</p>
                  </div>
                  <p className="text-xs text-text-sub mt-0.5">{t('checkout.payAtStoreDesc')}</p>
                </div>
              </div>
            </button>

            {insufficientPoints && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-3">
                <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                <p className="text-xs text-red-700 dark:text-red-300">{t('checkout.insufficientPoints', { needed: totalRounded.toFixed(2), have: Number(userPoints.toFixed(2)), more: (totalRounded - userPoints).toFixed(2) })}</p>
              </div>
            )}
          </div>
        </section>

        <div className="pt-6 mt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-sub font-medium">
              {t('checkout.subtotal')} ({itemCount} {itemCount === 1 ? t('checkout.item') : t('checkout.items')})
            </span>
            <span className="text-text-main dark:text-white font-bold">
              {formatPrice(subtotal, language)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-sub font-medium">{t('checkout.shipping')}</span>
            <span className={`font-bold ${shipping === 0 ? 'text-primary' : 'text-text-main dark:text-white'}`}>
              {shipping === 0 ? t('checkout.free') : formatPrice(shipping, language)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-sub font-medium">{t('checkout.tax')}</span>
            <span className="text-text-main dark:text-white font-bold">
              {formatPrice(tax, language)}
            </span>
          </div>
          {payWithPoints && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-amber-600 font-medium">{t('checkout.pointsDiscount')}</span>
              <span className="text-amber-600 font-bold">
                -{formatPrice(pointsDiscount, language)}
              </span>
            </div>
          )}
          <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex justify-between items-center">
            <span className="text-text-main dark:text-white text-lg font-bold">
              {t('checkout.total')}
            </span>
            <div className="text-right">
              {payWithPoints && (
                <span className="text-text-sub text-sm line-through mr-2">
                  {formatPrice(totalBeforeDiscount, language)}
                </span>
              )}
              <span className="text-text-main dark:text-white text-xl font-bold tracking-tight">
                {payWithPoints ? `${totalRounded.toFixed(2)} ${t('common.pts')}` : formatPrice(totalRounded, language)}
              </span>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={(attempted && !formValid) || insufficientPoints || isSubmitting}
            className={`flex w-full items-center justify-center rounded-full py-4 px-6 font-bold text-lg transition-all shadow-lg ${
              (attempted && !formValid) || insufficientPoints || isSubmitting
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                : payWithPoints
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/30 active:scale-[0.98]'
                : 'bg-primary text-white hover:bg-red-700 shadow-primary/30 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t('checkout.processing')}</span>
              </div>
            ) : payWithPoints ? t('checkout.payPoints', { amount: totalRounded.toFixed(2) }) : t('checkout.confirmOrder')}
          </button>
          {attempted && !formValid && (
            <p className="text-red-500 text-xs text-center">
              {t('checkout.fillAllRequired')}
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderSummarySection: React.FC<{ cartItems: CartItem[] }> = ({
  cartItems,
}) => {
  const { t } = useTranslation();
  const { language } = useProductData();

  return (
    <section>
      <h3 className="text-text-main dark:text-white text-base font-bold pb-3">
        {t('checkout.orderSummary')}
      </h3>
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-main dark:text-white truncate">
                {item.name}
              </p>
              <p className="text-xs text-text-sub">{t('checkout.qty', { count: item.quantity })}</p>
            </div>
            <p className="text-sm font-bold text-text-main dark:text-white shrink-0">
              {formatPrice(item.price * item.quantity, language)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

interface DeliveryInfoSectionProps {
  addresses: Address[];
  addressMode: 'saved' | 'manual';
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onSwitchMode: (mode: 'saved' | 'manual') => void;
  fullName: string;
  phone: string;
  email: string;
  streetAddress: string;
  postalCode: string;
  addressLabel: string;
  saveToBook: boolean;
  onFullNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onStreetAddressChange: (v: string) => void;
  onPostalCodeChange: (v: string) => void;
  onAddressLabelChange: (v: string) => void;
  onSaveToBookChange: (v: boolean) => void;
  attempted: boolean;
  manualValid: boolean;
  emailValid: boolean;
  inputClass: (valid: boolean) => string;
}

const DeliveryInfoSection: React.FC<DeliveryInfoSectionProps> = ({
  addresses,
  addressMode,
  selectedAddressId,
  onSelectAddress,
  onSwitchMode,
  fullName,
  phone,
  email,
  streetAddress,
  postalCode,
  addressLabel,
  saveToBook,
  onFullNameChange,
  onPhoneChange,
  onEmailChange,
  onStreetAddressChange,
  onPostalCodeChange,
  onAddressLabelChange,
  onSaveToBookChange,
  attempted,
  manualValid,
  emailValid,
  inputClass,
}) => {
  const { t } = useTranslation();
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const selectedLabelOption =
    LABEL_OPTIONS.find((opt) => opt.value === addressLabel) || LABEL_OPTIONS[0];

  const labelTranslations: Record<string, string> = {
    Apartment: t('checkout.apartment'),
    House: t('checkout.house'),
    Office: t('checkout.office'),
    Hotel: t('checkout.hotel'),
    Other: t('checkout.other'),
  };

  return (
    <section>
      <h3 className="text-text-main dark:text-white text-base font-bold pb-3">
        {t('checkout.deliveryInfo')}
      </h3>

      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5">
            local_shipping
          </span>
          <p className="text-xs text-emerald-800 dark:text-emerald-200">{t('checkout.deliveryOnlyLinkoping')}</p>
        </div>
      </div>

      {addresses.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onSwitchMode('saved')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              addressMode === 'saved'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-white/5 text-text-sub hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {t('checkout.saved')}
          </button>
          <button
            onClick={() => onSwitchMode('manual')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              addressMode === 'manual'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-white/5 text-text-sub hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {t('checkout.new')}
          </button>
        </div>
      )}

      {addressMode === 'saved' && addresses.length > 0 ? (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => onSelectAddress(addr.id)}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                selectedAddressId === addr.id
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    selectedAddressId === addr.id
                      ? 'border-primary bg-primary'
                      : 'border-gray-300 dark:border-white/30'
                  }`}
                >
                  {selectedAddressId === addr.id && (
                    <span className="material-symbols-outlined text-white text-[14px]">
                      check
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      {getLabelIcon(addr.label)}
                    </span>
                    <span className="text-sm font-semibold text-text-main dark:text-white">
                      {labelTranslations[addr.label] || addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full">
                        {t('checkout.default')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-main dark:text-white font-medium">
                    {addr.fullName}
                  </p>
                  <p className="text-xs text-text-sub">{addr.phone}</p>
                  {addr.email && (
                    <p className="text-xs text-text-sub">{addr.email}</p>
                  )}
                  <p className="text-xs text-text-sub truncate mt-1">
                    {addr.streetAddress}, {addr.postalCode} {addr.city}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {attempted && !selectedAddressId && (
            <p className="text-red-500 text-xs">{t('checkout.pleaseSelectDeliveryInfo')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
              <h4 className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wide">{t('checkout.contact')}</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-1.5">
                  {t('checkout.fullName')} *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => onFullNameChange(e.target.value)}
                  className={inputClass(fullName.trim().length > 0)}
                  placeholder={t('checkout.fullName')}
                />
                {attempted && !fullName.trim() && (
                  <p className="text-red-500 text-xs mt-1">
                    {t('checkout.fullNameRequired')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-1.5">
                  {t('checkout.phoneNumber')} *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  className={inputClass(phone.trim().length > 0)}
                  placeholder="+46 70 123 4567"
                />
                {attempted && !phone.trim() && (
                  <p className="text-red-500 text-xs mt-1">
                    {t('checkout.phoneRequired')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-1.5">
                  {t('checkout.email')} <span className="text-text-sub font-normal">({t('checkout.optional')})</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className={inputClass(emailValid)}
                  placeholder="your@email.com"
                />
                {attempted && !emailValid && (
                  <p className="text-red-500 text-xs mt-1">
                    {t('checkout.emailInvalid')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-white/10"></div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
              <h4 className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wide">{t('checkout.address')}</h4>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium text-text-main dark:text-white mb-1.5">
                  {t('checkout.addressLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-text-main dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      {selectedLabelOption.icon}
                    </span>
                    <span className="text-sm">{labelTranslations[selectedLabelOption.value] || selectedLabelOption.value}</span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-text-sub transition-transform text-[20px] ${
                      isLabelDropdownOpen ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isLabelDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                    {LABEL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onAddressLabelChange(option.value);
                          setIsLabelDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm ${
                          addressLabel === option.value
                            ? 'bg-primary/5 text-primary'
                            : 'text-text-main dark:text-white'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            addressLabel === option.value
                              ? 'text-primary'
                              : 'text-text-sub'
                          }`}
                        >
                          {option.icon}
                        </span>
                        <span className="font-medium">{labelTranslations[option.value] || option.value}</span>
                        {addressLabel === option.value && (
                          <span className="material-symbols-outlined text-primary text-[20px] ml-auto">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-1.5">
                  {t('checkout.streetAddress')} *
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => onStreetAddressChange(e.target.value)}
                  className={inputClass(streetAddress.trim().length > 0)}
                  placeholder={t('checkout.streetAddress')}
                />
                {attempted && !streetAddress.trim() && (
                  <p className="text-red-500 text-xs mt-1">
                    {t('checkout.streetAddressRequired')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-main dark:text-white mb-1.5">
                    {t('checkout.city')}
                  </label>
                  <input
                    type="text"
                    defaultValue={t('checkout.defaultCity')}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-text-sub cursor-not-allowed text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main dark:text-gray-300 mb-1.5">
                    {t('checkout.postalCode')} *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => onPostalCodeChange(e.target.value)}
                    className={inputClass(postalCode.trim().length > 0)}
                    placeholder="581 83"
                  />
                  {attempted && !postalCode.trim() && (
                    <p className="text-red-500 text-xs mt-1">{t('checkout.required')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-1.5">
                  {t('checkout.country')}
                </label>
                <input
                  type="text"
                  defaultValue={t('checkout.defaultCountry')}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-text-sub cursor-not-allowed text-sm"
                />
              </div>

              <label className="flex items-center gap-3 py-1 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={saveToBook}
                    onChange={(e) => onSaveToBookChange(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-white/30 rounded peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                    {saveToBook && (
                      <span className="material-symbols-outlined text-white text-[16px]">
                        check
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-text-main dark:text-white font-medium">
                  {t('checkout.saveDeliveryInfo')}
                </span>
              </label>
            </div>
          </div>
          {attempted && addressMode === 'manual' && !manualValid && (
            <p className="text-red-500 text-xs">
              {t('checkout.fillAllRequired')}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default CheckoutView;
