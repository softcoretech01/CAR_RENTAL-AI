import { useRef, useState } from 'react';
import { Layers, Upload, CheckCircle, XCircle, AlertTriangle, Loader2, Download, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { SeverityBadge } from '../components/SeverityBadge';

const IMAGE_BASE = '/api/v1/damage/images/';
const STATUS_ICON = { damaged:<XCircle className="w-4 h-4 text-red-500"/>, not_damaged:<CheckCircle className="w-4 h-4 text-emerald-500"/>, uncertain:<AlertTriangle className="w-4 h-4 text-amber-500"/> };

export default function Batch() {
  const ref = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [batchId, setBatchId] = useState(null);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [idx, setIdx] = useState(-1);

  function pick(list) { setFiles(Array.from(list).filter(f=>f.type.startsWith('image/')).slice(0,50)); setResults([]); setDone(false); setBatchId(null); }

  async function run() {
    if (!files.length) return;
    setProcessing(true); setResults([]); setDone(false);
    try {
      const label = `Batch ${new Date().toLocaleString()}`;
      const batch = await api.post(`/damage/batch?label=${encodeURIComponent(label)}`);
      setBatchId(batch.id);
      const acc = [];
      for (let i = 0; i < files.length; i++) {
        setIdx(i);
        try { acc.push({ file: files[i], result: await api.postFile(`/damage/batch/${batch.id}/analyse`, files[i]), error: null }); }
        catch (e) { acc.push({ file: files[i], result: null, error: e.message }); }
        setResults([...acc]);
      }
      setDone(true);
    } catch (e) { alert('Batch failed: ' + e.message); }
    finally { setProcessing(false); setIdx(-1); }
  }

  function reset() { setFiles([]); setResults([]); setDone(false); setBatchId(null); setIdx(-1); if(ref.current) ref.current.value=''; }

  function exportCSV() {
    const header = ['Filename','Status','Confidence','Severity','Damage Types','Region','Explanation','Flagged'];
    const rows = results.map(({file,result,error}) => !result
      ? [file.name,'ERROR','','','','',error,'']
      : [file.name,result.status,Math.round(result.confidence),result.severity,(result.damage_types||[]).join(';'),result.region_description||'',result.explanation||'',result.is_flagged?'Yes':'No']
    );
    const csv = [header,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `batch-${batchId||'export'}.csv`; a.click();
  }

  const damaged = results.filter(r=>r.result?.status==='damaged').length;
  const notDamaged = results.filter(r=>r.result?.status==='not_damaged').length;
  const flagged = results.filter(r=>r.result?.is_flagged).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Batch Upload</h1>
        <p className="text-sm text-gray-500 mt-1">Upload up to 50 images — each analysed automatically.</p>
      </div>

      {!done && (
        <div onClick={() => !processing && ref.current?.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);pick(e.dataTransfer.files);}}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all
            ${dragging?'border-violet-400 bg-violet-50 scale-[1.01]':'border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50'}
            ${processing?'cursor-not-allowed opacity-60':'cursor-pointer'}`}>
          <input ref={ref} type="file" multiple accept="image/*" className="hidden" onChange={e=>pick(e.target.files)} />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-violet-100 rounded-full"><Layers className="w-8 h-8 text-violet-600" /></div>
            {files.length > 0
              ? <><p className="font-semibold text-gray-700">{files.length} image{files.length!==1?'s':''} selected</p><p className="text-sm text-gray-400">Drop more to replace or click Start</p></>
              : <><p className="font-semibold text-gray-700">Drop images here or click to browse</p><p className="text-sm text-gray-400">Supports JPG, PNG, WebP · Max 50 files</p></>
            }
          </div>
        </div>
      )}

      {files.length > 0 && !done && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{files.length} files queued</p>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {files.map((f,i)=>(
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 py-0.5">
                {i<results.length ? (results[i].result?STATUS_ICON[results[i].result.status]:<AlertTriangle className="w-4 h-4 text-red-400"/>)
                  : i===idx ? <Loader2 className="w-4 h-4 text-violet-500 animate-spin"/>
                  : <Upload className="w-4 h-4 text-gray-300"/>}
                <span className="truncate">{f.name}</span>
                <span className="ml-auto text-gray-400 text-xs">{(f.size/1024).toFixed(0)}KB</span>
              </div>
            ))}
          </div>
          {processing && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Processing…</span><span>{results.length}/{files.length}</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2"><div className="h-2 bg-violet-500 rounded-full transition-all" style={{width:`${(results.length/files.length)*100}%`}}/></div>
            </div>
          )}
        </div>
      )}

      {!done && (
        <div className="flex gap-3">
          <button onClick={run} disabled={!files.length||processing}
            className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {processing ? <><Loader2 className="w-4 h-4 animate-spin"/>Processing {results.length+1}/{files.length}…</> : <><Layers className="w-4 h-4"/>Start Batch Analysis</>}
          </button>
          {files.length>0 && !processing && <button onClick={reset} className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"><RefreshCw className="w-4 h-4"/></button>}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {done && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Total',files.length,'text-gray-700','bg-gray-50 border-gray-200'],['Damaged',damaged,'text-red-700','bg-red-50 border-red-200'],['Not Damaged',notDamaged,'text-emerald-700','bg-emerald-50 border-emerald-200'],['Flagged',flagged,'text-yellow-700','bg-yellow-50 border-yellow-200']].map(([l,v,tc,bg])=>(
                <div key={l} className={`border rounded-xl p-3.5 text-center ${bg}`}>
                  <p className={`text-2xl font-bold ${tc}`}>{v}</p><p className="text-xs text-gray-500 mt-1">{l}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Results ({results.length})</p>
              {done && (
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50"><Download className="w-3.5 h-3.5"/>Export CSV</button>
                  <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700"><RefreshCw className="w-3.5 h-3.5"/>New Batch</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {results.map(({file,result,error},i)=>(
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  {result ? (
                    <>
                      <div className="aspect-square overflow-hidden"><img src={`${IMAGE_BASE}${result.image_path}`} alt={file.name} className="w-full h-full object-cover"/></div>
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-1">{STATUS_ICON[result.status]}<span className="text-xs font-semibold capitalize text-gray-700">{result.status.replace('_',' ')}</span></div>
                        <SeverityBadge severity={result.severity}/>
                        <p className="text-xs text-gray-400 truncate">{file.name}</p>
                        {result.is_flagged && <span className="text-xs text-yellow-700">⚠ Review</span>}
                      </div>
                    </>
                  ) : (
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-medium text-red-600">Failed</p>
                      <p className="text-xs text-gray-400 truncate">{file.name}</p>
                      <p className="text-xs text-red-400 truncate">{error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
