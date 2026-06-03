import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Code2, Eye, Download, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';

type Article = {
  id: string; title: string; slug: string | null;
  html: string; excerpt: string | null; updated_at: number; created_at: number;
};

export default function LibraryEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === 'new';

  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [tab, setTab] = useState<'code' | 'preview'>('code');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    const a = await api.get<Article>(`/library/${id}`);
    setTitle(a.title);
    setHtml(a.html ?? '');
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!title.trim()) { alert('Nhập tiêu đề bài viết'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const a = await api.post<Article>('/library', { title: title.trim(), html });
        nav(`/library/${a.id}`, { replace: true });
      } else {
        await api.put(`/library/${id}`, { title: title.trim(), html });
      }
    } catch (e: any) { alert('Lỗi: ' + e.message); }
    finally { setSaving(false); }
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (title.trim() || 'bai-viet') + '.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  if (loading) return <div className="p-8 text-gray-500 text-sm">Đang tải…</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 sticky top-[var(--mobile-header-h,0px)] z-20">
        <button onClick={() => nav('/library')} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md shrink-0"><ArrowLeft className="w-5 h-5" /></button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề bài viết *"
          className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-transparent hover:border-gray-200 focus:border-blue-300 rounded-md font-medium" />
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button onClick={copyHtml} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="Copy HTML">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={downloadHtml} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="Tải file .html"><Download className="w-4 h-4" /></button>
          <button onClick={save} disabled={saving}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 flex gap-1">
        <button onClick={() => setTab('code')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px ${tab === 'code' ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Code2 className="w-4 h-4" /> Mã HTML
        </button>
        <button onClick={() => setTab('preview')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px ${tab === 'preview' ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <Eye className="w-4 h-4" /> Xem trước
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 bg-gray-50">
        {tab === 'code' ? (
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            placeholder="Dán hoặc viết mã HTML của bài viết ở đây…"
            className="w-full h-full min-h-[60vh] p-4 sm:p-6 font-mono text-[13px] leading-relaxed bg-white border-0 resize-none focus:outline-none"
          />
        ) : (
          <iframe
            title="preview"
            srcDoc={html}
            sandbox="allow-same-origin"
            className="w-full h-full min-h-[60vh] bg-white border-0"
          />
        )}
      </div>
    </div>
  );
}
