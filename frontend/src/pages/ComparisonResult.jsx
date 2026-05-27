import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileDown, ChevronLeft, AlertTriangle, CheckCircle, HelpCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';
import ComparisonCard from '../components/ComparisonCard';
import StatusBadge from '../components/StatusBadge';

export default function ComparisonResult() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data,        setData]        = useState(null);
  const [rental,      setRental]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [comparison, r] = await Promise.all([
          api.getComparison(id),
          api.getRental(id),
        ]);
        setData(comparison);
        setRental(r);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const url = api.reportUrl(id);
      const response = await fetch(url);
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rental_${id}_report.pdf`;
      a.click();
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%' }} />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <AlertTriangle size={32} color="var(--red)" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text2)', marginBottom: 16 }}>{error}</p>
      <button className="btn btn-ghost" onClick={() => navigate(`/rentals/${id}`)}>Back to Rental</button>
    </div>
  );

  const { result, items = [] } = data || {};
  const overall = result?.overall_status || 'uncertain';

  const verdictMap = {
    clean:     { icon: <CheckCircle size={28} />, label: 'Clean Return',  cls: 'ok',       color: 'var(--green)' },
    damaged:   { icon: <AlertTriangle size={28} />, label: 'Damage Found', cls: 'damaged',  color: 'var(--red)' },
    uncertain: { icon: <HelpCircle size={28} />, label: 'Uncertain — Manual Review Required', cls: 'uncertain', color: 'var(--amber)' },
  };
  const verdict = verdictMap[overall] || verdictMap.uncertain;

  // Sort: damaged items first
  const sortedItems = [...items].sort((a, b) => {
    if (a.status === 'new_damage' && b.status !== 'new_damage') return -1;
    if (b.status === 'new_damage' && a.status !== 'new_damage') return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  return (
    <div className="fade-up">
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(`/rentals/${id}`)}>
        <ChevronLeft size={14} /> Rental Detail
      </button>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Comparison Result</h1>
          {rental && (
            <p className="page-sub">
              Rental #{id} · {rental.year} {rental.make} {rental.model} · {rental.plate_number}
            </p>
          )}
        </div>
        <button
          className="btn btn-ghost"
          onClick={downloadPdf}
          disabled={downloading}
        >
          {downloading ? <Loader size={14} className="spin" /> : <FileDown size={14} />}
          {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      {/* Verdict banner */}
      <div className={`result-banner ${verdict.cls}`} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ color: verdict.color }}>{verdict.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: verdict.color }}>{verdict.label}</div>
            {result?.summary && (
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{result.summary}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {overall === 'damaged' && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
              {result?.damage_count} position{result?.damage_count !== 1 ? 's' : ''} with new damage
            </span>
          )}
          <StatusBadge status={overall} />
        </div>
      </div>

      {/* Comparison cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sortedItems.map(item => (
          <ComparisonCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            No comparison items found.
          </div>
        )}
      </div>

      {/* Footer action */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate(`/rentals/${id}`)}>
          Back to Rental
        </button>
        <button className="btn btn-primary" onClick={downloadPdf} disabled={downloading}>
          {downloading ? <Loader size={14} className="spin" /> : <FileDown size={14} />}
          {downloading ? 'Generating PDF…' : 'Download PDF Report'}
        </button>
      </div>
    </div>
  );
}
