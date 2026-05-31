import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar as CalIcon } from 'lucide-react';
import { api } from '../lib/api';

type Target = { platform: string; status: string };
type ContentRow = {
  id: string; title: string; content_type: string; status: string;
  scheduled_at: number | null; assigned_name: string | null; targets?: Target[];
};

const PF: Record<string, { short: string; color: string }> = {
  youtube: { short: 'YT', color: 'bg-red-600' },
  facebook: { short: 'FB', color: 'bg-blue-600' },
  zalo: { short: 'ZL', color: 'bg-sky-500' },
  tiktok: { short: 'TT', color: 'bg-black' },
};

const STATUS: Record<string, { label: string; cls: string }> = {
  idea: { label: 'Ý tưởng', cls: 'bg-gray-100 text-gray-700' },
  draft: { label: 'Nháp', cls: 'bg-amber-100 text-amber-700' },
  review: { label: 'Chờ duyệt', cls: 'bg-orange-100 text-orange-700' },
  scheduled: { label: 'Đã lên lịch', cls: 'bg-blue-100 text-blue-700' },
  posted: { label: 'Đã đăng', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Lưu trữ', cls: 'bg-gray-100 text-gray-500' },
};

const TYPE: Record<string, string> = { video: 'Video', post: 'Bài + ảnh', article: 'Bài viết dài' };

export default function ContentList() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (platform) p.set('platform', platform);
    p.set('limit', '100');
    const data = await api.get<{ items: ContentRow[] }>(`/content?${p}`);
    setItems(data.items);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, platform]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
        <h1 className="text-lg sm:text-xl font-semibold">Nội dung</h1>
        <div className="flex gap-2">
          <Link to="/calendar" className="flex-1 sm:flex-none justify-center border border-gray-300 px-3 py-2 rounded-md text-sm flex items-center gap-1 hover:bg-gray-50">
            <CalIcon className="w-4 h-4" /> Lịch
          </Link>
          <Link to="/content/new" className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tạo nội dung
          </Link>
        </div>
      </div>

      <div className="flex flex-col xs:flex-row sm:flex-row gap-2 sm:gap-3 mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
          <option value="">Mọi nền tảng</option>
          {Object.entries(PF).map(([k, v]) => <option key={k} value={k}>{v.short}</option>)}
        </select>
      </div>

      {/* ===== MOBILE: thẻ ===== */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">Chưa có nội dung nào</div>
        ) : items.map((it) => (
          <Link key={it.id} to={`/content/${it.id}`} className="block bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-gray-900 leading-snug">{it.title}</span>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${STATUS[it.status]?.cls ?? ''}`}>
                {STATUS[it.status]?.label ?? it.status}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs text-gray-500">
              <span>{TYPE[it.content_type] ?? it.content_type}</span>
              <span>{it.scheduled_at ? new Date(it.scheduled_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Chưa đặt lịch'}</span>
              <span className="flex gap-1">
                {(it.targets ?? []).map((t) => (
                  <span key={t.platform}
                    className={`inline-flex items-center justify-center text-white text-[10px] font-bold w-6 h-5 rounded ${PF[t.platform]?.color ?? 'bg-gray-400'} ${t.status === 'posted' ? 'ring-2 ring-green-400' : ''}`}>
                    {PF[t.platform]?.short ?? '?'}
                  </span>
                ))}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ===== DESKTOP/TABLET: bảng ===== */}
      <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Chưa có nội dung nào</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium text-gray-600 w-36">Lịch đăng</th>
                <th className="px-4 py-2 font-medium text-gray-600">Tiêu đề</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-28">Loại</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-32">Nền tảng</th>
                <th className="px-4 py-2 font-medium text-gray-600 w-28">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {it.scheduled_at ? new Date(it.scheduled_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/content/${it.id}`} className="font-medium text-gray-900 hover:text-blue-600">{it.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{TYPE[it.content_type] ?? it.content_type}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(it.targets ?? []).map((t) => (
                        <span key={t.platform}
                          className={`inline-flex items-center justify-center text-white text-[10px] font-bold w-6 h-5 rounded ${PF[t.platform]?.color ?? 'bg-gray-400'} ${t.status === 'posted' ? 'ring-2 ring-green-400' : ''}`}>
                          {PF[t.platform]?.short ?? '?'}
                        </span>
                      ))}
                      {(!it.targets || it.targets.length === 0) && <span className="text-xs text-gray-400">chưa gắn</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS[it.status]?.cls ?? ''}`}>
                      {STATUS[it.status]?.label ?? it.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
