import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import VehicleCard from '../components/VehicleCard';

const CATEGORIES = ['sedan', 'suv', 'hatchback', 'van', 'other'];
const FILTERS    = ['all', 'available', 'rented_out'];

const EMPTY_FORM = { make: '', model: '', year: new Date().getFullYear(), color: '', plate_number: '', category: 'sedan' };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [modal,    setModal]    = useState(null);  // null | 'create' | 'edit' | 'delete'
  const [editing,  setEditing]  = useState(null);  // vehicle being edited
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState(null);

  function load() {
    api.listVehicles()
      .then(setVehicles)
      .catch(e => setError(e.message));
  }
  useEffect(load, []);

  const displayed = filter === 'all' ? vehicles : vehicles.filter(v => v.status === filter);

  function openCreate() { setForm(EMPTY_FORM); setEditing(null); setModal('create'); }
  function openEdit(v)  { setForm({ make: v.make, model: v.model, year: v.year, color: v.color, plate_number: v.plate_number, category: v.category }); setEditing(v); setModal('edit'); }
  function openDelete(v){ setEditing(v); setModal('delete'); }
  function closeModal() { setModal(null); setEditing(null); setBusy(false); }

  async function submitForm(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal === 'create') {
        const v = await api.createVehicle({ ...form, year: Number(form.year) });
        setVehicles(vs => [v, ...vs]);
      } else {
        const v = await api.updateVehicle(editing.id, { ...form, year: Number(form.year) });
        setVehicles(vs => vs.map(x => x.id === v.id ? v : x));
      }
      closeModal();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.deleteVehicle(editing.id);
      setVehicles(vs => vs.filter(v => v.id !== editing.id));
      closeModal();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicles</h1>
          <p className="page-sub">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} in fleet</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Add Vehicle
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: 'var(--red)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }} onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'Rented Out'}
          </button>
        ))}
      </div>

      {/* Vehicle grid */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          {filter !== 'all' ? 'No vehicles with this status.' : 'No vehicles yet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {displayed.map(v => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="card-header">
              <span className="card-title">{modal === 'create' ? 'Add Vehicle' : 'Edit Vehicle'}</span>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}><X size={14} /></button>
            </div>
            <form onSubmit={submitForm}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Make *</label>
                    <input className="field" style={{ width: '100%' }} value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} required placeholder="Toyota" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Model *</label>
                    <input className="field" style={{ width: '100%' }} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} required placeholder="Camry" />
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Year *</label>
                    <input className="field" style={{ width: '100%' }} type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required min="1990" max="2030" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Color *</label>
                    <input className="field" style={{ width: '100%' }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} required placeholder="Silver" />
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Plate Number *</label>
                    <input className="field" style={{ width: '100%', fontFamily: 'var(--mono)' }} value={form.plate_number} onChange={e => setForm(f => ({ ...f, plate_number: e.target.value.toUpperCase() }))} required placeholder="ABC-1234" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Category *</label>
                    <select className="field" style={{ width: '100%' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : modal === 'create' ? 'Add Vehicle' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {modal === 'delete' && editing && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '36px 32px' }}>
              <Trash2 size={32} color="var(--red)" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Vehicle?</h3>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>
                {editing.year} {editing.make} {editing.model} ({editing.plate_number}) will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
