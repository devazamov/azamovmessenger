import React, { useState } from 'react';

// So'rovnomani xabar ichida ko'rsatish + ovoz berish
export function PollMessage({ poll, meId, onVote }) {
  const totalVotes = poll.options.reduce((a, o) => a + o.votes.length, 0);
  const iVoted = poll.options.some((o) => o.votes.includes(meId));
  return (
    <div className="poll">
      <div className="poll-q">📊 {poll.question}</div>
      <div className="poll-meta">
        {poll.anonymous ? 'Anonim' : 'Ochiq'} · {poll.multiple ? 'ko\'p tanlovli' : 'bitta javob'}
        {poll.closed && ' · yopilgan'}
      </div>
      <div className="poll-options">
        {poll.options.map((o) => {
          const pct = totalVotes ? Math.round((o.votes.length / totalVotes) * 100) : 0;
          const chosen = o.votes.includes(meId);
          return (
            <button
              key={o.id}
              className={chosen ? 'poll-opt chosen' : 'poll-opt'}
              disabled={poll.closed}
              onClick={() => onVote(o.id)}
            >
              <span className="poll-opt-bar" style={{ width: `${pct}%` }} />
              <span className="poll-opt-mark">{chosen ? '◉' : '◯'}</span>
              <span className="poll-opt-text">{o.text}</span>
              {(iVoted || poll.closed) && <span className="poll-opt-pct">{pct}%</span>}
            </button>
          );
        })}
      </div>
      <div className="poll-total">{totalVotes} ovoz</div>
    </div>
  );
}

// So'rovnoma yaratish oynasi
export function CreatePollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiple, setMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(true);

  function setOpt(i, v) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }
  function addOpt() { if (options.length < 10) setOptions((p) => [...p, '']); }
  function removeOpt(i) { setOptions((p) => p.filter((_, idx) => idx !== i)); }

  const valid = question.trim() && options.filter((o) => o.trim()).length >= 2;

  function create() {
    onCreate({
      question: question.trim(),
      options: options.map((o) => o.trim()).filter(Boolean),
      multiple, anonymous,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>So'rovnoma yaratish</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <input className="modal-input" placeholder="Savol" value={question}
          onChange={(e) => setQuestion(e.target.value)} autoFocus />
        <label className="field-label">Variantlar</label>
        {options.map((o, i) => (
          <div key={i} className="poll-opt-row">
            <input className="modal-input" placeholder={`Variant ${i + 1}`} value={o}
              onChange={(e) => setOpt(i, e.target.value)} />
            {options.length > 2 && (
              <button className="icon-btn" onClick={() => removeOpt(i)}>✕</button>
            )}
          </div>
        ))}
        {options.length < 10 && <button className="ghost-btn" onClick={addOpt}>+ Variant qo'shish</button>}
        <label className="toggle-row">
          <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />
          Ko'p tanlovli javob
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          Anonim ovoz berish
        </label>
        <button className="primary-btn" disabled={!valid} onClick={create}>Yaratish</button>
      </div>
    </div>
  );
}
