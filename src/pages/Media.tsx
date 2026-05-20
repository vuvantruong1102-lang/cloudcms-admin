import { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

type Media = {
  id: string; url: string; filename: string; alt_text: string | null;
  size_bytes: number; mime_type: string; created_at: number;
};

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Media | null>(null);

  async function load() {
    setLoading(true);
    const data = await api.get<{ items: Media[] }>('/media?limit=48');
    setItems(data.items);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', f);
      try { await api.post('/media/upload', fd); } catch (e: any) { alert(e.message); }
    }
    setUploading(false);
    e.target.value = '';
    load();
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Thư viện ảnh</h1>
        <label className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-blue-700 cursor-pointer">
          <Upload className="w-4 h-4" /> {uploading ? 'Đang upload…' : 'Tải lên'}
          <input type="file" className="hidden" accept="image/*" multiple onChange={upload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
          Chưa có ảnh nào
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {items.map((m) => (
            <button
              key={m.id} onClick={() => setSelected(m)}
              className="aspect-square bg-gray-100 rounded-md overflow-hidden border-2 border-transparent hover:border-blue-500"
            >
              <img src={m.url} alt={m.alt_text ?? ''} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg w-full max-w-3xl grid grid-cols-[1fr_280px]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-50 flex items-center justify-center p-4">
              <img src={selected.url} alt={selected.alt_text ?? ''} className="max-w-full max-h-[500px] object-contain" />
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-gray-500">Tên file</div>
                <div className="text-sm">{selected.filename}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Kích thước</div>
                <div className="text-sm">{(selected.size_bytes / 1024).toFixed(1)} KB</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Alt text</label>
                <input
                  defaultValue={selected.alt_text ?? ''}
                  onBlur={(e) => updateMeta(selected.id, e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm mt-1"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">URL</div>
                <input readOnly value={selected.url} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-gray-50" />
              </div>
              <button
                onClick={() => del(selected.id)}
                className="w-full text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
