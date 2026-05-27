import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, AlertTriangle, CheckCircle, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

export default function FleetDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.fleetStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); api.fleetStats().then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false)); }} />;

  const { available = 0, rented_out = 0, total_vehicles = 0,
          awaiting_inspection = 0, damage_this_month = 0,
          recent_rentals = [] } = stats || {};

  const statCards = [
    { label: 'Total Vehicles', value: total_vehicles, icon: Car, color: 'violet' },
    { label: 'Available Now',  value: available,      icon: CheckCircle, color: 'green' },
    { label: 'Rented Out',     value: rented_out,     icon: TrendingUp,  color: 'amber' },
    { label: 'Awaiting Inspect', value: awaiting_inspection, icon: Clock,  color: 'red' },
  ];

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Dashboard</h1>
          <p className="page-sub">Overview of your rental fleet status</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/rentals/new')}>
          <Car size={15} /> New Rental
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`stat-card ${color}`}>
            <div className={`stat-icon ${color}`}><Icon size={17} /></div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {damage_this_month > 0 && label === 'Rented Out' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={12} color="var(--red)" />
                <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                  {damage_this_month} damage case{damage_this_month !== 1 ? 's' : ''} this month
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Rentals */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Rentals</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/rentals')}>
            View all <ExternalLink size={12} />
          </button>
        </div>
        {recent_rentals.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
            No rentals yet. <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate('/rentals/new')}>Create first rental</button>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Start Date</th>
                <th>Expected Return</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recent_rentals.map(r => (
                <tr key={r.id} className="tbl-row" style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/rentals/${r.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {r.year} {r.make} {r.model}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                      {r.plate_number}
                    </div>
                  </td>
                  <td>{r.full_name}</td>
                  <td>{r.start_date}</td>
                  <td>{r.expected_return_date}</td>
                  <td><StatusBadge status={r.status} size="sm" /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/rentals/${r.id}`); }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ height: 32, width: 200, background: 'var(--surface2)', borderRadius: 6, marginBottom: 24 }} />
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="stat-card" style={{ height: 100, background: 'var(--surface2)' }} />
        ))}
      </div>
      <div className="card" style={{ height: 200, background: 'var(--surface2)' }} />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <AlertTriangle size={32} color="var(--red)" style={{ marginBottom: 12 }} />
      <p style={{ color: 'var(--text2)', marginBottom: 16 }}>{message}</p>
      <button className="btn btn-ghost" onClick={onRetry}>Retry</button>
    </div>
  );
}
