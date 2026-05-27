/**
 * ComparisonCard — shows before/after photos side-by-side
 * with bounding box overlay on the AFTER image.
 * Boxes are fixed after image onLoad by reading natural vs rendered dimensions.
 */
import { useState, useRef } from 'react';
import StatusBadge from './StatusBadge';
import { api } from '../lib/api';

export default function ComparisonCard({ item }) {
  const afterRef = useRef(null);
  const [imgRect, setImgRect] = useState(null); // {top, left, w, h} relative offset inside container

  function handleAfterLoad() {
    const el = afterRef.current;
    if (!el) return;
    const container = el.parentElement;
    const cr = container.getBoundingClientRect();
    const ir = el.getBoundingClientRect();
    setImgRect({
      top:  ir.top  - cr.top,
      left: ir.left - cr.left,
      w:    ir.width,
      h:    ir.height,
    });
  }

  const hasDamage  = item.status === 'new_damage';
  const boxes      = item.bounding_boxes || [];
  const preUrl     = api.imageUrl(item.pre_image_path);
  const postUrl    = api.imageUrl(item.post_image_path);

  return (
    <div className={`comparison-card ${hasDamage ? 'has-damage' : ''}`}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          {item.position_name || `Position ${item.position_id}`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {Math.round(item.confidence)}% conf.
          </span>
          <StatusBadge status={item.status} size="sm" />
        </div>
      </div>

      {/* Photos */}
      <div className="comparison-photos">
        {/* BEFORE */}
        <div style={{ position: 'relative', borderRight: '1px solid var(--border)' }}>
          <div className="comparison-photo">
            {preUrl
              ? <img src={preUrl} alt="Before" />
              : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:12 }}>No photo</div>
            }
            <div className="comparison-photo-label">BEFORE</div>
          </div>
        </div>

        {/* AFTER + bounding boxes */}
        <div style={{ position: 'relative' }}>
          <div className="comparison-photo" ref={el => { if (el) afterRef.current = el.querySelector('img'); }}>
            {postUrl
              ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img
                    ref={afterRef}
                    src={postUrl}
                    alt="After"
                    onLoad={handleAfterLoad}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                  {/* Bounding boxes — offset-adjusted for objectFit: contain letterboxing */}
                  {imgRect && boxes.map(([ymin, xmin, ymax, xmax], i) => (
                    <div
                      key={i}
                      className="bbox-overlay"
                      style={{
                        top:    `${imgRect.top  + (ymin / 100) * imgRect.h}px`,
                        left:   `${imgRect.left + (xmin / 100) * imgRect.w}px`,
                        height: `${((ymax - ymin) / 100) * imgRect.h}px`,
                        width:  `${((xmax - xmin) / 100) * imgRect.w}px`,
                      }}
                    />
                  ))}
                </div>
              )
              : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--text3)',fontSize:12 }}>No photo</div>
            }
            <div className="comparison-photo-label">AFTER</div>
          </div>
        </div>
      </div>

      {/* Damage types + explanation */}
      {(hasDamage || item.explanation) && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {hasDamage && item.damage_types?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {item.damage_types.map(t => (
                <span key={t} className="badge badge-red" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
          )}
          {item.explanation && (
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
              {item.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
