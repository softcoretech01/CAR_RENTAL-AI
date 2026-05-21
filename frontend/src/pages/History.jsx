import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { HistoryTable } from '../components/HistoryTable';
import { DamageResultCard } from '../components/DamageResultCard';
import { RefreshCw, Filter, X, ArrowLeft } from 'lucide-react';

export default function History() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (severity) p.set('severity', severity);
      if (flaggedOnly) p.set('flagged', 'true');
      p.set('limit', PAGE); p.set('offset', page * PAGE);
      setAnalyses(await api.get(`/damage/history?${p}`));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [status, severity, flaggedOnly, page]);

  useEffect(() => { load(); }, [load]);

  async function doDelete(a) {
    await api.delete(`/damage/analyses/${a.id}`);
    setToDelete(null);
    if (selected?.id === a.id) setSelected(null);
    load();
  }

  if (selected) return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => setSelected(null)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to History
      </button>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <DamageResultCard result={selected} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
          <p className="text-sm text-gray-500 mt-1">All past damage analyses.</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        {[['status', ['','damaged','not_damaged','uncertain'], status, v => { setStatus(v); setPage(0); }],
          ['severity', ['','none','low','medium','high'], severity, v => { setSeverity(v); setPage(0); }]
        ].map(([name, opts, val, setter]) => (
          <select key={name} value={val} onChange={e => setter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-300">
            {opts.map(o => <option key={o} value={o}>{o || `All ${name}s`}</option>)}
          </select>
        ))}
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={flaggedOnly} onChange={e => { setFlaggedOnly(e.target.checked); setPage(0); }}
            className="rounded border-gray-300 text-violet-600" />
          Flagged only
        </label>
        {(status || severity || flaggedOnly) && (
          <button onClick={() => { setStatus(''); setSeverity(''); setFlaggedOnly(false); setPage(0); }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : <HistoryTable analyses={analyses} onView={setSelected} onDelete={setToDelete} />}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 text-sm text-gray-500">
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}
            className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Previous</button>
          <span>Page {page+1}</span>
          <button onClick={() => setPage(p => p+1)} disabled={analyses.length < PAGE}
            className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      </div>

      {toDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Delete Analysis?</h3>
            <p className="text-sm text-gray-500">Permanently removes the record and image.<br /><strong>{toDelete.original_name}</strong></p>
            <div className="flex gap-3">
              <button onClick={() => setToDelete(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => doDelete(toDelete)} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
