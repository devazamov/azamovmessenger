import { auth, db, storage } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where,
  orderBy, onSnapshot, getDocs, serverTimestamp, limit, arrayUnion, arrayRemove,
  deleteField, writeBatch, increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const COLORS = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#6ec9cb', '#faa774'];
function pickColor(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

const toMillis = (ts) => (ts?.toMillis ? ts.toMillis() : (ts || Date.now()));

// ---------- AUTH ----------
export async function register({ email, password, displayName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const username = email.split('@')[0].toLowerCase();
  const profile = {
    uid,
    email,
    username,
    displayName: displayName || username,
    nameLower: (displayName || username).toLowerCase(),
    bio: '',
    photoURL: null,
    emojiStatus: null,
    premium: false,
    blocked: [],
    avatarColor: pickColor(uid),
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), profile);
  return profile;
}

// Profilni yangilash (ism, username, bio, rasm, emoji status)
export async function updateProfile(uid, fields) {
  const patch = { ...fields };
  if (fields.displayName) patch.nameLower = fields.displayName.toLowerCase();
  await updateDoc(doc(db, 'users', uid), patch);
}

export async function setPremium(uid, value) {
  await updateDoc(doc(db, 'users', uid), { premium: !!value });
}

export async function setEmojiStatus(uid, emoji) {
  await updateDoc(doc(db, 'users', uid), { emojiStatus: emoji || null });
}

export async function login({ email, password }) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

// Auth holatini kuzatib, foydalanuvchi profilini qaytaradi
export function onAuth(cb) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) { cb(null); return; }
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    if (snap.exists()) {
      const u = snap.data();
      cb({ id: u.uid, ...u });
    } else {
      const username = (fbUser.email || 'user').split('@')[0].toLowerCase();
      const profile = {
        uid: fbUser.uid, email: fbUser.email, username,
        displayName: username, nameLower: username,
        bio: '', photoURL: null, emojiStatus: null, premium: false, blocked: [],
        avatarColor: pickColor(fbUser.uid),
        createdAt: serverTimestamp(), lastActive: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', fbUser.uid), profile);
      cb({ id: fbUser.uid, ...profile });
    }
  });
}

function publicUser(u) {
  return {
    id: u.uid, uid: u.uid, username: u.username, displayName: u.displayName,
    avatarColor: u.avatarColor, photoURL: u.photoURL || null,
    premium: !!u.premium, bio: u.bio || '', emojiStatus: u.emojiStatus || null,
  };
}

// ---------- USERS ----------
export async function searchUsers(qText, exceptUid) {
  const text = qText.trim().toLowerCase();
  if (!text) return [];
  const snap = await getDocs(query(collection(db, 'users'), limit(50)));
  return snap.docs
    .map((d) => d.data())
    .filter((u) => u.uid !== exceptUid &&
      (u.username?.includes(text) || u.nameLower?.includes(text)))
    .slice(0, 20)
    .map(publicUser);
}

export function subscribeUser(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) cb(snap.data());
  });
}

// Bir nechta foydalanuvchini bir martada olish (guruh a'zolari ro'yxati uchun)
export async function fetchUsers(uids) {
  const list = await Promise.all(uids.map(async (id) => {
    const s = await getDoc(doc(db, 'users', id));
    return s.exists() ? publicUser(s.data()) : null;
  }));
  return list.filter(Boolean);
}

// Bloklash / blokdan chiqarish
export async function blockUser(meId, otherId) {
  await updateDoc(doc(db, 'users', meId), { blocked: arrayUnion(otherId) });
}
export async function unblockUser(meId, otherId) {
  await updateDoc(doc(db, 'users', meId), { blocked: arrayRemove(otherId) });
}

// ---------- PRESENCE ----------
export function startPresence(uid) {
  const update = () => updateDoc(doc(db, 'users', uid), { lastActive: serverTimestamp() }).catch(() => {});
  update();
  const id = setInterval(update, 25000);
  const onVisible = () => { if (document.visibilityState === 'visible') update(); };
  document.addEventListener('visibilitychange', onVisible);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
}

export function isUserOnline(userData) {
  const last = toMillis(userData?.lastActive);
  return Date.now() - last < 60000;
}

// ---------- CHATS ----------
function previewOf(msg) {
  if (!msg) return '';
  if (msg.voice || msg.type === 'voice') return '🎤 Ovozli xabar';
  if (msg.poll || msg.type === 'poll') return '📊 So\'rovnoma';
  if (msg.sticker || msg.type === 'sticker') return (msg.sticker?.emoji || msg.sticker || '🖼 Stiker');
  if (msg.attachment) return msg.attachment.isImage ? '🖼 Rasm' : '📄 Fayl';
  return msg.body || '';
}

function decorate(id, c, meId) {
  let title = c.title || 'Guruh';
  let avatarColor = '#3390ec';
  let peer = null;
  if (c.type === 'saved') {
    title = 'Saqlangan xabarlar';
  } else if (c.type === 'private') {
    const otherId = (c.members || []).find((m) => m !== meId);
    const info = c.memberInfo?.[otherId];
    if (info) {
      peer = {
        id: otherId, uid: otherId, displayName: info.displayName,
        avatarColor: info.avatarColor, photoURL: info.photoURL || null,
      };
      title = info.displayName;
      avatarColor = info.avatarColor;
    }
  }
  const lm = c.lastMessage;
  return {
    id,
    type: c.type,
    title,
    description: c.description || '',
    username: c.username || null,
    avatarColor,
    photoURL: c.type === 'group' || c.type === 'channel' ? (c.photoURL || null) : (peer?.photoURL || null),
    peer,
    members: c.members || [],
    memberInfo: c.memberInfo || {},
    admins: c.admins || [],
    createdBy: c.createdBy || null,
    createdAt: toMillis(c.createdAt),
    unread: c.unread?.[meId] || 0,
    muted: !!c.muted?.[meId],
    archived: !!c.archived?.[meId],
    readAt: c.readAt || {},
    pinnedMessage: c.pinnedMessage || null,
    lastMessage: lm ? { ...lm, createdAt: toMillis(lm.createdAt) } : null,
  };
}

export function subscribeChats(meId, cb) {
  const q = query(collection(db, 'chats'), where('members', 'array-contains', meId));
  return onSnapshot(q, (snap) => {
    const chats = snap.docs.map((d) => decorate(d.id, d.data(), meId));
    chats.sort((a, b) =>
      (b.lastMessage?.createdAt || b.createdAt) - (a.lastMessage?.createdAt || a.createdAt));
    cb(chats);
  });
}

export async function openPrivateChat(me, other) {
  const q = query(collection(db, 'chats'), where('members', 'array-contains', me.id));
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => {
    const c = d.data();
    return c.type === 'private' && (c.members || []).includes(other.id);
  });
  if (existing) return existing.id;

  const ref = await addDoc(collection(db, 'chats'), {
    type: 'private',
    members: [me.id, other.id],
    memberInfo: {
      [me.id]: { displayName: me.displayName, avatarColor: me.avatarColor, photoURL: me.photoURL || null },
      [other.id]: { displayName: other.displayName, avatarColor: other.avatarColor, photoURL: other.photoURL || null },
    },
    createdBy: me.id,
    createdAt: serverTimestamp(),
    lastMessage: null,
    typing: {},
  });
  return ref.id;
}

// "Saqlangan xabarlar" — o'zi bilan suhbat (topiladi yoki yaratiladi)
export async function openSavedChat(me) {
  const q = query(collection(db, 'chats'), where('members', 'array-contains', me.id));
  const snap = await getDocs(q);
  const existing = snap.docs.find((d) => d.data().type === 'saved');
  if (existing) return existing.id;
  const ref = await addDoc(collection(db, 'chats'), {
    type: 'saved',
    members: [me.id],
    memberInfo: { [me.id]: { displayName: me.displayName, avatarColor: me.avatarColor } },
    createdBy: me.id,
    createdAt: serverTimestamp(),
    lastMessage: null,
    typing: {},
  });
  return ref.id;
}

export async function createGroup(me, title, members) {
  const ids = [me.id, ...members.map((u) => u.id)];
  const memberInfo = { [me.id]: { displayName: me.displayName, avatarColor: me.avatarColor, photoURL: me.photoURL || null } };
  for (const u of members) memberInfo[u.id] = { displayName: u.displayName, avatarColor: u.avatarColor, photoURL: u.photoURL || null };
  const ref = await addDoc(collection(db, 'chats'), {
    type: 'group',
    title,
    description: '',
    members: ids,
    memberInfo,
    admins: [me.id],
    createdBy: me.id,
    createdAt: serverTimestamp(),
    lastMessage: null,
    typing: {},
  });
  return ref.id;
}

export async function createChannel(me, title, description, members = []) {
  const ids = [me.id, ...members.map((u) => u.id)];
  const memberInfo = { [me.id]: { displayName: me.displayName, avatarColor: me.avatarColor, photoURL: me.photoURL || null } };
  for (const u of members) memberInfo[u.id] = { displayName: u.displayName, avatarColor: u.avatarColor, photoURL: u.photoURL || null };
  const ref = await addDoc(collection(db, 'chats'), {
    type: 'channel',
    title,
    description: description || '',
    members: ids,
    memberInfo,
    admins: [me.id],
    createdBy: me.id,
    createdAt: serverTimestamp(),
    lastMessage: null,
    typing: {},
  });
  return ref.id;
}

// ---------- CHAT SETTINGS (mute, archive, pin, meta, a'zolar) ----------
export async function muteChat(chatId, uid, value) {
  await updateDoc(doc(db, 'chats', chatId), { [`muted.${uid}`]: !!value }).catch(() => {});
}
export async function archiveChat(chatId, uid, value) {
  await updateDoc(doc(db, 'chats', chatId), { [`archived.${uid}`]: !!value }).catch(() => {});
}

export async function pinChatMessage(chatId, msg) {
  await updateDoc(doc(db, 'chats', chatId), {
    pinnedMessage: {
      id: msg.id,
      body: msg.body || previewOf(msg),
      senderName: msg.senderName,
    },
  });
}
export async function unpinChatMessage(chatId) {
  await updateDoc(doc(db, 'chats', chatId), { pinnedMessage: deleteField() });
}

export async function updateChatMeta(chatId, fields) {
  await updateDoc(doc(db, 'chats', chatId), { ...fields });
}

export async function addMembers(chatId, users) {
  const ref = doc(db, 'chats', chatId);
  const patch = { members: arrayUnion(...users.map((u) => u.id)) };
  for (const u of users) {
    patch[`memberInfo.${u.id}`] = { displayName: u.displayName, avatarColor: u.avatarColor, photoURL: u.photoURL || null };
  }
  await updateDoc(ref, patch);
}

export async function removeMember(chatId, uid) {
  await updateDoc(doc(db, 'chats', chatId), {
    members: arrayRemove(uid),
    admins: arrayRemove(uid),
    [`memberInfo.${uid}`]: deleteField(),
  });
}

export async function leaveChat(chatId, uid) {
  await removeMember(chatId, uid);
}

export async function setAdmin(chatId, uid, value) {
  await updateDoc(doc(db, 'chats', chatId), {
    admins: value ? arrayUnion(uid) : arrayRemove(uid),
  });
}

// ---------- MESSAGES ----------
export function subscribeMessages(chatId, meId, cb) {
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt'), limit(300));
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const msgs = [];
    for (const d of snap.docs) {
      const m = d.data();
      const createdAt = toMillis(m.createdAt);
      // "Men uchun o'chirilgan" xabarlarni yashiramiz
      if (Array.isArray(m.deletedFor) && m.deletedFor.includes(meId)) continue;
      // O'z-o'zini yo'q qiluvchi xabar muddati tugagan bo'lsa — yashir + o'chir
      if (m.expireAt && now > m.expireAt) {
        deleteDoc(d.ref).catch(() => {});
        continue;
      }
      msgs.push({ id: d.id, ...m, createdAt });
    }
    cb(msgs);
  });
}

async function bumpLastMessage(chatRef, me, members, msg) {
  const patch = {
    lastMessage: {
      preview: previewOf(msg),
      body: msg.body || null,
      type: msg.type || 'text',
      senderName: me.displayName,
      senderId: me.id,
      createdAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  };
  for (const uid of members) {
    if (uid !== me.id) patch[`unread.${uid}`] = increment(1);
  }
  await updateDoc(chatRef, patch);
}

export async function sendMessage(chatId, me, payload) {
  const { body, attachment, replyTo, forwardFrom, voice, poll, sticker, mentions, ttlSeconds } = payload;
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  const members = chatSnap.data()?.members || [];

  let type = 'text';
  if (voice) type = 'voice';
  else if (poll) type = 'poll';
  else if (sticker) type = 'sticker';

  const msg = {
    senderId: me.id,
    senderName: me.displayName,
    senderColor: me.avatarColor,
    type,
    body: body || null,
    attachment: attachment || null,
    voice: voice || null,
    poll: poll || null,
    sticker: sticker || null,
    replyTo: replyTo || null,
    forwardFrom: forwardFrom || null,
    mentions: mentions || [],
    reactions: {},
    edited: false,
    deletedFor: [],
    createdAt: serverTimestamp(),
  };
  if (ttlSeconds) msg.expireAt = Date.now() + ttlSeconds * 1000;

  await addDoc(collection(db, 'chats', chatId, 'messages'), msg);
  await bumpLastMessage(chatRef, me, members, msg);
}

export async function editMessage(chatId, messageId, newBody) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    body: newBody, edited: true,
  });
}

// Hammaga o'chirish (qattiq o'chirish)
export async function deleteMessage(chatId, messageId) {
  await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
}

// Faqat men uchun o'chirish (boshqalar ko'radi)
export async function deleteMessageForMe(chatId, messageId, uid) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    deletedFor: arrayUnion(uid),
  });
}

export async function toggleReaction(chatId, messageId, emoji, uid) {
  const mRef = doc(db, 'chats', chatId, 'messages', messageId);
  const snap = await getDoc(mRef);
  if (!snap.exists()) return;
  const reactions = snap.data().reactions || {};
  const users = reactions[emoji] || [];
  const next = users.includes(uid) ? users.filter((u) => u !== uid) : [...users, uid];
  if (next.length === 0) {
    await updateDoc(mRef, { [`reactions.${emoji}`]: deleteField() });
  } else {
    await updateDoc(mRef, { [`reactions.${emoji}`]: next });
  }
}

export async function forwardMessage(targetChatId, me, original) {
  await sendMessage(targetChatId, me, {
    body: original.body,
    attachment: original.attachment,
    voice: original.voice,
    sticker: original.sticker,
    forwardFrom: { name: original.senderName },
  });
}

export async function forwardMessages(targetChatId, me, originals) {
  for (const o of originals) await forwardMessage(targetChatId, me, o);
}

// ---------- POLLS ----------
export async function sendPoll(chatId, me, { question, options, multiple, anonymous }) {
  const poll = {
    question,
    multiple: !!multiple,
    anonymous: anonymous !== false,
    closed: false,
    options: options.map((text, i) => ({ id: String(i), text, votes: [] })),
  };
  await sendMessage(chatId, me, { poll });
}

export async function votePoll(chatId, messageId, optionId, uid, multiple) {
  const mRef = doc(db, 'chats', chatId, 'messages', messageId);
  const snap = await getDoc(mRef);
  if (!snap.exists()) return;
  const poll = snap.data().poll;
  if (!poll || poll.closed) return;
  const options = poll.options.map((o) => {
    const has = o.votes.includes(uid);
    if (o.id === optionId) {
      return { ...o, votes: has ? o.votes.filter((u) => u !== uid) : [...o.votes, uid] };
    }
    // Bitta javobli so'rovnomada boshqa variantlardan ovozni olib tashlaymiz
    if (!multiple) return { ...o, votes: o.votes.filter((u) => u !== uid) };
    return o;
  });
  await updateDoc(mRef, { 'poll.options': options });
}

export async function closePoll(chatId, messageId) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), { 'poll.closed': true });
}

// ---------- VOICE / STICKER ----------
export async function sendVoice(chatId, me, blob, duration, waveform) {
  const url = await uploadBlob(blob, me.id, 'voice.webm', 'uploads');
  await sendMessage(chatId, me, { voice: { url, duration, waveform: waveform || [] } });
}

export async function sendSticker(chatId, me, sticker) {
  await sendMessage(chatId, me, { sticker });
}

// ---------- UNREAD / READ ----------
export async function markChatRead(chatId, uid) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`unread.${uid}`]: 0,
    [`readAt.${uid}`]: serverTimestamp(),
  }).catch(() => {});
}

// ---------- TYPING ----------
export async function setTyping(chatId, me) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`typing.${me.id}`]: { name: me.displayName, at: Date.now() },
  }).catch(() => {});
}

export function subscribeTyping(chatId, meId, cb) {
  return onSnapshot(doc(db, 'chats', chatId), (snap) => {
    const t = snap.data()?.typing || {};
    const active = {};
    for (const [uid, info] of Object.entries(t)) {
      if (uid !== meId && Date.now() - (info.at || 0) < 4000) active[uid] = info.name;
    }
    cb(active);
  });
}

// ---------- STORIES (24 soat) ----------
const STORY_TTL = 24 * 60 * 60 * 1000;

export async function addStory(me, blob, caption) {
  const url = await uploadBlob(blob, me.id, 'story.jpg', 'stories');
  await addDoc(collection(db, 'stories'), {
    authorId: me.id,
    authorName: me.displayName,
    authorColor: me.avatarColor,
    authorPhoto: me.photoURL || null,
    url,
    caption: caption || '',
    viewers: [],
    createdAt: serverTimestamp(),
  });
}

export function subscribeStories(cb) {
  const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    const now = Date.now();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data(), createdAt: toMillis(d.data().createdAt) }))
      .filter((s) => now - s.createdAt < STORY_TTL);
    // Muallif bo'yicha guruhlash
    const byAuthor = {};
    for (const s of items) {
      (byAuthor[s.authorId] ||= []).push(s);
    }
    cb(byAuthor);
  });
}

export async function viewStory(storyId, uid) {
  await updateDoc(doc(db, 'stories', storyId), { viewers: arrayUnion(uid) }).catch(() => {});
}

export async function deleteStory(storyId) {
  await deleteDoc(doc(db, 'stories', storyId)).catch(() => {});
}

// ---------- STORAGE ----------
export async function uploadFile(file, uid) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${uid}/${Date.now()}_${safe}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  const url = await getDownloadURL(storageRef);
  return {
    url,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    isImage: (file.type || '').startsWith('image/'),
  };
}

// Blob yuklash (ovoz, stories) — name kengaytmasi muhim
export async function uploadBlob(blob, uid, name, folder = 'uploads') {
  const path = `${folder}/${uid}/${Date.now()}_${name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'application/octet-stream' });
  return getDownloadURL(storageRef);
}
