import React, { useState } from 'react';
import { Avatar } from './components.jsx';
import { ACCENTS, WALLPAPERS } from './theme.js';

const STATUS_EMOJI = ['⭐', '🔥', '😎', '🚀', '💎', '👑', '🎯', '❤️', '🌟', '⚡', '🎮', '☕'];

export default function Settings({
  user, settings, onClose, onSaveProfile, onUploadPhoto, onTheme,
  onBuyPremium, onSetEmojiStatus, onLogout,
  notifyOn, onToggleNotify, blockedUsers, onUnblock,
}) {
  const [tab, setTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [busy, setBusy] = useState(false);
  const photoRef = React.useRef(null);

  async function save() {
    setBusy(true);
    try { await onSaveProfile({ displayName: displayName.trim(), bio: bio.trim() }); }
    finally { setBusy(false); }
  }
  function pickPhoto(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (f) onUploadPhoto(f);
  }
  const set = (patch) => onTheme({ ...settings, ...patch });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sozlamalar</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button className={tab === 'profile' ? 'tab active' : 'tab'} onClick={() => setTab('profile')}>Profil</button>
          <button className={tab === 'appearance' ? 'tab active' : 'tab'} onClick={() => setTab('appearance')}>Ko'rinish</button>
          <button className={tab === 'privacy' ? 'tab active' : 'tab'} onClick={() => setTab('privacy')}>Maxfiylik</button>
        </div>

        <div className="settings-body">
          {tab === 'profile' && (
            <>
              <div className="profile-top">
                <div className="profile-avatar" onClick={() => photoRef.current?.click()}>
                  <Avatar name={user.displayName} color={user.avatarColor} photoURL={user.photoURL} size={88} />
                  <span className="profile-cam">📷</span>
                </div>
                <input type="file" accept="image/*" ref={photoRef} style={{ display: 'none' }} onChange={pickPhoto} />
                <div className="profile-name-row">
                  {user.displayName}
                  {user.emojiStatus && <span> {user.emojiStatus}</span>}
                  {user.premium && <span className="premium-star"> ⭐</span>}
                </div>
                <div className="profile-username">@{user.username}</div>
              </div>

              <label className="field-label">Ism</label>
              <input className="modal-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <label className="field-label">Bio</label>
              <input className="modal-input" placeholder="O'zingiz haqingizda..." value={bio}
                onChange={(e) => setBio(e.target.value)} />
              <button className="primary-btn" onClick={save} disabled={busy}>{busy ? '...' : 'Saqlash'}</button>

              {user.premium && (
                <>
                  <label className="field-label">Emoji status</label>
                  <div className="emoji-status-row">
                    {STATUS_EMOJI.map((e) => (
                      <button key={e} className={user.emojiStatus === e ? 'status-emoji active' : 'status-emoji'}
                        onClick={() => onSetEmojiStatus(user.emojiStatus === e ? null : e)}>{e}</button>
                    ))}
                  </div>
                </>
              )}

              <div className={user.premium ? 'premium-card active' : 'premium-card'}>
                <div className="premium-head">⭐ AZAMOV Premium</div>
                <div className="premium-desc">
                  {user.premium ? 'Premium faol! Emoji status, belgi va ko\'proq imkoniyat.' : 'Eksklyuziv belgi, emoji status va ranglar.'}
                </div>
                <button className="premium-btn" onClick={onBuyPremium}>
                  {user.premium ? 'Premiumni uzaytirish' : 'Premium olish'}
                </button>
              </div>

              <button className="logout-btn" onClick={onLogout}>Chiqish</button>
            </>
          )}

          {tab === 'appearance' && (
            <>
              <label className="field-label">Mavzu</label>
              <div className="theme-modes">
                <button className={settings.mode === 'light' ? 'mode-btn active' : 'mode-btn'} onClick={() => set({ mode: 'light' })}>☀️ Yorug'</button>
                <button className={settings.mode === 'dark' ? 'mode-btn active' : 'mode-btn'} onClick={() => set({ mode: 'dark' })}>🌙 Tungi</button>
              </div>

              <label className="field-label">Asosiy rang</label>
              <div className="accent-row">
                {ACCENTS.map((a) => (
                  <button key={a.id} className={settings.accent === a.id ? 'accent-dot active' : 'accent-dot'}
                    style={{ background: a.color }} onClick={() => set({ accent: a.id })} />
                ))}
              </div>

              <label className="field-label">Chat foni</label>
              <div className="wallpaper-grid">
                {WALLPAPERS.map((w) => (
                  <button key={w.id} className={settings.wallpaper === w.id ? 'wp-cell active' : 'wp-cell'}
                    style={{ background: settings.mode === 'dark' ? w.dark : w.light }}
                    onClick={() => set({ wallpaper: w.id })} title={w.name} />
                ))}
              </div>
            </>
          )}

          {tab === 'privacy' && (
            <>
              <label className="toggle-row">
                <input type="checkbox" checked={notifyOn} onChange={(e) => onToggleNotify(e.target.checked)} />
                Bildirishnomalar va ovoz
              </label>

              <label className="field-label">Bloklangan foydalanuvchilar</label>
              {blockedUsers.length === 0 && <div className="empty-hint">Bloklangan yo'q</div>}
              {blockedUsers.map((u) => (
                <div key={u.id} className="search-row">
                  <Avatar name={u.displayName} color={u.avatarColor} photoURL={u.photoURL} size={40} />
                  <div className="search-info">
                    <div className="search-name">{u.displayName}</div>
                    <div className="search-username">@{u.username}</div>
                  </div>
                  <button className="ghost-btn" onClick={() => onUnblock(u.id)}>Blokdan chiqarish</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
