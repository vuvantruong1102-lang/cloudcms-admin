import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Code2, Search, Upload, FileCode } from 'lucide-react';
import { api } from '../lib/api';

type Article = {
  id: string; title: string; slug: string | null;
  excerpt: string | null; updated_at: number; created_at: number;
};

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Library() {
  const [items, setItems] = useState<Article[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    const d = await api.get<{ items: Article[] }>(`/library?${p.toString()}`);
    setItems(d.items);
    setLoading(false);
  }, [q]);

  useEffect(() => { load(); }, [load]);

  async function del(a: Article) {
    if (!window.confirm(`Xoá bài viết "${a.title}"?`)) return;
    await api.delete(`/library/${a.id}`);
    await load();
  }

  async function handleUploadFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const html = await file.text();
      const title = file.name.replace(/\.html?$/i, '');
      await api.post('/library', { title, html });
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setUploading(false); }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-lg sm:text-xl font-semibold">Thư viện bài viết HTML</h1>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={handleUploadFile} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex-1 sm:flex-none justify-center border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50">
            <Upload className="w-4 h-4" /> <span className="whitespace-nowrap">{uploading ? 'Đang tải…' : 'Tải file .html'}</span>
          </button>
          <Link to="/library/new"
            className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tạo bài viết
          </Link>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tiêu đề…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm" />
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-lg">
          Chưa có bài viết nào. Bấm “Tạo bài viết” hoặc “Tải file .html”.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Tiêu đề</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-32">Cập nhật</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-24 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/library/${a.id}`} className="flex items-center gap-2 group">
                      <FileCode className="w-4 h-4 text-violet-500 shrink-0" />
                      <span>
                        <span className="font-medium group-hover:text-blue-600 block truncate">{a.title}</span>
                        {a.excerpt && <span className="text-xs text-gray-400 line-clamp-1">{a.excerpt}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(a.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/library/${a.id}`} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Sửa"><Code2 className="w-4 h-4" /></Link>
                      <button onClick={() => del(a)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="Xoá"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">Lưu HTML thô của bài viết. Có thể dán code, sửa trực tiếp và xem trước trước khi lưu.</p>
    </div>
  );
}
