import { useRef, useState } from 'react';
import { Upload, X, Image } from 'lucide-react';

export function ImageUploader({ onFile }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  function pick(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }
  function clear(e) {
    e.stopPropagation();
    setPreview(null); onFile(null);
    if (ref.current) ref.current.value = '';
  }

  return (
    <div
      onClick={() => !preview && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
      className={`drop-zone ${dragging ? 'dragging' : ''}`}
      style={{ minHeight: 220, cursor: preview ? 'default' : 'pointer', position: 'relative' }}
    >
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />

      {preview ? (
        <>
          <img src={preview} alt="Preview"
            style={{ maxHeight: 220, maxWidth: '100%', objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' }} />
          <button onClick={clear}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--surface)', border: '1px solid var(--border2)',
              color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          <div className="drop-zone-icon"><Upload size={22} /></div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Drop image here or click to browse
            </p>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              JPG, PNG, WebP · Resized to 1024px
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
            color: 'var(--text3)', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px',
          }}>
            <Image size={11} /> Standard formats accepted
          </div>
        </>
      )}
    </div>
  );
}
