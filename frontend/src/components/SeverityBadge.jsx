export function SeverityBadge({ severity }) {
  const map = {
    none:   { label: 'No Damage',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    low:    { label: 'Low',          cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    medium: { label: 'Medium',       cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    high:   { label: 'High',         cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  const { label, cls } = map[severity] ?? map.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}
