import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera, Car, User, Calendar, ArrowRight,
  FileText, Loader, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

export default function RentalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rental,       setRental]       = useState(null);
  const [prePhotos,    setPrePhotos]    = useState([]);
  const [postPhotos,   setPostPhotos]   = useState([]);
  const [comparison,   setComparison]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [comparing,    setComparing]    = useState(false);
  const [error,        setError]        = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.getRental(id);
      setRental(r);

      const preStatuses  = ['pre_inspection_done', 'rented_out', 'post_inspection_pending', 'comparing', 'completed'];
      const postStatuses = ['post_inspection_pending', 'comparing', 'completed'];

      // Fetch pre-inspection photos directly once it's completed
      if (preStatuses.includes(r.status)) {
        try {
          const insp = await api.getInspectionByRental(id, 'pre');
          if (insp?.id) {
            const photos = await api.getInspectionPhotos(insp.id);
            setPrePhotos(photos.map(p => ({ image_path: p.image_path, position_name: p.position_name })));
          }
        } catch {}
      }

      // Fetch post-inspection photos directly once it's completed
      if (postStatuses.includes(r.status)) {
        try {
          const insp = await api.getInspectionByRental(id, 'post');
          if (insp?.id) {
            const photos = await api.getInspectionPhotos(insp.id);
            setPostPhotos(photos.map(p => ({ image_path: p.image_path, position_name: p.position_name })));
          }
        } catch {}
      }

      // Fetch comparison result (completed rentals only)
      if (['comparing', 'completed'].includes(r.status)) {
        try {
          const c = await api.getComparison(id);
          setComparison(c);
        } catch {}
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function startComparison() {
    setComparing(true);
    setError(null);
    try {
      await api.runComparison(id);
      await load();
      navigate(`/rentals/${id}/comparison`);
    } catch (e) {
      setError(e.message);
      setComparing(false);
    }
  }

  async function updateStatus(newStatus, extra = {}) {
    try {
      const r = await api.updateRentalStatus(id, { status: newStatus, ...extra });
      setRental(r);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <Spinner />;

  if (!rental) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ color: 'var(--text2)' }}>Rental not found.</p>
      <button className="btn btn-ghost" onClick={() => navigate('/rentals')}>Back to rentals</button>
    </div>
  );

  const canStartPreInspect  = rental.status === 'pre_inspection_pending';
  const canMarkRentedOut    = rental.status === 'pre_inspection_done';
  const canStartPostInspect = rental.status === 'rented_out';
  const canCompare          = rental.status === 'post_inspection_pending';
  const isCompleted         = rental.status === 'completed';

  return (
    <div className="fade-up">
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/rentals')}>
        <ChevronLeft size={14} /> All Rentals
      </button>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">
            Rental #{rental.id} — {rental.year} {rental.make} {rental.model}
          </h1>
          <p className="page-sub" style={{ marginTop: 6 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{rental.plate_number}</span>
          </p>
        </div>
        <StatusBadge status={rental.status} />
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Info grid */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Vehicle */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={15} color="var(--text3)" />
              <span className="card-title">Vehicle</span>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow label="Make / Model"  value={`${rental.year} ${rental.make} ${rental.model}`} />
            <InfoRow label="Color"         value={rental.color} />
            <InfoRow label="Category"      value={rental.category} mono={false} />
            <InfoRow label="Plate"         value={rental.plate_number} mono />
          </div>
        </div>

        {/* Customer */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={15} color="var(--text3)" />
              <span className="card-title">Customer</span>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow label="Name"    value={rental.full_name} />
            <InfoRow label="Phone"   value={rental.phone} />
            <InfoRow label="Email"   value={rental.email || '—'} />
            <InfoRow label="ID/Lic." value={rental.id_number} mono />
          </div>
        </div>
      </div>

      {/* Dates card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} color="var(--text3)" />
            <span className="card-title">Rental Period</span>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <InfoRow label="Start"           value={rental.start_date} />
            <InfoRow label="Expected Return" value={rental.expected_return_date} />
            {rental.actual_return_date && <InfoRow label="Actual Return" value={rental.actual_return_date} />}
            {rental.notes && <InfoRow label="Notes" value={rental.notes} />}
          </div>
        </div>
      </div>

      {/* Action zone */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Next Step</span>
        </div>
        <div className="card-body">
          {canStartPreInspect && (
            <ActionRow
              title="Start Pre-Inspection"
              sub="Photograph the vehicle before handing it to the customer"
              onClick={() => navigate(`/rentals/${id}/inspect/pre`)}
              label="Start Pre-Inspection"
              color="primary"
              icon={<Camera size={15} />}
            />
          )}
          {canMarkRentedOut && (
            <ActionRow
              title="Mark as Rented Out"
              sub="Pre-inspection is complete. Hand the keys to the customer."
              onClick={() => updateStatus('rented_out')}
              label="Mark Rented Out"
              color="success"
              icon={<ArrowRight size={15} />}
            />
          )}
          {canStartPostInspect && (
            <ActionRow
              title="Start Post-Inspection"
              sub="Car has been returned. Photograph each position and compare with the pre-inspection."
              onClick={() => navigate(`/rentals/${id}/inspect/post`)}
              label="Start Post-Inspection"
              color="primary"
              icon={<Camera size={15} />}
            />
          )}
          {canCompare && (
            <ActionRow
              title="Run AI Comparison"
              sub="Post-inspection complete. Run AI to compare before/after photos for each position."
              onClick={startComparison}
              label={comparing ? 'Comparing…' : 'Run Comparison'}
              color="primary"
              icon={comparing ? <Loader size={15} className="spin" /> : <ArrowRight size={15} />}
              disabled={comparing}
            />
          )}
          {isCompleted && (
            <ActionRow
              title="View Comparison Result"
              sub="All done. View the damage report and download the PDF."
              onClick={() => navigate(`/rentals/${id}/comparison`)}
              label="View Report"
              color="primary"
              icon={<FileText size={15} />}
            />
          )}
          {!canStartPreInspect && !canMarkRentedOut && !canStartPostInspect && !canCompare && !isCompleted && (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Status: <strong>{rental.status}</strong></p>
          )}
        </div>
      </div>

      {/* Photo previews */}
      {(prePhotos.length > 0 || postPhotos.length > 0) && (
        <div className="grid-2">
          {prePhotos.length > 0 && (
            <PhotoSection title="Pre-Inspection Photos" photos={prePhotos} />
          )}
          {postPhotos.length > 0 && (
            <PhotoSection title="Post-Inspection Photos" photos={postPhotos} />
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
      <span style={{ color: 'var(--text3)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right', fontFamily: mono ? 'var(--mono)' : undefined }}>
        {value || '—'}
      </span>
    </div>
  );
}

function ActionRow({ title, sub, onClick, label, color, icon, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
      </div>
      <button
        className={`btn btn-${color}`}
        onClick={onClick}
        disabled={disabled}
        style={{ flexShrink: 0 }}
      >
        {icon} {label}
      </button>
    </div>
  );
}

function PhotoSection({ title, photos }) {
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="card-body">
        <div className="photo-grid">
          {photos.map((p, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div className="photo-slot">
                <img src={api.imageUrl(p.image_path)} alt={p.position_name} />
                {p.position_name && (
                  <div className="comparison-photo-label" style={{ fontSize: 9 }}>{p.position_name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%' }} />
    </div>
  );
}
