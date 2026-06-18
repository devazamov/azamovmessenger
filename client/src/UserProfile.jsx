import React from 'react';
import { Avatar, lastSeen } from './components.jsx';

// Boshqa foydalanuvchi profilini ko'rish (shaxsiy chat sarlavhasidan)
export default function UserProfile({
  user, online, lastActive, isBlocked,
  onAudioCall, onVideoCall, onToggleBlock, onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Profil</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="profile-top">
          <Avatar name={user.displayName} color={user.avatarColor} photoURL={user.photoURL} size={96} />
          <div className="profile-name-row">
            {user.displayName}
            {user.emojiStatus && <span> {user.emojiStatus}</span>}
            {user.premium && <span className="premium-star"> ⭐</span>}
          </div>
          <div className="profile-username">@{user.username}</div>
          <div className={online ? 'profile-status online' : 'profile-status'}>
            {online ? 'onlayn' : `oxirgi marta ${lastSeen(lastActive)}`}
          </div>
        </div>

        <div className="profile-actions">
          <button className="pa-btn" onClick={onAudioCall}><span>📞</span>Qo'ng'iroq</button>
          <button className="pa-btn" onClick={onVideoCall}><span>📹</span>Video</button>
        </div>

        {user.bio && (
          <div className="profile-section">
            <div className="ps-label">Bio</div>
            <div className="ps-value">{user.bio}</div>
          </div>
        )}
        <div className="profile-section">
          <div className="ps-label">Foydalanuvchi nomi</div>
          <div className="ps-value">@{user.username}</div>
        </div>

        <button className={isBlocked ? 'primary-btn' : 'danger-btn'} onClick={onToggleBlock}>
          {isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
        </button>
      </div>
    </div>
  );
}
