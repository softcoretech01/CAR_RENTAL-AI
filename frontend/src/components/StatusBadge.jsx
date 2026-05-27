/**
 * StatusBadge — maps rental/vehicle/comparison status strings to styled badges.
 */
export default function StatusBadge({ status, size = 'md' }) {
  const map = {
    // Vehicle
    available:                { cls: 'badge-green',  label: 'Available' },
    rented_out:               { cls: 'badge-amber',  label: 'Rented Out' },
    // Rental lifecycle
    pre_inspection_pending:   { cls: 'badge-amber',  label: 'Pre-Inspect Pending' },
    pre_inspection_done:      { cls: 'badge-violet', label: 'Pre-Inspect Done' },
    post_inspection_pending:  { cls: 'badge-amber',  label: 'Post-Inspect Pending' },
    comparing:                { cls: 'badge-violet', label: 'Comparing…' },
    completed:                { cls: 'badge-green',  label: 'Completed' },
    // Comparison
    clean:                    { cls: 'badge-green',  label: 'Clean Return' },
    damaged:                  { cls: 'badge-red',    label: 'Damage Found' },
    uncertain:                { cls: 'badge-amber',  label: 'Uncertain' },
    // Comparison items
    new_damage:               { cls: 'badge-red',    label: 'New Damage' },
    no_change:                { cls: 'badge-green',  label: 'No Change' },
    // Inspection
    in_progress:              { cls: 'badge-amber',  label: 'In Progress' },
  };

  const { cls, label } = map[status] || { cls: 'badge-dim', label: status };

  return (
    <span className={`badge ${cls}`} style={size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : {}}>
      {label}
    </span>
  );
}
