const MAP = {
  none:   { label: 'No Damage', cls: 'badge-green' },
  low:    { label: 'Low',       cls: 'badge-amber' },
  medium: { label: 'Medium',    cls: 'badge-amber'  },
  high:   { label: 'High',      cls: 'badge-red'   },
};

export function SeverityBadge({ severity }) {
  const { label, cls } = MAP[severity] ?? MAP.none;
  return <span className={`badge ${cls}`}>{label}</span>;
}
