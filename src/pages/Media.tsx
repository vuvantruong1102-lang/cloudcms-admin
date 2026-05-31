import { useEffect, useState, useCallback } from 'react';
import { Upload, Trash2, FolderPlus, Folder, ChevronRight, Home, FolderInput, X } from 'lucide-react';
import { api } from '../lib/api';

type Media = {
  id: string; url: string; filename: string; alt_text: string | null;
  size_bytes: number; mime_type: string; folder_id: string | null; created_at: number;
};
type MFolder = { id: string; name: string; parent_id: string | null; created_at: number };

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [folders, setFolders] = useState<MFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Media | null>(null);
  const [moving, setMoving] = useState<Media | null>(null);

  const loadFolders = useCallback(async () => {
    const d = await api.get<{ items: MFolder[] }>('/media-folders/list');
    setFolders(d.items);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const folderParam = currentFolder ?? 'root';
    const data = await api.get<{ items: Media[] }>(`/media?limit=48&folder=${folderParam}`);
    setItems(data.items);
    setLoading(false);
  }, [currentFolder]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const subFolders = folders.filter((f) => f.parent_id === currentFolder);
  const crumbs: MFolder[] = [];
  let cur = currentFolder;
  while (cur) {
    const f = folders.find((x) => x.id === cur);
    if (!f) break;
    crumbs.unshift(f); cur = f.parent_id;
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);
      if (currentFolder) fd.append('folder_id', currentFolder);
      try { await api.post('/media/upload', fd); } catch (e: any) { alert(e.message); }
    }
    setUploading(false);
    e.target.value = '';
    loadItems();
  }

  async function createFolder() {
    const name = window.prompt('Tên thư mục mới:');
    if (!name?.trim()) return;
    await api.post('/media-folders', { name: name.trim(), parent_id: currentFolder });
    await loadFolders();
  }

  async function deleteFolder(f: MFolder) {
    if (!window.confirm(`Xoá thư mục "${f.name}"? Ảnh bên trong chuyển về gốc, thư mục con bị xoá theo.`)) return;
    await api.delete(`/media-folders/${f.id}`);
    await loadFolders(); await loadItems();
  }

  async function moveTo(folderId: string | null) {
    if (!moving) return;
    await api.put(`/media-folders/move/${moving.id}`, { folder_id: folderId });
    setMoving(null); await loadItems();
  }

  async function del(id: string) {
    if (!confirm('Xóa ảnh này?')) return;
    await api.delete(`/media/${id}`);
    setItems((prev) => prev.filter((m) => m.id !== id));
    setSelected(null);
  }

  async function updateMeta(id: string, alt_text: string) {
    await api.patch(`/media/${id}`, { alt_text });
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, alt_text } : m)));
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">Thư viện ảnh</h1>
        <div className="flex gap-2">
          <button onClick={createFolder} className="flex-1 sm:flex-none justify-center border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <FolderPlus className="w-4 h-4" /> Thư mục mới
          </button>
          <label className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-blue-700 cursor-pointer">
            <Upload className="w-4 h-4" /> {uploading ? 'Đang upload…' : 'Tải lên'}
            <input type="file" className="hidden" accept="image/*" multiple onChange={upload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
          <Home className="w-4 h-4" /> Thư viện ảnh
        </button>
        {crumbs.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <button onClick={() => setCurrentFolder(f.id)} className="px-2 py-1 rounded hover:bg-gray-100 text-gray-700">{f.name}</button>
          </span>
        ))}
      </div>

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

      {loading ? (
        <div className="text-sm text-gray-500">Đang tải…</div>
      ) : items.length === 0 && subFolders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">Thư mục trống</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {items.map((m) => (
            <div key={m.id} className="group relative aspect-square bg-gray-100 rounded-md overflow-hidden border-2 border-transparent hover:border-blue-500">
              <button onClick={() => setSelected(m)} className="w-full h-full">
                <img src={m.url} alt={m.alt_text ?? ''} className="w-full h-full object-cover" />
              </button>
              <button onClick={() => setMoving(m)} title="Di chuyển"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/90 rounded p-1 text-gray-600 hover:text-blue-600">
                <FolderInput className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-[1fr_280px]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-50 flex items-center justify-center p-4">
              <img src={selected.url} alt={selected.alt_text ?? ''} className="max-w-full max-h-[500px] object-contain" />
            </div>
            <div className="p-4 space-y-3">
              <div><div className="text-xs text-gray-500">Tên file</div><div className="text-sm break-all">{selected.filename}</div></div>
              <div><div className="text-xs text-gray-500">Kích thước</div><div className="text-sm">{(selected.size_bytes / 1024).toFixed(1)} KB</div></div>
              <div>
                <label className="text-xs text-gray-500">Alt text</label>
                <input defaultValue={selected.alt_text ?? ''} onBlur={(e) => updateMeta(selected.id, e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm mt-1" />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">URL</div>
                <input readOnly value={selected.url} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
              </div>
              <button onClick={() => del(selected.id)} className="w-full text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move dialog */}
      {moving && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMoving(null)}>
          <div className="bg-white rounded-lg p-5 w-96 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Di chuyển ảnh tới…</h3>
              <button onClick={() => setMoving(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <button onClick={() => moveTo(null)} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-sm">
              <Home className="w-4 h-4 text-gray-500" /> Thư mục gốc
            </button>
            {folders.map((f) => (
              <button key={f.id} onClick={() => moveTo(f.id)} className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-sm">
                <Folder className="w-4 h-4 text-amber-400 fill-amber-100" /> {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
