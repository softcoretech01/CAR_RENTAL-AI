import { CheckCircle, XCircle, AlertTriangle, Trash2, Eye } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';

const IMAGE_BASE = '/api/v1/damage/images/';
const STATUS_ICON = {
  damaged:     <XCircle className="w-4 h-4 text-red-500" />,
  not_damaged: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  uncertain:   <AlertTriangle className="w-4 h-4 text-amber-500" />,
};

export function HistoryTable({ analyses, onView, onDelete }) {
  if (!analyses.length) return (
    <div className="text-center py-16 text-gray-400">
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No analyses found.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            {['Image','File','Status','Confidence','Severity','Source','Date',''].map(h => (
              <th key={h} className="pb-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {analyses.map(a => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="py-3 pr-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img src={`${IMAGE_BASE}${a.image_path}`} alt="" className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>
              </td>
              <td className="py-3 pr-3 max-w-[160px]">
                <p className="truncate text-gray-700 font-medium">{a.original_name || '—'}</p>
                {a.is_flagged && <span className="text-xs text-yellow-700">⚠ Flagged</span>}
              </td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-1.5">{STATUS_ICON[a.status]}<span className="capitalize text-gray-700">{a.status.replace('_',' ')}</span></div>
              </td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${a.confidence>=80?'bg-emerald-500':a.confidence>=65?'bg-yellow-500':'bg-red-500'}`}
                      style={{ width: `${a.confidence}%` }} />
                  </div>
                  <span className="text-gray-600">{Math.round(a.confidence)}%</span>
                </div>
              </td>
              <td className="py-3 pr-3"><SeverityBadge severity={a.severity} /></td>
              <td className="py-3 pr-3 capitalize text-gray-500">{a.source}</td>
              <td className="py-3 pr-3 text-gray-400 whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</td>
              <td className="py-3">
                <div className="flex gap-1.5">
                  <button onClick={() => onView(a)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(a)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
