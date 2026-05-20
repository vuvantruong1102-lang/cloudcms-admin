import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api } from '../lib/api';

type PostRow = {
  id: string; slug: string; title: string; status: string;
  updated_at: number; seo_score: number | null;
  author_name: string; category_name: string | null;
};

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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    const data = await api.get<{ items: PostRow[] }>(`/posts?${params}`);
    setPosts(data.items);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Bài viết</h1>
        <Link to="/posts/new" className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Bài viết mới
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Tìm bài viết…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          />
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
                <th className="px-4 py-2 font-medium text-gray-600 w-28">Trạng thái</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-24">SEO</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-36">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/posts/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {p.title}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[p.status]}`}>
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.seo_score !== null && (
                      <span className={`text-sm font-medium ${
                        p.seo_score >= 80 ? 'text-green-600' :
                        p.seo_score >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {p.seo_score}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(p.updated_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
