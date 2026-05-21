import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ScanSearch, Layers, History, GitCompare, Zap } from 'lucide-react';
import Analyse from './pages/Analyse';
import Batch from './pages/Batch';
import HistoryPage from './pages/History';
import Compare from './pages/Compare';

const NAV = [
  { path: '/analyse', label: 'Analyse', icon: ScanSearch },
  { path: '/batch',   label: 'Batch',   icon: Layers },
  { path: '/history', label: 'History', icon: History },
  { path: '/compare', label: 'Compare', icon: GitCompare },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-8 h-14">
          <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <div className="p-1.5 bg-violet-600 rounded-lg"><Zap className="w-4 h-4 text-white" /></div>
            DamageAI
          </div>
          <nav className="flex items-center gap-1">
            {NAV.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'text-violet-700 bg-violet-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`
                }>
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route index element={<Navigate to="/analyse" replace />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="/batch"   element={<Batch />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/compare" element={<Compare />} />
        </Routes>
      </main>
    </div>
  );
}
