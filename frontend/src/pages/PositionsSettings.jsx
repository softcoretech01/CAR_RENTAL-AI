/**
 * PositionsSettings — manage inspection positions.
 * Full CRUD: add, rename inline, reorder with ↑↓, delete.
 * Page fills viewport; position list scrolls inside the card.
 */
import { useEffect, useState, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Check, X,
  ChevronUp, ChevronDown, GripVertical, MapPin,
} from 'lucide-react';
import { api } from '../lib/api';

/* topbar 56px + page padding 32px×2 = 120px */
const PAGE_OVERHEAD = 120;

/* ── tiny icon button with fixed dimensions ─────────────── */
function IconBtn({ onClick, disabled, title, danger, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, padding: 0, borderRadius: 6, flexShrink: 0,
        border: `1px solid ${danger ? 'rgba(220,38,38,.25)' : 'var(--border)'}`,
        background: active
          ? 'var(--violet-bg)'
          : danger ? 'var(--red-bg)' : 'var(--surface)',
        color: danger ? 'var(--red)' : active ? 'var(--violet)' : 'var(--text2)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .35 : 1,
        transition: 'opacity .15s',
      }}
    >
      {children}
    </button>
  );
}

export default function PositionsSettings() {
  const [positions, setPositions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const [newName, setNewName] = useState('');
  const [adding,  setAdding]  = useState(false);
  const addRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState('');
  const [editOrder, setEditOrder] = useState(0);
  const [savingId,  setSavingId]  = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  function load() {
    setLoading(true);
    api.listPositions()
      .then(setPositions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  /* ── Add ── */
  async function addPosition(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const maxOrder = positions.length > 0
        ? Math.max(...positions.map(p => p.sort_order)) + 1
        : 1;
      const p = await api.createPosition({ name: newName.trim(), sort_order: maxOrder });
      setPositions(prev => [...prev, p]);
      setNewName('');
      addRef.current?.focus();
    } catch (e) { setError(e.message); }
    finally     { setAdding(false); }
  }

  /* ── Edit ── */
  function startEdit(pos) { setEditingId(pos.id); setEditName(pos.name); setEditOrder(pos.sort_order); }
  function cancelEdit()   { setEditingId(null); }

  async function saveEdit(pos) {
    if (!editName.trim()) return;
    setSavingId(pos.id);
    try {
      const updated = await api.updatePosition(pos.id, { name: editName.trim(), sort_order: editOrder });
      setPositions(prev => prev.map(p => p.id === pos.id ? updated : p));
      setEditingId(null);
    } catch (e) { setError(e.message); }
    finally     { setSavingId(null); }
  }

  /* ── Reorder ── */
  async function moveUp(idx) {
    if (idx === 0) return;
    const list = [...positions];
    const [above, cur] = [list[idx - 1], list[idx]];
    try {
      const [a, c] = await Promise.all([
        api.updatePosition(above.id, { name: above.name, sort_order: cur.sort_order }),
        api.updatePosition(cur.id,   { name: cur.name,   sort_order: above.sort_order }),
      ]);
      list[idx - 1] = a; list[idx] = c;
      setPositions(list);
    } catch (e) { setError(e.message); }
  }

  async function moveDown(idx) {
    if (idx === positions.length - 1) return;
    const list = [...positions];
    const [cur, below] = [list[idx], list[idx + 1]];
    try {
      const [c, b] = await Promise.all([
        api.updatePosition(cur.id,   { name: cur.name,   sort_order: below.sort_order }),
        api.updatePosition(below.id, { name: below.name, sort_order: cur.sort_order }),
      ]);
      list[idx] = c; list[idx + 1] = b;
      setPositions(list);
    } catch (e) { setError(e.message); }
  }

  /* ── Delete ── */
  async function confirmDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await api.deletePosition(deletingId);
      setPositions(prev => prev.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } catch (e) { setError(e.message); }
    finally     { setDeleting(false); }
  }

  const deletingPos = deletingId ? positions.find(p => p.id === deletingId) : null;

  /* ─────────────────────────────────────────────────────── */
  return (
    <div
      className="fade-up"
      style={{
        maxWidth: 720,
        height: `calc(100vh - ${PAGE_OVERHEAD}px)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 18, flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Inspection Positions</h1>
          <p className="page-sub">
            Define every position photographed during pre- and post-inspections.
            Add as many as needed — no limit.
          </p>
        </div>
        <div style={{
          background: 'var(--violet-bg)', border: '1px solid rgba(79,70,229,.2)',
          borderRadius: 99, padding: '4px 14px', whiteSpace: 'nowrap',
          fontSize: 13, fontWeight: 700, color: 'var(--violet)',
        }}>
          {positions.length} position{positions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          flexShrink: 0,
          background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)',
          borderRadius: 8, padding: '9px 16px', marginBottom: 12,
          color: 'var(--red)', fontSize: 13,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {error}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 0 }}
            onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* ── Add new position (pinned) ── */}
      <div className="card" style={{ flexShrink: 0, marginBottom: 14 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} color="var(--violet)" />
            <span className="card-title">Add New Position</span>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={addPosition} style={{ display: 'flex', gap: 10 }}>
            <input
              ref={addRef}
              className="field"
              style={{ flex: 1 }}
              placeholder="e.g. Sunroof, Under-chassis, Left Mirror…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={adding}
            />
            <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()}>
              {adding ? 'Adding…' : <><Plus size={14} /> Add</>}
            </button>
          </form>
        </div>
      </div>

      {/* ── All Positions card — fills remaining height ── */}
      <div
        className="card"
        style={{
          flex: 1, minHeight: 0,
          padding: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Card header */}
        <div
          className="card-header"
          style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={15} color="var(--text3)" />
            <span className="card-title">All Positions</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            ✏ to rename · ↑↓ to reorder
          </span>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              <div className="spin" style={{
                width: 22, height: 22, borderRadius: '50%', display: 'inline-block',
                border: '3px solid var(--border)', borderTopColor: 'var(--violet)',
              }} />
            </div>
          ) : positions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
              No positions yet — add one above.
            </div>
          ) : (
            positions.map((pos, idx) => {
              const isEditing = editingId === pos.id;
              const isSaving  = savingId  === pos.id;

              return (
                <div
                  key={pos.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 16px',
                    borderBottom: idx < positions.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isEditing ? 'var(--violet-bg)' : 'transparent',
                    transition: 'background .15s',
                  }}
                >
                  {/* Grip + index */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    flexShrink: 0, color: 'var(--text3)', width: 44,
                  }}>
                    <GripVertical size={13} style={{ opacity: .5 }} />
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--mono)',
                      color: 'var(--text3)', lineHeight: 1,
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Name — editable */}
                  {isEditing ? (
                    <input
                      className="field"
                      style={{ flex: 1, fontSize: 13, padding: '4px 10px', height: 32 }}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(pos);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', truncate: true }}>
                        {pos.name}
                      </span>
                      {pos.is_default && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                          color: 'var(--violet)', background: 'var(--violet-bg)',
                          padding: '1px 7px', borderRadius: 99,
                        }}>
                          default
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                          onClick={() => saveEdit(pos)}
                          disabled={isSaving || !editName.trim()}
                        >
                          {isSaving ? '…' : <><Check size={12} /> Save</>}
                        </button>
                        <IconBtn onClick={cancelEdit} title="Cancel">
                          <X size={12} />
                        </IconBtn>
                      </>
                    ) : (
                      <>
                        {/* Reorder group */}
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
                        }}>
                          <button
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            title="Move up"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, padding: 0, border: 'none',
                              borderRight: '1px solid var(--border)',
                              background: 'var(--surface)', color: 'var(--text2)',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              opacity: idx === 0 ? .3 : 1,
                              transition: 'opacity .15s',
                            }}
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => moveDown(idx)}
                            disabled={idx === positions.length - 1}
                            title="Move down"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, padding: 0, border: 'none',
                              background: 'var(--surface)', color: 'var(--text2)',
                              cursor: idx === positions.length - 1 ? 'not-allowed' : 'pointer',
                              opacity: idx === positions.length - 1 ? .3 : 1,
                              transition: 'opacity .15s',
                            }}
                          >
                            <ChevronDown size={13} />
                          </button>
                        </div>

                        {/* Edit */}
                        <IconBtn onClick={() => startEdit(pos)} title="Rename">
                          <Pencil size={12} />
                        </IconBtn>

                        {/* Delete */}
                        <IconBtn onClick={() => setDeletingId(pos.id)} title="Delete" danger>
                          <Trash2 size={12} />
                        </IconBtn>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint — pinned at bottom of card */}
        {!loading && positions.length > 0 && (
          <div style={{
            flexShrink: 0,
            padding: '9px 16px', borderTop: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text3)', background: 'var(--surface2)',
          }}>
            Changes take effect on the next inspection. Existing photos are not affected.
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {deletingId && deletingPos && (
        <div className="overlay" onClick={() => setDeletingId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '36px 32px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--red-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Trash2 size={24} color="var(--red)" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Delete "{deletingPos.name}"?
              </h3>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>
                This position will be removed from the list.
                Existing inspection photos for this position are not deleted.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setDeletingId(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete Position'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
