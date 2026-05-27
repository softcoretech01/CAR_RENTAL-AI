import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterX, ExternalLink, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pre_inspection_pending',  label: 'Pre-Inspect Pending' },
  { value: 'pre_inspection_done',     label: 'Pre-Inspect Done' },
  { value: 'rented_out',              label: 'Rented Out' },
  { value: 'post_inspection_pending', label: 'Post-Inspect Pending' },
  { value: 'comparing',               label: 'Comparing' },
  { value: 'completed',               label: 'Completed' },
];

const PAGE_SIZE = 20;

/* ── Inline action-menu for each row ───────────────────────────────── */
function RowMenu({ rental, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const canDelete = rental.status === 'pre_inspection_pending';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ padding: '5px 8px' }}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            minWidth: 160, zIndex: 100, overflow: 'hidden',
          }}
        >
          <button
            className="btn"
            style={{
              width: '100%', justifyContent: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 0, background: 'transparent',
              color: 'var(--text)', fontSize: 13, fontWeight: 500,
            }}
            onClick={() => { setOpen(false); onEdit(rental); }}
          >
            <Pencil size={13} color="var(--violet)" /> Edit rental
          </button>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 10px' }} />

          <button
            className="btn"
            style={{
              width: '100%', justifyContent: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 0, background: 'transparent',
              color: canDelete ? 'var(--red)' : 'var(--text3)',
              fontSize: 13, fontWeight: 500,
              cursor: canDelete ? 'pointer' : 'not-allowed',
            }}
            disabled={!canDelete}
            title={canDelete ? 'Delete rental' : 'Only pre-inspection pending rentals can be deleted'}
            onClick={() => { setOpen(false); if (canDelete) onDelete(rental); }}
          >
            <Trash2 size={13} /> Delete
            {!canDelete && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>locked</span>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────── */
function EditModal({ rental, onClose, onSaved }) {
  const [form, setForm] = useState({
    expected_return_date: rental.expected_return_date ?? '',
    notes:                rental.notes               ?? '',
    daily_rate:           rental.daily_rate           ?? '',
    pickup_location:      rental.pickup_location      ?? '',
    dropoff_location:     rental.dropoff_location     ?? '',
  });
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateRental(rental.id, {
        ...form,
        daily_rate: form.daily_rate !== '' ? Number(form.daily_rate) : null,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="card-header">
          <span className="card-title">Edit Rental #{rental.id}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Vehicle + customer info — read only context */}
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{rental.year} {rental.make} {rental.model}</span>
              <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 8 }}>{rental.plate_number}</span>
              <span style={{ color: 'var(--text2)', marginLeft: 16 }}>{rental.full_name}</span>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
                  Expected Return *
                </label>
                <input
                  className="field" type="date" style={{ width: '100%' }}
                  value={form.expected_return_date}
                  onChange={e => setForm(f => ({ ...f, expected_return_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
                  Daily Rate
                </label>
                <input
                  className="field" type="number" min="0" step="0.01" placeholder="0.00"
                  style={{ width: '100%' }}
                  value={form.daily_rate}
                  onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
                  Pickup Location
                </label>
                <input
                  className="field" placeholder="e.g. Branch A"
                  style={{ width: '100%' }}
                  value={form.pickup_location}
                  onChange={e => setForm(f => ({ ...f, pickup_location: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
                  Dropoff Location
                </label>
                <input
                  className="field" placeholder="e.g. Branch B"
                  style={{ width: '100%' }}
                  value={form.dropoff_location}
                  onChange={e => setForm(f => ({ ...f, dropoff_location: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
                Notes
              </label>
              <textarea
                className="field" rows={3} placeholder="Internal notes…"
                style={{ width: '100%', resize: 'vertical' }}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {error && (
              <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete confirm modal ────────────────────────────────────────────── */
function DeleteModal({ rental, onClose, onDeleted }) {
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteRental(rental.id);
      onDeleted(rental.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '36px 32px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--red-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Trash2 size={24} color="var(--red)" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Rental #{rental.id}?</h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 6 }}>
            <strong>{rental.year} {rental.make} {rental.model}</strong> rented to <strong>{rental.full_name}</strong>
          </p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 24 }}>
            This rental will be permanently removed and the vehicle marked available again.
          </p>

          {error && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" onClick={confirm} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete Rental'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function RentalHistory() {
  const navigate = useNavigate();

  const [rentals,      setRentals]      = useState([]);
  const [page,         setPage]         = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [editTarget,   setEditTarget]   = useState(null);  // rental being edited
  const [deleteTarget, setDeleteTarget] = useState(null);  // rental being deleted

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    api.listRentals(params)
      .then(data => setRentals(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function clearFilters() { setStatusFilter(''); setPage(0); }
  const hasFilters = !!statusFilter;

  function handleSaved(updated) {
    setRentals(rs => rs.map(r => r.id === updated.id ? updated : r));
    setEditTarget(null);
  }

  function handleDeleted(id) {
    setRentals(rs => rs.filter(r => r.id !== id));
    setDeleteTarget(null);
  }

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rental History</h1>
          <p className="page-sub">All rentals sorted by most recent</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/rentals/new')}>
          + New Rental
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="field" value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          style={{ minWidth: 200 }}
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <FilterX size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            <div className="spin" style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>{error}</div>
        ) : rentals.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
            No rentals {hasFilters ? 'matching filters' : 'yet'}.
            {!hasFilters && (
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 10 }} onClick={() => navigate('/rentals/new')}>
                Create first rental
              </button>
            )}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Start</th>
                <th>Return</th>
                <th>Status</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {rentals.map(r => (
                <tr
                  key={r.id}
                  className="tbl-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/rentals/${r.id}`)}
                >
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>#{r.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {r.year} {r.make} {r.model}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {r.plate_number}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.phone}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.start_date}</td>
                  <td style={{ fontSize: 13 }}>
                    {r.actual_return_date || r.expected_return_date}
                    {r.actual_return_date && r.actual_return_date !== r.expected_return_date && (
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                        Expected: {r.expected_return_date}
                      </div>
                    )}
                  </td>
                  <td><StatusBadge status={r.status} size="sm" /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); navigate(`/rentals/${r.id}`); }}
                        title="View detail"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <RowMenu
                        rental={r}
                        onEdit={setEditTarget}
                        onDelete={setDeleteTarget}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && !error && rentals.length === PAGE_SIZE && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              Page {page + 1}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          rental={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteModal
          rental={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
