import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Activity, XCircle, CheckCircle2, ShieldAlert,
  TrendingUp, RefreshCw, Zap, Eye, ArrowRight,
} from 'lucide-react';
import { DamageResultCard } from '../components/DamageResultCard';
import { SeverityBadge } from '../components/SeverityBadge';

const STATS = (s) => [
  { key: 'total',       label: 'Total Scans',      value: s.total,       icon: Activity,     cls: 'violet' },
  { key: 'damaged',     label: 'Damage Detected',  value: s.damaged,     icon: XCircle,      cls: 'red'    },
  { key: 'not_damaged', label: 'Clear / Safe',      value: s.not_damaged, icon: CheckCircle2, cls: 'green'  },
  { key: 'flagged',     label: 'Flagged Reviews',  value: s.flagged,     icon: ShieldAlert,  cls: 'amber'  },
];

const C = 2 * Math.PI * 14; // SVG circle circumference at r=14

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try { setStats(await api.get('/damage/stats')); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, gap: 12, color: 'var(--text2)' }}>
      <RefreshCw size={20} className="spin" style={{ color: 'var(--violet)' }} />
      <span style={{ fontSize: 14 }}>Loading dashboard…</span>
    </div>
  );
  if (!stats) return null;

  const feedbackTotal = stats.correct + stats.incorrect;
  const accuracy = feedbackTotal > 0 ? Math.round((stats.correct / feedbackTotal) * 100) : 100;
  const cards = STATS(stats);

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Dashboard</h1>
          <p className="page-sub">Real-time health, statistics and feedback telemetry.</p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid-4">
        {cards.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className={`stat-card ${cls}`}>
            <div className={`stat-icon ${cls}`}>
              <Icon size={16} />
            </div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            <div className="stat-bar-track">
              <div
                className="stat-bar-fill"
                style={{
                  width: stats.total > 0 ? `${Math.min(100, (value / stats.total) * 100)}%` : '2%',
                  background: cls === 'violet' ? 'var(--violet)' : cls === 'red' ? 'var(--red)' : cls === 'green' ? 'var(--green)' : 'var(--amber)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Accuracy + Learning loop ─────────────────────────── */}
      <div className="grid-3-1">

        {/* Accuracy gauge */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">AI Accuracy Score</span>
            <TrendingUp size={14} style={{ color: 'var(--violet)' }} />
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <p className="page-sub" style={{ textAlign: 'center', marginTop: 0 }}>
              Calculated from user-validated feedback corrections.
            </p>

            {/* Donut */}
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border2)" strokeWidth="3"/>
                <circle cx="18" cy="18" r="14" fill="none"
                  stroke="var(--violet)" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(accuracy / 100) * C} ${C}`}
                  style={{ filter: 'drop-shadow(0 0 6px var(--violet-glow))', transition: 'stroke-dasharray .7s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                  {accuracy}%
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4 }}>
                  Verified
                </span>
              </div>
            </div>

            <div style={{
              width: '100%', display: 'flex', justifyContent: 'space-between',
              paddingTop: 14, borderTop: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text2)',
            }}>
              <span>Total: <b style={{ color: 'var(--text)' }}>{feedbackTotal}</b></span>
              <span style={{ color: 'var(--green)' }}>✓ {stats.correct} correct</span>
              <span style={{ color: 'var(--red)' }}>✗ {stats.incorrect} wrong</span>
            </div>
          </div>
        </div>

        {/* Learning loop */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--violet-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={13} style={{ color: 'var(--violet)' }} />
              </div>
              <span className="card-title">Continuous Learning Loop</span>
            </div>
            <span className="badge badge-violet">{stats.incorrect_items.length} samples</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
              When you mark a prediction as <span style={{ color: 'var(--text)', fontWeight: 600 }}>Incorrect</span>,
              DamageAI records it and injects these as few-shot examples into all subsequent AI prompts.
            </p>

            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
              flex: 1, minHeight: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="section-label">Active Pool</span>
              </div>
              {stats.incorrect_items.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                  No corrections yet — pool is clean.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                  {stats.incorrect_items.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '6px 10px', fontSize: 12,
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {item.original_name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span className="badge badge-red">{item.status.replace('_', ' ')}</span>
                        <ArrowRight size={10} style={{ color: 'var(--text3)' }} />
                        <span style={{ color: 'var(--text2)' }}>re-eval</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>
              💡 Consistent validation improves specialized / edge-case detection over time.
            </p>
          </div>
        </div>
      </div>

      {/* ── Flagged queue ───────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} style={{ color: 'var(--amber)' }} />
            <span className="card-title">Action Queue — Flagged Reviews</span>
          </div>
          {stats.flagged_items.length > 0 && (
            <span className="badge badge-amber">{stats.flagged_items.length} pending</span>
          )}
        </div>

        {stats.flagged_items.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center', color: 'var(--text2)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--green)', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Review queue is clean!</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>No items need manual intervention.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                {['File Name', 'Prediction', 'Confidence', 'Severity', ''].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.flagged_items.map(item => (
                <tr key={item.id} className="tbl-row">
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{item.original_name || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 500 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                        background: item.status === 'damaged' ? 'var(--red)' : item.status === 'not_damaged' ? 'var(--green)' : 'var(--amber)',
                      }} />
                      <span style={{ textTransform: 'capitalize' }}>{item.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{Math.round(item.confidence)}%</td>
                  <td><SeverityBadge severity={item.severity} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-sm" onClick={() => setSelected(item)}
                      style={{ background: 'var(--violet-bg)', color: 'var(--violet)', border: '1px solid rgba(124,90,246,.2)' }}>
                      <Eye size={12} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Review Analysis</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕ Close</button>
            </div>
            <div style={{ padding: 24 }}>
              <DamageResultCard result={selected} onReset={null} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
