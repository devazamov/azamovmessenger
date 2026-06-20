import React, { useState, useEffect, useRef } from 'react';
import {
  onAuth, logout, startPresence,
  subscribeChats, subscribeMessages, subscribeTyping,
  sendMessage as sendMsg, setTyping, uploadFile,
  openPrivateChat, createGroup as createGroupFb, createChannel as createChannelFb, openSavedChat,
  openSecretChat,
  searchUsers, isUserOnline, subscribeUser, fetchUsers,
  editMessage, deleteMessage, deleteMessageForMe, toggleReaction, forwardMessages, reportMessage,
  markChatRead, updateProfile, setEmojiStatus, purchasePremium,
  muteChat, archiveChat, pinChatMessage, unpinChatMessage, updateChatMeta,
  addMembers, removeMember, leaveChat, setAdmin,
  sendVoice, sendSticker, sendPoll, votePoll,
  sendVideoNote, sendContact, sendLocation,
  addStory, subscribeStories, viewStory, deleteStory,
  blockUser, unblockUser,
} from './chatStore.js';
import { encryptText, decryptMessages, generateSecretKey } from './crypto.js';
import { PremiumModal } from './Premium.jsx';
import { Call, subscribeIncomingCalls, declineCall } from './calls.js';
import { loadSettings, saveSettings, applySettings } from './theme.js';
import {
  requestNotifyPermission, showNotification, playPop, startRingtone,
  setUnreadTitle, notificationsEnabled, setNotificationsEnabled,
} from './notify.js';
import Auth from './Auth.jsx';
import ChatView from './ChatView.jsx';
import Sidebar from './Sidebar.jsx';
import Settings from './Settings.jsx';
import UserProfile from './UserProfile.jsx';
import GroupInfo from './GroupInfo.jsx';
import { StoryViewer } from './Stories.jsx';
import { IncomingCall, CallWindow } from './CallUI.jsx';
import { lastSeen, NewChatModal, ForwardModal, ConfirmModal } from './components.jsx';
import Logo from './Logo.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { applySettings(loadSettings()); }, []);

  useEffect(() => {
    const unsub = onAuth((u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return <div className="splash"><Logo size={72} /><p>Yuklanmoqda...</p></div>;
  if (!user) return <Auth />;
  return <Messenger user={user} onLogout={logout} />;
}

function Messenger({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTypingState] = useState({});
  const [peerData, setPeerData] = useState({});
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('all');
  const [uploading, setUploading] = useState(false);

  // Modallar
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [forwarding, setForwarding] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [storyAuthor, setStoryAuthor] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showPremium, setShowPremium] = useState(false);

  // Stories, mavzu, bildirishnoma
  const [storiesByAuthor, setStoriesByAuthor] = useState({});
  const [settings, setSettings] = useState(loadSettings());
  const [notifyOn, setNotifyOn] = useState(notificationsEnabled());

  // Qo'ng'iroqlar
  const [incoming, setIncoming] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  const active = chats.find((c) => c.id === activeId) || null;

  // Maxfiy chat kaliti (effekt ichida foydalanish uchun ref)
  const secretKeyRef = useRef(null);
  useEffect(() => { secretKeyRef.current = active?.secret ? active.secretKey : null; }, [active]);

  useEffect(() => startPresence(user.id), [user.id]);
  useEffect(() => subscribeChats(user.id, setChats), [user.id]);
  useEffect(() => subscribeUser(user.id, (d) => setUser((u) => ({ ...u, ...d, id: u.id }))), [user.id]);
  useEffect(() => subscribeStories(setStoriesByAuthor), []);
  useEffect(() => { requestNotifyPermission(); }, []);

  // Faol chat xabarlari
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setMessages([]);
    markChatRead(activeId, user.id);
    const unsub = subscribeMessages(activeId, user.id, async (msgs) => {
      const key = secretKeyRef.current;
      setMessages(key ? await decryptMessages(msgs, key) : msgs);
      markChatRead(activeId, user.id);
    });
    return unsub;
  }, [activeId, user.id]);

  useEffect(() => {
    if (!activeId) return;
    return subscribeTyping(activeId, user.id, (t) => setTypingState(t));
  }, [activeId, user.id]);

  // Suhbatdoshlar holati
  const peerIds = chats.filter((c) => c.peer).map((c) => c.peer.id).join(',');
  useEffect(() => {
    const ids = peerIds ? peerIds.split(',') : [];
    const unsubs = ids.map((uid) =>
      subscribeUser(uid, (data) => {
        setPeerData((prev) => ({
          ...prev,
          [uid]: {
            online: isUserOnline(data),
            lastActive: data.lastActive?.toMillis ? data.lastActive.toMillis() : Date.now(),
            premium: !!data.premium,
            photoURL: data.photoURL || null,
            displayName: data.displayName,
            username: data.username,
            bio: data.bio || '',
            avatarColor: data.avatarColor,
            emojiStatus: data.emojiStatus || null,
          },
        }));
      })
    );
    return () => unsubs.forEach((u) => u && u());
  }, [peerIds]);

  // Kelayotgan qo'ng'iroqlar
  useEffect(() => subscribeIncomingCalls(user.id, (c) => setIncoming(c)), [user.id]);
  useEffect(() => {
    if (incoming && !activeCall) { const stop = startRingtone(); return stop; }
  }, [incoming, activeCall]);

  // Bildirishnomalar + sarlavhadagi o'qilmagan soni
  const notifyBaseline = useRef(null);
  useEffect(() => {
    const total = chats.filter((c) => !c.muted).reduce((a, c) => a + (c.unread || 0), 0);
    setUnreadTitle(total);

    if (notifyBaseline.current === null) {
      // Birinchi yuklashda eski xabarlarga bildirishnoma chiqarmaymiz
      notifyBaseline.current = {};
      for (const c of chats) notifyBaseline.current[c.id] = c.lastMessage?.createdAt || 0;
      return;
    }
    for (const c of chats) {
      const t = c.lastMessage?.createdAt || 0;
      const prev = notifyBaseline.current[c.id] || 0;
      if (t > prev && c.lastMessage && c.lastMessage.senderId !== user.id && !c.muted) {
        const hidden = document.visibilityState !== 'visible';
        if (c.id !== activeId || hidden) {
          playPop();
          showNotification(c.title, {
            body: c.lastMessage.preview || c.lastMessage.body || 'Yangi xabar',
            icon: c.photoURL || undefined,
            onClick: () => setActiveId(c.id),
          });
        }
      }
      notifyBaseline.current[c.id] = t;
    }
  }, [chats, activeId, user.id]);

  // ---- Xabar yuborish ----
  async function handleSend(payload) {
    if (!activeId) return;
    // Maxfiy chatda matnni shifrlaymiz
    if (active?.secret && payload.body) {
      const enc = await encryptText(payload.body, active.secretKey);
      payload = { ...payload, body: null, enc };
    }
    sendMsg(activeId, user, payload);
  }

  async function handleVideoNote({ blob, duration }) {
    if (!activeId) return;
    setUploading(true);
    try { await sendVideoNote(activeId, user, blob, duration); }
    catch (err) { alert('Video xabar yuborilmadi.\n' + (err.message || err)); }
    finally { setUploading(false); }
  }
  const handleSendContact = (contact) => activeId && sendContact(activeId, user, contact);
  const handleSendLocation = (location) => activeId && sendLocation(activeId, user, location);
  async function handleOpenContact(contact) {
    const u = { id: contact.uid, displayName: contact.name, avatarColor: contact.avatarColor, photoURL: contact.photoURL };
    setActiveId(await openPrivateChat(user, u));
  }

  async function handleFile(file) {
    if (!activeId || !file) return;
    setUploading(true);
    try {
      const attachment = await uploadFile(file, user.id);
      await sendMsg(activeId, user, { attachment });
    } catch (err) {
      alert('Fayl yuklash ishlamadi (Storage sozlanmagan?).\n' + (err.message || err));
    } finally { setUploading(false); }
  }

  async function handleVoice({ blob, duration, waveform }) {
    if (!activeId) return;
    try { await sendVoice(activeId, user, blob, duration, waveform); }
    catch (err) { alert('Ovozli xabar yuborilmadi.\n' + (err.message || err)); }
  }

  const handleSticker = (s) => activeId && sendSticker(activeId, user, s);
  const handlePoll = (p) => activeId && sendPoll(activeId, user, p);
  const handleVote = (msgId, optId, multiple) => votePoll(activeId, msgId, optId, user.id, multiple);

  const lastTyping = useRef(0);
  function notifyTyping() {
    const now = Date.now();
    if (now - lastTyping.current > 2500) { lastTyping.current = now; if (activeId) setTyping(activeId, user); }
  }

  // ---- Profil rasm ----
  async function handleProfilePhoto(file) {
    setUploading(true);
    try {
      const att = await uploadFile(file, user.id);
      await updateProfile(user.id, { photoURL: att.url });
    } catch (err) { alert('Rasm yuklanmadi.\n' + (err.message || err)); }
    finally { setUploading(false); }
  }
  async function handleGroupPhoto(file) {
    if (!active) return;
    try { const att = await uploadFile(file, user.id); await updateChatMeta(active.id, { photoURL: att.url }); }
    catch (err) { alert('Rasm yuklanmadi.\n' + (err.message || err)); }
  }

  // ---- Suhbat ochish/yaratish ----
  async function openPrivate(u) { setActiveId(await openPrivateChat(user, u)); setShowNew(false); }
  async function openSecret(u) {
    const key = await generateSecretKey();
    setActiveId(await openSecretChat(user, u, key));
    setShowNew(false);
    setShowUserProfile(false);
  }
  async function buyPremium(planId, card) {
    await purchasePremium(user, planId, card);
    setShowPremium(false);
  }
  async function createGroup(title, members) { setActiveId(await createGroupFb(user, title, members)); setShowNew(false); }
  async function createChannel(title, desc, members) { setActiveId(await createChannelFb(user, title, desc, members)); setShowNew(false); }
  async function openSaved() { setActiveId(await openSavedChat(user)); }

  // ---- Forward ----
  async function doForward(targetChat) {
    if (forwarding) await forwardMessages(targetChat.id, user, forwarding);
    setForwarding(null);
    setActiveId(targetChat.id);
  }

  // ---- Chat sozlamalari ----
  const handleMute = (c, v) => muteChat(c.id, user.id, v);
  const handleArchive = (c, v) => archiveChat(c.id, user.id, v);
  function handleLeave(c) {
    setConfirm({
      title: c.type === 'channel' ? 'Kanalni tark etish' : 'Chiqish',
      text: `"${c.title}" dan chiqasizmi?`,
      confirmLabel: 'Chiqish', danger: true,
      onConfirm: async () => { await leaveChat(c.id, user.id); if (activeId === c.id) setActiveId(null); setShowGroupInfo(false); setConfirm(null); },
    });
  }

  // ---- Stories ----
  async function handleAddStory(file) {
    try { await addStory(user, file, ''); } catch (err) { alert('Story yuklanmadi.\n' + (err.message || err)); }
  }

  // ---- Block ----
  const isBlocked = active?.peer ? (user.blocked || []).includes(active.peer.id) : false;
  function toggleBlock() {
    if (!active?.peer) return;
    if (isBlocked) unblockUser(user.id, active.peer.id);
    else blockUser(user.id, active.peer.id);
  }

  // ---- Sozlamalar oynasi ----
  async function openSettings() {
    setShowSettings(true);
    const ids = user.blocked || [];
    setBlockedUsers(ids.length ? await fetchUsers(ids) : []);
  }
  function changeTheme(next) { setSettings(next); saveSettings(next); applySettings(next); }
  function toggleNotify(v) { setNotifyOn(v); setNotificationsEnabled(v); if (v) requestNotifyPermission(); }

  // ---- Qo'ng'iroqlar ----
  function startCall(video) {
    if (!active?.peer || activeCall) return;
    const pd = peerData[active.peer.id] || {};
    const peer = { id: active.peer.id, displayName: active.title, avatarColor: active.avatarColor, photoURL: active.photoURL || pd.photoURL };
    const session = new Call({ me: user, peer, isCaller: true, video });
    session.on('state', (s) => { if (s === 'ended') setActiveCall(null); });
    setActiveCall({ session, peer, video, isCaller: true });
  }
  function acceptCall() {
    if (!incoming) return;
    const peer = { id: incoming.callerId, displayName: incoming.callerName, avatarColor: incoming.callerColor, photoURL: incoming.callerPhoto };
    const session = new Call({ me: user, peer, callId: incoming.id, isCaller: false, video: incoming.type === 'video' });
    session.on('state', (s) => { if (s === 'ended') setActiveCall(null); });
    setActiveCall({ session, peer, video: incoming.type === 'video', isCaller: false });
    setIncoming(null);
  }
  function rejectCall() { if (incoming) declineCall(incoming.id); setIncoming(null); }

  // ---- Header / subtitle ----
  const activePeer = active?.peer ? peerData[active.peer.id] : null;
  const activeSub = active
    ? (active.type === 'saved' ? 'O\'zingizga eslatma'
      : active.type === 'channel' ? `${active.members.length} obunachi`
      : active.type === 'group' ? `${active.members.length} a'zo`
      : activePeer?.online ? 'onlayn' : `oxirgi marta ${lastSeen(activePeer?.lastActive)}`)
    : '';

  const canPost = active?.type !== 'channel' || active?.admins?.includes(user.id) || active?.createdBy === user.id;

  function onHeaderClick() {
    if (!active) return;
    if (active.type === 'private' || active.type === 'secret') setShowUserProfile(true);
    else if (active.type === 'group' || active.type === 'channel') setShowGroupInfo(true);
  }

  // Profil ko'rish uchun peer ma'lumoti
  const peerProfile = active?.peer ? {
    id: active.peer.id,
    displayName: activePeer?.displayName || active.title,
    username: activePeer?.username || '',
    avatarColor: active.avatarColor,
    photoURL: active.photoURL || activePeer?.photoURL,
    bio: activePeer?.bio || '',
    premium: activePeer?.premium,
    emojiStatus: activePeer?.emojiStatus,
  } : null;

  return (
    <div className={activeId ? 'messenger has-active' : 'messenger'}>
      <Sidebar
        user={user} chats={chats} activeId={activeId} onSelect={setActiveId}
        search={search} setSearch={setSearch} folder={folder} setFolder={setFolder}
        storiesByAuthor={storiesByAuthor} onAddStory={handleAddStory} onOpenStory={setStoryAuthor}
        onOpenSettings={openSettings} onNewChat={() => setShowNew(true)} onOpenSaved={openSaved}
        peerData={peerData} onMute={handleMute} onArchive={handleArchive} onLeave={handleLeave}
      />

      <main className="main-pane">
        {active ? (
          <ChatView
            chat={active} me={user} messages={messages} subtitle={activeSub}
            online={activePeer?.online || false} uploading={uploading} typingUsers={typing}
            canPost={canPost}
            onSend={handleSend} onFile={handleFile} onVoice={handleVoice}
            onSticker={handleSticker} onPoll={handlePoll} onVote={handleVote}
            onVideoNote={handleVideoNote} onSendContact={handleSendContact}
            onSendLocation={handleSendLocation} onOpenContact={handleOpenContact}
            searchUsers={(q) => searchUsers(q, user.id)}
            onTyping={notifyTyping}
            onEdit={(id, body) => editMessage(active.id, id, body)}
            onDeleteEveryone={(id) => deleteMessage(active.id, id)}
            onDeleteForMe={(id) => deleteMessageForMe(active.id, id, user.id)}
            onReact={(id, em) => toggleReaction(active.id, id, em, user.id)}
            onForward={(msgs) => setForwarding(msgs)}
            onPin={(msg) => pinChatMessage(active.id, msg)}
            onUnpin={() => unpinChatMessage(active.id)}
            onReport={(msg) => { reportMessage(active.id, msg, user); alert('Shikoyat yuborildi. Rahmat!'); }}
            onHeaderClick={onHeaderClick}
            onAudioCall={() => startCall(false)} onVideoCall={() => startCall(true)}
            onBack={() => setActiveId(null)}
          />
        ) : (
          <div className="welcome">
            <div className="welcome-icon"><Logo size={104} /></div>
            <h2>AZAMOV</h2>
            <p>Suhbatni tanlang yoki yangi suhbat boshlang</p>
          </div>
        )}
      </main>

      {showNew && (
        <NewChatModal
          onClose={() => setShowNew(false)}
          onOpenPrivate={openPrivate} onCreateGroup={createGroup} onCreateChannel={createChannel}
          searchUsers={(q) => searchUsers(q, user.id)}
        />
      )}

      {forwarding && (
        <ForwardModal chats={chats} count={forwarding.length}
          onClose={() => setForwarding(null)} onPick={doForward} />
      )}

      {showSettings && (
        <Settings
          user={user} settings={settings} onClose={() => setShowSettings(false)}
          onSaveProfile={(f) => updateProfile(user.id, f)}
          onUploadPhoto={handleProfilePhoto} onTheme={changeTheme}
          onBuyPremium={() => { setShowSettings(false); setShowPremium(true); }}
          onSetEmojiStatus={(e) => setEmojiStatus(user.id, e)}
          onLogout={onLogout}
          notifyOn={notifyOn} onToggleNotify={toggleNotify}
          blockedUsers={blockedUsers} onUnblock={(id) => { unblockUser(user.id, id); setBlockedUsers((p) => p.filter((u) => u.id !== id)); }}
        />
      )}

      {showUserProfile && peerProfile && (
        <UserProfile
          user={peerProfile} online={activePeer?.online} lastActive={activePeer?.lastActive}
          isBlocked={isBlocked}
          onAudioCall={() => { setShowUserProfile(false); startCall(false); }}
          onVideoCall={() => { setShowUserProfile(false); startCall(true); }}
          onSecretChat={active?.type !== 'secret' ? () => openSecret({ id: peerProfile.id, displayName: peerProfile.displayName, avatarColor: peerProfile.avatarColor, photoURL: peerProfile.photoURL }) : null}
          onToggleBlock={() => { toggleBlock(); setShowUserProfile(false); }}
          onClose={() => setShowUserProfile(false)}
        />
      )}

      {showGroupInfo && active && (
        <GroupInfo
          chat={active} me={user} onClose={() => setShowGroupInfo(false)}
          onEditMeta={(f) => updateChatMeta(active.id, f)} onUploadPhoto={handleGroupPhoto}
          onAddMembers={(users) => addMembers(active.id, users)}
          onRemoveMember={(uid) => removeMember(active.id, uid)}
          onLeave={() => handleLeave(active)}
          onSetAdmin={(uid, v) => setAdmin(active.id, uid, v)}
          searchUsers={(q) => searchUsers(q, user.id)}
        />
      )}

      {storyAuthor && (
        <StoryViewer
          authorId={storyAuthor} storiesByAuthor={storiesByAuthor} me={user}
          onClose={() => setStoryAuthor(null)}
          onView={(id) => viewStory(id, user.id)} onDelete={(id) => deleteStory(id)}
        />
      )}

      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}

      {showPremium && (
        <PremiumModal user={user} onClose={() => setShowPremium(false)} onBuy={buyPremium} />
      )}

      {incoming && !activeCall && (
        <IncomingCall call={incoming} onAccept={acceptCall} onDecline={rejectCall} />
      )}
      {activeCall && (
        <CallWindow session={activeCall.session} peer={activeCall.peer}
          video={activeCall.video} isCaller={activeCall.isCaller} />
      )}
    </div>
  );
}
