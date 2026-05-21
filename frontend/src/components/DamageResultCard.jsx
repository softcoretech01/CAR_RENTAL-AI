import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, RefreshCw, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { SeverityBadge } from './SeverityBadge';
import { ConfidenceBar } from './ConfidenceBar';

const IMAGE_BASE = '/api/v1/damage/images/';

const STATUS = {
  damaged:     { icon: XCircle,      label: 'Damaged',     banner: 'bg-red-50 border-red-200',     text: 'text-red-700',     iconCls: 'text-red-500' },
  not_damaged: { icon: CheckCircle,  label: 'Not Damaged', banner: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', iconCls: 'text-emerald-500' },
  uncertain:   { icon: AlertTriangle,label: 'Uncertain',   banner: 'bg-amber-50 border-amber-200', text: 'text-amber-700',   iconCls: 'text-amber-500' },
};

export function DamageResultCard({ result, onReset }) {
  const [feedback, setFeedback] = useState(result.user_feedback || null);
  const [busy, setBusy] = useState(false);
  const cfg = STATUS[result.status] ?? STATUS.uncertain;
  const Icon = cfg.icon;

  async function submitFeedback(value) {
    if (busy || feedback) return;
    setBusy(true);
    try { await api.patch(`/damage/analyses/${result.id}/feedback`, { feedback: value }); setFeedback(value); }
    catch { /* silent */ } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={`border rounded-xl p-4 flex items-center gap-3 ${cfg.banner}`}>
        <Icon className={`w-8 h-8 shrink-0 ${cfg.iconCls}`} />
        <div>
          <p className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</p>
          {result.original_name && <p className="text-xs text-gray-500 mt-0.5">{result.original_name}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SeverityBadge severity={result.severity} />
          {result.is_flagged && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-full text-xs font-semibold">
              <AlertTriangle className="w-3 h-3" /> Review
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center">
          <img src={`${IMAGE_BASE}${result.image_path}`} alt="Analysed" className="w-full h-full object-contain" />
        </div>
        <div className="space-y-4">
          <ConfidenceBar confidence={result.confidence} />
          {result.damage_types?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Damage Types</p>
              <div className="flex flex-wrap gap-1.5">
                {result.damage_types.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium capitalize">{t}</span>
                ))}
              </div>
            </div>
          )}
          {result.region_description && result.region_description !== 'No damage detected' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Location</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-2.5">{result.region_description}</p>
            </div>
          )}
          {result.explanation && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Assessment</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-2.5">{result.explanation}</p>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(result.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {result.is_flagged && (
        <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 rounded-xl p-3.5 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
          <span><strong>Low confidence.</strong> Please review this image manually before making a decision.</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <span className="text-sm text-gray-500">Was this correct?</span>
        <button onClick={() => submitFeedback('correct')} disabled={!!feedback || busy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${feedback === 'correct' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50'}`}>
          <ThumbsUp className="w-3.5 h-3.5" /> Yes
        </button>
        <button onClick={() => submitFeedback('incorrect')} disabled={!!feedback || busy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${feedback === 'incorrect' ? 'bg-red-100 text-red-800 border border-red-300'
              : 'border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50'}`}>
          <ThumbsDown className="w-3.5 h-3.5" /> No
        </button>
        {onReset && (
          <button onClick={onReset}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Analyse Another
          </button>
        )}
      </div>
    </div>
  );
}
