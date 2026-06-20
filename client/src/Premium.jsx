import React, { useState } from 'react';
import { PREMIUM_PLANS } from './chatStore.js';

const FEATURES = [
  { icon: '⭐', title: 'Premium belgi', desc: 'Ismingiz yonida maxsus belgi' },
  { icon: '😎', title: 'Emoji status', desc: 'Profilingizga emoji status qo\'shing' },
  { icon: '📈', title: 'Katta limitlar', desc: 'Ko\'proq guruh, kanal va fayl hajmi' },
  { icon: '🎨', title: 'Maxsus ranglar', desc: 'Eksklyuziv accent ranglar' },
  { icon: '⚡', title: 'Tezkor qo\'llab-quvvatlash', desc: 'Birinchi navbatda yordam' },
];

const fmt = (n) => n.toLocaleString('uz-UZ');

export function PremiumModal({ user, onClose, onBuy }) {
  const [planId, setPlanId] = useState('6m');
  const [step, setStep] = useState('plans'); // plans | pay
  const [card, setCard] = useState({ number: '', exp: '', cvv: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const plan = PREMIUM_PLANS.find((p) => p.id === planId);
  const until = user.premiumUntil ? new Date(user.premiumUntil?.toMillis ? user.premiumUntil.toMillis() : user.premiumUntil) : null;

  function setCardField(k, v) { setCard((c) => ({ ...c, [k]: v })); }
  const cardValid = card.number.replace(/\s/g, '').length >= 12 && card.exp.length >= 4 && card.cvv.length >= 3;

  async function pay() {
    setBusy(true);
    try {
      await onBuy(planId, card);
      setDone(true);
    } catch (err) {
      alert('To\'lov amalga oshmadi.\n' + (err.message || err));
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⭐ AZAMOV Premium</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div className="premium-success">
            <div className="premium-success-icon">🎉</div>
            <h2>Premium faollashtirildi!</h2>
            <p>Rahmat! Premium imkoniyatlaridan bahramand bo'ling.</p>
            <button className="primary-btn" onClick={onClose}>Yopish</button>
          </div>
        ) : step === 'plans' ? (
          <div className="premium-body">
            {user.premium && until && (
              <div className="premium-active-note">✅ Premium faol — {until.toLocaleDateString('uz-UZ')} gacha</div>
            )}
            <div className="premium-features">
              {FEATURES.map((f) => (
                <div key={f.title} className="premium-feature">
                  <span className="pf-icon">{f.icon}</span>
                  <div><div className="pf-title">{f.title}</div><div className="pf-desc">{f.desc}</div></div>
                </div>
              ))}
            </div>

            <div className="premium-plans">
              {PREMIUM_PLANS.map((p) => (
                <button key={p.id} className={planId === p.id ? 'plan-card active' : 'plan-card'}
                  onClick={() => setPlanId(p.id)}>
                  <div className="plan-label">{p.label}</div>
                  <div className="plan-price">{fmt(p.price)} so'm</div>
                  <div className="plan-permonth">{fmt(p.perMonth)} so'm/oy</div>
                  {p.id === '6m' && <span className="plan-badge">Ommabop</span>}
                </button>
              ))}
            </div>

            <button className="primary-btn premium-cta" onClick={() => setStep('pay')}>
              {fmt(plan.price)} so'm — To'lovga o'tish
            </button>
          </div>
        ) : (
          <div className="premium-body">
            <div className="pay-summary">
              <span>{plan.label} Premium</span>
              <strong>{fmt(plan.price)} so'm</strong>
            </div>
            <label className="field-label">Karta raqami</label>
            <input className="modal-input" inputMode="numeric" placeholder="8600 0000 0000 0000"
              value={card.number}
              onChange={(e) => setCardField('number', e.target.value.replace(/[^\d ]/g, '').slice(0, 19))} />
            <div className="pay-row">
              <div style={{ flex: 1 }}>
                <label className="field-label">Amal qiladi</label>
                <input className="modal-input" placeholder="MM/YY" value={card.exp}
                  onChange={(e) => setCardField('exp', e.target.value.replace(/[^\d/]/g, '').slice(0, 5))} />
              </div>
              <div style={{ width: 90 }}>
                <label className="field-label">CVV</label>
                <input className="modal-input" placeholder="123" value={card.cvv}
                  onChange={(e) => setCardField('cvv', e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </div>
            </div>
            <div className="pay-note">🔒 Demo to'lov — haqiqiy pul yechilmaydi.</div>
            <button className="primary-btn premium-cta" disabled={!cardValid || busy} onClick={pay}>
              {busy ? 'To\'lanmoqda...' : `${fmt(plan.price)} so'm to'lash`}
            </button>
            <button className="ghost-btn" onClick={() => setStep('plans')}>← Orqaga</button>
          </div>
        )}
      </div>
    </div>
  );
}
