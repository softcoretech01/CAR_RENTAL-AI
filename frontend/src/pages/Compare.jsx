import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, GitCompare, LayoutGrid, Sliders } from 'lucide-react';

const IMAGE_BASE = '/api/v1/damage/images/';

const STATUS_CFG = {
  damaged:     { icon: XCircle,       color: 'var(--red)'   },
  not_damaged: { icon: CheckCircle2,  color: 'var(--green)' },
  uncertain:   { icon: AlertTriangle, color: 'var(--amber)' },
};

function Panel({ a }) {
  if (!a) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 200, borderRadius: 10, border: '1px dashed var(--border2)',
      color: 'var(--text3)', fontSize: 13, background: 'var(--surface2)',
    }}>
      Select a scan above
    </div>
  );
  const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.uncertain;
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface3)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={`${IMAGE_BASE}${a.image_path}`} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, color: cfg.color }}>
          <Icon size={15} /> <span style={{ textTransform: 'capitalize' }}>{a.status.replace('_', ' ')}</span>
        </div>
        <ConfidenceBar confidence={a.confidence} />
        <SeverityBadge severity={a.severity} />
        {a.damage_types?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {a.damage_types.map(t => (
              <span key={t} className="badge badge-red" style={{ textTransform: 'capitalize', fontSize: 10 }}>{t}</span>
            ))}
          </div>
        )}
        {a.explanation && (
          <p style={{
            fontSize: 12, color: 'var(--text2)', lineHeight: 1.65,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px',
          }}>{a.explanation}</p>
        )}
      </div>
    </div>
  );
}

export default function Compare() {
  const [all, setAll]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [leftId, setLeftId]   = useState(null);
  const [rightId, setRightId] = useState(null);
  const [viewMode, setViewMode] = useState('slider');
  const sliderRef   = useRef(null);
  const [sliderPos, setSliderPos]   = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerW, setContainerW] = useState(800); // track actual px width

  const left  = all.find(a => a.id === leftId) || null;
  const right = all.find(a => a.id === rightId) || null;

  useEffect(() => {
    api.get('/damage/history?limit=200').then(setAll).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Keep containerW in sync with the slider div's actual rendered width
  useEffect(() => {
    if (!sliderRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(sliderRef.current);
    setContainerW(sliderRef.current.offsetWidth);
    return () => ro.disconnect();
  }, [leftId, rightId, viewMode]); // re-observe when slider becomes visible

  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); };
  }, []);

  function handleMove(e) {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX == null) return;
    setSliderPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 10, color: 'var(--text2)' }}>
      <RefreshCw size={18} className="spin" style={{ color: 'var(--violet)' }} />
      <span>Loading records…</span>
    </div>
  );

  const Picker = ({ label, val, set }) => (
    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="section-label">{label}</span>
      <select className="field" value={val || ''} onChange={e => set(e.target.value ? Number(e.target.value) : null)}>
        <option value="">— select scan —</option>
        {all.map(a => (
          <option key={a.id} value={a.id}>
            #{a.id} · {a.original_name || a.image_path} ({new Date(a.created_at).toLocaleDateString()})
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
      onMouseMove={handleMove} onTouchMove={handleMove}>

      <div className="page-header">
        <div>
          <h1 className="page-title">Compare Scans</h1>
          <p className="page-sub">Select two analysis records to view side-by-side or use the split slider.</p>
        </div>
        {left && right && (
          <div className="tabs">
            <button className={`tab ${viewMode === 'slider' ? 'active' : ''}`} onClick={() => setViewMode('slider')}>
              <Sliders size={13} /> Slider
            </button>
            <button className={`tab ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <LayoutGrid size={13} /> Grid
            </button>
          </div>
        )}
      </div>

      {/* Selectors */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <Picker label="Left / Before" val={leftId} set={setLeftId} />
          <GitCompare size={18} style={{ color: 'var(--border2)', flexShrink: 0, marginBottom: 8 }} />
          <Picker label="Right / After" val={rightId} set={setRightId} />
        </div>
      </div>

      {/* Views */}
      {left && right && viewMode === 'slider' ? (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Split-Screen Slider</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Drag to compare</span>
          </div>
          <div className="card-body">
            <div
              ref={sliderRef}
              style={{
                position: 'relative', width: '100%', height: 420,
                borderRadius: 10, overflow: 'hidden',
                background: 'var(--surface2)',
                cursor: 'ew-resize', userSelect: 'none',
              }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              {/*
               * FIX: RIGHT/After image is the full-width background.
               *      LEFT/Before image clips from 0 → sliderPos% (overlay on the left).
               * Result: left of handle = Before, right of handle = After. ✓
               */}

              {/* RIGHT / After — full-width background, always visible */}
              <img
                src={`${IMAGE_BASE}${right.image_path}`}
                alt="After"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* LEFT / Before — overlay that clips to sliderPos% */}
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: `${sliderPos}%`,
                overflow: 'hidden',
              }}>
                {/* Image must be sized to the FULL container width so it renders at the same
                    position/scale as the background image — not the width of the clip div */}
                <img
                  src={`${IMAGE_BASE}${left.image_path}`}
                  alt="Before"
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: containerW, height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* Label: Before (left side of handle) */}
              <div style={{
                position: 'absolute', top: 12, left: 12,
                background: 'rgba(0,0,0,.72)', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                borderRadius: 6, letterSpacing: '.05em', textTransform: 'uppercase',
                pointerEvents: 'none',
              }}>
                ◀ Before · {left.original_name || 'Left'}
              </div>

              {/* Label: After (right side of handle) */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: 'var(--violet)', color: '#fff',
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                borderRadius: 6, letterSpacing: '.05em', textTransform: 'uppercase',
                pointerEvents: 'none',
              }}>
                After · {right.original_name || 'Right'} ▶
              </div>

              {/* Divider line + drag handle */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${sliderPos}%`,
                width: 2,
                background: '#fff',
                boxShadow: '0 0 10px rgba(0,0,0,.4)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#fff',
                  border: '2px solid rgba(255,255,255,.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(0,0,0,.35)',
                }}>
                  <GitCompare size={15} style={{ color: '#111' }} />
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
              ← Drag the handle left or right to compare →
            </p>
          </div>
        </div>
      ) : left && right && viewMode === 'grid' ? (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Left / Before</span></div>
            <div className="card-body"><Panel a={left} /></div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Right / After</span></div>
            <div className="card-body"><Panel a={right} /></div>
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="card"><div className="card-body"><Panel a={left} /></div></div>
          <div className="card"><div className="card-body"><Panel a={right} /></div></div>
        </div>
      )}

      {/* Diff table */}
      {left && right && (
        <div className="card">
          <div className="card-header"><span className="card-title">Properties Comparison</span></div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Property</th>
                <th>Left / Before</th>
                <th>Right / After</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Status',          left.status.replace('_',' '),                        right.status.replace('_',' ')],
                ['Confidence',      `${Math.round(left.confidence)}%`,                  `${Math.round(right.confidence)}%`],
                ['Severity',        left.severity,                                       right.severity],
                ['Damage Types',    (left.damage_types||[]).join(', ')||'—',            (right.damage_types||[]).join(', ')||'—'],
                ['Flagged',         left.is_flagged ? 'Yes' : 'No',                     right.is_flagged ? 'Yes' : 'No'],
                ['Date',            new Date(left.created_at).toLocaleDateString(),     new Date(right.created_at).toLocaleDateString()],
              ].map(([field, lVal, rVal]) => {
                const diff = lVal !== rVal;
                return (
                  <tr key={field} className="tbl-row" style={{ background: diff ? 'var(--violet-bg)' : undefined }}>
                    <td style={{ fontWeight: 600, color: 'var(--text2)' }}>{field}</td>
                    <td style={{ fontWeight: diff ? 700 : 400, color: diff ? 'var(--violet-2)' : 'var(--text2)', textTransform: 'capitalize' }}>{lVal}</td>
                    <td style={{ fontWeight: diff ? 700 : 400, color: diff ? 'var(--violet-2)' : 'var(--text2)', textTransform: 'capitalize' }}>{rVal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
