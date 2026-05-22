import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ScanSearch, Layers, History,
  GitCompare, Zap, ChevronLeft, Menu,
} from 'lucide-react';
import Dashboard   from './pages/Dashboard';
import Analyse     from './pages/Analyse';
import Batch       from './pages/Batch';
import HistoryPage from './pages/History';
import Compare     from './pages/Compare';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analyse',   label: 'Analyse',   icon: ScanSearch },
  { path: '/batch',     label: 'Batch',     icon: Layers },
  { path: '/history',   label: 'History',   icon: History },
  { path: '/compare',   label: 'Compare',   icon: GitCompare },
];

const W_OPEN   = 220;
const W_CLOSED =  60;

export default function App() {
  const [open, setOpen] = useState(true);
  const W = open ? W_OPEN : W_CLOSED;

  return (
    <div className="app-root">

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <nav className={`sidebar ${open ? '' : 'sidebar-collapsed'}`}>

        {/* Brand */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div className="brand-logo">
              <Zap size={15} color="#fff" />
            </div>
            {open && <span className="brand-name">DamageAI</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronLeft size={15} /> : <Menu size={15} />}
          </button>
        </div>

        {/* Nav links */}
        <div className="sidebar-nav">
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path} to={path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!open ? label : undefined}
            >
              <Icon size={17} className="nav-icon" />
              {open && label}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {open ? (
            <div className="status-row">
              <div className="status-dot" />
              <span className="status-label">SQLite · Groq Vision</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="status-dot" />
            </div>
          )}
        </div>
      </nav>

      {/* ── MAIN ─────────────────────────────────────────────────── */}
      <div
        className="main-wrapper"
        style={{ paddingLeft: W, transition: 'padding-left .3s cubic-bezier(.4,0,.2,1)' }}
      >
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-live">
            <div className="status-dot" />
            LIVE
          </div>
          <div className="topbar-user">
            <div className="user-avatar">A</div>
            <span className="user-label">Administrator</span>
          </div>
        </header>

        {/* Pages */}
        <main className="page">
          <Routes>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyse"   element={<Analyse />} />
            <Route path="/batch"     element={<Batch />} />
            <Route path="/history"   element={<HistoryPage />} />
            <Route path="/compare"   element={<Compare />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
