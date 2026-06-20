import React, { useState, useEffect, useMemo } from 'react';
import { Avatar } from '../components.jsx';
import Logo from '../Logo.jsx';
import {
  onAdminAuth, adminLogin, adminLogout,
  subscribeAllUsers, subscribeAllChats, subscribePayments,
  subscribeReports, subscribeAllStories, subscribeAnnouncements,
  setBanned, setRole, adminGrantPremium, adminRevokePremium, adminDeleteUserDoc,
  adminDeleteChat, adminDeleteStory,
  resolveReport, deleteReport, deleteReportedMessage,
  sendAnnouncement, deleteAnnouncement,
} from './adminStore.js';
import './admin.css';

const fmt = (n) => Number(n || 0).toLocaleString('uz-UZ');
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('uz-UZ') : '—');
const fmtDateTime = (ms) => (ms ? new Date(ms).toLocaleString('uz-UZ') : '—');
const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : (ts || 0));

export default function AdminApp() {
  const [admin, setAdmin] = useState(undefined); // undefined=loading
  useEffect(() => onAdminAuth(setAdmin), []);

  if (admin === undefined) return <div className="adm-splash"><Logo size={64} /><p>Yuklanmoqda...</p></div>;
  if (!admin) return <AdminLogin />;
  if (admin.notAdmin) return <AccessDenied />;
  return <AdminLayout admin={admin} />;
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await adminLogin(email.trim(), password); }
    catch (e2) { setErr(e2.message || 'Kirish xatosi'); }
    finally { setBusy(false); }
  }
  return (
    <div className="adm-login">
      <form className="adm-login-box" onSubmit={submit}>
        <Logo size={56} />
        <h1>AZAMOV Admin</h1>
        <p className="adm-login-sub">Boshqaruv paneliga kirish</p>
        <input className="adm-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <input className="adm-input" type="password" placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div className="adm-error">{err}</div>}
        <button className="adm-btn primary" disabled={busy}>{busy ? '...' : 'Kirish'}</button>
        <a className="adm-back" href="/">← Ilovaga qaytish</a>
      </form>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="adm-login">
      <div className="adm-login-box">
        <div style={{ fontSize: 48 }}>🚫</div>
        <h1>Ruxsat yo'q</h1>
        <p className="adm-login-sub">Bu hisobda admin huquqi yo'q.</p>
        <button className="adm-btn" onClick={adminLogout}>Chiqish</button>
        <a className="adm-back" href="/">← Ilovaga qaytish</a>
      </div>
    </div>
  );
}

const NAV = [
  { id: 'dashboard', label: 'Boshqaruv', icon: '📊' },
  { id: 'users', label: 'Foydalanuvchilar', icon: '👥' },
  { id: 'chats', label: 'Chatlar', icon: '💬' },
  { id: 'premium', label: 'Premium', icon: '⭐' },
  { id: 'moderation', label: 'Moderatsiya', icon: '🛡' },
];

function AdminLayout({ admin }) {
  const [page, setPage] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reports, setReports] = useState([]);
  const [stories, setStories] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => subscribeAllUsers(setUsers), []);
  useEffect(() => subscribeAllChats(setChats), []);
  useEffect(() => subscribePayments(setPayments), []);
  useEffect(() => subscribeReports(setReports), []);
  useEffect(() => subscribeAllStories(setStories), []);
  useEffect(() => subscribeAnnouncements(setAnnouncements), []);

  const openReports = reports.filter((r) => r.status !== 'resolved').length;

  return (
    <div className="adm-app">
      <aside className="adm-sidebar">
        <div className="adm-brand"><Logo size={28} /> <span>Admin</span></div>
        <nav className="adm-nav">
          {NAV.map((n) => (
            <button key={n.id} className={page === n.id ? 'adm-nav-item active' : 'adm-nav-item'} onClick={() => setPage(n.id)}>
              <span className="adm-nav-icon">{n.icon}</span>{n.label}
              {n.id === 'moderation' && openReports > 0 && <span className="adm-badge">{openReports}</span>}
            </button>
          ))}
        </nav>
        <div className="adm-me">
          <Avatar name={admin.displayName} color={admin.avatarColor} photoURL={admin.photoURL} size={36} />
          <div className="adm-me-info">
            <div className="adm-me-name">{admin.displayName}</div>
            <div className="adm-me-role">Administrator</div>
          </div>
        </div>
        <button className="adm-logout" onClick={adminLogout}>Chiqish</button>
      </aside>

      <main className="adm-main">
        {page === 'dashboard' && <Dashboard users={users} chats={chats} payments={payments} stories={stories} reports={reports} />}
        {page === 'users' && <UsersPage users={users} adminId={admin.id} />}
        {page === 'chats' && <ChatsPage chats={chats} />}
        {page === 'premium' && <PremiumPage users={users} payments={payments} />}
        {page === 'moderation' && (
          <ModerationPage admin={admin} reports={reports} stories={stories} announcements={announcements} />
        )}
      </main>
    </div>
  );
}

// ---------------- DASHBOARD ----------------
function Dashboard({ users, chats, payments, stories, reports }) {
  const now = Date.now();
  const premiumUsers = users.filter((u) => u.premium).length;
  const bannedUsers = users.filter((u) => u.banned).length;
  const new7d = users.filter((u) => now - toMs(u.createdAt) < 7 * 24 * 3600 * 1000).length;
  const revenue = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (p.amount || 0), 0);
  const byType = chats.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {});
  const openReports = reports.filter((r) => r.status !== 'resolved').length;

  // Oxirgi 7 kun ro'yxatdan o'tishlar
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 3600 * 1000);
    const key = d.toDateString();
    const count = users.filter((u) => new Date(toMs(u.createdAt)).toDateString() === key).length;
    days.push({ label: d.toLocaleDateString('uz-UZ', { weekday: 'short' }), count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const cards = [
    { label: 'Foydalanuvchilar', value: fmt(users.length), icon: '👥', sub: `+${new7d} (7 kun)` },
    { label: 'Premium', value: fmt(premiumUsers), icon: '⭐', sub: `${((premiumUsers / (users.length || 1)) * 100).toFixed(0)}%` },
    { label: 'Daromad', value: fmt(revenue) + " so'm", icon: '💰', sub: `${payments.length} to'lov` },
    { label: 'Chatlar', value: fmt(chats.length), icon: '💬', sub: `${byType.channel || 0} kanal` },
    { label: 'Faol stories', value: fmt(stories.length), icon: '📷', sub: '24 soat' },
    { label: 'Shikoyatlar', value: fmt(openReports), icon: '🛡', sub: 'ochiq' },
    { label: 'Bloklangan', value: fmt(bannedUsers), icon: '🚫', sub: 'foydalanuvchi' },
    { label: 'Maxfiy chat', value: fmt(byType.secret || 0), icon: '🔒', sub: 'shifrlangan' },
  ];

  return (
    <div className="adm-page">
      <h2>Boshqaruv paneli</h2>
      <div className="adm-cards">
        {cards.map((c) => (
          <div key={c.label} className="adm-card">
            <div className="adm-card-icon">{c.icon}</div>
            <div className="adm-card-value">{c.value}</div>
            <div className="adm-card-label">{c.label}</div>
            <div className="adm-card-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="adm-grid2">
        <div className="adm-panel">
          <h3>Ro'yxatdan o'tish (7 kun)</h3>
          <div className="adm-chart">
            {days.map((d, i) => (
              <div key={i} className="adm-bar-col">
                <div className="adm-bar" style={{ height: `${(d.count / maxDay) * 100}%` }} title={d.count}>
                  <span>{d.count || ''}</span>
                </div>
                <div className="adm-bar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="adm-panel">
          <h3>Chat turlari</h3>
          {[['private', 'Shaxsiy'], ['group', 'Guruh'], ['channel', 'Kanal'], ['secret', 'Maxfiy'], ['saved', 'Saqlangan']].map(([k, label]) => {
            const v = byType[k] || 0;
            const pct = (v / (chats.length || 1)) * 100;
            return (
              <div key={k} className="adm-stat-row">
                <span className="adm-stat-label">{label}</span>
                <div className="adm-stat-bar"><div style={{ width: `${pct}%` }} /></div>
                <span className="adm-stat-val">{v}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------- USERS ----------------
function UsersPage({ users, adminId }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users
      .filter((u) => {
        if (filter === 'premium' && !u.premium) return false;
        if (filter === 'banned' && !u.banned) return false;
        if (filter === 'admin' && u.role !== 'admin') return false;
        if (!t) return true;
        return (u.displayName || '').toLowerCase().includes(t) || (u.username || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t);
      })
      .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [users, q, filter]);

  async function grant(u) {
    const m = prompt(`${u.displayName} uchun necha oy premium?`, '1');
    if (m && Number(m) > 0) await adminGrantPremium(u.id, Number(m));
  }
  async function del(u) {
    if (confirm(`${u.displayName} profilini o'chirasizmi? (Auth hisobi qoladi)`)) await adminDeleteUserDoc(u.id);
  }

  return (
    <div className="adm-page">
      <h2>Foydalanuvchilar ({users.length})</h2>
      <div className="adm-toolbar">
        <input className="adm-input" placeholder="Ism, @username yoki email..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="adm-filters">
          {[['all', 'Hammasi'], ['premium', 'Premium'], ['banned', 'Bloklangan'], ['admin', 'Adminlar']].map(([k, l]) => (
            <button key={k} className={filter === k ? 'adm-chip active' : 'adm-chip'} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Foydalanuvchi</th><th>Holat</th><th>Premium</th><th>Ro'yxat</th><th>Amallar</th></tr></thead>
          <tbody>
            {list.map((u) => {
              const premUntil = toMs(u.premiumUntil);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="adm-user-cell">
                      <Avatar name={u.displayName} color={u.avatarColor} photoURL={u.photoURL} size={36} />
                      <div>
                        <div className="adm-user-name">{u.displayName} {u.role === 'admin' && <span className="adm-tag admin">admin</span>}</div>
                        <div className="adm-user-sub">@{u.username || '—'} · {u.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.banned ? <span className="adm-tag danger">bloklangan</span> : <span className="adm-tag ok">faol</span>}</td>
                  <td>{u.premium ? <span className="adm-tag prem">⭐ {premUntil ? fmtDate(premUntil) : ''}</span> : '—'}</td>
                  <td className="adm-muted">{fmtDate(toMs(u.createdAt))}</td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-mini" onClick={() => setBanned(u.id, !u.banned)}>{u.banned ? 'Blokdan chiqarish' : 'Bloklash'}</button>
                      <button className="adm-mini" onClick={() => grant(u)}>+ Premium</button>
                      {u.premium && <button className="adm-mini" onClick={() => adminRevokePremium(u.id)}>Premium olib tashlash</button>}
                      {u.id !== adminId && (
                        <button className="adm-mini" onClick={() => setRole(u.id, u.role === 'admin' ? null : 'admin')}>
                          {u.role === 'admin' ? 'Adminlikdan olish' : 'Admin qilish'}
                        </button>
                      )}
                      {u.id !== adminId && <button className="adm-mini danger" onClick={() => del(u)}>O'chirish</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={5} className="adm-empty">Topilmadi</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- CHATS ----------------
const TYPE_LABEL = { private: 'Shaxsiy', group: 'Guruh', channel: 'Kanal', secret: 'Maxfiy', saved: 'Saqlangan' };
function ChatsPage({ chats }) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const list = chats
    .filter((c) => (type === 'all' || c.type === type) && (!q || (c.title || '').toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

  async function del(c) {
    if (confirm(`"${c.title || TYPE_LABEL[c.type]}" chatini va xabarlarini o'chirasizmi?`)) await adminDeleteChat(c.id);
  }
  return (
    <div className="adm-page">
      <h2>Chatlar ({chats.length})</h2>
      <div className="adm-toolbar">
        <input className="adm-input" placeholder="Nom bo'yicha qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="adm-filters">
          {['all', 'private', 'group', 'channel', 'secret'].map((k) => (
            <button key={k} className={type === k ? 'adm-chip active' : 'adm-chip'} onClick={() => setType(k)}>{k === 'all' ? 'Hammasi' : TYPE_LABEL[k]}</button>
          ))}
        </div>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Nom</th><th>Tur</th><th>A'zolar</th><th>Oxirgi xabar</th><th>Yaratilgan</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className="adm-user-name">{c.title || (c.type === 'private' ? 'Shaxsiy suhbat' : TYPE_LABEL[c.type])}</td>
                <td><span className="adm-tag">{TYPE_LABEL[c.type] || c.type}</span></td>
                <td>{(c.members || []).length}</td>
                <td className="adm-muted adm-clip">{c.lastMessage?.preview || c.lastMessage?.body || '—'}</td>
                <td className="adm-muted">{fmtDate(c.createdAtMs)}</td>
                <td><button className="adm-mini danger" onClick={() => del(c)}>O'chirish</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="adm-empty">Chat yo'q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- PREMIUM ----------------
function PremiumPage({ users, payments }) {
  const paid = payments.filter((p) => p.status === 'paid');
  const revenue = paid.reduce((a, p) => a + (p.amount || 0), 0);
  const premiumUsers = users.filter((u) => u.premium);
  const thisMonth = paid.filter((p) => Date.now() - p.createdAtMs < 30 * 24 * 3600 * 1000).reduce((a, p) => a + (p.amount || 0), 0);

  return (
    <div className="adm-page">
      <h2>Premium boshqaruvi</h2>
      <div className="adm-cards">
        <div className="adm-card"><div className="adm-card-icon">💰</div><div className="adm-card-value">{fmt(revenue)}</div><div className="adm-card-label">Umumiy daromad (so'm)</div></div>
        <div className="adm-card"><div className="adm-card-icon">📅</div><div className="adm-card-value">{fmt(thisMonth)}</div><div className="adm-card-label">Oxirgi 30 kun (so'm)</div></div>
        <div className="adm-card"><div className="adm-card-icon">⭐</div><div className="adm-card-value">{fmt(premiumUsers.length)}</div><div className="adm-card-label">Premium foydalanuvchi</div></div>
        <div className="adm-card"><div className="adm-card-icon">🧾</div><div className="adm-card-value">{fmt(paid.length)}</div><div className="adm-card-label">Jami to'lovlar</div></div>
      </div>

      <div className="adm-panel">
        <h3>To'lovlar tarixi</h3>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Foydalanuvchi</th><th>Reja</th><th>Summa</th><th>Karta</th><th>Sana</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="adm-user-name">{p.userName || p.uid}</td>
                  <td><span className="adm-tag prem">{p.planLabel || p.planId}</span></td>
                  <td>{fmt(p.amount)} so'm</td>
                  <td className="adm-muted">{p.cardLast4 ? `•••• ${p.cardLast4}` : '—'}</td>
                  <td className="adm-muted">{fmtDateTime(p.createdAtMs)}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="adm-empty">To'lovlar yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- MODERATION ----------------
function ModerationPage({ admin, reports, stories, announcements }) {
  const [tab, setTab] = useState('reports');
  const [text, setText] = useState('');
  const openReports = reports.filter((r) => r.status !== 'resolved');

  async function send() {
    if (!text.trim()) return;
    await sendAnnouncement(admin, text.trim());
    setText('');
  }

  return (
    <div className="adm-page">
      <h2>Moderatsiya</h2>
      <div className="adm-filters" style={{ marginBottom: 16 }}>
        {[['reports', `Shikoyatlar (${openReports.length})`], ['stories', `Stories (${stories.length})`], ['ann', "E'lonlar"]].map(([k, l]) => (
          <button key={k} className={tab === k ? 'adm-chip active' : 'adm-chip'} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Sabab</th><th>Xabar / Kim</th><th>Shikoyatchi</th><th>Sana</th><th>Amallar</th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className={r.status === 'resolved' ? 'adm-row-done' : ''}>
                  <td>{r.reason || 'Shikoyat'}</td>
                  <td className="adm-clip">{r.messageBody || r.targetName || '—'}</td>
                  <td className="adm-muted">{r.reporterName || '—'}</td>
                  <td className="adm-muted">{fmtDateTime(r.createdAtMs)}</td>
                  <td>
                    <div className="adm-actions">
                      {r.chatId && r.messageId && <button className="adm-mini danger" onClick={() => deleteReportedMessage(r.chatId, r.messageId)}>Xabarni o'chirish</button>}
                      {r.status !== 'resolved' && <button className="adm-mini" onClick={() => resolveReport(r.id)}>Hal qilindi</button>}
                      <button className="adm-mini" onClick={() => deleteReport(r.id)}>O'chirish</button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && <tr><td colSpan={5} className="adm-empty">Shikoyatlar yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stories' && (
        <div className="adm-stories-grid">
          {stories.map((s) => (
            <div key={s.id} className="adm-story">
              <img src={s.url} alt="" />
              <div className="adm-story-foot">
                <span>{s.authorName}</span>
                <button className="adm-mini danger" onClick={() => { if (confirm("Story o'chirilsinmi?")) adminDeleteStory(s.id); }}>🗑</button>
              </div>
            </div>
          ))}
          {stories.length === 0 && <div className="adm-empty">Faol stories yo'q</div>}
        </div>
      )}

      {tab === 'ann' && (
        <div>
          <div className="adm-panel">
            <h3>Yangi e'lon yuborish</h3>
            <textarea className="adm-textarea" rows={3} placeholder="Barcha foydalanuvchilarga e'lon..." value={text} onChange={(e) => setText(e.target.value)} />
            <button className="adm-btn primary" onClick={send} disabled={!text.trim()}>E'lon yuborish</button>
          </div>
          <div className="adm-table-wrap" style={{ marginTop: 16 }}>
            <table className="adm-table">
              <thead><tr><th>Matn</th><th>Muallif</th><th>Sana</th><th></th></tr></thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td>{a.text}</td>
                    <td className="adm-muted">{a.authorName}</td>
                    <td className="adm-muted">{fmtDateTime(a.createdAtMs)}</td>
                    <td><button className="adm-mini danger" onClick={() => deleteAnnouncement(a.id)}>O'chirish</button></td>
                  </tr>
                ))}
                {announcements.length === 0 && <tr><td colSpan={4} className="adm-empty">E'lonlar yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
