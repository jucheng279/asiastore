import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationProps, Address } from '../types';
import { LABEL_OPTIONS, getLabelIcon } from '../lib/addressLabels';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Omit<Address, 'id'> & { id?: string }) => void;
  address?: Address | null;
}

const AddressFormModal: React.FC<AddressFormModalProps> = ({ isOpen, onClose, onSave, address }) => {
  const { t } = useTranslation();
  const isEditing = !!address;

  const [label, setLabel] = useState(address?.label || 'Apartment');
  const [fullName, setFullName] = useState(address?.fullName || '');
  const [phone, setPhone] = useState(address?.phone || '');
  const [email, setEmail] = useState(address?.email || '');
  const [streetAddress, setStreetAddress] = useState(address?.streetAddress || '');
  const [postalCode, setPostalCode] = useState(address?.postalCode || '');
  const [isDefault, setIsDefault] = useState(address?.isDefault || false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setLabel(address?.label || 'Apartment');
      setFullName(address?.fullName || '');
      setPhone(address?.phone || '');
      setEmail(address?.email || '');
      setStreetAddress(address?.streetAddress || '');
      setPostalCode(address?.postalCode || '');
      setIsDefault(address?.isDefault || false);
      setIsDropdownOpen(false);
    }
  }, [isOpen, address]);

  const handleSubmit = () => {
    const addressData = {
      ...(address?.id && { id: address.id }),
      label,
      fullName,
      phone,
      email: email.trim() || undefined,
      streetAddress,
      city: 'Linkoping',
      postalCode,
      country: 'Sweden',
      isDefault,
    };
    onSave(addressData);
    onClose();
  };

  if (!isOpen) return null;

  const selectedOption = LABEL_OPTIONS.find((opt) => opt.value === label) || LABEL_OPTIONS[0];
  const inputBase = "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-text-main dark:text-white placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-t-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        <div className="sticky top-0 bg-surface-light dark:bg-surface-dark px-4 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-main dark:text-white">
              {isEditing ? t('addresses.editDeliveryInfo') : t('addresses.addDeliveryInfo')}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-sub">close</span>
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 mb-6">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">info</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('addresses.formNotice')}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              <h3 className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wide">{t('addresses.contact')}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                  {t('addresses.fullName')}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputBase}
                  placeholder={t('addresses.fullName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                  {t('addresses.phoneNumber')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputBase}
                  placeholder="+46 70 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                  {t('addresses.email')} <span className="text-text-sub font-normal">({t('checkout.optional')})</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-white/10 mb-6"></div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
              <h3 className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wide">{t('addresses.address')}</h3>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                  {t('addresses.addressLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-text-main dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      {selectedOption.icon}
                    </span>
                    <span>{t('checkout.' + selectedOption.value.toLowerCase())}</span>
                  </div>
                  <span className={`material-symbols-outlined text-text-sub transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                    {LABEL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setLabel(option.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                          label === option.value ? 'bg-primary/5 text-primary' : 'text-text-main dark:text-white'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[20px] ${label === option.value ? 'text-primary' : 'text-text-sub'}`}>
                          {option.icon}
                        </span>
                        <span className="font-medium">{t('checkout.' + option.value.toLowerCase())}</span>
                        {label === option.value && (
                          <span className="material-symbols-outlined text-primary text-[20px] ml-auto">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                  {t('addresses.streetAddress')}
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className={inputBase}
                  placeholder={t('addresses.streetAddress')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                    {t('addresses.city')}
                  </label>
                  <input
                    type="text"
                    defaultValue={t('checkout.defaultCity')}
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-text-sub cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                    {t('addresses.postalCode')}
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={inputBase}
                    placeholder="581 83"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main dark:text-white mb-2">
                  {t('addresses.country')}
                </label>
                <input
                  type="text"
                  defaultValue={t('checkout.defaultCountry')}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-text-sub cursor-not-allowed"
                />
              </div>

              <label className="flex items-center gap-3 py-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-white/30 rounded peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[16px] opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                  </div>
                </div>
                <span className="text-text-main dark:text-white font-medium">{t('addresses.setAsDefault')}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-surface-light dark:bg-surface-dark px-4 py-4 border-t border-gray-100 dark:border-white/10">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 dark:border-white/20 rounded-xl text-text-main dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              {isEditing ? t('addresses.saveChanges') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">
              {getLabelIcon(address.label)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-text-main dark:text-white font-semibold">{t('checkout.' + address.label.toLowerCase())}</h3>
              {address.isDefault && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {t('common.default')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-text-sub text-[20px]">edit</span>
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <span className="material-symbols-outlined text-red-500 text-[20px]">delete</span>
          </button>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-text-main dark:text-white font-medium">{address.fullName}</p>
        {address.email && (
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-text-sub text-[16px]">mail</span>
            <p className="text-text-sub">{address.email}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-text-sub text-[16px]">call</span>
          <p className="text-text-sub">{address.phone}</p>
        </div>
        <div className="pt-1">
          <p className="text-text-sub">{address.streetAddress}</p>
          <p className="text-text-sub">{address.postalCode} {address.city}</p>
          <p className="text-text-sub">{address.country}</p>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onAddNew: () => void }> = ({ onAddNew }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-text-sub text-[48px]">location_off</span>
      </div>
      <h3 className="text-text-main dark:text-white text-lg font-bold mb-2">{t('addresses.noAddresses')}</h3>
      <p className="text-text-sub text-center mb-6">
        {t('addresses.noAddressesDesc')}
      </p>
      <button
        onClick={onAddNew}
        className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        {t('addresses.addDeliveryInfo')}
      </button>
    </div>
  );
};

interface AddressesViewProps extends NavigationProps {
  addresses: Address[];
  onSaveAddress: (address: Omit<Address, 'id'> & { id?: string }) => void;
  onDeleteAddress: (addressId: string) => void;
}

const AddressesView: React.FC<AddressesViewProps> = ({ onNavigate, addresses, onSaveAddress, onDeleteAddress }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const handleAddNew = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAddress(null);
  };

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
          <h1 className="text-lg font-bold text-text-main dark:text-white">{t('addresses.title')}</h1>
        </div>
      </header>

      <div className="p-4 lg:px-6 lg:max-w-3xl">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[20px] mt-0.5">local_shipping</span>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">{t('addresses.deliveryNotice')}</p>
          </div>
        </div>

        {addresses.length === 0 ? (
          <EmptyState onAddNew={handleAddNew} />
        ) : (
          <>
            <div className="space-y-3">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={() => handleEdit(address)}
                  onDelete={() => onDeleteAddress(address.id)}
                />
              ))}
            </div>

            <button
              onClick={handleAddNew}
              className="mt-4 w-full py-3.5 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl text-text-main dark:text-white font-semibold hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[22px]">add</span>
              {t('addresses.addDeliveryInfo')}
            </button>
          </>
        )}
      </div>

      <AddressFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={onSaveAddress}
        address={editingAddress}
      />

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AddressesView;
