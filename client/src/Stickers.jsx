import React, { useState } from 'react';

const EMOJI = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤩','🥳','😏','😴','🤔','🙄','😬','😭',
  '😡','🥺','😱','🤯','😇','🤗','🤭','🤫','👍','👎','👏','🙏','💪','🤝','👌','✌️',
  '❤️','🧡','💛','💚','💙','💜','🖤','💔','💯','🔥','⭐','🎉','🎁','✅','❌','⚡',
  '😅','😆','😉','😋','😜','🤪','😝','🤑','🤐','😯','😪','😫','🥱','😤','😠','🤬',
];

// "Stikerlar" — katta emoji to'plamlari (haqiqiy sticker fayllarisiz)
const STICKER_PACKS = {
  '😎 Kayfiyat': ['😂','😍','🥳','😎','🤩','😭','🥺','😡','🤔','😴','🤯','🥰','😇','🤗','😱','🙃'],
  '👍 Imo-ishora': ['👍','👎','👏','🙏','💪','🤝','👌','✌️','🤞','🤟','🤙','👋','🫶','🤲','✊','🫰'],
  '❤️ Sevgi': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓','💗','💖','💘','💝'],
  '🎉 Bayram': ['🎉','🎊','🎁','🎂','🎈','🥳','✨','⭐','🌟','💫','🔥','🎆','🎇','🏆','🥇','🎯'],
  '🐱 Hayvonlar': ['🐱','🐶','🦊','🐻','🐼','🐨','🦁','🐯','🐸','🐵','🐰','🐹','🐧','🦄','🐢','🐙'],
};

export default function Stickers({ onEmoji, onSticker, onGif }) {
  const [tab, setTab] = useState('emoji');
  const [pack, setPack] = useState(Object.keys(STICKER_PACKS)[0]);

  return (
    <div className="sticker-panel">
      <div className="sticker-tabs">
        <button className={tab === 'emoji' ? 'st-tab active' : 'st-tab'} onClick={() => setTab('emoji')}>😀 Emoji</button>
        <button className={tab === 'sticker' ? 'st-tab active' : 'st-tab'} onClick={() => setTab('sticker')}>🎨 Stiker</button>
      </div>

      {tab === 'emoji' ? (
        <div className="emoji-grid">
          {EMOJI.map((e, i) => (
            <button key={i} type="button" className="emoji-cell" onClick={() => onEmoji(e)}>{e}</button>
          ))}
        </div>
      ) : (
        <>
          <div className="pack-tabs">
            {Object.keys(STICKER_PACKS).map((p) => (
              <button key={p} className={p === pack ? 'pack-tab active' : 'pack-tab'} onClick={() => setPack(p)}>
                {p.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="sticker-grid">
            {STICKER_PACKS[pack].map((s, i) => (
              <button key={i} type="button" className="sticker-cell" onClick={() => onSticker({ emoji: s })}>{s}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
