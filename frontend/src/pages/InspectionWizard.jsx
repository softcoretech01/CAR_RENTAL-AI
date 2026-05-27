import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { api } from '../lib/api';
import PhotoCapture from '../components/PhotoCapture';

export default function InspectionWizard() {
  const { id: rentalId, type } = useParams();
  const navigate = useNavigate();

  const [positions,   setPositions]   = useState([]);
  const [inspection,  setInspection]  = useState(null);
  const [photos,      setPhotos]      = useState({});   // { positionId: photoRow }
  const [posIdx,      setPosIdx]      = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [completing,  setCompleting]  = useState(false);
  const [error,       setError]       = useState(null);

  // Load positions and create/find inspection
  useEffect(() => {
    async function init() {
      try {
        const [pos] = await Promise.all([api.listPositions()]);
        setPositions(pos);

        // Create a new inspection
        const insp = await api.createInspection(rentalId, type);
        setInspection(insp);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [rentalId, type]);

  const currentPos = positions[posIdx];
  const doneCount  = Object.keys(photos).length;

  const handleCapture = useCallback(async (file) => {
    if (!inspection || !currentPos) return;
    try {
      const photo = await api.addInspectionPhoto(inspection.id, currentPos.id, file);
      setPhotos(prev => ({ ...prev, [currentPos.id]: photo }));
    } catch (e) {
      setError(e.message);
    }
  }, [inspection, currentPos]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: 'var(--red)', marginBottom: 16 }}>{error}</p>
        <button className="btn btn-ghost" onClick={() => navigate(`/rentals/${rentalId}`)}>Back to Rental</button>
      </div>
    );
  }

  const isLast = posIdx === positions.length - 1;

  return (
    <div className="fade-up" style={{ maxWidth: 520 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">
          {type === 'pre' ? 'Pre-Inspection' : 'Post-Inspection'}
        </h1>
        <p className="page-sub">
          Rental #{rentalId} — photograph each position of the vehicle
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
            Position {posIdx + 1} of {positions.length}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {doneCount} photographed
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${((posIdx) / positions.length) * 100}%` }} />
        </div>
      </div>

      {/* Current position */}
      {currentPos && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                {currentPos.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {photos[currentPos.id]
                  ? '✓ Photo captured'
                  : 'Take or upload a photo of this position'}
              </div>
            </div>
            {photos[currentPos.id] && (
              <CheckCircle size={20} color="var(--green)" />
            )}
          </div>
          <div className="card-body">
            <PhotoCapture
              key={currentPos.id}
              positionName={currentPos.name}
              onCapture={handleCapture}
              existingUrl={photos[currentPos.id] ? api.imageUrl(photos[currentPos.id].image_path) : null}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          className="btn btn-ghost"
          disabled={posIdx === 0}
          onClick={() => setPosIdx(i => i - 1)}
        >
          <ChevronLeft size={15} /> Back
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          {/* Skip */}
          {!photos[currentPos?.id] && !isLast && (
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
              {completing ? 'Completing…' : 'Complete Inspection'} <CheckCircle size={15} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!photos[currentPos?.id]}
              onClick={() => setPosIdx(i => i + 1)}
            >
              Next <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {doneCount > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Captured Photos
          </div>
          <div className="photo-grid">
            {positions.map(pos => {
              const photo = photos[pos.id];
              if (!photo) return null;
              return (
                <div key={pos.id} style={{ textAlign: 'center' }}>
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
