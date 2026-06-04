import { useEffect, useState } from 'react';
import { X, Upload, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { readImageSize } from '../lib/image-tools';

type Media = {
  id: string; url: string; filename: string; alt_text: string | null;
  width: number | null; height: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (m: Media) => void;
  /** kích thước khuyến nghị tối thiểu để cảnh báo (vd ảnh OG 1200×630) */
  recommend?: { width: number; height: number };
};

export default function MediaPicker({ open, onClose, onSelect, recommend }: Props) {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ items: Media[] }>('/media?limit=48');
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    // đọc kích thước ở client để lưu vào DB
    try {
      const dim = await readImageSize(file);
      fd.append('width', String(dim.width));
      fd.append('height', String(dim.height));
    } catch { /* bỏ qua nếu không đọc được */ }
    try {
      const m = await api.post<Media>('/media/upload', fd);
      setItems((prev) => [m, ...prev]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (!open) return null;

  function tooSmall(m: Media): boolean {
    if (!recommend || !m.width || !m.height) return false;
    return m.width < recommend.width || m.height < recommend.height;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-medium">Chọn ảnh</h2>
            {recommend && (
              <p className="text-xs text-gray-500 mt-0.5">Khuyến nghị tối thiểu {recommend.width}×{recommend.height} px</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-xs bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-blue-700">
              <Upload className="w-3.5 h-3.5" /> {uploading ? 'Đang upload…' : 'Tải lên'}
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            </label>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-8">Đang tải…</div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">Chưa có ảnh nào. Hãy tải lên ảnh đầu tiên.</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {items.map((m) => {
                const small = tooSmall(m);
                return (
                  <button
                    key={m.id}
                    onClick={() => { onSelect(m); onClose(); }}
                    className={`group text-left rounded-md overflow-hidden border-2 transition-colors ${small ? 'border-amber-300 hover:border-amber-500' : 'border-transparent hover:border-blue-500'}`}
                  >
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img src={m.url} alt={m.alt_text ?? ''} className="w-full h-full object-cover" />
                    </div>
                    <div className="px-1.5 py-1">
                      {m.width && m.height ? (
                        <div className={`text-[11px] flex items-center gap-1 ${small ? 'text-amber-600' : 'text-gray-500'}`}>
                          {small && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {m.width}×{m.height}
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400">— chưa rõ kích thước</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
