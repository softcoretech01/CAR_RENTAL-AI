import { useRef, useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

export function ImageUploader({ onFile }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  function pick(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    onFile(file);
  }

  function clear(e) {
    e.stopPropagation();
    setPreview(null);
    onFile(null);
    if (ref.current) ref.current.value = '';
  }

  return (
    <div
      onClick={() => !preview && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
      className={`relative rounded-2xl border-2 border-dashed transition-all
        ${dragging ? 'border-violet-400 bg-violet-50 scale-[1.01]'
          : 'border-gray-300 bg-gray-50 hover:border-violet-400 hover:bg-violet-50'}
        ${preview ? 'cursor-default' : 'cursor-pointer'}`}
      style={{ minHeight: 240 }}
    >
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden" onChange={e => pick(e.target.files[0])} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full rounded-2xl object-contain max-h-80" />
          <button onClick={clear}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow border border-gray-200 hover:bg-red-50">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
          <div className="p-4 bg-violet-100 rounded-full"><Upload className="w-8 h-8 text-violet-600" /></div>
          <div>
            <p className="font-semibold text-gray-700">Drop an image here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse · JPG, PNG, WebP, GIF</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <ImageIcon className="w-3.5 h-3.5" /> Auto-resized to 1024px max
          </div>
        </div>
      )}
    </div>
  );
}
