import { db } from './firebase.js';
import {
  doc, collection, setDoc, updateDoc, getDoc, deleteDoc, addDoc,
  onSnapshot, query, where, serverTimestamp, getDocs,
} from 'firebase/firestore';

// Common STUN serverlar. Production uchun TURN ham kerak bo'ladi
// (turli NAT orqasidagi qurilmalar uchun) — bu yerda demo uchun STUN yetarli.
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Bitta qo'ng'iroq sessiyasi (caller yoki callee). UI shu obyektga ulanadi.
export class Call {
  constructor({ me, peer, callId, isCaller, video }) {
    this.me = me;
    this.peer = peer;           // {id, displayName, avatarColor, photoURL}
    this.callId = callId;       // callee uchun mavjud, caller uchun yangi yaratiladi
    this.isCaller = isCaller;
    this.video = !!video;
    this.pc = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.unsubs = [];
    this.handlers = { state: [], local: [], remote: [] }; // bir nechta tinglovchi
    this.state = 'connecting'; // connecting | ringing | active | ended
    this.micOn = true;
    this.camOn = !!video;
  }

  on(event, cb) { (this.handlers[event] ||= []).push(cb); return this; }
  _emit(event, arg) { (this.handlers[event] || []).forEach((cb) => { try { cb(arg); } catch {} }); }
  _setState(s) { this.state = s; this._emit('state', s); }

  async _media() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: this.video ? { width: 640, height: 480 } : false,
    });
    this._emit('local', this.localStream);
  }

  _setupPc() {
    this.pc = new RTCPeerConnection(ICE);
    this.localStream.getTracks().forEach((t) => this.pc.addTrack(t, this.localStream));
    this.pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => this.remoteStream.addTrack(t));
      this._emit('remote', this.remoteStream);
    };
    this.pc.onconnectionstatechange = () => {
      const st = this.pc.connectionState;
      if (st === 'connected') this._setState('active');
      if (st === 'failed' || st === 'disconnected') this.hangup();
    };
  }

  async startAsCaller() {
    await this._media();
    this._setupPc();
    const callRef = doc(collection(db, 'calls'));
    this.callId = callRef.id;
    const callerCands = collection(callRef, 'callerCandidates');
    const calleeCands = collection(callRef, 'calleeCandidates');

    this.pc.onicecandidate = (e) => { if (e.candidate) addDoc(callerCands, e.candidate.toJSON()); };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await setDoc(callRef, {
      callerId: this.me.id,
      calleeId: this.peer.id,
      callerName: this.me.displayName,
      callerColor: this.me.avatarColor,
      callerPhoto: this.me.photoURL || null,
      type: this.video ? 'video' : 'audio',
      offer: { type: offer.type, sdp: offer.sdp },
      status: 'ringing',
      createdAt: serverTimestamp(),
    });
    this._setState('ringing');

    // Javob va status kuzatish
    this.unsubs.push(onSnapshot(callRef, async (snap) => {
      const data = snap.data();
      if (!data) { this.hangup(); return; }
      if (data.answer && this.pc.signalingState !== 'stable' && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
      if (data.status === 'declined' || data.status === 'ended') this._cleanup('ended');
    }));
    // Callee ICE
    this.unsubs.push(onSnapshot(calleeCands, (snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type === 'added') this.pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => {});
      });
    }));
  }

  async startAsCallee() {
    await this._media();
    this._setupPc();
    const callRef = doc(db, 'calls', this.callId);
    const callerCands = collection(callRef, 'callerCandidates');
    const calleeCands = collection(callRef, 'calleeCandidates');

    this.pc.onicecandidate = (e) => { if (e.candidate) addDoc(calleeCands, e.candidate.toJSON()); };

    const snap = await getDoc(callRef);
    const data = snap.data();
    if (!data) { this.hangup(); return; }
    await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp }, status: 'accepted' });
    this._setState('active');

    this.unsubs.push(onSnapshot(callRef, (s) => {
      const d = s.data();
      if (!d || d.status === 'ended') this._cleanup('ended');
    }));
    this.unsubs.push(onSnapshot(callerCands, (s) => {
      s.docChanges().forEach((ch) => {
        if (ch.type === 'added') this.pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => {});
      });
    }));
  }

  toggleMic() {
    this.micOn = !this.micOn;
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = this.micOn; });
    return this.micOn;
  }
  toggleCam() {
    this.camOn = !this.camOn;
    this.localStream?.getVideoTracks().forEach((t) => { t.enabled = this.camOn; });
    return this.camOn;
  }

  async hangup() {
    if (this.callId) {
      await updateDoc(doc(db, 'calls', this.callId), { status: 'ended' }).catch(() => {});
    }
    this._cleanup('ended');
  }

  async decline() {
    if (this.callId) {
      await updateDoc(doc(db, 'calls', this.callId), { status: 'declined' }).catch(() => {});
    }
    this._cleanup('ended');
  }

  _cleanup(state) {
    if (this.state === 'ended') return;
    this._setState(state || 'ended');
    this.unsubs.forEach((u) => u && u());
    this.unsubs = [];
    this.localStream?.getTracks().forEach((t) => t.stop());
    try { this.pc?.close(); } catch {}
    this.pc = null;
    // Eski signaling hujjatlarini tozalash (best-effort)
    if (this.callId) cleanupCallDoc(this.callId);
  }
}

async function cleanupCallDoc(callId) {
  try {
    const callRef = doc(db, 'calls', callId);
    for (const sub of ['callerCandidates', 'calleeCandidates']) {
      const snap = await getDocs(collection(callRef, sub));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    await deleteDoc(callRef);
  } catch {}
}

// Kelayotgan qo'ng'iroqni rad etish (sessiyasiz)
export async function declineCall(callId) {
  await updateDoc(doc(db, 'calls', callId), { status: 'declined' }).catch(() => {});
}

// Menga kelayotgan qo'ng'iroqlarni kuzatish (ringing holatda)
export function subscribeIncomingCalls(meId, cb) {
  const q = query(
    collection(db, 'calls'),
    where('calleeId', '==', meId),
    where('status', '==', 'ringing'),
  );
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(calls[0] || null);
  });
}
