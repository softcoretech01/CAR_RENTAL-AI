/**
 * PhotoCapture — single position photo input.
 * Uses <input type="file" capture="environment"> so mobile gets the camera
 * and desktop gets a file picker. No webcam stream needed.
 */
import { useRef, useState } from 'react';
import { Camera, CheckCircle, Loader } from 'lucide-react';

export default function PhotoCapture({ positionName, onCapture, existingUrl, disabled }) {
  const inputRef  = useRef(null);
  const [preview, setPreview] = useState(existingUrl || null);
  const [busy,    setBusy]    = useState(false);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    try {
      await onCapture(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Label */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
        {positionName}
      </div>

      {/* Photo slot */}
      <div
        className="photo-slot"
        onClick={() => !disabled && !busy && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={positionName} />
            {busy && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Loader size={22} color="#fff" className="spin" />
              </div>
            )}
            {!busy && (
              <div style={{
                position: 'absolute', bottom: 6, right: 6,
                background: 'rgba(22,163,74,.9)', borderRadius: '50%',
                width: 22, height: 22, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle size={14} color="#fff" />
              </div>
            )}
          </>
        ) : (
          <div className="photo-slot-empty">
            {busy
              ? <Loader size={22} className="spin" />
              : <Camera size={22} />
            }
            <span>{busy ? 'Uploading…' : 'Tap to photo'}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={disabled || busy}
      />
    </div>
  );
}
