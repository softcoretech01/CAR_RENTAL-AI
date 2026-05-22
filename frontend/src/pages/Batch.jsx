import { useRef, useState } from 'react';
import { Layers, Upload, CheckCircle2, XCircle, AlertTriangle, Loader2, Download, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';

const IMAGE_BASE = '/api/v1/damage/images/';
const STATUS_CFG = {
  damaged:     { icon: XCircle,       color: 'var(--red)'   },
  not_damaged: { icon: CheckCircle2,  color: 'var(--green)' },
  uncertain:   { icon: AlertTriangle, color: 'var(--amber)' },
};

export default function Batch() {
  const ref = useRef(null);
  const [files, setFiles]       = useState([]);
  const [dragging, setDragging] = useState(false);
  const [batchId, setBatchId]   = useState(null);
  const [results, setResults]   = useState([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone]         = useState(false);
  const [idx, setIdx]           = useState(-1);

  function pick(list) {
    setFiles(Array.from(list).filter(f => f.type.startsWith('image/')).slice(0, 50));
    setResults([]); setDone(false); setBatchId(null);
  }

  async function run() {
    if (!files.length) return;
    setProcessing(true); setResults([]); setDone(false);
    try {
      const label = `Batch ${new Date().toLocaleString()}`;
      const batch = await api.post(`/damage/batch?label=${encodeURIComponent(label)}`);
      setBatchId(batch.id);
      const acc = [];
      for (let i = 0; i < files.length; i++) {
        setIdx(i);
        try { acc.push({ file: files[i], result: await api.postFile(`/damage/batch/${batch.id}/analyse`, files[i]), error: null }); }
        catch (e) { acc.push({ file: files[i], result: null, error: e.message }); }
        setResults([...acc]);
      }
      setDone(true);
    } catch (e) { alert('Batch failed: ' + e.message); }
    finally { setProcessing(false); setIdx(-1); }
  }

  function reset() {
    setFiles([]); setResults([]); setDone(false); setBatchId(null); setIdx(-1);
    if (ref.current) ref.current.value = '';
  }

  function exportCSV() {
    const header = ['Filename','Status','Confidence','Severity','Damage Types','Region','Explanation','Flagged'];
    const rows = results.map(({ file, result, error }) => !result
      ? [file.name, 'ERROR', '', '', '', '', error, '']
      : [file.name, result.status, Math.round(result.confidence), result.severity,
         (result.damage_types || []).join(';'), result.region_description || '', result.explanation || '', result.is_flagged ? 'Yes' : 'No']
    );
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `batch-${batchId || 'export'}.csv`; a.click();
  }

  const damaged    = results.filter(r => r.result?.status === 'damaged').length;
  const notDamaged = results.filter(r => r.result?.status === 'not_damaged').length;
  const flagged    = results.filter(r => r.result?.is_flagged).length;
  const progress   = files.length > 0 ? Math.round((results.length / files.length) * 100) : 0;

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Batch Analysis</h1>
          <p className="page-sub">Upload up to 50 images for automated sequential processing.</p>
        </div>
      </div>

      {/* Drop zone */}
      {!done && (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''}`}
          style={{ cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? .6 : 1, minHeight: 180 }}
          onClick={() => !processing && ref.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
        >
          <input ref={ref} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => pick(e.target.files)} />
          <div className="drop-zone-icon"><Layers size={22} /></div>
          {files.length > 0 ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{files.length} images selected</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Click to replace files</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Drop images here or click to browse</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>JPG, PNG, WebP · up to 50 files</p>
            </div>
          )}
        </div>
      )}

      {/* File queue */}
      {files.length > 0 && !done && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{files.length} Files Queued</span>
            {processing && <span className="badge badge-violet">{results.length}/{files.length} done</span>}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {files.map((f, i) => {
                const r = results[i];
                const isCurrent = i === idx;
                const cfg = r?.result ? STATUS_CFG[r.result.status] : null;
                const StatusIcon = cfg?.icon;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px', borderRadius: 7,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    fontSize: 13,
                  }}>
                    <span style={{ width: 16, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      {isCurrent ? <Loader2 size={13} className="spin" style={{ color: 'var(--violet)' }} />
                        : StatusIcon ? <StatusIcon size={13} style={{ color: cfg.color }} />
                        : <Upload size={13} style={{ color: 'var(--text3)' }} />}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)', fontWeight: 500 }}>
                      {f.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                );
              })}
            </div>

            {processing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span className="section-label">Progress</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--violet)', fontWeight: 700 }}>{progress}%</span>
                </div>
                <div className="conf-track" style={{ height: 6 }}>
                  <div className="conf-fill" style={{ width: `${progress}%`, background: 'var(--violet)', transition: 'width .3s ease' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!done && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-lg" style={{ flex: 1, justifyContent: 'center' }}
            onClick={run} disabled={!files.length || processing}>
            {processing
              ? <><Loader2 size={16} className="spin" /> Processing…</>
              : <><Layers size={16} /> Start Batch Analysis</>}
          </button>
          {files.length > 0 && !processing && (
            <button className="btn btn-ghost btn-lg" onClick={reset}>
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {done && (
            <div className="grid-4">
              {[
                { label: 'Total Scanned', value: files.length, cls: 'violet' },
                { label: 'Damage Found',  value: damaged,       cls: 'red'    },
                { label: 'Clear / Safe',  value: notDamaged,    cls: 'green'  },
                { label: 'Flagged',       value: flagged,        cls: 'amber'  },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`stat-card ${cls}`}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">Results Grid ({results.length})</span>
              {done && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
                    <Download size={13} /> CSV
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={reset}>
                    <RefreshCw size={13} /> New Batch
                  </button>
                </div>
              )}
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {results.map(({ file, result, error }, i) => (
                  <div key={i} style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 10, overflow: 'hidden',
                  }}>
                    {result ? (
                      <>
                        <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--surface3)', position: 'relative' }}>
                          <img src={`${IMAGE_BASE}${result.image_path}`} alt={file.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {result.is_flagged && (
                            <span className="badge badge-amber" style={{ position: 'absolute', top: 6, right: 6, fontSize: 9 }}>
                              Review
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const cfg = STATUS_CFG[result.status] ?? STATUS_CFG.uncertain;
                            const I = cfg.icon;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: cfg.color }}>
                                <I size={12} /> <span style={{ textTransform: 'capitalize' }}>{result.status.replace('_', ' ')}</span>
                              </div>
                            );
                          })()}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{file.name}</span>
                            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text2)', flexShrink: 0 }}>{Math.round(result.confidence)}%</span>
                          </div>
                          <SeverityBadge severity={result.severity} />
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>Failed</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 6, padding: '4px 8px' }}>{error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
