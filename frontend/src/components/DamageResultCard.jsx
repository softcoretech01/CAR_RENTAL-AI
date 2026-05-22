import { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle,
  ThumbsUp, ThumbsDown, Clock, ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api';
import { SeverityBadge } from './SeverityBadge';
import { ConfidenceBar } from './ConfidenceBar';

const IMAGE_BASE = '/api/v1/damage/images/';

const STATUS_CFG = {
  damaged:     { icon: XCircle,      label: 'Damage Detected', bannerCls: 'damaged',   color: 'var(--red)'   },
  not_damaged: { icon: CheckCircle2, label: 'Undamaged — Clear', bannerCls: 'ok',       color: 'var(--green)' },
  uncertain:   { icon: AlertTriangle,label: 'Uncertain Result', bannerCls: 'uncertain', color: 'var(--amber)' },
};

export function DamageResultCard({ result, onReset }) {
  const [feedback, setFeedback] = useState(result.user_feedback || null);
  const [busy, setBusy]         = useState(false);
  const cfg = STATUS_CFG[result.status] ?? STATUS_CFG.uncertain;
  const Icon = cfg.icon;

  async function submitFeedback(value) {
    if (busy || feedback) return;
    setBusy(true);
    try {
      await api.patch(`/damage/analyses/${result.id}/feedback`, { feedback: value });
      setFeedback(value);
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Status banner */}
      <div className={`result-banner ${cfg.bannerCls}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(0,0,0,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={20} style={{ color: cfg.color }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: cfg.color }}>{cfg.label}</p>
            {result.original_name && (
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{result.original_name}</p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SeverityBadge severity={result.severity} />
          {result.is_flagged && (
            <span className="badge badge-amber">
              <ShieldAlert size={10} /> Flagged
            </span>
          )}
        </div>
      </div>

      {/* Image + metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Image with bounding boxes */}
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 200, position: 'relative',
        }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={`${IMAGE_BASE}${result.image_path}`} alt="Analysed"
              style={{ maxHeight: 300, maxWidth: '100%', display: 'block', objectFit: 'contain' }} />
            {result.status === 'damaged' && result.bounding_boxes?.map((box, i) => {
              const [ymin, xmin, ymax, xmax] = box;
              return (
                <div key={i} style={{
                  position: 'absolute', border: '2px solid var(--red)',
                  background: 'rgba(255,84,84,.12)',
                  top: `${ymin}%`, left: `${xmin}%`,
                  height: `${ymax - ymin}%`, width: `${xmax - xmin}%`,
                  borderRadius: 2,
                }}>
                  <span style={{
                    position: 'absolute', top: -18, left: 0,
                    background: 'var(--red)', color: '#fff',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>
                    #{i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <ConfidenceBar confidence={result.confidence} />

            {result.damage_types?.length > 0 && (
              <div>
                <p className="section-label" style={{ marginBottom: 8 }}>Identified Types</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.damage_types.map(t => (
                    <span key={t} className="badge badge-red" style={{ textTransform: 'capitalize' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.region_description && result.region_description !== 'No damage detected' && (
            <div>
              <p className="section-label" style={{ marginBottom: 6 }}>Spatial Location</p>
              <p style={{
                fontSize: 13, color: 'var(--text2)', lineHeight: 1.65,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px',
              }}>
                {result.region_description}
              </p>
            </div>
          )}

          {result.explanation && (
            <div>
              <p className="section-label" style={{ marginBottom: 6 }}>AI Assessment</p>
              <p style={{
                fontSize: 13, color: 'var(--text2)', lineHeight: 1.65,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px',
              }}>
                {result.explanation}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
            <Clock size={11} />
            {new Date(result.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {result.is_flagged && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'var(--amber-bg)', border: '1px solid rgba(255,170,0,.2)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <ShieldAlert size={15} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>Low Confidence Warning</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>
              Score fell below the 65% verification threshold. Human review is recommended.
            </p>
          </div>
        </div>
      )}

      {/* Feedback */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        paddingTop: 14, borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Was this prediction correct?</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${feedback === 'correct' ? 'btn-success' : 'btn-ghost'}`}
            onClick={() => submitFeedback('correct')}
            disabled={!!feedback || busy}
          >
            <ThumbsUp size={12} /> Correct
          </button>
          <button
            className={`btn btn-sm ${feedback === 'incorrect' ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => submitFeedback('incorrect')}
            disabled={!!feedback || busy}
          >
            <ThumbsDown size={12} /> Incorrect
          </button>
        </div>
        {onReset && (
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={onReset}>
            Scan Another
          </button>
        )}
      </div>
    </div>
  );
}
