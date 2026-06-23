import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ExternalLink, Download, Trash2, Film, X, UploadCloud, Link2,
  FolderPlus, Folder, ChevronRight, LayoutGrid, List as ListIcon, FolderInput, Home,
} from 'lucide-react';
import { api } from '../lib/api';

type Video = {
  id: string; title: string; source: string; drive_url: string;
  r2_key: string | null; size_bytes: number | null; folder_id: string | null;
  note: string | null; created_at: number;
};
type VFolder = { id: string; name: string; parent_id: string | null; created_at: number };

function fmtSize(b: number | null): string {
  if (!b) return '—';
  if (b > 1024 * 1024 * 1024) return (b / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  return Math.round(b / 1024 / 1024) + ' MB';
}
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [folders, setFolders] = useState<VFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null); // null = gốc
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'none' | 'upload' | 'drive'>('none');

  // upload
  const [upTitle, setUpTitle] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // drive
  const [drTitle, setDrTitle] = useState(''); const [drUrl, setDrUrl] = useState('');
  const [saving, setSaving] = useState(false);
  // move
  const [moving, setMoving] = useState<Video | null>(null);

  const loadFolders = useCallback(async () => {
    const d = await api.get<{ items: VFolder[] }>('/videos/folders/list');
    setFolders(d.items);
  }, []);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    const folderParam = currentFolder ?? 'root';
    const d = await api.get<{ items: Video[] }>(`/videos?folder=${folderParam}`);
    setVideos(d.items);
    setLoading(false);
  }, [currentFolder]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadVideos(); }, [loadVideos]);

  // Sub-folders của thư mục hiện tại
  const subFolders = folders.filter((f) => f.parent_id === currentFolder);

  // Breadcrumb: lần ngược parent
  const crumbs: VFolder[] = [];
  let cur = currentFolder;
  while (cur) {
    const f = folders.find((x) => x.id === cur);
    if (!f) break;
    crumbs.unshift(f);
    cur = f.parent_id;
  }

  async function createFolder() {
    const name = window.prompt('Tên thư mục mới:');
    if (!name?.trim()) return;
    await api.post('/videos/folders', { name: name.trim(), parent_id: currentFolder });
    await loadFolders();
  }

  async function deleteFolder(f: VFolder) {
    if (!window.confirm(`Xoá thư mục "${f.name}"? Video bên trong sẽ chuyển về thư mục gốc, thư mục con bị xoá theo.`)) return;
    await api.delete(`/videos/folders/${f.id}`);
    await loadFolders(); await loadVideos();
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('Chọn file video'); return; }
    if (!upTitle.trim()) { alert('Nhập tên video'); return; }
    try {
      setProgress(0);
      const pre = await api.post<{ upload_url: string; r2_key: string; public_url: string | null }>(
        '/videos/presign', { filename: file.name, content_type: file.type || 'video/mp4', size: file.size });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', pre.upload_url, true);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Upload R2 thất bại: ' + xhr.status));
        xhr.onerror = () => reject(new Error('Lỗi mạng khi upload'));
        xhr.send(file);
      });
      await api.post('/videos', {
        title: upTitle.trim(), source: 'r2', r2_key: pre.r2_key, public_url: pre.public_url,
        size_bytes: file.size, mime_type: file.type, folder_id: currentFolder,
      });
      setUpTitle(''); setProgress(null); setMode('none');
      if (fileRef.current) fileRef.current.value = '';
      await loadVideos();
    } catch (e: any) { alert('Lỗi: ' + e.message); setProgress(null); }
  }

  async function handleDrive() {
    if (!drTitle.trim() || !drUrl.trim()) { alert('Cần nhập tên và link Drive'); return; }
    setSaving(true);
    try {
      await api.post('/videos', { title: drTitle.trim(), source: 'drive', drive_url: drUrl.trim(), folder_id: currentFolder });
      setDrTitle(''); setDrUrl(''); setMode('none'); await loadVideos();
    } catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setSaving(false); }
  }

  async function download(v: Video) {
    try {
      const res = await api.get<{ download_url: string; filename?: string }>(`/videos/${v.id}/download`);
      if (!res.download_url) return;

      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        // iOS Safari bỏ qua thuộc tính download với URL cross-origin và chặn click sau await.
        // Backend đã gửi Content-Disposition: attachment nên điều hướng thẳng sẽ buộc Safari
        // hiện tùy chọn lưu/chia sẻ file thay vì phát video inline.
        window.location.href = res.download_url;
        return;
      }
      // Desktop / Android: dùng thẻ <a download> để tải nền, không rời trang.
      const a = document.createElement('a');
      a.href = res.download_url;
      if (res.filename) a.download = res.filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) { alert('Lỗi: ' + e.message); }
  }

  async function del(v: Video) {
    if (!window.confirm(`Xoá video "${v.title}"?`)) return;
    await api.delete(`/videos/${v.id}`); await loadVideos();
  }

  async function moveTo(folderId: string | null) {
    if (!moving) return;
    await api.put(`/videos/${moving.id}/move`, { folder_id: folderId });
    setMoving(null); await loadVideos();
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">Video</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={createFolder} className="flex-1 sm:flex-none justify-center border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <FolderPlus className="w-4 h-4" /> <span className="whitespace-nowrap">Thư mục mới</span>
          </button>
          <button onClick={() => setMode(mode === 'upload' ? 'none' : 'upload')}
            className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <UploadCloud className="w-4 h-4" /> Tải lên
          </button>
          <button onClick={() => setMode(mode === 'drive' ? 'none' : 'drive')}
            className="flex-1 sm:flex-none justify-center border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <Link2 className="w-4 h-4" /> <span className="whitespace-nowrap">Link Drive</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
            <Home className="w-4 h-4" /> Video
          </button>
          {crumbs.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <button onClick={() => setCurrentFolder(f.id)} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-700">{f.name}</button>
            </span>
          ))}
        </div>
        <div className="flex border border-gray-300 rounded-md overflow-hidden">
          <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}`} title="Danh sách"><ListIcon className="w-4 h-4" /></button>
          <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}`} title="Lưới"><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Upload form */}
      {mode === 'upload' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tải video lên {crumbs.length ? `→ ${crumbs[crumbs.length - 1].name}` : '(thư mục gốc)'}</h2>
            <button onClick={() => setMode('none')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="Tên video *" />
          <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="w-full text-sm" />
          {progress !== null && (
            <div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
              <div className="text-xs text-gray-500 mt-1">Đang tải lên… {progress}%</div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setMode('none')} disabled={progress !== null} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Huỷ</button>
            <button onClick={handleUpload} disabled={progress !== null} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{progress !== null ? `Đang tải ${progress}%` : 'Tải lên'}</button>
          </div>
        </div>
      )}
      {mode === 'drive' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Thêm link Google Drive</h2>
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

      {/* Folders */}
      {subFolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {subFolders.map((f) => (
            <div key={f.id} className="group flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5 hover:border-blue-300 cursor-pointer"
              onDoubleClick={() => setCurrentFolder(f.id)}>
              <Folder className="w-5 h-5 text-amber-400 fill-amber-100" />
              <button onClick={() => setCurrentFolder(f.id)} className="flex-1 text-left text-sm font-medium truncate">{f.name}</button>
              <button onClick={() => deleteFolder(f)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
      ) : videos.length === 0 && subFolders.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-lg">Thư mục trống.</div>
      ) : view === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Tên file</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-24">Dung lượng</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-28">Ngày tải</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-20">Nguồn</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-40 text-right sticky right-0 bg-gray-50">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><Film className="w-4 h-4 text-gray-400 shrink-0" /><span className="font-medium truncate">{v.title}</span></div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{fmtSize(v.size_bytes)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(v.created_at)}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{v.source === 'r2' ? 'R2' : 'Drive'}</span></td>
                  <td className="px-4 py-3 sticky right-0 bg-white">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setMoving(v)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Di chuyển"><FolderInput className="w-4 h-4" /></button>
                      <button onClick={() => download(v)} className="inline-flex items-center gap-1 px-2 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded font-medium" title="Tải video về"><Download className="w-4 h-4" /> Tải</button>
                      {v.source === 'drive' && <a href={v.drive_url} target="_blank" rel="noopener" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Mở Drive"><ExternalLink className="w-4 h-4" /></a>}
                      <button onClick={() => del(v)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Xoá"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {videos.map((v) => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                <Film className="w-10 h-10 text-gray-300" />
                <span className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">{v.source === 'r2' ? 'R2' : 'Drive'}</span>
              </div>
              <div className="p-3">
                <div className="font-medium text-sm truncate" title={v.title}>{v.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{fmtSize(v.size_bytes)} · {fmtDate(v.created_at)}</div>
                <div className="flex gap-1 flex-wrap mt-2">
                  <button onClick={() => setMoving(v)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"><FolderInput className="w-3.5 h-3.5" /></button>
                  <button onClick={() => download(v)} className="inline-flex items-center gap-1 px-2 py-1 border border-green-200 text-green-700 bg-green-50 rounded text-xs font-medium hover:bg-green-100"><Download className="w-3.5 h-3.5" /> Tải về</button>
                  {v.source === 'drive' && <a href={v.drive_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  <button onClick={() => del(v)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Move dialog */}
      {moving && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMoving(null)}>
          <div className="bg-white rounded-lg p-5 w-96 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Di chuyển "{moving.title}" tới…</h3>
              <button onClick={() => setMoving(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <button onClick={() => moveTo(null)} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-sm">
              <Home className="w-4 h-4 text-gray-500" /> Thư mục gốc (Video)
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => moveTo(f.id)} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-sm">
                <Folder className="w-4 h-4 text-amber-400 fill-amber-100" /> {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Nhấp đúp thư mục để mở. Video lưu trên Cloudflare R2, upload thẳng không giới hạn 100MB.</p>
    </div>
  );
}
