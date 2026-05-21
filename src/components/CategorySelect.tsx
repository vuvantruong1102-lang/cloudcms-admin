import { useEffect, useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { api } from '../lib/api';

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Props = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

export default function CategorySelect({ value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // Backend /api/categories trả về array trực tiếp (không wrap trong { items: [...] })
      const data = await api.get<Category[] | { items: Category[] }>('/categories');
      // Hỗ trợ cả 2 format để tương lai đổi backend không gãy
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setCategories(list);
    } catch (e) {
      console.error('Lỗi tải danh mục:', e);
      setCategories([]); // đảm bảo không bị undefined
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createCategory() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const slug = newName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      const resp = await api.post<{ id: string }>('/categories', {
        name: newName.trim(),
        slug,
      });
      // Reload và auto-select category mới
      await load();
      onChange(resp.id);
      setNewName('');
      setShowCreate(false);
    } catch (e: any) {
      alert('Lỗi tạo danh mục: ' + e.message);
    } finally {
      setCreating(false);
    }
  }

  const selected = categories.find((c) => c.id === value);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5" />
          Danh mục
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Tạo mới
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-gray-400">Đang tải…</div>
      ) : (
        <>
          {/* Dropdown chọn */}
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
          >
            <option value="">— Chưa phân loại —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {selected && (
            <div className="mt-1.5 text-xs text-gray-400">
              Slug: <code className="bg-gray-50 px-1 rounded font-mono">{selected.slug}</code>
            </div>
          )}

          {/* Form tạo nhanh */}
          {showCreate && (
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
              <div className="flex items-center gap-1 mb-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createCategory();
                    if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
                  }}
                  placeholder="Tên danh mục mới…"
                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                />
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={createCategory}
                disabled={!newName.trim() || creating}
                className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Đang tạo…' : 'Tạo danh mục'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
