import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, ClipboardList, PlusCircle,
  History, ChevronLeft, Menu, MapPin,
} from 'lucide-react';

import FleetDashboard      from './pages/FleetDashboard';
import Vehicles            from './pages/Vehicles';
import NewRentalWizard     from './pages/NewRentalWizard';
import RentalHistory       from './pages/RentalHistory';
import RentalDetail        from './pages/RentalDetail';
import InspectionWizard    from './pages/InspectionWizard';
import ComparisonResult    from './pages/ComparisonResult';
import PositionsSettings   from './pages/PositionsSettings';

const NAV = [
  { path: '/',              label: 'Fleet',       icon: LayoutDashboard, end: true },
  { path: '/vehicles',      label: 'Vehicles',    icon: Car },
  { path: '/rentals/new',   label: 'New Rental',  icon: PlusCircle },
  { path: '/rentals',       label: 'Rentals',     icon: ClipboardList },
  { path: '/positions',     label: 'Positions',   icon: MapPin },
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
              <Car size={16} color="#fff" />
            </div>
            {open && <span className="brand-name">RentalScan</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronLeft size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav links */}
        <div className="sidebar-nav">
          {NAV.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path} to={path} end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!open ? label : undefined}
            >
              <Icon size={19} className="nav-icon" />
              {open && label}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {open ? (
            <div className="status-row">
              <div className="status-dot" />
              <span className="status-label">MySQL · Groq Vision</span>
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
            <div className="user-avatar">R</div>
            <span className="user-label">Rental Admin</span>
          </div>
        </header>

        {/* Pages */}
        <main className="page">
          <Routes>
            <Route index                                    element={<FleetDashboard />} />
            <Route path="/vehicles"                         element={<Vehicles />} />
            <Route path="/rentals/new"                      element={<NewRentalWizard />} />
            <Route path="/rentals"                          element={<RentalHistory />} />
            <Route path="/rentals/:id"                      element={<RentalDetail />} />
            <Route path="/rentals/:id/inspect/:type"        element={<InspectionWizard />} />
            <Route path="/rentals/:id/comparison"           element={<ComparisonResult />} />
            <Route path="/positions"                        element={<PositionsSettings />} />
            <Route path="*"                                 element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
