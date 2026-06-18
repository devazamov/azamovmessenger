import React, { useState, useEffect, useRef } from 'react';
import { Avatar, formatDuration } from './components.jsx';

// Kelayotgan qo'ng'iroq oynasi
export function IncomingCall({ call, onAccept, onDecline }) {
  return (
    <div className="incoming-call">
      <div className="incoming-box">
        <Avatar name={call.callerName} color={call.callerColor} photoURL={call.callerPhoto} size={96} />
        <div className="incoming-name">{call.callerName}</div>
        <div className="incoming-type">{call.type === 'video' ? '📹 Video qo\'ng\'iroq' : '📞 Qo\'ng\'iroq'}...</div>
        <div className="incoming-actions">
          <button className="call-btn decline" onClick={onDecline}>📵</button>
          <button className="call-btn accept" onClick={onAccept}>📞</button>
        </div>
      </div>
    </div>
  );
}

// Faol qo'ng'iroq oynasi
export function CallWindow({ session, peer, video, isCaller }) {
  const [state, setState] = useState('connecting');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(video);
  const [seconds, setSeconds] = useState(0);
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    session.on('local', (stream) => { if (localRef.current) localRef.current.srcObject = stream; });
    session.on('remote', (stream) => { if (remoteRef.current) remoteRef.current.srcObject = stream; });
    session.on('state', (s) => setState(s));
    (async () => {
      try {
        if (isCaller) await session.startAsCaller();
        else await session.startAsCallee();
      } catch (e) {
        alert('Qo\'ng\'iroqni boshlab bo\'lmadi: ' + (e.message || e));
        session.hangup();
      }
    })();
    return () => {};
  }, []);

  useEffect(() => {
    if (state !== 'active') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  const statusText = state === 'ringing' ? 'Jiringlamoqda...'
    : state === 'connecting' ? 'Ulanmoqda...'
    : state === 'active' ? formatDuration(seconds)
    : 'Tugadi';

  return (
    <div className={video ? 'call-window video' : 'call-window'}>
      {video && <video ref={remoteRef} className="call-remote-video" autoPlay playsInline />}
      {video && <video ref={localRef} className="call-local-video" autoPlay playsInline muted />}
      {!video && <audio ref={remoteRef} autoPlay />}
      {!video && <audio ref={localRef} autoPlay muted />}

      {(!video || state !== 'active') && (
        <div className="call-center">
          <Avatar name={peer.displayName} color={peer.avatarColor} photoURL={peer.photoURL} size={120} />
          <div className="call-name">{peer.displayName}</div>
          <div className="call-status">{statusText}</div>
        </div>
      )}

      {video && state === 'active' && <div className="call-status-overlay">{statusText}</div>}

      <div className="call-controls">
        <button className={micOn ? 'call-ctrl' : 'call-ctrl off'}
          onClick={() => setMicOn(session.toggleMic())}>{micOn ? '🎤' : '🔇'}</button>
        {video && (
          <button className={camOn ? 'call-ctrl' : 'call-ctrl off'}
            onClick={() => setCamOn(session.toggleCam())}>{camOn ? '📹' : '🚫'}</button>
        )}
        <button className="call-ctrl hangup" onClick={() => session.hangup()}>📵</button>
      </div>
    </div>
  );
}
