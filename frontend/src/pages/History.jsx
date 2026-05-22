import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { HistoryTable } from '../components/HistoryTable';
import { DamageResultCard } from '../components/DamageResultCard';
import { RefreshCw, Filter, X, ArrowLeft, Trash2 } from 'lucide-react';

const PG = 20;

export default function History() {
  const [analyses, setAnalyses]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [toDelete, setToDelete]     = useState(null);
  const [status, setStatus]         = useState('');
  const [severity, setSeverity]     = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage]             = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (status)     p.set('status',   status);
      if (severity)   p.set('severity', severity);
      if (flaggedOnly) p.set('flagged', 'true');
      p.set('limit', PG); p.set('offset', page * PG);
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

  const hasFilter = status || severity || flaggedOnly;

  if (selected) return (
    <div className="fade-up" style={{ maxWidth: 760, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ marginBottom: 18 }}>
        <ArrowLeft size={13} /> Back
      </button>
      <div className="card">
        <div className="card-header"><span className="card-title">Analysis Detail</span></div>
        <div className="card-body"><DamageResultCard result={selected} /></div>
      </div>
    </div>
  );

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Analysis Archive</h1>
          <p className="page-sub">Audit, inspect, and manage all historical inspection records.</p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} style={{ color: loading ? 'var(--violet)' : undefined }} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ borderRadius: 10 }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--violet)' }}>
            <Filter size={13} />
            <span className="section-label">Filters</span>
          </div>

          <select className="field" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
            <option value="">All Statuses</option>
            <option value="damaged">Damaged</option>
            <option value="not_damaged">Not Damaged</option>
            <option value="uncertain">Uncertain</option>
          </select>

          <select className="field" value={severity} onChange={e => { setSeverity(e.target.value); setPage(0); }}>
            <option value="">All Severities</option>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: 'var(--text2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={flaggedOnly}
              onChange={e => { setFlaggedOnly(e.target.checked); setPage(0); }}
              style={{ accentColor: 'var(--violet)', width: 14, height: 14 }}
            />
            Flagged only
          </label>

          {hasFilter && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}
              onClick={() => { setStatus(''); setSeverity(''); setFlaggedOnly(false); setPage(0); }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 24px', color: 'var(--text2)' }}>
            <RefreshCw size={18} className="spin" style={{ color: 'var(--violet)' }} />
            <span style={{ fontSize: 13 }}>Loading records…</span>
          </div>
        ) : (
          <>
            <HistoryTable analyses={analyses} onView={setSelected} onDelete={setToDelete} />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderTop: '1px solid var(--border)',
            }}>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                ← Prev
              </button>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>Page {page + 1}</span>
              <button className="btn btn-ghost btn-sm"
                onClick={() => setPage(p => p + 1)} disabled={analyses.length < PG}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete modal */}
      {toDelete && (
        <div className="overlay" onClick={() => setToDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={16} style={{ color: 'var(--red)' }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Delete Record?</h3>
            </div>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
                This permanently removes the analysis and its stored image from disk.
              </p>
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 12px', fontSize: 12, fontFamily: 'var(--mono)',
                color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {toDelete.original_name}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setToDelete(null)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => doDelete(toDelete)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
