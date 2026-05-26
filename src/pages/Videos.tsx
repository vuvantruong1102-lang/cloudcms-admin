import { useEffect, useState, useRef } from 'react';
import { Plus, ExternalLink, Download, Trash2, Film, X, UploadCloud, Link2 } from 'lucide-react';
import { api } from '../lib/api';

type Video = {
  id: string; title: string; source: string; drive_url: string; drive_file_id: string | null;
  r2_key: string | null; size_bytes: number | null; mime_type: string | null;
  thumbnail: string | null; note: string | null; tags: string | null; created_at: number;
};

function fmtSize(b: number | null): string {
  if (!b) return '';
  if (b > 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  return Math.round(b / 1024 / 1024) + ' MB';
}

export default function Videos() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'none' | 'upload' | 'drive'>('none');

  // upload state
  const [upTitle, setUpTitle] = useState('');
  const [upNote, setUpNote] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // drive state
  const [drTitle, setDrTitle] = useState('');
  const [drUrl, setDrUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await api.get<{ items: Video[] }>('/videos');
    setItems(data.items);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // ---- Upload thẳng lên R2 qua presigned URL ----
  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('Chọn file video'); return; }
    if (!upTitle.trim()) { alert('Nhập tên video'); return; }

    try {
      setProgress(0);
      // 1. xin presigned URL
      const pre = await api.post<{ upload_url: string; r2_key: string; public_url: string | null }>(
        '/videos/presign',
        { filename: file.name, content_type: file.type || 'video/mp4', size: file.size }
      );

      // 2. PUT thẳng lên R2 với progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', pre.upload_url, true);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Upload R2 thất bại: ' + xhr.status));
        xhr.onerror = () => reject(new Error('Lỗi mạng khi upload'));
        xhr.send(file);
      });

      // 3. lưu metadata
      await api.post('/videos', {
        title: upTitle.trim(), source: 'r2', r2_key: pre.r2_key, public_url: pre.public_url,
        size_bytes: file.size, mime_type: file.type, note: upNote.trim() || null,
      });

      setUpTitle(''); setUpNote(''); setProgress(null); setMode('none');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
      setProgress(null);
    }
  }

  // ---- Thêm bằng link Drive (giữ lại) ----
  async function handleDrive() {
    if (!drTitle.trim() || !drUrl.trim()) { alert('Cần nhập tên và link Drive'); return; }
    setSaving(true);
    try {
      await api.post('/videos', { title: drTitle.trim(), source: 'drive', drive_url: drUrl.trim() });
      setDrTitle(''); setDrUrl(''); setMode('none');
      await load();
    } catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setSaving(false); }
  }

  async function download(v: Video) {
    try {
      const res = await api.get<{ download_url: string }>(`/videos/${v.id}/download`);
      if (res.download_url) window.open(res.download_url, '_blank');
    } catch (e: any) { alert('Lỗi: ' + e.message); }
  }

  async function del(id: string, t: string) {
    if (!window.confirm(`Xoá video "${t}"?`)) return;
    try { await api.delete(`/videos/${id}`); await load(); }
    catch (e: any) { alert('Lỗi: ' + e.message); }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Video</h1>
        <div className="flex gap-2">
          <button onClick={() => setMode(mode === 'upload' ? 'none' : 'upload')}
            className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <UploadCloud className="w-4 h-4" /> Tải video lên
          </button>
          <button onClick={() => setMode(mode === 'drive' ? 'none' : 'drive')}
            className="border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <Link2 className="w-4 h-4" /> Thêm link Drive
          </button>
        </div>
      </div>

      {mode === 'upload' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tải video lên (lưu trên Cloudflare R2)</h2>
            <button onClick={() => setMode('none')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tên video *</label>
            <input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="VD: Review JP395 - bản full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Chọn file (MP4, MOV, WEBM — tối đa 2GB)</label>
            <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="w-full text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Ghi chú</label>
            <input value={upNote} onChange={(e) => setUpNote(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
          </div>
          {progress !== null && (
            <div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-1">Đang tải lên… {progress}%</div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setMode('none')} disabled={progress !== null} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Huỷ</button>
            <button onClick={handleUpload} disabled={progress !== null} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {progress !== null ? `Đang tải ${progress}%` : 'Tải lên'}
            </button>
          </div>
        </div>
      )}

      {mode === 'drive' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Thêm video từ link Google Drive</h2>
            <button onClick={() => setMode('none')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <input value={drTitle} onChange={(e) => setDrTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="Tên video" />
          <input value={drUrl} onChange={(e) => setDrUrl(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="https://drive.google.com/file/d/.../view" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setMode('none')} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Huỷ</button>
            <button onClick={handleDrive} disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{saving ? 'Đang lưu…' : 'Thêm'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-lg">Chưa có video nào.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map((v) => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" /> : <Film className="w-10 h-10 text-gray-300" />}
                <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                  {v.source === 'r2' ? 'R2' : 'Drive'}
                </span>
              </div>
              <div className="p-3">
                <div className="font-medium text-sm truncate" title={v.title}>{v.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{v.note || ''} {v.size_bytes ? `· ${fmtSize(v.size_bytes)}` : ''}</div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {v.source === 'drive' && (
                    <a href={v.drive_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                      <ExternalLink className="w-3.5 h-3.5" /> Mở
                    </a>
                  )}
                  <button onClick={() => download(v)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                    <Download className="w-3.5 h-3.5" /> Tải về
                  </button>
                  <button onClick={() => del(v.id, v.title)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4">Video tải lên được lưu trên Cloudflare R2 (cùng nơi với ảnh). File đi thẳng từ trình duyệt lên R2 nên không giới hạn 100MB.</p>
    </div>
  );
}
