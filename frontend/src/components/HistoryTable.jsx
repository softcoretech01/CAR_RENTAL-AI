import { CheckCircle2, XCircle, AlertTriangle, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';

const IMAGE_BASE = '/api/v1/damage/images/';

const STATUS_CFG = {
  damaged:     { icon: XCircle,      color: 'var(--red)',   label: 'Damaged' },
  not_damaged: { icon: CheckCircle2, color: 'var(--green)', label: 'Clear' },
  uncertain:   { icon: AlertTriangle,color: 'var(--amber)', label: 'Uncertain' },
};

export function HistoryTable({ analyses, onView, onDelete }) {
  if (!analyses.length) return (
    <div style={{ padding: '72px 24px', textAlign: 'center', color: 'var(--text3)' }}>
      <AlertTriangle size={28} style={{ margin: '0 auto 12px', color: 'var(--border2)' }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No records found</p>
      <p style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters above.</p>
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            {['Preview', 'File Name', 'Status', 'Confidence', 'Severity', 'Source', 'Date', ''].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analyses.map(a => {
            const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.uncertain;
            const Icon = cfg.icon;
            return (
              <tr key={a.id} className="tbl-row">
                <td>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8,
                    overflow: 'hidden', background: 'var(--surface2)',
                    border: '1px solid var(--border)', flexShrink: 0,
                  }}>
                    <img src={`${IMAGE_BASE}${a.image_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                </td>
                <td style={{ maxWidth: 180 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                    {a.original_name || '—'}
                  </p>
                  {a.is_flagged && (
                    <span className="badge badge-amber" style={{ marginTop: 4, fontSize: 10 }}>
                      <ShieldAlert size={9} /> Flagged
                    </span>
                  )}
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: cfg.color }}>
                    <Icon size={14} /> {cfg.label}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 60, height: 3, borderRadius: 99,
                      background: 'var(--border2)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        background: a.confidence >= 80 ? 'var(--green)' : a.confidence >= 65 ? 'var(--amber)' : 'var(--red)',
                        width: `${a.confidence}%`,
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)' }}>
                      {Math.round(a.confidence)}%
                    </span>
                  </div>
                </td>
                <td><SeverityBadge severity={a.severity} /></td>
                <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{a.source}</td>
                <td style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => onView(a)}
                      style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', padding: '5px 8px' }}>
                      <Eye size={13} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => onDelete(a)}
                      style={{ padding: '5px 8px' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
