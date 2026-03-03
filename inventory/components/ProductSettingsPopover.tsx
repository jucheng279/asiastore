import { useEffect, useRef } from 'react';
import { EyeOff, Zap, Award, Trash2 } from 'lucide-react';

interface ProductSettingsPopoverProps {
  isVisible: boolean;
  isFlash: boolean;
  isTrending: boolean;
  onToggleVisibility: () => void;
  onToggleFlash: () => void;
  onToggleTrending: () => void;
  onDelete: () => void;
  onClose: () => void;
  hideFlashTrending?: boolean;
}

export function ProductSettingsPopover({
  isVisible,
  isFlash,
  isTrending,
  onToggleVisibility,
  onToggleFlash,
  onToggleTrending,
  onDelete,
  onClose,
  hideFlashTrending,
}: ProductSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        const settingsButton = (event.target as Element).closest('[data-settings-button]');
        if (!settingsButton) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const isHidden = !isVisible;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-soft-lg border border-slate-200 py-1.5 z-50 animate-scale-in"
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <EyeOff size={16} className={isHidden ? 'text-slate-600' : 'text-slate-400'} />
          <span>Hide</span>
        </div>
        <button
          onClick={onToggleVisibility}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            isHidden ? 'bg-slate-500' : 'bg-slate-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
              isHidden ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {!hideFlashTrending && (
        <>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Zap size={16} className={isFlash ? 'text-orange-500' : 'text-slate-400'} />
              <span>Flash</span>
            </div>
            <button
              onClick={onToggleFlash}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isFlash ? 'bg-orange-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  isFlash ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <Award size={16} className={isTrending ? 'text-amber-500' : 'text-slate-400'} />
              <span>Best</span>
            </div>
            <button
              onClick={onToggleTrending}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isTrending ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                  isTrending ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </>
      )}
      <div className="h-px bg-slate-100 my-1 mx-3" />
      <button
        onClick={onDelete}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={16} />
        <span>Delete product</span>
      </button>
    </div>
  );
}
