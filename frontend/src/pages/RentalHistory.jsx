import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Car, FilterX, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pre_inspection_pending',  label: 'Pre-Inspect Pending' },
  { value: 'pre_inspection_done',     label: 'Pre-Inspect Done' },
  { value: 'rented_out',              label: 'Rented Out' },
  { value: 'post_inspection_pending', label: 'Post-Inspect Pending' },
  { value: 'comparing',               label: 'Comparing' },
  { value: 'completed',               label: 'Completed' },
];

const PAGE_SIZE = 20;

export default function RentalHistory() {
  const navigate = useNavigate();

  const [rentals,    setRentals]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;

    api.listRentals(params)
      .then(data => {
        setRentals(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function clearFilters() {
    setStatusFilter('');
    setPage(0);
  }

  const hasFilters = !!statusFilter;

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rental History</h1>
          <p className="page-sub">All rentals sorted by most recent</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/rentals/new')}>
          + New Rental
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="field"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          style={{ minWidth: 200 }}
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <FilterX size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
            <div className="spin" style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%', display: 'inline-block' }} />
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>{error}</div>
        ) : rentals.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
            No rentals {hasFilters ? 'matching filters' : 'yet'}.
            {!hasFilters && (
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 10 }} onClick={() => navigate('/rentals/new')}>
                Create first rental
              </button>
            )}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Start</th>
                <th>Return</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rentals.map(r => (
                <tr
                  key={r.id}
                  className="tbl-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/rentals/${r.id}`)}
                >
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>#{r.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      {r.year} {r.make} {r.model}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {r.plate_number}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.phone}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.start_date}</td>
                  <td style={{ fontSize: 13 }}>
                    {r.actual_return_date || r.expected_return_date}
                    {r.actual_return_date && r.actual_return_date !== r.expected_return_date && (
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                        Expected: {r.expected_return_date}
                      </div>
                    )}
                  </td>
                  <td><StatusBadge status={r.status} size="sm" /></td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); navigate(`/rentals/${r.id}`); }}
                    >
                      View <ExternalLink size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && !error && rentals.length === PAGE_SIZE && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              Page {page + 1}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
