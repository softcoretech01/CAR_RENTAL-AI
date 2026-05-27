import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera, CheckCircle, ChevronLeft, ChevronRight,
  SkipForward, ListChecks, Check,
} from 'lucide-react';
import { api } from '../lib/api';
import PhotoCapture from '../components/PhotoCapture';

/* ── Phase constants ─────────────────────────────────────────────── */
const PHASE_SETUP   = 'setup';
const PHASE_CAPTURE = 'capture';

export default function InspectionWizard() {
  const { id: rentalId, type } = useParams();
  const navigate = useNavigate();

  /* server data */
  const [allPositions,  setAllPositions]  = useState([]);
  const [inspection,    setInspection]    = useState(null);

  /* UI state */
  const [phase,         setPhase]         = useState(PHASE_SETUP);
  const [selected,      setSelected]      = useState(new Set()); // position ids chosen in setup
  const [activeList,    setActiveList]    = useState([]);        // ordered positions to capture
  const [posIdx,        setPosIdx]        = useState(0);
  const [photos,        setPhotos]        = useState({});        // { positionId: photoRow }

  const [loading,       setLoading]       = useState(true);
  const [completing,    setCompleting]    = useState(false);
  const [error,         setError]         = useState(null);

  /* ── Boot: load positions + get/create inspection ── */
  useEffect(() => {
    async function init() {
      try {
        const [pos, insp] = await Promise.all([
          api.listPositions(),
          api.createInspection(rentalId, type),
        ]);
        setAllPositions(pos);
        setSelected(new Set(pos.map(p => p.id)));   // default: all checked
        setInspection(insp);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [rentalId, type]);

  /* ── Setup helpers ─────────────────────────────────── */
  function togglePos(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAll()  { setSelected(new Set(allPositions.map(p => p.id))); }
  function clearAll()   { setSelected(new Set()); }

  function startCapture() {
    const list = allPositions.filter(p => selected.has(p.id));
    if (list.length === 0) return;
    setActiveList(list);
    setPosIdx(0);
    setPhase(PHASE_CAPTURE);
  }

  /* ── Capture helpers ───────────────────────────────── */
  const currentPos = activeList[posIdx];
  const doneCount  = Object.keys(photos).length;
  const isLast     = posIdx === activeList.length - 1;

  const handleCapture = useCallback(async (file) => {
    if (!inspection || !currentPos) return;
    try {
      const photo = await api.addInspectionPhoto(inspection.id, currentPos.id, file);
      setPhotos(prev => ({ ...prev, [currentPos.id]: photo }));
    } catch (e) {
      setError(e.message);
    }
  }, [inspection, currentPos]);

  function jumpTo(idx) { setPosIdx(idx); }

  async function complete() {
    if (!inspection) return;
    setCompleting(true);
    try {
      await api.completeInspection(inspection.id);
      navigate(`/rentals/${rentalId}`);
    } catch (e) {
      setError(e.message);
      setCompleting(false);
    }
  }

  /* ── Loading / error screens ───────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%' }} />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
      <button className="btn btn-ghost" onClick={() => navigate(`/rentals/${rentalId}`)}>Back to Rental</button>
    </div>
  );

  const label = type === 'pre' ? 'Pre-Inspection' : 'Post-Inspection';

  /* ══════════════════════════════════════════════════════
     PHASE 1 — SETUP: choose positions
  ══════════════════════════════════════════════════════ */
  if (phase === PHASE_SETUP) {
    return (
      <div className="fade-up" style={{ maxWidth: 680 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}
            onClick={() => navigate(`/rentals/${rentalId}`)}>
            <ChevronLeft size={14} /> Back to Rental
          </button>
          <h1 className="page-title">{label}</h1>
          <p className="page-sub">Rental #{rentalId} — choose which positions to photograph</p>
        </div>

        <div className="card">
          {/* Toolbar */}
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListChecks size={15} color="var(--text3)" />
              <span className="card-title">Positions to inspect</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--violet)' }}>
                {selected.size} / {allPositions.length} selected
              </span>
              <button className="btn btn-ghost btn-sm" onClick={selectAll}>All</button>
              <button className="btn btn-ghost btn-sm" onClick={clearAll}>None</button>
            </div>
          </div>

          {/* Position checklist */}
          <div className="card-body">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
            }}>
              {allPositions.map(pos => {
                const on = selected.has(pos.id);
                return (
                  <button
                    key={pos.id}
                    onClick={() => togglePos(pos.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 'var(--radius)',
                      border: on ? '1.5px solid var(--violet)' : '1.5px solid var(--border)',
                      background: on ? 'var(--violet-bg)' : 'var(--surface2)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                      fontSize: 13, fontWeight: on ? 600 : 400,
                      color: on ? 'var(--violet)' : 'var(--text2)',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      background: on ? 'var(--violet)' : 'transparent',
                      border: on ? '2px solid var(--violet)' : '2px solid var(--border2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    {pos.name}
                  </button>
                );
              })}
            </div>

            {selected.size === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginTop: 16 }}>
                Select at least one position to continue.
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 22px', borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>
              You can skip individual positions during capture too.
            </p>
            <button
              className="btn btn-primary"
              disabled={selected.size === 0}
              onClick={startCapture}
            >
              Start {label} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     PHASE 2 — CAPTURE: two-panel layout
  ══════════════════════════════════════════════════════ */
  const progress = Math.round((doneCount / activeList.length) * 100);

  return (
    <div className="fade-up">
      {/* Compact header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{label}</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Rental #{rentalId}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text2)',
              background: 'var(--surface2)', padding: '4px 12px', borderRadius: 99,
              border: '1px solid var(--border)',
            }}>
              {doneCount} / {activeList.length} done
            </span>
            <button
              className="btn btn-primary"
              onClick={complete}
              disabled={completing || doneCount === 0}
              style={{ fontSize: 13 }}
            >
              {completing ? 'Completing…' : 'Finish Inspection'} <CheckCircle size={14} />
            </button>
          </div>
        </div>

        {/* Slim progress bar */}
        <div style={{ marginTop: 14 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Position {posIdx + 1} of {activeList.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--violet)', fontWeight: 600 }}>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: position list ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 20 }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Positions
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {activeList.map((pos, i) => {
              const isDone    = !!photos[pos.id];
              const isCurrent = i === posIdx;
              return (
                <button
                  key={pos.id}
                  onClick={() => jumpTo(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 14px', textAlign: 'left',
                    background: isCurrent ? 'var(--violet-bg)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                    border: 'none', borderLeft: isCurrent ? '3px solid var(--violet)' : '3px solid transparent',
                    cursor: 'pointer', transition: 'background .12s',
                    fontSize: 13, color: isCurrent ? 'var(--violet)' : isDone ? 'var(--text2)' : 'var(--text3)',
                    fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: isDone ? 'var(--green)' : isCurrent ? 'var(--violet)' : 'var(--surface3)',
                    border: isDone ? '2px solid var(--green)' : isCurrent ? '2px solid var(--violet)' : '2px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone
                      ? <Check size={10} color="#fff" strokeWidth={3} />
                      : isCurrent
                        ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                        : <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 700 }}>{i+1}</span>
                    }
                  </div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pos.name}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Re-configure link */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              onClick={() => setPhase(PHASE_SETUP)}
            >
              ← Edit positions
            </button>
          </div>
        </div>

        {/* ── RIGHT: capture card ── */}
        {currentPos && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Position header */}
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>
                  {currentPos.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {photos[currentPos.id] ? '✓ Photo saved — tap to retake' : 'Upload or take a photo of this position'}
                </div>
              </div>
              {photos[currentPos.id] && <CheckCircle size={20} color="var(--green)" />}
            </div>

            {/* Photo area — compact, not huge */}
            <div style={{ padding: '20px 24px' }}>
              <PhotoCapture
                key={currentPos.id}
                positionName={currentPos.name}
                onCapture={handleCapture}
                existingUrl={photos[currentPos.id] ? api.imageUrl(photos[currentPos.id].image_path) : null}
              />
            </div>

            {/* Navigation footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              background: 'var(--surface2)',
            }}>
              <button
                className="btn btn-ghost"
                disabled={posIdx === 0}
                onClick={() => setPosIdx(i => i - 1)}
              >
                <ChevronLeft size={15} /> Back
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {!isLast && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPosIdx(i => i + 1)}
                    title="Skip this position"
                  >
                    <SkipForward size={14} /> Skip
                  </button>
                )}
                {isLast ? (
                  <button
                    className="btn btn-primary"
                    onClick={complete}
                    disabled={completing || doneCount === 0}
                  >
                    {completing ? 'Completing…' : 'Finish'} <CheckCircle size={15} />
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => setPosIdx(i => i + 1)}
                  >
                    Next <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip — captured photos */}
      {doneCount > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '.06em',
          }}>
            Captured — {doneCount} photo{doneCount !== 1 ? 's' : ''}
          </div>
          <div className="photo-grid">
            {activeList.map(pos => {
              const photo = photos[pos.id];
              if (!photo) return null;
              return (
                <div
                  key={pos.id}
                  style={{ textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => jumpTo(activeList.indexOf(pos))}
                  title={`Jump to ${pos.name}`}
                >
                  <div className="photo-slot">
                    <img src={api.imageUrl(photo.image_path)} alt={pos.name} />
                    <div className="comparison-photo-label" style={{ fontSize: 9 }}>{pos.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
