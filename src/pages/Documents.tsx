import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Download, Trash2, FileText, X, UploadCloud,
  FolderPlus, Folder, ChevronRight, LayoutGrid, List as ListIcon, FolderInput, Home,
  FileSpreadsheet, File as FileIcon,
} from 'lucide-react';
import { api } from '../lib/api';

type Doc = {
  id: string; title: string; filename: string; r2_key: string | null;
  mime_type: string | null; size_bytes: number | null; folder_id: string | null;
  note: string | null; created_at: number;
};
type DFolder = { id: string; name: string; parent_id: string | null; created_at: number };

function fmtSize(b: number | null): string {
  if (!b) return '—';
  if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function docIcon(mime: string | null, filename: string) {
  const f = (filename || '').toLowerCase();
  if (mime?.includes('pdf') || f.endsWith('.pdf')) return { Icon: FileText, cls: 'text-red-500' };
  if (mime?.includes('sheet') || mime?.includes('excel') || f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'))
    return { Icon: FileSpreadsheet, cls: 'text-green-600' };
  if (mime?.includes('word') || f.endsWith('.docx') || f.endsWith('.doc'))
    return { Icon: FileText, cls: 'text-blue-600' };
  return { Icon: FileIcon, cls: 'text-gray-400' };
}

const ACCEPT =
  '.pdf,.xlsx,.xls,.csv,.doc,.docx,application/pdf,application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,' +
  'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<DFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'none' | 'upload'>('none');

  const [upTitle, setUpTitle] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [moving, setMoving] = useState<Doc | null>(null);

  const loadFolders = useCallback(async () => {
    const d = await api.get<{ items: DFolder[] }>('/documents/folders/list');
    setFolders(d.items);
  }, []);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const folderParam = currentFolder ?? 'root';
    const d = await api.get<{ items: Doc[] }>(`/documents?folder=${folderParam}`);
    setDocs(d.items);
    setLoading(false);
  }, [currentFolder]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadDocs(); }, [loadDocs]);

  const subFolders = folders.filter((f) => f.parent_id === currentFolder);

  const crumbs: DFolder[] = [];
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
    await api.post('/documents/folders', { name: name.trim(), parent_id: currentFolder });
    await loadFolders();
  }

  async function deleteFolder(f: DFolder) {
    if (!window.confirm(`Xoá thư mục "${f.name}"? Tài liệu bên trong sẽ chuyển về thư mục gốc, thư mục con bị xoá theo.`)) return;
    await api.delete(`/documents/folders/${f.id}`);
    await loadFolders(); await loadDocs();
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('Chọn file tài liệu'); return; }
    const title = upTitle.trim() || file.name;
    try {
      setProgress(0);
      const pre = await api.post<{ upload_url: string; r2_key: string; public_url: string | null }>(
        '/documents/presign', { filename: file.name, content_type: file.type || 'application/octet-stream', size: file.size });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', pre.upload_url, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error('Upload R2 thất bại: ' + xhr.status));
        xhr.onerror = () => reject(new Error('Lỗi mạng khi upload'));
        xhr.send(file);
      });
      await api.post('/documents', {
        title, filename: file.name, r2_key: pre.r2_key, public_url: pre.public_url,
        size_bytes: file.size, mime_type: file.type, folder_id: currentFolder,
      });
      setUpTitle(''); setProgress(null); setMode('none');
      if (fileRef.current) fileRef.current.value = '';
      await loadDocs();
    } catch (e: any) { alert('Lỗi: ' + e.message); setProgress(null); }
  }

  async function download(d: Doc) {
    try {
      const res = await api.get<{ download_url: string }>(`/documents/${d.id}/download`);
      if (res.download_url) window.open(res.download_url, '_blank');
    } catch (e: any) { alert('Lỗi: ' + e.message); }
  }

  async function del(d: Doc) {
    if (!window.confirm(`Xoá tài liệu "${d.title}"?`)) return;
    await api.delete(`/documents/${d.id}`); await loadDocs();
  }

  async function moveTo(folderId: string | null) {
    if (!moving) return;
    await api.put(`/documents/${moving.id}/move`, { folder_id: folderId });
    setMoving(null); await loadDocs();
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">Tài liệu</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={createFolder} className="flex-1 sm:flex-none justify-center border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <FolderPlus className="w-4 h-4" /> <span className="whitespace-nowrap">Thư mục mới</span>
          </button>
          <button onClick={() => setMode(mode === 'upload' ? 'none' : 'upload')}
            className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <UploadCloud className="w-4 h-4" /> Tải lên
          </button>
        </div>
      </div>

      {/* Breadcrumb + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
            <Home className="w-4 h-4" /> Tài liệu
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
            <h2 className="text-sm font-semibold">Tải tài liệu lên {crumbs.length ? `→ ${crumbs[crumbs.length - 1].name}` : '(thư mục gốc)'}</h2>
            <button onClick={() => setMode('none')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="Tên hiển thị (để trống = tên file)" />
          <input ref={fileRef} type="file" accept={ACCEPT} className="w-full text-sm" />
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

      {/* Documents */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
      ) : docs.length === 0 && subFolders.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-lg">Thư mục trống.</div>
      ) : view === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Tên tài liệu</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-24">Dung lượng</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-28">Ngày tải</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-40 text-right sticky right-0 bg-gray-50">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const { Icon, cls } = docIcon(d.mime_type, d.filename);
                return (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><Icon className={`w-4 h-4 shrink-0 ${cls}`} /><span className="font-medium truncate">{d.title}</span></div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtSize(d.size_bytes)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3 sticky right-0 bg-white">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setMoving(d)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Di chuyển"><FolderInput className="w-4 h-4" /></button>
                        <button onClick={() => download(d)} className="inline-flex items-center gap-1 px-2 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded font-medium" title="Tải về"><Download className="w-4 h-4" /> Tải</button>
                        <button onClick={() => del(d)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Xoá"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {docs.map((d) => {
            const { Icon, cls } = docIcon(d.mime_type, d.filename);
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
                  <Icon className={`w-12 h-12 ${cls}`} />
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm truncate" title={d.title}>{d.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{fmtSize(d.size_bytes)} · {fmtDate(d.created_at)}</div>
                  <div className="flex gap-1 flex-wrap mt-2">
                    <button onClick={() => setMoving(d)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"><FolderInput className="w-3.5 h-3.5" /></button>
                    <button onClick={() => download(d)} className="inline-flex items-center gap-1 px-2 py-1 border border-green-200 text-green-700 bg-green-50 rounded text-xs font-medium hover:bg-green-100"><Download className="w-3.5 h-3.5" /> Tải về</button>
                    <button onClick={() => del(d)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
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
              <Home className="w-4 h-4 text-gray-500" /> Thư mục gốc (Tài liệu)
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => moveTo(f.id)} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-sm">
                <Folder className="w-4 h-4 text-amber-400 fill-amber-100" /> {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Hỗ trợ PDF, Excel (.xlsx/.xls/.csv), Word (.doc/.docx). File lưu trên Cloudflare R2, upload thẳng không giới hạn 100MB.</p>
    </div>
  );
}
