import { useState } from 'react';
import { Upload, Camera, Loader2, AlertCircle, ScanEye } from 'lucide-react';
import { api } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';
import { WebcamCapture } from '../components/WebcamCapture';
import { DamageResultCard } from '../components/DamageResultCard';

const TABS = [
  { id: 'upload', label: 'File Upload', icon: Upload },
  { id: 'webcam', label: 'Live Webcam', icon: Camera },
];

export default function Analyse() {
  const [tab, setTab]           = useState('upload');
  const [file, setFile]         = useState(null);
  const [webcamData, setWebcamData] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);

  function reset() { setResult(null); setError(null); setFile(null); setWebcamData(null); }

  async function analyse() {
    setError(null); setLoading(true);
    try {
      if (tab === 'upload') {
        if (!file) { setError('Please select an image file first.'); return; }
        setResult(await api.postFile('/damage/analyse', file));
      } else {
        if (!webcamData) { setError('Please capture a photo first.'); return; }
        setResult(await api.post('/damage/analyse/webcam', { image_data: webcamData, original_name: `webcam_${Date.now()}.jpg` }));
      }
    } catch (e) { setError(e.message || 'Analysis failed.'); }
    finally { setLoading(false); }
  }

  const canRun = (tab === 'upload' && file) || (tab === 'webcam' && webcamData);

  return (
    <div className="fade-up" style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 className="page-title">AI Damage Analysis</h1>
        <p className="page-sub">Upload an image or capture a live frame to run AI damage diagnostics.</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => { setTab(id); reset(); }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {result ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Analysis Result</span>
            <button className="btn btn-ghost btn-sm" onClick={reset}>← New Scan</button>
          </div>
          <div className="card-body">
            <DamageResultCard result={result} onReset={reset} />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {tab === 'upload' && <ImageUploader onFile={setFile} />}
            {tab === 'webcam' && <WebcamCapture onCapture={setWebcamData} />}

            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'var(--red-bg)', border: '1px solid rgba(255,84,84,.2)',
                borderRadius: 10, padding: '12px 16px',
              }}>
                <AlertCircle size={15} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>Error</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{error}</p>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={analyse}
              disabled={!canRun || loading}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Running AI diagnostics…</>
                : <><ScanEye size={16} /> Run Damage Analysis</>
              }
            </button>

            {loading && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                Processing via Groq Vision · typically 3–6 seconds
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
