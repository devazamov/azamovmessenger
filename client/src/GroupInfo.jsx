import React, { useState, useEffect } from 'react';
import { Avatar } from './components.jsx';

// Guruh / kanal ma'lumotlari va boshqaruvi
export default function GroupInfo({
  chat, me, onClose, onEditMeta, onUploadPhoto,
  onAddMembers, onRemoveMember, onLeave, onSetAdmin, searchUsers,
}) {
  const isAdmin = chat.admins?.includes(me.id) || chat.createdBy === me.id;
  const isChannel = chat.type === 'channel';
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [desc, setDesc] = useState(chat.description || '');
  const [adding, setAdding] = useState(false);
  const photoRef = React.useRef(null);

  const members = chat.members.map((id) => ({
    id,
    ...(chat.memberInfo?.[id] || { displayName: id }),
    isAdmin: chat.admins?.includes(id) || chat.createdBy === id,
    isOwner: chat.createdBy === id,
  }));

  function saveMeta() {
    onEditMeta({ title: title.trim() || chat.title, description: desc.trim() });
    setEditing(false);
  }
  function pickPhoto(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (f) onUploadPhoto(f);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isChannel ? 'Kanal' : 'Guruh'} ma'lumotlari</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="profile-top">
          <div className="profile-avatar" onClick={() => isAdmin && photoRef.current?.click()} style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
            <Avatar name={chat.title} color={chat.avatarColor} photoURL={chat.photoURL} size={88} />
            {isAdmin && <span className="profile-cam">📷</span>}
          </div>
          <input type="file" accept="image/*" ref={photoRef} style={{ display: 'none' }} onChange={pickPhoto} />

          {editing ? (
            <>
              <input className="modal-input" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="modal-input" placeholder="Tavsif" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <div className="confirm-actions">
                <button className="ghost-btn" onClick={() => setEditing(false)}>Bekor</button>
                <button className="primary-btn" onClick={saveMeta}>Saqlash</button>
              </div>
            </>
          ) : (
            <>
              <div className="profile-name-row">{chat.title}</div>
              <div className="profile-username">
                {chat.members.length} {isChannel ? 'obunachi' : 'a\'zo'}
              </div>
              {chat.description && <div className="ps-value" style={{ textAlign: 'center', marginTop: 6 }}>{chat.description}</div>}
              {isAdmin && <button className="ghost-btn" onClick={() => setEditing(true)}>✏️ Tahrirlash</button>}
            </>
          )}
        </div>

        <div className="members-head">
          <span className="field-label">{isChannel ? 'Obunachilar' : 'A\'zolar'}</span>
          {isAdmin && <button className="ghost-btn" onClick={() => setAdding(true)}>+ Qo'shish</button>}
        </div>

        <div className="search-results">
          {members.map((m) => (
            <div key={m.id} className="search-row">
              <Avatar name={m.displayName} color={m.avatarColor} photoURL={m.photoURL} size={40} />
              <div className="search-info">
                <div className="search-name">{m.displayName}{m.id === me.id && ' (siz)'}</div>
                <div className="search-username">
                  {m.isOwner ? 'Egasi' : m.isAdmin ? 'Admin' : 'A\'zo'}
                </div>
              </div>
              {isAdmin && m.id !== me.id && !m.isOwner && (
                <div className="member-actions">
                  <button className="icon-btn" title={m.isAdmin ? 'Adminlikdan olish' : 'Admin qilish'}
                    onClick={() => onSetAdmin(m.id, !m.isAdmin)}>{m.isAdmin ? '⭐' : '☆'}</button>
                  <button className="icon-btn danger" title="Chiqarish" onClick={() => onRemoveMember(m.id)}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="danger-btn" onClick={onLeave}>
          {isChannel ? 'Kanalni tark etish' : 'Guruhdan chiqish'}
        </button>
      </div>

      {adding && (
        <AddMembersModal
          existing={chat.members}
          searchUsers={searchUsers}
          onClose={() => setAdding(false)}
          onAdd={(users) => { onAddMembers(users); setAdding(false); }}
        />
      )}
    </div>
  );
}

function AddMembersModal({ existing, searchUsers, onClose, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      try {
        const r = await searchUsers(query);
        setResults(r.filter((u) => !existing.includes(u.id)));
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(u) {
    setSelected((p) => p.find((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u]);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>A'zo qo'shish</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <input className="modal-input" placeholder="Qidirish..." value={query}
          onChange={(e) => setQuery(e.target.value)} autoFocus />
        {selected.length > 0 && (
          <div className="chips">
            {selected.map((u) => <span key={u.id} className="chip" onClick={() => toggle(u)}>{u.displayName} ✕</span>)}
          </div>
        )}
        <div className="search-results">
          {results.map((u) => {
            const sel = selected.find((x) => x.id === u.id);
            return (
              <div key={u.id} className="search-row" onClick={() => toggle(u)}>
                <Avatar name={u.displayName} color={u.avatarColor} photoURL={u.photoURL} size={40} />
                <div className="search-info">
                  <div className="search-name">{u.displayName}</div>
                  <div className="search-username">@{u.username}</div>
                </div>
                <span className="check">{sel ? '☑' : '☐'}</span>
              </div>
            );
          })}
        </div>
        <button className="primary-btn" disabled={selected.length === 0} onClick={() => onAdd(selected)}>
          Qo'shish ({selected.length})
        </button>
      </div>
    </div>
  );
}
