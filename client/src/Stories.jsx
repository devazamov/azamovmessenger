import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './components.jsx';

// Stories qatori (sidebar tepasida)
export function StoriesRow({ storiesByAuthor, me, onAdd, onOpen }) {
  const fileRef = useRef(null);
  const authors = Object.keys(storiesByAuthor).filter((id) => id !== me.id);
  const myStories = storiesByAuthor[me.id];

  function pick(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (f) onAdd(f);
  }

  return (
    <div className="stories-row">
      <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={pick} />
      <div className="story-cell" onClick={() => (myStories ? onOpen(me.id) : fileRef.current?.click())}>
        <div className="story-add-wrap">
          <Avatar name={me.displayName} color={me.avatarColor} photoURL={me.photoURL} size={56}
            ring={!!myStories} />
          {!myStories && <span className="story-add">+</span>}
        </div>
        <span className="story-name">Siz</span>
      </div>
      {authors.map((id) => {
        const list = storiesByAuthor[id];
        const first = list[0];
        const seen = list.every((s) => s.viewers?.includes(me.id));
        return (
          <div key={id} className="story-cell" onClick={() => onOpen(id)}>
            <Avatar name={first.authorName} color={first.authorColor} photoURL={first.authorPhoto}
              size={56} ring ringSeen={seen} />
            <span className="story-name">{first.authorName.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}

// Story ko'ruvchi (to'liq ekran, avtomatik o'tish)
export function StoryViewer({ authorId, storiesByAuthor, me, onClose, onView, onDelete }) {
  const list = storiesByAuthor[authorId] || [];
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const story = list[idx];
  const isMine = authorId === me.id;

  useEffect(() => {
    if (!story) { onClose(); return; }
    onView(story.id);
    setProgress(0);
    const start = Date.now();
    const dur = 5000;
    const iv = setInterval(() => {
      const p = (Date.now() - start) / dur;
      if (p >= 1) {
        clearInterval(iv);
        if (idx < list.length - 1) setIdx(idx + 1);
        else onClose();
      } else setProgress(p);
    }, 50);
    return () => clearInterval(iv);
  }, [idx, story?.id]);

  if (!story) return null;

  return (
    <div className="story-viewer" onClick={onClose}>
      <div className="story-content" onClick={(e) => e.stopPropagation()}>
        <div className="story-bars">
          {list.map((_, i) => (
            <div key={i} className="story-bar">
              <div className="story-bar-fill" style={{ width: i < idx ? '100%' : i === idx ? `${progress * 100}%` : '0%' }} />
            </div>
          ))}
        </div>
        <div className="story-top">
          <Avatar name={story.authorName} color={story.authorColor} photoURL={story.authorPhoto} size={36} />
          <span className="story-author">{story.authorName}</span>
          <button className="icon-btn story-close" onClick={onClose}>✕</button>
        </div>

        <img className="story-img" src={story.url} alt="story" />
        {story.caption && <div className="story-caption">{story.caption}</div>}

        <div className="story-nav">
          <div className="story-nav-left" onClick={() => idx > 0 && setIdx(idx - 1)} />
          <div className="story-nav-right" onClick={() => (idx < list.length - 1 ? setIdx(idx + 1) : onClose())} />
        </div>

        {isMine && (
          <div className="story-footer">
            <span className="story-views">👁 {story.viewers?.length || 0}</span>
            <button className="danger-btn small" onClick={() => onDelete(story.id)}>O'chirish</button>
          </div>
        )}
      </div>
    </div>
  );
}
