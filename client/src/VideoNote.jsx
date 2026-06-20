import React, { useState, useRef, useEffect } from 'react';
import { formatDuration } from './components.jsx';

const MAX_SECONDS = 60;

// Dumaloq video xabar yozish oynasi (Telegram "video note").
// onDone({ blob, duration }) chaqiriladi.
export function VideoNoteRecorder({ onDone, onCancel }) {
  const [time, setTime] = useState(0);
  const videoRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);
  const timeRef = useRef(0);
  timeRef.current = time;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 480, facingMode: 'user' },
          audio: true,
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus' : 'video/webm';
        const rec = new MediaRecorder(stream, { mimeType: mime });
        recRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (cancelledRef.current) return;
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          onDone({ blob, duration: Math.round(timeRef.current) });
        };
        rec.start();
        timerRef.current = setInterval(() => {
          setTime((t) => {
            const next = t + 0.1;
            if (next >= MAX_SECONDS) stop(true);
            return next;
          });
        }, 100);
      } catch {
        alert('Kamera/mikrofonga ruxsat berilmadi.');
        onCancel();
      }
    })();
    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stop(send) {
    cancelledRef.current = !send;
    clearInterval(timerRef.current);
    try { recRef.current?.stop(); } catch {}
    if (!send) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCancel();
    }
  }

  const pct = Math.min(100, (time / MAX_SECONDS) * 100);

  return (
    <div className="vnote-overlay" onClick={(e) => e.target === e.currentTarget && stop(false)}>
      <div className="vnote-box">
        <div className="vnote-circle">
          <video ref={videoRef} playsInline className="vnote-video" />
          <svg className="vnote-ring" viewBox="0 0 100 100">
            <circle className="vnote-ring-bg" cx="50" cy="50" r="48" />
            <circle className="vnote-ring-fg" cx="50" cy="50" r="48"
              style={{ strokeDasharray: 302, strokeDashoffset: 302 - (302 * pct) / 100 }} />
          </svg>
        </div>
        <div className="vnote-time">🔴 {formatDuration(time)} / {formatDuration(MAX_SECONDS)}</div>
        <div className="vnote-actions">
          <button type="button" className="ghost-btn" onClick={() => stop(false)}>Bekor</button>
          <button type="button" className="primary-btn" onClick={() => stop(true)}>Yuborish ➤</button>
        </div>
      </div>
    </div>
  );
}

// Dumaloq video xabarni ko'rsatish (bubble ichida) — bosilganda ijro.
export function VideoNotePlayer({ videoNote }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.currentTime = 0; v.play(); setPlaying(true); }
  }

  return (
    <div className="vnote-msg" onClick={toggle}>
      <video ref={ref} src={videoNote.url} className="vnote-msg-video"
        playsInline onEnded={() => setPlaying(false)} />
      {!playing && <div className="vnote-play">▶</div>}
      <span className="vnote-msg-dur">{formatDuration(videoNote.duration)}</span>
    </div>
  );
}
