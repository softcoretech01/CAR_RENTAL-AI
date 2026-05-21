import { useState } from 'react';
import { Upload, Camera, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { ImageUploader } from '../components/ImageUploader';
import { WebcamCapture } from '../components/WebcamCapture';
import { DamageResultCard } from '../components/DamageResultCard';

const TABS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'webcam', label: 'Webcam', icon: Camera },
];

export default function Analyse() {
  const [tab, setTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [webcamData, setWebcamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function reset() { setResult(null); setError(null); setFile(null); setWebcamData(null); }

  async function analyse() {
    setError(null); setLoading(true);
    try {
      if (tab === 'upload') {
        if (!file) { setError('Select an image first.'); return; }
        setResult(await api.postFile('/damage/analyse', file));
      } else {
        if (!webcamData) { setError('Capture a photo first.'); return; }
        setResult(await api.post('/damage/analyse/webcam', {
          image_data: webcamData,
          original_name: `webcam_${Date.now()}.jpg`,
        }));
      }
    } catch (e) {
      setError(e.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  }

  const canAnalyse = (tab === 'upload' && file) || (tab === 'webcam' && webcamData);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Damage Detection</h1>
        <p className="text-sm text-gray-500 mt-1">Upload or capture an image — AI analyses it in seconds.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); reset(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === id ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {result ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <DamageResultCard result={result} onReset={reset} />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
          {tab === 'upload' && <ImageUploader onFile={setFile} />}
          {tab === 'webcam' && <WebcamCapture onCapture={setWebcamData} />}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />{error}
            </div>
          )}
          <button onClick={analyse} disabled={!canAnalyse || loading}
            className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing with AI…</> : 'Analyse Image'}
          </button>
          {loading && <p className="text-center text-xs text-gray-400">Groq AI is examining your image — usually 3–8 seconds.</p>}
        </div>
      )}
    </div>
  );
}
