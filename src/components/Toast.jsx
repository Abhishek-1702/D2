import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Toast({ toast, setToast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    // trigger entrance animation
    setVisible(true);
    // auto-dismiss if parent hasn't already
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300);
    }, toast.duration || 3000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;

  return createPortal(
    <div className="fixed right-6 top-6 z-50 pointer-events-none">
      <div
        className={`transform transition-all duration-300 pointer-events-auto ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className={`px-4 py-2 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'}`}>
          {toast.message}
        </div>
      </div>
    </div>,
    document.body
  );
}
