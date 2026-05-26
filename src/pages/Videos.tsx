import { useEffect, useState } from 'react';
import { Plus, ExternalLink, Download, Trash2, Film, X } from 'lucide-react';
import { api } from '../lib/api';

type Video = {
  id: string; title: string; drive_url: string; drive_file_id: string | null;
  thumbnail: string | null; note: string | null; tags: string | null; created_at: number;
};

// Link tải trực tiếp từ Drive file id
function driveDownloadUrl(fileId: string | null): string | null {
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null;
}

export default function Videos() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await api.get<{ items: Video[] }>('/videos');
    setItems(data.items);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim() || !driveUrl.trim()) { alert('Cần nhập tên và link Drive'); return; }
    setSaving(true);
    try {
      await api.post('/videos', { title: title.trim(), drive_url: driveUrl.trim(), note: note.trim() || null, tags: tags.trim() || null });
      setTitle(''); setDriveUrl(''); setNote(''); setTags(''); setShowForm(false);
      await load();
    } catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setSaving(false); }
  }

  async function del(id: string, t: string) {
    if (!window.confirm(`Xoá video "${t}" khỏi thư viện? (Không xoá file trên Drive)`)) return;
    try { await api.delete(`/videos/${id}`); await load(); }
    catch (e: any) { alert('Lỗi: ' + e.message); }
  }

  async function copyUrl(url: string) {
    try { await navigator.clipboard.writeText(url); alert('Đã copy link'); }
    catch { alert('Không copy được'); }
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Video</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Thêm video
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Thêm video từ Google Drive</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tên video *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="VD: Review JP395 - bản full" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Link Google Drive *</label>
            <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="https://drive.google.com/file/d/.../view" />
            <p className="text-xs text-gray-400 mt-1">Nhớ đặt quyền chia sẻ "Bất kỳ ai có link" để tải được.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Ghi chú</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Tags (phân tách dấu phẩy)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm" placeholder="review, jp395" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Huỷ</button>
            <button onClick={create} disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu…' : 'Thêm video'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-lg">Chưa có video nào. Bấm "Thêm video" để bắt đầu.</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map((v) => {
            const dl = driveDownloadUrl(v.drive_file_id);
            return (
              <div key={v.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" /> : <Film className="w-10 h-10 text-gray-300" />}
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm truncate" title={v.title}>{v.title}</div>
                  {v.note && <div className="text-xs text-gray-500 mt-0.5 truncate">{v.note}</div>}
                  <div className="flex gap-1 flex-wrap mt-2">
                    <a href={v.drive_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                      <ExternalLink className="w-3.5 h-3.5" /> Mở Drive
                    </a>
                    {dl && (
                      <a href={dl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">
                        <Download className="w-3.5 h-3.5" /> Tải về
                      </a>
                    )}
                    <button onClick={() => copyUrl(v.drive_url)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">Copy link</button>
                    <button onClick={() => del(v.id, v.title)} className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4">Video lưu trên Google Drive của bạn. CMS chỉ lưu link để mở/tải nhanh khi cần đăng lên nền tảng.</p>
    </div>
  );
}
