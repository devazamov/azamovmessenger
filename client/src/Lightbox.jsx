import React, { useEffect } from 'react';

// To'liq ekran rasm ko'ruvchi (zoom + yuklab olish)
export default function Lightbox({ src, name, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <a className="lightbox-action" href={src} download={name || 'image'} target="_blank" rel="noreferrer">⬇ Yuklab olish</a>
        <button className="lightbox-action" onClick={onClose}>✕</button>
      </div>
      <img className="lightbox-img" src={src} alt={name} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
