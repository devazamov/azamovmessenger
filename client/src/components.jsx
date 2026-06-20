import React, { useState, useEffect } from 'react';

export function Avatar({ name, color, size = 48, online, photoURL, ring, ringSeen }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const inner = photoURL ? (
    <img className="avatar" src={photoURL} alt={name}
      style={{ width: size, height: size, objectFit: 'cover' }} />
  ) : (
    <div className="avatar" style={{ background: color || '#3390ec', width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
  return (
    <div className={ring ? (ringSeen ? 'avatar-wrap story-ring seen' : 'avatar-wrap story-ring') : 'avatar-wrap'}
      style={{ width: size, height: size }}>
      {inner}
      {online && <span className="online-dot" />}
    </div>
  );
}

export function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// "oxirgi marta ... oldin" formati
export function lastSeen(ts) {
  if (!ts) return 'yaqinda';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'kecha';
  if (day < 7) return `${day} kun oldin`;
  return new Date(ts).toLocaleDateString('uz-UZ');
}

// Sana ajratuvchisi uchun ("Bugun", "Kecha", sana)
export function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Bugun';
  if (same(d, yest)) return 'Kecha';
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
}

// Matndagi havola va @mention'larni jonli elementlarga aylantirish
const URL_RE = /(https?:\/\/[^\s]+)/g;
const MENTION_RE = /(@[a-zA-Z0-9_]{2,})/g;
export function renderText(text) {
  if (!text) return null;
  const parts = String(text).split(/(https?:\/\/[^\s]+|@[a-zA-Z0-9_]{2,})/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (URL_RE.test(p)) {
      URL_RE.lastIndex = 0;
      return <a key={i} href={p} target="_blank" rel="noreferrer" className="msg-link">{p}</a>;
    }
    if (MENTION_RE.test(p)) {
      MENTION_RE.lastIndex = 0;
      return <span key={i} className="mention">{p}</span>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// Yangi suhbat / guruh / kanal yaratish modali
export function NewChatModal({ onClose, onOpenPrivate, onCreateGroup, onCreateChannel, searchUsers }) {
  const [tab, setTab] = useState('private');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 1) { setResults([]); return; }
      try { setResults(await searchUsers(query)); } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(u) {
    setSelected((prev) =>
      prev.find((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
    );
  }

  const isGroup = tab === 'group';
  const isChannel = tab === 'channel';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{tab === 'private' ? 'Yangi suhbat' : isGroup ? 'Yangi guruh' : 'Yangi kanal'}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button className={tab === 'private' ? 'tab active' : 'tab'} onClick={() => setTab('private')}>Suhbat</button>
          <button className={isGroup ? 'tab active' : 'tab'} onClick={() => setTab('group')}>Guruh</button>
          <button className={isChannel ? 'tab active' : 'tab'} onClick={() => setTab('channel')}>Kanal</button>
        </div>

        {(isGroup || isChannel) && (
          <input className="modal-input" placeholder={isChannel ? 'Kanal nomi' : 'Guruh nomi'}
            value={title} onChange={(e) => setTitle(e.target.value)} />
        )}
        {isChannel && (
          <input className="modal-input" placeholder="Tavsif (ixtiyoriy)"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        )}

        <input
          className="modal-input"
          placeholder="Foydalanuvchi qidirish..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {(isGroup || isChannel) && selected.length > 0 && (
          <div className="chips">
            {selected.map((u) => (
              <span key={u.id} className="chip" onClick={() => toggle(u)}>{u.displayName} ✕</span>
            ))}
          </div>
        )}

        <div className="search-results">
          {results.map((u) => {
            const isSel = selected.find((x) => x.id === u.id);
            return (
              <div key={u.id} className="search-row"
                onClick={() => (tab === 'private' ? onOpenPrivate(u) : toggle(u))}>
                <Avatar name={u.displayName} color={u.avatarColor} photoURL={u.photoURL} size={40} />
                <div className="search-info">
                  <div className="search-name">{u.displayName}{u.premium && ' ⭐'}</div>
                  <div className="search-username">@{u.username}</div>
                </div>
                {(isGroup || isChannel) && <span className="check">{isSel ? '☑' : '☐'}</span>}
              </div>
            );
          })}
          {query && results.length === 0 && <div className="empty-hint">Hech kim topilmadi</div>}
        </div>

        {isGroup && (
          <button className="primary-btn" disabled={!title.trim() || selected.length === 0}
            onClick={() => onCreateGroup(title, selected)}>
            Guruh yaratish ({selected.length})
          </button>
        )}
        {isChannel && (
          <button className="primary-btn" disabled={!title.trim()}
            onClick={() => onCreateChannel(title, desc, selected)}>
            Kanal yaratish ({selected.length})
          </button>
        )}
      </div>
    </div>
  );
}

// Xabarni forward qilish uchun chat tanlash
export function ForwardModal({ chats, onClose, onPick, count }) {
  const [q, setQ] = useState('');
  const list = chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Qayerga yuborilsin?{count > 1 ? ` (${count} xabar)` : ''}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <input className="modal-input" placeholder="Qidirish..." value={q}
          onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="search-results">
          {list.map((c) => (
            <div key={c.id} className="search-row" onClick={() => onPick(c)}>
              <Avatar name={c.title} color={c.avatarColor} photoURL={c.photoURL} size={40} />
              <div className="search-info">
                <div className="search-name">{c.title}</div>
                <div className="search-username">
                  {c.type === 'group' ? 'Guruh' : c.type === 'channel' ? 'Kanal' : c.type === 'saved' ? 'Saqlangan' : 'Shaxsiy'}
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="empty-hint">Suhbat topilmadi</div>}
        </div>
      </div>
    </div>
  );
}

// Kontakt ulashish uchun foydalanuvchi tanlash
export function ContactPickerModal({ searchUsers, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 1) { setResults([]); return; }
      try { setResults(await searchUsers(query)); } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [query]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Kontakt ulashish</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <input className="modal-input" placeholder="Foydalanuvchi qidirish..." value={query}
          onChange={(e) => setQuery(e.target.value)} autoFocus />
        <div className="search-results">
          {results.map((u) => (
            <div key={u.id} className="search-row" onClick={() => onPick(u)}>
              <Avatar name={u.displayName} color={u.avatarColor} photoURL={u.photoURL} size={40} />
              <div className="search-info">
                <div className="search-name">{u.displayName}{u.premium && ' ⭐'}</div>
                <div className="search-username">@{u.username}</div>
              </div>
            </div>
          ))}
          {query && results.length === 0 && <div className="empty-hint">Hech kim topilmadi</div>}
        </div>
      </div>
    </div>
  );
}

// Tasdiqlash oynasi (o'chirish, chiqish va h.k.)
export function ConfirmModal({ title, text, confirmLabel = 'Tasdiqlash', danger, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {text && <p className="confirm-text">{text}</p>}
        <div className="confirm-actions">
          <button className="ghost-btn" onClick={onClose}>Bekor</button>
          <button className={danger ? 'danger-btn' : 'primary-btn'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
