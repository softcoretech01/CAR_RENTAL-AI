import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';

export function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive]     = useState(false);
  const [error, setError]       = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setActive(false);
  }, []);
  useEffect(() => () => stop(), [stop]);

  async function start() {
    setError(null); setSnapshot(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setActive(true);
    } catch { setError('Camera access was denied or unavailable.'); }
  }

  function capture() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const uri = c.toDataURL('image/jpeg', 0.92);
    setSnapshot(uri); stop(); onCapture(uri);
  }

  function retake() { setSnapshot(null); start(); onCapture(null); }

  if (error) return (
    <div className="drop-zone" style={{ borderColor: 'rgba(255,84,84,.3)', background: 'var(--red-bg)', gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,84,84,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CameraOff size={20} style={{ color: 'var(--red)' }} />
      </div>
      <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>{error}</p>
      <button className="btn btn-ghost btn-sm" onClick={start}>Retry</button>
    </div>
  );

  if (snapshot) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', justifyContent: 'center' }}>
        <img src={snapshot} alt="Captured" style={{ maxHeight: 260, objectFit: 'contain' }} />
      </div>
      <button className="btn btn-ghost" style={{ justifyContent: 'center' }} onClick={retake}>
        <RotateCcw size={13} /> Retake
      </button>
    </div>
  );

  if (!active) return (
    <div className="drop-zone" style={{ gap: 14 }}>
      <div className="drop-zone-icon"><Camera size={22} /></div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Live Webcam Capture</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Capture frames directly from your device camera</p>
      </div>
      <button className="btn btn-primary" onClick={start}>
        <Camera size={14} /> Activate Camera
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', border: '1px solid var(--border)' }}>
        <video ref={videoRef} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} muted playsInline />
        <div style={{
          position: 'absolute', top: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(0,0,0,.7)', borderRadius: 20, padding: '4px 10px',
          fontSize: 10, fontWeight: 700, color: 'var(--red)', letterSpacing: '.06em',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', animation: 'pulseDot 1.2s ease infinite' }} />
          LIVE
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={capture}>
          <Camera size={14} /> Capture
        </button>
        <button className="btn btn-ghost" onClick={stop}>
          <CameraOff size={14} />
        </button>
      </div>
    </div>
  );
}
