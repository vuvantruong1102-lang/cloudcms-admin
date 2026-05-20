import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

type Category = {
  id: string; slug: string; name: string; description: string | null;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await api.get<Category[]>('/categories');
    setItems(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/categories', {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      });
      setName(''); setSlug(''); setDescription('');
      setShowForm(false);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string, name: string) {
    if (!confirm(`Xóa danh mục "${name}"? Các bài viết thuộc danh mục này sẽ bị bỏ liên kết.`)) return;
    await api.delete(`/categories/${id}`);
    setItems((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Danh mục</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Thêm danh mục
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Tên danh mục</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="VD: Tin tức"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Slug (tự động nếu để trống)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
              placeholder="tin-tuc"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm resize-y"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Đang lưu…' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">Chưa có danh mục nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-gray-600">Tên</th>
                <th className="px-4 py-2 font-medium text-gray-600">Slug</th>
                <th className="px-4 py-2 font-medium text-gray-600">Mô tả</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.slug}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => del(c.id, c.name)} className="text-gray-400 hover:text-red-600 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
