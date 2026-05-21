import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

const IMAGE_BASE = '/api/v1/damage/images/';
const STATUS_ICON = { damaged: <XCircle className="w-5 h-5 text-red-500" />, not_damaged: <CheckCircle className="w-5 h-5 text-emerald-500" />, uncertain: <AlertTriangle className="w-5 h-5 text-amber-500" /> };

function Panel({ a }) {
  if (!a) return <div className="flex items-center justify-center h-48 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">Select an analysis above</div>;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center">
        <img src={`${IMAGE_BASE}${a.image_path}`} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">{STATUS_ICON[a.status]}<span className="font-semibold capitalize">{a.status.replace('_',' ')}</span></div>
        <ConfidenceBar confidence={a.confidence} />
        <SeverityBadge severity={a.severity} />
        {a.damage_types?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {a.damage_types.map(t => <span key={t} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs capitalize">{t}</span>)}
          </div>
        )}
        {a.explanation && <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2.5 leading-relaxed">{a.explanation}</p>}
      </div>
    </div>
  );
}

export default function Compare() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftId, setLeftId] = useState(null);
  const [rightId, setRightId] = useState(null);
  const left = all.find(a => a.id === leftId) || null;
  const right = all.find(a => a.id === rightId) || null;

  useEffect(() => {
    api.get('/damage/history?limit=200').then(setAll).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…</div>;

  const Picker = ({ label, val, set }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <select value={val || ''} onChange={e => set(e.target.value ? Number(e.target.value) : null)}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
        <option value="">— select —</option>
        {all.map(a => <option key={a.id} value={a.id}>#{a.id} · {a.original_name || a.image_path} · {new Date(a.created_at).toLocaleDateString()}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Before / After Compare</h1>
        <p className="text-sm text-gray-500 mt-1">Select any two past analyses to compare side-by-side.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <Picker label="Left" val={leftId} set={setLeftId} />
        <Picker label="Right" val={rightId} set={setRightId} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[['Left', left], ['Right', right]].map(([side, a]) => (
          <div key={side} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{side}</p>
            <Panel a={a} />
          </div>
        ))}
      </div>
      {left && right && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Comparison</p>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="pb-2 pr-4">Field</th><th className="pb-2 pr-4">Left</th><th className="pb-2">Right</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50 text-gray-700">
              {[
                ['Status', left.status.replace('_',' '), right.status.replace('_',' ')],
                ['Confidence', `${Math.round(left.confidence)}%`, `${Math.round(right.confidence)}%`],
                ['Severity', left.severity, right.severity],
                ['Damage Types', (left.damage_types||[]).join(', ')||'—', (right.damage_types||[]).join(', ')||'—'],
                ['Flagged', left.is_flagged?'Yes':'No', right.is_flagged?'Yes':'No'],
                ['Date', new Date(left.created_at).toLocaleDateString(), new Date(right.created_at).toLocaleDateString()],
              ].map(([f,l,r]) => (
                <tr key={f}>
                  <td className="py-2 pr-4 font-medium text-gray-500">{f}</td>
                  <td className={`py-2 pr-4 ${l!==r?'font-semibold text-violet-700':''}`}>{l}</td>
                  <td className={`py-2 ${l!==r?'font-semibold text-violet-700':''}`}>{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
