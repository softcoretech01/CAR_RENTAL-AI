export function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 65 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Confidence</span>
        <span className="font-semibold text-gray-800">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
