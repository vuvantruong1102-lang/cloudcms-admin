import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Archive, Trash2, ArchiveRestore, Eye, Tag, X } from 'lucide-react';
import { api } from '../lib/api';

type PostRow = {
  id: string; slug: string; title: string; status: string;
  updated_at: number; seo_score: number | null;
  author_name: string; category_name: string | null; category_id: string | null;
};
type Category = { id: string; slug: string; name: string; description: string | null };

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  archived: 'bg-orange-100 text-orange-700',
};
const statusLabel: Record<string, string> = {
  draft: 'Nháp', published: 'Đã đăng', scheduled: 'Lên lịch', archived: 'Đã lưu trữ',
};

export default function PostsList() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string>('');

  // Category management panel
  const [showCatPanel, setShowCatPanel] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    const data = await api.get<{ items: PostRow[] }>(`/posts?${params}`);
    setPosts(data.items);
    setLoading(false);
  }

  async function loadCategories() {
    try {
      const data = await api.get<Category[] | { items: Category[] }>('/categories');
      setCategories(Array.isArray(data) ? data : (data?.items ?? []));
    } catch { setCategories([]); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  useEffect(() => { loadCategories(); }, []);

  async function createCategory() {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      await api.post('/categories', { name: newCatName.trim() });
      setNewCatName('');
      await loadCategories();
    } catch (e: any) { alert('Lỗi tạo danh mục: ' + e.message); }
    finally { setCreatingCat(false); }
  }

  async function deleteCategory(id: string, name: string) {
    if (!window.confirm(`Xóa danh mục "${name}"? Bài viết thuộc danh mục này sẽ bị bỏ liên kết.`)) return;
    try { await api.delete(`/categories/${id}`); await loadCategories(); await load(); }
    catch (e: any) { alert('Lỗi: ' + e.message); }
  }

  async function archivePost(post: PostRow) {
    const isArchived = post.status === 'archived';
    const newStatus = isArchived ? 'draft' : 'archived';
    const msg = isArchived
      ? `Khôi phục "${post.title}" về trạng thái Nháp?`
      : `Lưu trữ "${post.title}"?\n\nBài sẽ ẩn khỏi website, nhưng vẫn giữ lại để khôi phục sau.`;
    if (!window.confirm(msg)) return;
    setActionLoading(post.id);
    try { await api.put(`/posts/${post.id}`, { status: newStatus }); await load(); }
    catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setActionLoading(''); }
  }

  async function deletePost(post: PostRow) {
    const msg = `⚠️ XÓA VĨNH VIỄN bài "${post.title}"?\n\nHành động này KHÔNG THỂ HOÀN TÁC.\n\nNếu chỉ muốn ẩn, hãy dùng "Lưu trữ" thay vì xóa.`;
    if (!window.confirm(msg)) return;
    const confirm2 = window.prompt(`Để xác nhận xóa, gõ chữ "XOA" (viết hoa, không dấu) rồi bấm OK:`);
    if (confirm2 !== 'XOA') { alert('Đã hủy xóa.'); return; }
    setActionLoading(post.id);
    try { await api.delete(`/posts/${post.id}`); await load(); }
    catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setActionLoading(''); }
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Website</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCatPanel(!showCatPanel)}
            className="border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <Tag className="w-4 h-4" /> Quản lý danh mục
          </button>
          <Link to="/posts/new" className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Bài viết mới
          </Link>
        </div>
      </div>

      {/* Category management panel (gộp từ trang Danh mục cũ) */}
      {showCatPanel && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1"><Tag className="w-4 h-4" /> Danh mục</h2>
            <button onClick={() => setShowCatPanel(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-2 mb-3">
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createCategory()}
              placeholder="Tên danh mục mới…"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm" />
            <button onClick={createCategory} disabled={creatingCat || !newCatName.trim()}
              className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
              <Plus className="w-4 h-4" /> {creatingCat ? 'Đang tạo…' : 'Thêm danh mục'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <span className="text-xs text-gray-400">Chưa có danh mục nào</span>
            ) : categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 bg-gray-100 rounded-full pl-3 pr-1.5 py-1 text-sm">
                {c.name}
                <button onClick={() => deleteCategory(c.id, c.name)} className="text-gray-400 hover:text-red-600 p-0.5" title="Xóa">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Tìm bài viết…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="published">Đã đăng</option>
          <option value="scheduled">Lên lịch</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Chưa có bài viết nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Tiêu đề</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-40">Danh mục</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-28">Trạng thái</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-20">SEO</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-32">Cập nhật</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-32 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/posts/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">{p.title}</Link>
                    <div className="text-xs text-gray-500 mt-0.5">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.category_name
                      ? <span className="inline-block bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">{p.category_name}</span>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.seo_score !== null && (
                      <span className={`text-sm font-medium ${p.seo_score >= 80 ? 'text-green-600' : p.seo_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p.seo_score}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(p.updated_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'published' && (
                        <a href={`https://yokool.vn/news/${p.slug}`} target="_blank" rel="noopener"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Xem trên yokool.vn">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button type="button" onClick={() => archivePost(p)} disabled={actionLoading === p.id}
                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                        title={p.status === 'archived' ? 'Khôi phục về Nháp' : 'Lưu trữ (ẩn khỏi web)'}>
                        {p.status === 'archived' ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => deletePost(p)} disabled={actionLoading === p.id}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Xóa vĩnh viễn">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500 flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1"><Archive className="w-3 h-3" /> Lưu trữ: ẩn khỏi website, khôi phục được</span>
        <span className="flex items-center gap-1"><Trash2 className="w-3 h-3" /> Xóa: vĩnh viễn, không khôi phục được</span>
      </div>
    </div>
  );
}
