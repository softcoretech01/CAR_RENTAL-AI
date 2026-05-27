import { Car, Pencil, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function VehicleCard({ vehicle, onClick, actionLabel, onAction, onEdit, onDelete }) {
  return (
    <div
      className={`vehicle-card ${vehicle.status}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {/* Top row: icon + status badge — no buttons here */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: 'var(--surface2)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--text3)',
        }}>
          <Car size={20} />
        </div>
        <StatusBadge status={vehicle.status} size="sm" />
      </div>

      {/* Plate */}
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700,
        color: 'var(--text)', letterSpacing: '.05em', marginBottom: 4,
      }}>
        {vehicle.plate_number}
      </div>

      {/* Name */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
        {vehicle.year} {vehicle.make} {vehicle.model}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
        {vehicle.color} · {vehicle.category}
      </div>

      {/* Primary action (e.g. "Select") */}
      {actionLabel && onAction && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
          onClick={e => { e.stopPropagation(); onAction(vehicle); }}
        >
          {actionLabel}
        </button>
      )}

      {/* Edit / Delete — inside the card, below all content, never overlapping */}
      {(onEdit || onDelete) && (
        <div style={{
          display: 'flex', gap: 6, marginTop: 14,
          paddingTop: 12, borderTop: '1px solid var(--border)',
        }}>
          {onEdit && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: 'center', gap: 5 }}
              onClick={e => { e.stopPropagation(); onEdit(vehicle); }}
              title="Edit vehicle"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              className="btn btn-danger btn-sm"
              style={{ flex: 1, justifyContent: 'center', gap: 5 }}
              onClick={e => { e.stopPropagation(); onDelete(vehicle); }}
              disabled={vehicle.status === 'rented_out'}
              title={vehicle.status === 'rented_out' ? 'Cannot delete a rented vehicle' : 'Delete vehicle'}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
