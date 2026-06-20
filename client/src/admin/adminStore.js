import { auth, db } from '../firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, updateDoc, deleteDoc, collection, query, where, orderBy,
  onSnapshot, getDocs, limit, serverTimestamp, addDoc, increment,
} from 'firebase/firestore';

const toMillis = (ts) => (ts?.toMillis ? ts.toMillis() : (ts || 0));
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// ---------- ADMIN AUTH ----------
// Admin huquqi: users/{uid}.role === 'admin'.
export function onAdminAuth(cb) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) { cb(null); return; }
    const snap = await getDoc(doc(db, 'users', fbUser.uid));
    const data = snap.exists() ? snap.data() : null;
    if (data?.role === 'admin') cb({ id: fbUser.uid, ...data });
    else cb({ id: fbUser.uid, ...(data || {}), notAdmin: true });
  });
}

export async function adminLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', cred.user.uid));
  if (snap.data()?.role !== 'admin') {
    await signOut(auth);
    throw new Error('Bu hisob admin emas.');
  }
  return { id: cred.user.uid, ...snap.data() };
}

export async function adminLogout() { await signOut(auth); }

// ---------- USERS ----------
export function subscribeAllUsers(cb) {
  return onSnapshot(query(collection(db, 'users'), limit(1000)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function setBanned(uid, value) {
  await updateDoc(doc(db, 'users', uid), { banned: !!value });
}
export async function setRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role: role || null });
}
export async function adminGrantPremium(uid, months) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const current = toMillis(snap.data()?.premiumUntil);
  const base = current && current > Date.now() ? current : Date.now();
  await updateDoc(ref, { premium: true, premiumUntil: base + months * MONTH_MS });
}
export async function adminRevokePremium(uid) {
  await updateDoc(doc(db, 'users', uid), { premium: false, premiumUntil: null });
}
export async function adminDeleteUserDoc(uid) {
  // Diqqat: bu faqat Firestore profilini o'chiradi (Auth hisobi qoladi).
  await deleteDoc(doc(db, 'users', uid));
}

// ---------- CHATS ----------
export function subscribeAllChats(cb) {
  return onSnapshot(query(collection(db, 'chats'), limit(1000)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: toMillis(d.data().createdAt) })));
  });
}
export async function adminDeleteChat(chatId) {
  // Xabarlarni ham o'chiramiz (oxirgi 300 ta).
  const msgs = await getDocs(query(collection(db, 'chats', chatId, 'messages'), limit(300)));
  await Promise.all(msgs.docs.map((m) => deleteDoc(m.ref).catch(() => {})));
  await deleteDoc(doc(db, 'chats', chatId));
}

// ---------- STORIES ----------
export function subscribeAllStories(cb) {
  return onSnapshot(query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
    const now = Date.now();
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: toMillis(d.data().createdAt) }))
      .filter((s) => now - s.createdAtMs < 24 * 60 * 60 * 1000));
  });
}
export async function adminDeleteStory(id) { await deleteDoc(doc(db, 'stories', id)); }

// ---------- PAYMENTS ----------
export function subscribePayments(cb) {
  return onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: toMillis(d.data().createdAt) })));
  });
}

// ---------- REPORTS (shikoyatlar) ----------
export function subscribeReports(cb) {
  return onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: toMillis(d.data().createdAt) })));
  });
}
export async function resolveReport(id) {
  await updateDoc(doc(db, 'reports', id), { status: 'resolved', resolvedAt: serverTimestamp() });
}
export async function deleteReport(id) { await deleteDoc(doc(db, 'reports', id)); }
export async function deleteReportedMessage(chatId, messageId) {
  await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId)).catch(() => {});
}

// ---------- ANNOUNCEMENTS (e'lonlar) ----------
export function subscribeAnnouncements(cb) {
  return onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAtMs: toMillis(d.data().createdAt) })));
  });
}
export async function sendAnnouncement(admin, text) {
  await addDoc(collection(db, 'announcements'), {
    text, authorId: admin.id, authorName: admin.displayName || 'Admin',
    createdAt: serverTimestamp(),
  });
}
export async function deleteAnnouncement(id) { await deleteDoc(doc(db, 'announcements', id)); }

export { toMillis };
