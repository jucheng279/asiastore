import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

type ToastType = 'success' | 'warning';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('success');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, t: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setType(t);
    setMessage(msg);
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setMessage(null), 300);
    }, t === 'warning' ? 4000 : 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className={`flex items-center gap-2.5 ${type === 'warning' ? 'bg-amber-600 dark:bg-amber-700' : 'bg-gray-900 dark:bg-gray-800'} text-white px-5 py-3 rounded-xl shadow-xl max-w-[90vw]`}>
            <span className={`material-symbols-outlined ${type === 'warning' ? 'text-white' : 'text-emerald-400'} text-[20px]`} style={{ fontVariationSettings: "'FILL' 1" }}>{type === 'warning' ? 'warning' : 'check_circle'}</span>
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
