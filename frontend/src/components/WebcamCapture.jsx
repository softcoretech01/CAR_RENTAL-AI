import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, ZapOff } from 'lucide-react';

export function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  async function start() {
    setError(null); setSnapshot(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      setActive(true);
    } catch { setError('Camera access denied.'); }
  }

  function capture() {
    const v = videoRef.current; const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const uri = c.toDataURL('image/jpeg', 0.92);
    setSnapshot(uri); stop(); onCapture(uri);
  }

  function retake() { setSnapshot(null); start(); onCapture(null); }

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-3 bg-red-50 border border-red-200 rounded-2xl py-14 px-6 text-center">
      <ZapOff className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-600">{error}</p>
      <button onClick={start} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Try Again</button>
    </div>
  );

  if (snapshot) return (
    <div className="space-y-3">
      <img src={snapshot} alt="Captured" className="w-full rounded-2xl border border-gray-200 max-h-80 object-contain bg-gray-50" />
      <button onClick={retake} className="w-full py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Retake Photo</button>
    </div>
  );

  if (!active) return (
    <div className="flex flex-col items-center justify-center gap-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl py-14 px-6 text-center">
      <div className="p-4 bg-violet-100 rounded-full"><Camera className="w-8 h-8 text-violet-600" /></div>
      <div>
        <p className="font-semibold text-gray-700">Use your camera</p>
        <p className="text-sm text-gray-400 mt-1">Capture a photo for instant analysis</p>
      </div>
      <button onClick={start} className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700">Start Camera</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden bg-black border border-gray-200">
        <video ref={videoRef} className="w-full max-h-80 object-cover" muted playsInline />
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-2">
        <button onClick={capture}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700">
          <Camera className="w-4 h-4" /> Capture
        </button>
        <button onClick={stop} className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50">
          <CameraOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
