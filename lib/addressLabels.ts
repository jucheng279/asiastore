export const LABEL_OPTIONS = [
  { value: 'Apartment', icon: 'apartment' },
  { value: 'House', icon: 'home' },
  { value: 'Office', icon: 'work' },
  { value: 'Hotel', icon: 'hotel' },
  { value: 'Other', icon: 'location_on' },
];

export const getLabelIcon = (label: string): string => {
  const option = LABEL_OPTIONS.find(
    (opt) => opt.value.toLowerCase() === label.toLowerCase()
  );
  return option?.icon || 'location_on';
};
