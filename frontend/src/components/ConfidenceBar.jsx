export function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence);
  const color = pct >= 80 ? 'var(--green)' : pct >= 65 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text2)', fontWeight: 500 }}>Confidence</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
