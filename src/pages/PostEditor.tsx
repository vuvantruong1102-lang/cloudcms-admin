import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Rocket, ArrowLeft, RefreshCw, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import { api } from '../lib/api';
import { slugify } from '../lib/slugify';
import ArticleEditor from '../components/ArticleEditor';
import SeoPanel from '../components/SeoPanel';
import MediaPicker from '../components/MediaPicker';
import CategorySelect from '../components/CategorySelect';

type Post = {
  id: string; slug: string; title: string; excerpt: string;
  content_html: string; content_json: string;
  meta_title: string; meta_description: string; meta_keywords: string;
  focus_keyword: string; canonical_url: string;
  og_title: string; og_description: string; og_image_url: string;
  featured_image_id: string | null; featured_image_alt: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  robots_index: number; robots_follow: number;
  category_id: string | null;
  title_align: 'left' | 'center' | 'right';
};

const empty: Post = {
  id: '', slug: '', title: '', excerpt: '', content_html: '', content_json: '',
  meta_title: '', meta_description: '', meta_keywords: '',
  focus_keyword: '', canonical_url: '',
  og_title: '', og_description: '', og_image_url: '',
  featured_image_id: null, featured_image_alt: '',
  status: 'draft', robots_index: 1, robots_follow: 1, category_id: null,
  title_align: 'left',
};

export default function PostEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;

  const [post, setPost] = useState<Post>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState<number | null>(null);
  const [pickerMode, setPickerMode] = useState<'editor' | 'featured' | null>(null);

  // ===== Auto-slug: track xem user đã manual edit slug chưa =====
  // Nếu user edit slug bằng tay → STOP auto sync từ title
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // ===== Topbar height: đo runtime để toolbar sticky đúng vị trí =====
  const topbarRef = useRef<HTMLDivElement>(null);

  // Load nếu là edit
  useEffect(() => {
    if (!id) return;
    api.get<Post>(`/posts/${id}`).then((p) => {
      setPost({ ...empty, ...p });
      // Bài đã có slug từ trước → coi như user đã manual set (không auto override)
      if (p.slug) setSlugManuallyEdited(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // ===== Đo topbar height + set CSS variable cho sticky toolbar =====
  useEffect(() => {
    function updateTopbarHeight() {
      if (topbarRef.current) {
        const h = topbarRef.current.getBoundingClientRect().height;
        // Set CSS var trên body để ArticleEditor đọc được
        document.documentElement.style.setProperty('--editor-topbar-h', `${h}px`);
      }
    }
    updateTopbarHeight();
    window.addEventListener('resize', updateTopbarHeight);
    // Re-measure khi autoSaved hiện (topbar có thể cao thêm)
    const t = setTimeout(updateTopbarHeight, 100);
    return () => {
      window.removeEventListener('resize', updateTopbarHeight);
      clearTimeout(t);
    };
  }, [autoSaved, isNew]);

  function update<K extends keyof Post>(k: K, v: Post[K]) {
    setPost((p) => ({ ...p, [k]: v }));
  }

  // ===== Update title + auto-sync slug nếu chưa được edit thủ công =====
  function updateTitle(newTitle: string) {
    setPost((p) => {
      const next = { ...p, title: newTitle };
      if (!slugManuallyEdited) {
        next.slug = slugify(newTitle);
      }
      return next;
    });
  }

  // ===== Update slug thủ công - đánh dấu user đã edit =====
  function updateSlug(newSlug: string) {
    setSlugManuallyEdited(true);
    // Cũng auto clean slug khi gõ (loại space, ký tự lạ)
    const cleaned = slugify(newSlug);
    update('slug', cleaned);
  }

  // ===== Nút "Đặt lại từ tiêu đề" - reset slug về auto-sync =====
  function resetSlugFromTitle() {
    update('slug', slugify(post.title));
    setSlugManuallyEdited(false);
  }

  async function save(newStatus?: Post['status']) {
    setSaving(true);
    try {
      const payload = { ...post, status: newStatus ?? post.status };
      // Nếu chưa có slug khi save, generate từ title luôn
      if (!payload.slug && payload.title) {
        payload.slug = slugify(payload.title);
      }
      if (isNew) {
        const resp = await api.post<{ id: string }>('/posts', payload);
        nav(`/posts/${resp.id}`, { replace: true });
      } else {
        await api.put(`/posts/${id}`, payload);
      }
      if (newStatus) update('status', newStatus);
      setAutoSaved(Date.now());
    } catch (e: any) {
      alert('Lỗi lưu: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function archivePost() {
    const isArchived = post.status === 'archived';
    const msg = isArchived
      ? `Khôi phục bài "${post.title}" về trạng thái Nháp?`
      : `Lưu trữ bài "${post.title}"?\n\nBài sẽ ẩn khỏi website, nhưng vẫn giữ lại để khôi phục sau.`;

    if (!window.confirm(msg)) return;

    const newStatus = isArchived ? 'draft' : 'archived';
    await save(newStatus);
    alert(isArchived ? 'Đã khôi phục bài.' : 'Đã lưu trữ. Bài đã ẩn khỏi website.');
  }

  async function deletePost() {
    if (!window.confirm(`⚠️ XÓA VĨNH VIỄN bài "${post.title}"?\n\nHành động này KHÔNG THỂ HOÀN TÁC.\n\nNếu chỉ muốn ẩn, hãy dùng "Lưu trữ" thay vì xóa.`)) return;

    const confirm2 = window.prompt(`Để xác nhận xóa, gõ chữ "XOA" (viết hoa, không dấu) rồi bấm OK:`);
    if (confirm2 !== 'XOA') {
      alert('Đã hủy xóa.');
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/posts/${id}`);
      alert('Đã xóa bài viết.');
      nav('/posts', { replace: true });
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
      setSaving(false);
    }
  }

  // Autosave: khi không phải bài mới, debounce 3s sau khi edit
  useEffect(() => {
    if (isNew || !post.title) return;
    const t = setTimeout(() => save(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [post.title, post.content_html, post.meta_description, post.focus_keyword]);

  function onPickImage(m: { url: string; alt_text: string | null; id: string }) {
    if (pickerMode === 'featured') {
      update('og_image_url', m.url);
      update('featured_image_id', m.id);
      if (m.alt_text) update('featured_image_alt', m.alt_text);
    } else if (pickerMode === 'editor') {
      const html = `<p><img src="${m.url}" alt="${m.alt_text ?? ''}" /></p>`;
      update('content_html', (post.content_html ?? '') + html);
    }
    setPickerMode(null);
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Đang tải…</div>;

  const siteHost = window.location.host;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar - sticky top-0 */}
      <div
        ref={topbarRef}
        className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sticky top-14 lg:top-0 z-20"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => nav('/posts')} className="p-1.5 hover:bg-gray-100 rounded flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium truncate">{isNew ? 'Bài viết mới' : 'Chỉnh sửa bài'}</span>
          {autoSaved && (
            <span className="hidden sm:inline text-xs text-gray-500">
              Đã lưu • {new Date(autoSaved).toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Nút Archive + Delete - chỉ hiện khi đã có bài (không phải bài mới) */}
          {!isNew && (
            <>
              <button
                onClick={archivePost}
                disabled={saving}
                className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 disabled:opacity-50"
                title={post.status === 'archived' ? 'Khôi phục bài' : 'Lưu trữ (ẩn khỏi web)'}
              >
                {post.status === 'archived'
                  ? <><ArchiveRestore className="w-3.5 h-3.5 inline sm:mr-1" /> <span className="hidden sm:inline">Khôi phục</span></>
                  : <><Archive className="w-3.5 h-3.5 inline sm:mr-1" /> <span className="hidden sm:inline">Lưu trữ</span></>
                }
              </button>
              <button
                onClick={deletePost}
                disabled={saving}
                className="text-sm px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-red-50 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                title="Xóa vĩnh viễn"
              >
                <Trash2 className="w-3.5 h-3.5 inline sm:mr-1" /> <span className="hidden sm:inline">Xóa</span>
              </button>
              <div className="hidden sm:block w-px h-5 bg-gray-300 mx-1" />
            </>
          )}

          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="text-sm px-2.5 sm:px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 inline sm:mr-1" /> <span className="hidden sm:inline">Lưu nháp</span>
          </button>
          <button
            onClick={() => save('published')}
            disabled={saving || !post.title}
            className="text-sm px-2.5 sm:px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Rocket className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">{post.status === 'published' ? 'Cập nhật' : 'Xuất bản'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-3 sm:p-4 max-w-[1400px] mx-auto w-full">
        {/* LEFT: Editor */}
        <div className="space-y-3">
          <input
            value={post.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Nhập tiêu đề bài viết…"
            className="w-full text-xl sm:text-2xl font-semibold py-2 px-1 border-0 focus:outline-none bg-transparent"
          />

          {/* URL row - hiển thị slug auto-generate hoặc cho phép custom */}
          <div className="flex items-center gap-2 text-xs text-gray-500 px-1 flex-wrap">
            <span>URL:</span>
            <span className="text-gray-400">/blog/</span>
            <input
              value={post.slug}
              onChange={(e) => updateSlug(e.target.value)}
              placeholder={post.title ? slugify(post.title) : 'auto-tu-tieu-de'}
              className="border border-gray-200 rounded px-2 py-0.5 text-xs font-mono flex-1 min-w-[200px] focus:border-blue-400 focus:outline-none"
            />
            {slugManuallyEdited && post.title && (
              <button
                onClick={resetSlugFromTitle}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                title="Đặt lại slug tự động từ tiêu đề"
                type="button"
              >
                <RefreshCw className="w-3 h-3" />
                Đặt lại từ tiêu đề
              </button>
            )}
            {!slugManuallyEdited && post.title && (
              <span className="text-xs text-green-600">✓ Tự động</span>
            )}
          </div>

          <ArticleEditor
            initialHtml={post.content_html}
            onChange={(html, json) => {
              update('content_html', html);
              update('content_json', JSON.stringify(json));
            }}
            onPickImage={() => setPickerMode('editor')}
          />

          <details className="bg-white border border-gray-200 rounded-md p-3">
            <summary className="cursor-pointer text-sm font-medium">Mô tả ngắn (excerpt)</summary>
            <textarea
              value={post.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              placeholder="Mô tả ngắn cho bài viết, hiển thị ở trang danh sách…"
              className="w-full mt-2 px-3 py-2 border border-gray-200 rounded text-sm resize-y min-h-[80px]"
            />
          </details>
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-3">
          {/* Featured image */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Ảnh đại diện / OG image</div>
            {post.og_image_url ? (
              <div className="relative">
                <img src={post.og_image_url} alt={post.featured_image_alt} className="w-full rounded-md border border-gray-200" />
                <button
                  onClick={() => { update('og_image_url', ''); update('featured_image_id', null); }}
                  className="absolute top-1 right-1 bg-white/90 text-xs px-2 py-0.5 rounded shadow-sm border border-gray-200"
                >
                  Xóa
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickerMode('featured')}
                className="w-full aspect-video bg-gray-50 rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-100 text-xs"
              >
                <span className="text-2xl mb-1">🖼️</span>
                Chọn ảnh
              </button>
            )}
            <input
              value={post.featured_image_alt}
              onChange={(e) => update('featured_image_alt', e.target.value)}
              placeholder="Alt text"
              className="w-full mt-2 px-2 py-1 border border-gray-200 rounded text-xs"
            />
          </div>

          {/* Category select */}
          <CategorySelect
            value={post.category_id}
            onChange={(id) => update('category_id', id)}
          />

          {/* Title alignment */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Căn lề tiêu đề bài viết</div>
            <div className="grid grid-cols-3 gap-1">
              {([
                { value: 'left', label: 'Trái', icon: '⬅' },
                { value: 'center', label: 'Giữa', icon: '⬆' },
                { value: 'right', label: 'Phải', icon: '➡' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('title_align', opt.value)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded border text-xs ${
                    post.title_align === opt.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base leading-none">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Áp dụng cho tiêu đề H1 hiển thị trên trang bài viết.
            </div>
          </div>

          {/* SEO Panel */}
          <SeoPanel
            title={post.title}
            slug={post.slug}
            metaTitle={post.meta_title}
            metaDescription={post.meta_description}
            focusKeyword={post.focus_keyword}
            contentHtml={post.content_html}
            ogImageUrl={post.og_image_url}
            featuredImageAlt={post.featured_image_alt}
            siteHost={siteHost}
            onApplyMetaDescription={(s) => update('meta_description', s)}
            onApplyKeywords={(kws) => update('meta_keywords', kws.join(', '))}
          />

          {/* Meta fields */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-700 mb-2">Metadata SEO</div>

            <div>
              <label className="text-xs text-gray-500">Từ khóa chính</label>
              <input
                value={post.focus_keyword}
                onChange={(e) => update('focus_keyword', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Meta title</label>
              <input
                value={post.meta_title}
                onChange={(e) => update('meta_title', e.target.value)}
                placeholder={post.title}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 flex justify-between">
                <span>Meta description</span>
                <span className={post.meta_description.length > 160 ? 'text-red-600' : ''}>
                  {post.meta_description.length}/160
                </span>
              </label>
              <textarea
                value={post.meta_description}
                onChange={(e) => update('meta_description', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs resize-y min-h-[60px]"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500">Meta keywords (cách nhau bằng dấu phẩy)</label>
              <input
                value={post.meta_keywords}
                onChange={(e) => update('meta_keywords', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
              />
            </div>

            <details>
              <summary className="text-xs text-gray-600 cursor-pointer mt-2">Tùy chọn nâng cao</summary>
              <div className="space-y-2 mt-2">
                <div>
                  <label className="text-xs text-gray-500">Canonical URL</label>
                  <input
                    value={post.canonical_url}
                    onChange={(e) => update('canonical_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!post.robots_index}
                    onChange={(e) => update('robots_index', e.target.checked ? 1 : 0)}
                  />
                  Cho phép Google index
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!!post.robots_follow}
                    onChange={(e) => update('robots_follow', e.target.checked ? 1 : 0)}
                  />
                  Cho phép follow links
                </label>
              </div>
            </details>
          </div>
        </div>
      </div>

      <MediaPicker open={pickerMode !== null} onClose={() => setPickerMode(null)} onSelect={onPickImage} />
    </div>
  );
}
