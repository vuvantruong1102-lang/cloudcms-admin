import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, Sparkles, Save, Check, Trash2, Plus } from 'lucide-react';
import { api } from '../lib/api';

const PLATFORMS: Record<string, { label: string; short: string; color: string; open: string }> = {
  youtube: { label: 'YouTube', short: 'YT', color: 'border-l-red-600', open: 'https://studio.youtube.com/' },
  facebook: { label: 'Facebook', short: 'FB', color: 'border-l-blue-600', open: 'https://www.facebook.com/' },
  zalo: { label: 'Zalo', short: 'ZL', color: 'border-l-sky-500', open: 'https://oa.zalo.me/' },
  tiktok: { label: 'TikTok', short: 'TT', color: 'border-l-black', open: 'https://www.tiktok.com/upload' },
};
const STATUSES = ['idea', 'draft', 'review', 'scheduled', 'posted', 'archived'];
const STATUS_LABEL: Record<string, string> = {
  idea: 'Ý tưởng', draft: 'Nháp', review: 'Chờ duyệt', scheduled: 'Đã lên lịch', posted: 'Đã đăng', archived: 'Lưu trữ',
};
const TYPES: Record<string, string> = { video: 'Video', post: 'Bài + ảnh', article: 'Bài viết dài' };

type Target = { id: string; platform: string; caption: string | null; status: string; posted_url: string | null };
type Template = { id: string; name: string; platform: string; body: string };

// datetime-local <-> epoch ms helpers (local time)
function msToLocal(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToMs(v: string): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return isNaN(t) ? null : t;
}

export default function ContentEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('post');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('idea');
  const [scheduledAt, setScheduledAt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [newPlatforms, setNewPlatforms] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    const data = await api.get<any>(`/content/${id}`);
    setTitle(data.title); setContentType(data.content_type); setBody(data.body ?? '');
    setStatus(data.status); setScheduledAt(msToLocal(data.scheduled_at)); setLinkUrl(data.link_url ?? '');
    setTargets(data.targets ?? []);
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    api.get<{ items: Template[] }>('/templates').then((d) => setTemplates(d.items)).catch(() => {});
    // probe AI availability cheaply: ask templates ok, then assume AI by trying a HEAD-like call is overkill;
    // we just enable and let the button show — backend returns error gracefully if not configured.
    setAiEnabled(true);
    load();
  }, [load]);

  async function createPost() {
    if (!title.trim()) { alert('Cần nhập tên nội dung'); return; }
    const sched = localToMs(scheduledAt);
    const res = await api.post<{ id: string }>('/content', {
      title, content_type: contentType, body,
      scheduled_at: sched, status: sched ? 'scheduled' : 'idea',
      platforms: newPlatforms,
    });
    nav(`/content/${res.id}`);
  }

  async function savePost() {
    await api.put(`/content/${id}`, {
      title, content_type: contentType, body, status,
      scheduled_at: localToMs(scheduledAt), link_url: linkUrl,
    });
    alert('Đã lưu');
  }

  async function deletePost() {
    if (!window.confirm('Xoá nội dung này?')) return;
    await api.delete(`/content/${id}`);
    nav('/content');
  }

  async function addPlatform(pf: string) {
    await api.put(`/content/${id}`, { targets: [{ platform: pf, caption: '', status: 'pending' }] });
    load();
  }

  if (isNew) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-semibold mb-6">Tạo nội dung mới</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <Field label="Tên nội dung *">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="VD: Review sạc JP395" />
          </Field>
          <Field label="Loại nội dung">
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="input">
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Mô tả / kịch bản gốc">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="input" />
          </Field>
          <Field label="Đăng lên nền tảng nào?">
            <div className="flex gap-4 flex-wrap">
              {Object.entries(PLATFORMS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={newPlatforms.includes(k)}
                    onChange={(e) => setNewPlatforms((p) => e.target.checked ? [...p, k] : p.filter((x) => x !== k))} />
                  {v.label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Lịch đăng (tuỳ chọn)">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" />
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={createPost} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Tạo nội dung</button>
            <button onClick={() => nav('/content')} className="border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50">Huỷ</button>
          </div>
        </div>
        <style>{inputStyle}</style>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-gray-500">Đang tải…</div>;

  const activePlatforms = targets.map((t) => t.platform);
  const inactivePlatforms = Object.keys(PLATFORMS).filter((k) => !activePlatforms.includes(k));

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex gap-2">
          <button onClick={deletePost} className="border border-gray-300 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Xoá
          </button>
          <button onClick={() => nav('/content')} className="border border-gray-300 px-3 py-2 rounded-md text-sm hover:bg-gray-50">← Danh sách</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <Field label="Tên nội dung">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại">
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="input">
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Lịch đăng">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" />
          </Field>
          <Field label="Mô tả / kịch bản gốc">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="input" />
          </Field>
          <Field label="Link bài viết web (nếu có)">
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="input" placeholder="https://yokool.vn/news/..." />
          </Field>
          <button onClick={savePost} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
            <Save className="w-4 h-4" /> Lưu thông tin chung
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-sm font-medium text-gray-600 mb-3">Thêm nền tảng</div>
          <div className="space-y-2">
            {inactivePlatforms.length === 0 ? (
              <span className="text-xs text-gray-400">Đã thêm đủ 4 nền tảng</span>
            ) : inactivePlatforms.map((k) => (
              <button key={k} onClick={() => addPlatform(k)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center gap-1">
                <Plus className="w-4 h-4" /> {PLATFORMS[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-7 mb-4">Caption từng nền tảng</h2>
      <div className="grid grid-cols-2 gap-4">
        {targets.map((t) => (
          <TargetCard key={t.id} contentId={id!} target={t} templates={templates}
            aiEnabled={aiEnabled} topic={title} productInfo={body} onChange={load} />
        ))}
        {targets.length === 0 && <p className="text-sm text-gray-400">Chưa gắn nền tảng nào. Dùng "Thêm nền tảng" bên trên.</p>}
      </div>
      <style>{inputStyle}</style>
    </div>
  );
}

function TargetCard({ contentId, target, templates, aiEnabled, topic, productInfo, onChange }: {
  contentId: string; target: Target; templates: Template[]; aiEnabled: boolean;
  topic: string; productInfo: string; onChange: () => void;
}) {
  const pf = PLATFORMS[target.platform];
  const [caption, setCaption] = useState(target.caption ?? '');
  const [postedUrl, setPostedUrl] = useState(target.posted_url ?? '');
  const [busy, setBusy] = useState(false);
  const isPosted = target.status === 'posted';
  const tpl = templates.filter((x) => x.platform === target.platform || x.platform === 'all');

  async function save(extra: any = {}) {
    await api.put(`/content/${contentId}`, { targets: [{ platform: target.platform, caption, ...extra }] });
  }
  async function copy() {
    try { await navigator.clipboard.writeText(caption); alert('Đã copy caption'); }
    catch { alert('Không copy được, hãy chọn tay'); }
  }
  async function runAI() {
    setBusy(true);
    try {
      const res = await api.post<{ caption: string }>('/ai/caption', { platform: target.platform, topic, productInfo });
      if (res.caption) setCaption(res.caption);
    } catch (e: any) { alert('AI lỗi: ' + e.message); }
    finally { setBusy(false); }
  }
  async function togglePosted() {
    await save({ status: isPosted ? 'pending' : 'posted', posted_url: postedUrl });
    onChange();
  }
  async function remove() {
    if (!window.confirm(`Bỏ ${pf.label} khỏi bài này?`)) return;
    await api.put(`/content/${contentId}`, { delete_platform: target.platform });
    onChange();
  }

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${pf.color} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{pf.label}</span>
        {isPosted && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Đã đăng</span>}
      </div>
      {tpl.length > 0 && (
        <select onChange={(e) => { if (e.target.value) { setCaption((c) => c ? c + '\n' + e.target.value : e.target.value); e.target.value = ''; } }}
          className="input mb-2 text-xs">
          <option value="">— Chọn mẫu caption —</option>
          {tpl.map((x) => <option key={x.id} value={x.body}>{x.name}</option>)}
        </select>
      )}
      <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={5}
        className="input text-sm" placeholder={`Caption cho ${pf.label}...`} />
      <div className="flex gap-1 flex-wrap mt-2">
        <Btn onClick={copy} icon={Copy}>Copy</Btn>
        <a href={pf.open} target="_blank" rel="noopener" className="btn-ghost"><ExternalLink className="w-3.5 h-3.5" /> Mở</a>
        {aiEnabled && <Btn onClick={runAI} icon={Sparkles} disabled={busy}>{busy ? '...' : 'AI'}</Btn>}
        <Btn onClick={() => save().then(() => alert('Đã lưu caption'))} icon={Save}>Lưu</Btn>
        <Btn onClick={togglePosted} icon={Check}>{isPosted ? 'Bỏ đăng' : 'Đã đăng'}</Btn>
        <button onClick={remove} className="btn-ghost text-red-600">Bỏ</button>
      </div>
      {isPosted && (
        <input value={postedUrl} onChange={(e) => setPostedUrl(e.target.value)} placeholder="Link bài đã đăng"
          className="input text-xs mt-2" onBlur={() => save({ status: 'posted', posted_url: postedUrl })} />
      )}
      <style>{btnStyle}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm text-gray-600 mb-1">{label}</label>{children}</div>;
}
function Btn({ onClick, icon: Icon, children, disabled }: any) {
  return <button onClick={onClick} disabled={disabled} className="btn-ghost disabled:opacity-50"><Icon className="w-3.5 h-3.5" /> {children}</button>;
}

const inputStyle = `.input{width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;background:#fff;}
textarea.input{resize:vertical;font-family:inherit;}`;
const btnStyle = `.btn-ghost{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;background:#fff;cursor:pointer;}
.btn-ghost:hover{background:#f9fafb;}`;
