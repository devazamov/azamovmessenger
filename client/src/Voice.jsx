import React, { useState, useRef, useEffect } from 'react';
import { formatDuration } from './components.jsx';

// Ovozli xabar yozish tugmasi (composer ichida).
// onDone({ blob, duration, waveform }) chaqiriladi.
export function VoiceRecorder({ onDone, onCancel }) {
  const [time, setTime] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const levelsRef = useRef([]);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const rec = new MediaRecorder(stream);
        recRef.current = rec;
        rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          cancelAnimationFrame(rafRef.current);
          if (cancelledRef.current) return;
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          // To'lqin shaklini 24 ta ustunga siqamiz
          const wf = compress(levelsRef.current, 24);
          onDone({ blob, duration: Math.round(timeRef.current), waveform: wf });
        };
        rec.start();

        // Daraja o'lchash (waveform uchun)
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          levelsRef.current.push(avg);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();

        timerRef.current = setInterval(() => setTime((t) => t + 0.1), 100);
      } catch (err) {
        alert('Mikrofonga ruxsat berilmadi.');
        onCancel();
      }
    })();
    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const timeRef = useRef(0);
  timeRef.current = time;

  function stop(send) {
    cancelledRef.current = !send;
    clearInterval(timerRef.current);
    try { recRef.current?.stop(); } catch {}
    if (!send) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCancel();
    }
  }

  return (
    <div className="voice-recorder">
      <button type="button" className="voice-cancel" onClick={() => stop(false)} title="Bekor qilish">🗑</button>
      <span className="voice-rec-dot" />
      <span className="voice-rec-time">{formatDuration(time)}</span>
      <span className="voice-rec-hint">Yozilmoqda...</span>
      <button type="button" className="send-btn" onClick={() => stop(true)} title="Yuborish">➤</button>
    </div>
  );
}

function compress(levels, n) {
  if (!levels.length) return new Array(n).fill(8);
  const out = [];
  const step = levels.length / n;
  for (let i = 0; i < n; i++) {
    const slice = levels.slice(Math.floor(i * step), Math.floor((i + 1) * step));
    const avg = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
    out.push(Math.max(4, Math.min(28, Math.round((avg / 255) * 28))));
  }
  return out;
}

// Ovozli xabarni ko'rsatish/ijro etish (bubble ichida)
export function VoicePlayer({ voice, mine }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const wf = voice.waveform?.length ? voice.waveform : new Array(24).fill(10);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || voice.duration || 1));
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  return (
    <div className={mine ? 'voice-player mine' : 'voice-player'}>
      <audio ref={audioRef} src={voice.url} preload="metadata" />
      <button type="button" className="voice-play-btn" onClick={toggle}>{playing ? '❚❚' : '▶'}</button>
      <div className="voice-wave">
        {wf.map((h, i) => {
          const active = i / wf.length <= progress;
          return <span key={i} className={active ? 'wbar on' : 'wbar'} style={{ height: h }} />;
        })}
      </div>
      <span className="voice-dur">{formatDuration(voice.duration)}</span>
    </div>
  );
}
