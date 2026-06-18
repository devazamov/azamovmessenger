import React, { useState } from 'react';
import { Avatar, formatTime } from './components.jsx';
import { StoriesRow } from './Stories.jsx';
import Logo from './Logo.jsx';

const FOLDERS = [
  { id: 'all', label: 'Hammasi' },
  { id: 'unread', label: 'O\'qilmagan' },
  { id: 'private', label: 'Shaxsiy' },
  { id: 'group', label: 'Guruhlar' },
  { id: 'channel', label: 'Kanallar' },
];

function chatIcon(c) {
  if (c.type === 'channel') return '📢 ';
  if (c.type === 'group') return '👥 ';
  return '';
}

export default function Sidebar({
  user, chats, activeId, onSelect, search, setSearch,
  folder, setFolder, storiesByAuthor, onAddStory, onOpenStory,
  onOpenSettings, onNewChat, onOpenSaved, peerData,
  onMute, onArchive, onLeave,
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [menu, setMenu] = useState(null); // {chat, x, y}

  React.useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const savedChat = chats.find((c) => c.type === 'saved');
  const normal = chats.filter((c) => c.type !== 'saved');
  const archivedChats = normal.filter((c) => c.archived);

  const visible = normal.filter((c) => {
    if (c.archived !== showArchived) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (showArchived) return true;
    if (folder === 'unread') return c.unread > 0;
    if (folder === 'private') return c.type === 'private';
    if (folder === 'group') return c.type === 'group';
    if (folder === 'channel') return c.type === 'channel';
    return true;
  });

  const peerOf = (c) => (c.peer ? peerData[c.peer.id] : null);
  const isOnline = (c) => peerOf(c)?.online || false;

  function openMenu(e, c) {
    e.preventDefault();
    setMenu({ chat: c, x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 180) });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo size={28} />
        <span className="brand-name">AZAMOV</span>
      </div>

      <div className="sidebar-header" onClick={onOpenSettings} style={{ cursor: 'pointer' }}>
        <Avatar name={user.displayName} color={user.avatarColor} photoURL={user.photoURL} size={40} />
        <div className="sidebar-me">
          <div className="sidebar-name">
            {user.displayName}
            {user.emojiStatus && <span> {user.emojiStatus}</span>}
            {user.premium && <span className="premium-star"> ⭐</span>}
          </div>
          <div className="sidebar-status online">● onlayn</div>
        </div>
        <button className="icon-btn" title="Sozlamalar" onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}>⚙</button>
      </div>

      <div className="search-bar">
        <input placeholder="Qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!showArchived && !search && (
        <StoriesRow storiesByAuthor={storiesByAuthor} me={user} onAdd={onAddStory} onOpen={onOpenStory} />
      )}

      {!showArchived && (
        <div className="folder-tabs">
          {FOLDERS.map((f) => (
            <button key={f.id} className={folder === f.id ? 'folder-tab active' : 'folder-tab'}
              onClick={() => setFolder(f.id)}>{f.label}</button>
          ))}
        </div>
      )}

      <div className="chat-list">
        {showArchived ? (
          <div className="archived-head" onClick={() => setShowArchived(false)}>← Arxivdan chiqish</div>
        ) : (
          <>
            <div className="chat-item saved-row" onClick={onOpenSaved}>
              <div className="saved-icon">🔖</div>
              <div className="chat-item-body">
                <div className="chat-item-top"><span className="chat-item-title">Saqlangan xabarlar</span></div>
                <div className="chat-item-last"><span className="chat-item-preview muted">O'zingizga eslatma</span></div>
              </div>
            </div>
            {archivedChats.length > 0 && (
              <div className="archived-head" onClick={() => setShowArchived(true)}>
                🗄 Arxivlangan ({archivedChats.length})
              </div>
            )}
          </>
        )}

        {visible.length === 0 && !savedChat && (
          <div className="empty-hint">Suhbatlar yo'q. Yangi suhbat boshlang.</div>
        )}

        {visible.map((c) => (
          <div key={c.id}
            className={c.id === activeId ? 'chat-item active' : 'chat-item'}
            onClick={() => onSelect(c.id)}
            onContextMenu={(e) => openMenu(e, c)}>
            <Avatar name={c.title} color={c.avatarColor} photoURL={c.photoURL} size={52} online={isOnline(c)} />
            <div className="chat-item-body">
              <div className="chat-item-top">
                <span className="chat-item-title">
                  {chatIcon(c)}{c.title}{peerOf(c)?.premium && ' ⭐'}
                </span>
                {c.lastMessage && <span className="chat-item-time">{formatTime(c.lastMessage.createdAt)}</span>}
              </div>
              <div className="chat-item-last">
                <span className="chat-item-preview">
                  {c.lastMessage ? (
                    <>
                      {(c.type === 'group') && c.lastMessage.senderName ? `${c.lastMessage.senderName.split(' ')[0]}: ` : ''}
                      {c.lastMessage.preview || c.lastMessage.body}
                    </>
                  ) : <span className="muted">Xabar yo'q</span>}
                </span>
                {c.muted && <span className="mute-icon">🔕</span>}
                {c.unread > 0 && <span className={c.muted ? 'unread-badge muted-badge' : 'unread-badge'}>{c.unread > 99 ? '99+' : c.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {menu && (
        <div className="chat-ctx" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { onMute(menu.chat, !menu.chat.muted); setMenu(null); }}>
            {menu.chat.muted ? '🔔 Ovozni yoqish' : '🔕 Ovozsiz qilish'}
          </button>
          <button onClick={() => { onArchive(menu.chat, !menu.chat.archived); setMenu(null); }}>
            {menu.chat.archived ? '📤 Arxivdan chiqarish' : '🗄 Arxivlash'}
          </button>
          {menu.chat.type !== 'private' && (
            <button className="danger" onClick={() => { onLeave(menu.chat); setMenu(null); }}>🚪 Chiqish</button>
          )}
        </div>
      )}

      <button className="fab" onClick={onNewChat} title="Yangi suhbat">✎</button>
    </aside>
  );
}
