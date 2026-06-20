import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Avatar, formatTime, formatBytes, dayLabel, renderText, ContactPickerModal } from './components.jsx';
import { VoiceRecorder, VoicePlayer } from './Voice.jsx';
import { VideoNoteRecorder, VideoNotePlayer } from './VideoNote.jsx';
import { PollMessage, CreatePollModal } from './Poll.jsx';
import Stickers from './Stickers.jsx';
import Lightbox from './Lightbox.jsx';

const QUICK_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];
const TTL_OPTIONS = [
  { label: 'O\'chirilgan', value: 0 },
  { label: '10 soniya', value: 10 },
  { label: '1 daqiqa', value: 60 },
  { label: '1 soat', value: 3600 },
];

const toMs = (v) => (v?.toMillis ? v.toMillis() : (v || 0));
const isEmojiOnly = (s) => {
  if (!s) return false;
  const t = s.trim();
  return t.length <= 8 && /^[\p{Extended_Pictographic}‍️⃣]+$/u.test(t);
};

export default function ChatView({
  chat, me, messages, subtitle, online, uploading, typingUsers, canPost,
  onSend, onFile, onVoice, onSticker, onPoll, onVote, onTyping,
  onVideoNote, onSendContact, onSendLocation, onOpenContact, searchUsers,
  onEdit, onDeleteEveryone, onDeleteForMe, onReact, onForward, onPin, onUnpin, onReport,
  onHeaderClick, onAudioCall, onVideoCall, onBack,
}) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);
  const [contactPicker, setContactPicker] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [ttl, setTtl] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchIdx, setSearchIdx] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState({});
  const [mentionList, setMentionList] = useState(null);

  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const msgRefs = useRef({});

  const isChannel = chat.type === 'channel';
  const isSaved = chat.type === 'saved';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    setReplyTo(null); setEditing(null); setSelectMode(false); setSelected({});
    setSearchOpen(false); setSearchQ(''); setShowStickers(false);
  }, [chat.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 250;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const close = () => { setMenu(null); setShowAttach(false); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // Qidiruv natijalari
  const matches = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase();
    return messages.filter((m) => (m.body || '').toLowerCase().includes(q)).map((m) => m.id);
  }, [searchQ, messages]);

  useEffect(() => {
    if (!matches.length) return;
    const id = matches[Math.min(searchIdx, matches.length - 1)];
    msgRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchIdx, matches]);

  // Yetkazib berish/o'qilganlik holati (mening xabarlarim uchun)
  function readState(m) {
    if (!isSaved && m.senderId !== me.id) return null;
    if (isSaved) return 'read';
    const others = chat.members.filter((u) => u !== me.id);
    if (!others.length) return 'sent';
    const allRead = others.every((u) => toMs(chat.readAt?.[u]) >= m.createdAt);
    return allRead ? 'read' : 'sent';
  }

  function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (editing) {
      onEdit(editing.id, body);
      setEditing(null);
    } else {
      const mentions = (body.match(/@([a-zA-Z0-9_]{2,})/g) || []).map((s) => s.slice(1));
      onSend({
        body,
        mentions,
        ttlSeconds: ttl || undefined,
        replyTo: replyTo ? {
          id: replyTo.id, senderName: replyTo.senderName,
          body: replyTo.body, isImage: replyTo.attachment?.isImage || false,
        } : null,
      });
    }
    setText('');
    setReplyTo(null);
    setMentionList(null);
  }

  function onInput(e) {
    const v = e.target.value;
    setText(v);
    onTyping();
    // @mention avtotanlash (guruh/kanal)
    if (chat.type === 'group' || chat.type === 'channel') {
      const m = v.slice(0, e.target.selectionStart).match(/@([a-zA-Z0-9_]*)$/);
      if (m) {
        const q = m[1].toLowerCase();
        const list = Object.entries(chat.memberInfo || {})
          .filter(([id]) => id !== me.id)
          .map(([id, info]) => ({ id, ...info }))
          .filter((u) => (u.displayName || '').toLowerCase().includes(q))
          .slice(0, 5);
        setMentionList(list.length ? list : null);
      } else setMentionList(null);
    }
  }

  function pickMention(u) {
    const handle = (u.displayName || '').split(' ')[0];
    setText((t) => t.replace(/@([a-zA-Z0-9_]*)$/, `@${handle} `));
    setMentionList(null);
    inputRef.current?.focus();
  }

  function pickFile(e) { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }

  function shareLocation() {
    setShowAttach(false);
    if (!navigator.geolocation) { alert('Brauzer geolokatsiyani qo\'llab-quvvatlamaydi.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => onSendLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('Lokatsiyaga ruxsat berilmadi.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openMenu(e, msg) {
    e.preventDefault();
    if (selectMode) { toggleSelect(msg); return; }
    const x = Math.min(e.clientX, window.innerWidth - 210);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setMenu({ msg, x, y });
  }

  function startEdit(msg) { setEditing({ id: msg.id, body: msg.body }); setText(msg.body || ''); setReplyTo(null); setMenu(null); setTimeout(() => inputRef.current?.focus(), 0); }
  function startReply(msg) { setReplyTo(msg); setEditing(null); setMenu(null); setTimeout(() => inputRef.current?.focus(), 0); }
  function addEmoji(em) { setText((t) => t + em); inputRef.current?.focus(); }

  function toggleSelect(msg) {
    setSelected((p) => { const n = { ...p }; if (n[msg.id]) delete n[msg.id]; else n[msg.id] = msg; return n; });
  }
  const selectedList = Object.values(selected);
  function copySelected() {
    const txt = selectedList.map((m) => m.body || '').filter(Boolean).join('\n');
    navigator.clipboard?.writeText(txt);
    setSelectMode(false); setSelected({});
  }
  function deleteSelected() {
    selectedList.forEach((m) => { if (m.senderId === me.id || isAdmin) onDeleteEveryone(m.id); else onDeleteForMe(m.id); });
    setSelectMode(false); setSelected({});
  }

  const isAdmin = chat.admins?.includes(me.id) || chat.createdBy === me.id;
  const typingNames = Object.values(typingUsers || {});
  const showComposer = canPost !== false;

  // Sana ajratuvchilari bilan render qilish
  let lastDay = null;

  return (
    <div className="chat-view">
      <header className="chat-header">
        <button className="icon-btn chat-back" onClick={onBack} title="Orqaga">←</button>
        <div className="chat-header-main" onClick={onHeaderClick} style={{ cursor: 'pointer' }}>
          <Avatar name={chat.title} color={chat.avatarColor} photoURL={chat.photoURL}
            size={42} online={chat.type === 'private' && online} />
          <div className="chat-header-info">
            <div className="chat-header-title">
              {chat.secret && <span className="secret-lock" title="Maxfiy chat">🔒 </span>}
              {chat.title}
              {chat.peer?.premium && <span className="premium-star"> ⭐</span>}
              {chat.peer?.emojiStatus && <span> {chat.peer.emojiStatus}</span>}
            </div>
            <div className="chat-header-sub">
              {typingNames.length > 0
                ? <span className="typing">{typingNames.join(', ')} yozmoqda...</span>
                : subtitle}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          {chat.type === 'private' && (
            <>
              <button className="icon-btn" title="Qo'ng'iroq" onClick={onAudioCall}>📞</button>
              <button className="icon-btn" title="Video" onClick={onVideoCall}>📹</button>
            </>
          )}
          <button className="icon-btn" title="Qidirish" onClick={() => setSearchOpen((s) => !s)}>🔍</button>
        </div>
      </header>

      {chat.pinnedMessage && (
        <div className="pin-banner" onClick={() => msgRefs.current[chat.pinnedMessage.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          <div className="pin-icon">📌</div>
          <div className="pin-body">
            <div className="pin-title">Qadalgan xabar</div>
            <div className="pin-text">{chat.pinnedMessage.body}</div>
          </div>
          {isAdmin || chat.type === 'private' || isSaved ? (
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onUnpin(); }}>✕</button>
          ) : null}
        </div>
      )}

      {searchOpen && (
        <div className="chat-search">
          <input autoFocus placeholder="Xabarlarda qidirish..." value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setSearchIdx(0); }} />
          <span className="search-count">{matches.length ? `${Math.min(searchIdx + 1, matches.length)}/${matches.length}` : '0'}</span>
          <button className="icon-btn" onClick={() => setSearchIdx((i) => Math.max(0, i - 1))}>▲</button>
          <button className="icon-btn" onClick={() => setSearchIdx((i) => Math.min(matches.length - 1, i + 1))}>▼</button>
          <button className="icon-btn" onClick={() => { setSearchOpen(false); setSearchQ(''); }}>✕</button>
        </div>
      )}

      {selectMode && (
        <div className="select-bar">
          <button className="icon-btn" onClick={() => { setSelectMode(false); setSelected({}); }}>✕</button>
          <span className="select-count">{selectedList.length} tanlandi</span>
          <div className="select-actions">
            <button className="icon-btn" title="Nusxalash" onClick={copySelected}>📋</button>
            <button className="icon-btn" title="Forward" onClick={() => { onForward(selectedList); setSelectMode(false); setSelected({}); }}>↪️</button>
            <button className="icon-btn danger" title="O'chirish" onClick={deleteSelected}>🗑</button>
          </div>
        </div>
      )}

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="no-messages">Hali xabar yo'q. Birinchi bo'lib yozing!</div>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === me.id;
          const prev = messages[i - 1];
          const showName = (chat.type === 'group' || chat.type === 'channel') && !mine && (!prev || prev.senderId !== m.senderId);
          const day = dayLabel(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const isMatch = matches.includes(m.id);
          return (
            <React.Fragment key={m.id}>
              {showDay && <div className="day-sep"><span>{day}</span></div>}
              <MessageBubble
                m={m} mine={mine} showName={showName} meId={me.id}
                isChannel={isChannel}
                read={readState(m)}
                selectMode={selectMode} selected={!!selected[m.id]}
                highlight={isMatch} searchQ={searchQ}
                refCb={(el) => { if (el) msgRefs.current[m.id] = el; }}
                onMenu={openMenu} onReact={onReact} onSelect={toggleSelect}
                onVote={(optId) => onVote(m.id, optId, m.poll?.multiple)}
                onImage={(src, name) => setLightbox({ src, name })}
                onContact={onOpenContact}
              />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {menu && (
        <MessageMenu
          menu={menu} mine={menu.msg.senderId === me.id} isAdmin={isAdmin} isSaved={isSaved}
          onReply={() => startReply(menu.msg)}
          onEdit={() => startEdit(menu.msg)}
          onDeleteEveryone={() => { onDeleteEveryone(menu.msg.id); setMenu(null); }}
          onDeleteForMe={() => { onDeleteForMe(menu.msg.id); setMenu(null); }}
          onForward={() => { onForward([menu.msg]); setMenu(null); }}
          onReact={(em) => { onReact(menu.msg.id, em); setMenu(null); }}
          onPin={() => { onPin(menu.msg); setMenu(null); }}
          onCopy={() => { navigator.clipboard?.writeText(menu.msg.body || ''); setMenu(null); }}
          onSelect={() => { setSelectMode(true); toggleSelect(menu.msg); setMenu(null); }}
          onReport={() => { onReport(menu.msg); setMenu(null); }}
        />
      )}

      {(replyTo || editing) && (
        <div className="reply-bar">
          <div className="reply-bar-icon">{editing ? '✏️' : '↩️'}</div>
          <div className="reply-bar-body">
            <div className="reply-bar-title">{editing ? 'Tahrirlash' : replyTo.senderName}</div>
            <div className="reply-bar-text">
              {editing ? editing.body : (replyTo.body || (replyTo.attachment?.isImage ? '🖼 Rasm' : '📄 Fayl'))}
            </div>
          </div>
          <button className="icon-btn" onClick={() => { setReplyTo(null); setEditing(null); setText(''); }}>✕</button>
        </div>
      )}

      {mentionList && (
        <div className="mention-pop">
          {mentionList.map((u) => (
            <div key={u.id} className="mention-item" onClick={() => pickMention(u)}>
              <Avatar name={u.displayName} color={u.avatarColor} photoURL={u.photoURL} size={28} />
              <span>{u.displayName}</span>
            </div>
          ))}
        </div>
      )}

      {showStickers && showComposer && (
        <Stickers
          onEmoji={addEmoji}
          onSticker={(s) => { onSticker(s); setShowStickers(false); }}
        />
      )}

      {showComposer ? (
        recording ? (
          <VoiceRecorder
            onDone={(v) => { onVoice(v); setRecording(false); }}
            onCancel={() => setRecording(false)}
          />
        ) : (
          <form className="composer" onSubmit={submit}>
            <div className="attach-wrap">
              <button type="button" className="icon-btn attach" title="Biriktirish"
                onClick={(e) => { e.stopPropagation(); setShowAttach((s) => !s); }}>
                {uploading ? '⏳' : '📎'}
              </button>
              {showAttach && (
                <div className="attach-menu" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { photoRef.current?.click(); setShowAttach(false); }}>🖼 Rasm / Video</button>
                  <button type="button" onClick={() => { fileRef.current?.click(); setShowAttach(false); }}>📄 Fayl</button>
                  <button type="button" onClick={() => { setRecordingVideo(true); setShowAttach(false); }}>📹 Video xabar</button>
                  <button type="button" onClick={() => { setContactPicker(true); setShowAttach(false); }}>👤 Kontakt</button>
                  <button type="button" onClick={shareLocation}>📍 Lokatsiya</button>
                  {chat.type !== 'channel' && <button type="button" onClick={() => { setCreatingPoll(true); setShowAttach(false); }}>📊 So'rovnoma</button>}
                  <div className="attach-ttl">
                    <span>⏱ O'z-o'zini yo'q qilish</span>
                    <select value={ttl} onChange={(e) => setTtl(Number(e.target.value))}>
                      {TTL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
            <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={pickFile} />
            <input type="file" accept="image/*,video/*" ref={photoRef} style={{ display: 'none' }} onChange={pickFile} />
            <button type="button" className="icon-btn attach" onClick={() => setShowStickers((s) => !s)} title="Emoji / Stiker">😊</button>
            <input
              ref={inputRef}
              className="composer-input"
              placeholder={ttl ? `⏱ ${TTL_OPTIONS.find((o) => o.value === ttl)?.label}...` : 'Xabar yozing...'}
              value={text}
              onChange={onInput}
            />
            {text.trim() ? (
              <button type="submit" className="send-btn">{editing ? '✓' : '➤'}</button>
            ) : (
              <button type="button" className="send-btn mic" title="Ovozli xabar" onClick={() => setRecording(true)}>🎤</button>
            )}
          </form>
        )
      ) : (
        <div className="channel-readonly">🔒 Faqat adminlar yozishi mumkin</div>
      )}

      {creatingPoll && (
        <CreatePollModal onClose={() => setCreatingPoll(false)}
          onCreate={(p) => { onPoll(p); setCreatingPoll(false); }} />
      )}
      {recordingVideo && (
        <VideoNoteRecorder
          onDone={(v) => { onVideoNote(v); setRecordingVideo(false); }}
          onCancel={() => setRecordingVideo(false)}
        />
      )}
      {contactPicker && (
        <ContactPickerModal
          searchUsers={searchUsers}
          onClose={() => setContactPicker(false)}
          onPick={(u) => {
            onSendContact({ uid: u.id, name: u.displayName, username: u.username || null, avatarColor: u.avatarColor, photoURL: u.photoURL || null });
            setContactPicker(false);
          }}
        />
      )}
      {lightbox && <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function MessageBubble({
  m, mine, showName, meId, isChannel, read, selectMode, selected,
  highlight, searchQ, refCb, onMenu, onReact, onSelect, onVote, onImage, onContact,
}) {
  const reactions = Object.entries(m.reactions || {}).filter(([, u]) => u.length > 0);
  const bigEmoji = (m.sticker) || (!m.attachment && !m.voice && !m.poll && isEmojiOnly(m.body));
  const stickerChar = m.sticker?.emoji || m.sticker;

  return (
    <div className={`msg-row ${mine ? 'mine' : ''} ${selectMode ? 'selecting' : ''} ${highlight ? 'matched' : ''}`}
      ref={refCb}
      onContextMenu={(e) => onMenu(e, m)}
      onClick={() => selectMode && onSelect(m)}>
      {selectMode && <span className={selected ? 'sel-box on' : 'sel-box'}>{selected ? '✓' : ''}</span>}

      {bigEmoji && m.sticker ? (
        <div className="sticker-msg" onDoubleClick={() => onReact(m.id, '👍')} onContextMenu={(e) => onMenu(e, m)}>
          <div className="big-sticker">{stickerChar}</div>
          <span className="sticker-time">{formatTime(m.createdAt)}{mine && <Ticks read={read} />}</span>
          {reactions.length > 0 && <Reactions reactions={reactions} meId={meId} onReact={(em) => onReact(m.id, em)} />}
        </div>
      ) : (
        <div className={bigEmoji ? 'bubble emoji-only' : 'bubble'} onDoubleClick={() => onReact(m.id, '👍')}>
          {showName && <div className="bubble-name" style={{ color: m.senderColor }}>{m.senderName}</div>}
          {m.forwardFrom && <div className="forward-tag">↪ {m.forwardFrom.name} dan</div>}
          {m.replyTo && (
            <div className="reply-quote">
              <div className="reply-quote-name">{m.replyTo.senderName}</div>
              <div className="reply-quote-text">{m.replyTo.body || (m.replyTo.isImage ? '🖼 Rasm' : '📄 Fayl')}</div>
            </div>
          )}
          {m.attachment && <Attachment a={m.attachment} onImage={onImage} />}
          {m.voice && <VoicePlayer voice={m.voice} mine={mine} />}
          {m.videoNote && <VideoNotePlayer videoNote={m.videoNote} />}
          {m.contact && <ContactCard contact={m.contact} onOpen={onContact} />}
          {m.location && <LocationCard location={m.location} />}
          {m.poll && <PollMessage poll={m.poll} meId={meId} onVote={onVote} />}
          {m.body && (
            <div className={bigEmoji ? 'bubble-text big' : 'bubble-text'}>
              {highlight && searchQ ? highlightText(m.body, searchQ) : renderText(m.body)}
            </div>
          )}
          {m.expireAt && <span className="ttl-tag">⏱</span>}
          <span className="bubble-time">
            {m.edited && <span className="edited">tahrirlandi </span>}
            {formatTime(m.createdAt)}
            {mine && <Ticks read={read} />}
          </span>
          {reactions.length > 0 && <Reactions reactions={reactions} meId={meId} onReact={(em) => onReact(m.id, em)} />}
        </div>
      )}
    </div>
  );
}

function Ticks({ read }) {
  if (!read) return null;
  return <span className={read === 'read' ? 'ticks read' : 'ticks'}> {read === 'read' ? '✓✓' : '✓'}</span>;
}

function Reactions({ reactions, meId, onReact }) {
  return (
    <div className="reactions">
      {reactions.map(([em, users]) => (
        <span key={em} className={users.includes(meId) ? 'reaction mine' : 'reaction'}
          onClick={(e) => { e.stopPropagation(); onReact(em); }}>
          {em} {users.length}
        </span>
      ))}
    </div>
  );
}

function highlightText(text, q) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function MessageMenu({
  menu, mine, isAdmin, isSaved, onReply, onEdit, onDeleteEveryone, onDeleteForMe,
  onForward, onReact, onPin, onCopy, onSelect, onReport,
}) {
  const canDeleteEveryone = mine || isAdmin;
  return (
    <div className="msg-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
      <div className="menu-emojis">
        {QUICK_EMOJI.map((em) => (
          <button key={em} className="menu-emoji" onClick={() => onReact(em)}>{em}</button>
        ))}
      </div>
      {!isSaved && <button className="menu-item" onClick={onReply}>↩️ Javob berish</button>}
      <button className="menu-item" onClick={onForward}>↪️ Forward</button>
      {menu.msg.body && <button className="menu-item" onClick={onCopy}>📋 Nusxalash</button>}
      <button className="menu-item" onClick={onPin}>📌 Qadab qo'yish</button>
      <button className="menu-item" onClick={onSelect}>☑️ Tanlash</button>
      {!mine && !isSaved && <button className="menu-item" onClick={onReport}>🚩 Shikoyat</button>}
      {mine && menu.msg.body && <button className="menu-item" onClick={onEdit}>✏️ Tahrirlash</button>}
      <button className="menu-item" onClick={onDeleteForMe}>🙈 Men uchun o'chirish</button>
      {canDeleteEveryone && <button className="menu-item danger" onClick={onDeleteEveryone}>🗑 Hammaga o'chirish</button>}
    </div>
  );
}

function Attachment({ a, onImage }) {
  if (a.isImage) {
    return (
      <div className="attach-image" onClick={() => onImage(a.url, a.name)}>
        <img src={a.url} alt={a.name} />
      </div>
    );
  }
  if (a.isVideo) {
    return (
      <div className="attach-video">
        <video src={a.url} controls playsInline preload="metadata" />
      </div>
    );
  }
  return (
    <a href={a.url} target="_blank" rel="noreferrer" download={a.name} className="attach-file">
      <span className="attach-icon">📄</span>
      <span className="attach-meta">
        <span className="attach-name">{a.name}</span>
        <span className="attach-size">{formatBytes(a.size)}</span>
      </span>
    </a>
  );
}

function ContactCard({ contact, onOpen }) {
  return (
    <div className="contact-card" onClick={() => onOpen && onOpen(contact)}>
      <Avatar name={contact.name} color={contact.avatarColor} photoURL={contact.photoURL} size={44} />
      <div className="contact-card-info">
        <div className="contact-card-name">👤 {contact.name}</div>
        {contact.username && <div className="contact-card-username">@{contact.username}</div>}
      </div>
    </div>
  );
}

function LocationCard({ location }) {
  const { lat, lng } = location;
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  const tile = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=300x150&markers=${lat},${lng},red-pushpin`;
  return (
    <a className="location-card" href={href} target="_blank" rel="noreferrer">
      <img src={tile} alt="Lokatsiya" onError={(e) => { e.target.style.display = 'none'; }} />
      <div className="location-card-foot">📍 {lat.toFixed(5)}, {lng.toFixed(5)}</div>
    </a>
  );
}
