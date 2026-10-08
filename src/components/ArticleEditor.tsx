import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as UIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link2, Image as ImageIcon, Sparkles, Redo, Undo,
  Youtube as YoutubeIcon, Info, AlertTriangle, CheckCircle, Lightbulb,
  Table as TableIcon, Upload, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Type,
  HelpCircle, FileCode,
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { ResizableImage } from '../lib/ResizableImage';
import { Callout } from '../lib/CalloutExtension';
import { CTABlock, type CTAData } from '../lib/CTAExtension';
import { FontSize } from '../lib/FontSizeExtension';
import { FAQBlock, type FAQData } from '../lib/FAQExtension';
import FAQManager, { type FAQEntry } from './FAQManager';

// Handle mà ArticleEditor expose ra component cha, để cha chèn ảnh
// (từ media picker) đúng vào vị trí con trỏ đã lưu, thay vì nối vào cuối.
export type EditorHandle = {
  insertImageAtCursor: (url: string, alt?: string) => void;
};

type Props = {
  initialHtml: string;
  onChange: (html: string, json: any) => void;
  onPickImage: () => void; // mở media picker
  onReady?: (handle: EditorHandle) => void; // cha nhận handle để chèn ảnh
};

const FONTS = [
  { label: 'Mặc định', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
];

// Color palette: 14 màu preset thường dùng + 1 ô tự chọn
const COLORS = [
  { label: 'Mặc định', value: '' }, // empty = unsetColor
  { label: 'Đen', value: '#1a1a1a' },
  { label: 'Xám đậm', value: '#4b5563' },
  { label: 'Xám nhạt', value: '#9ca3af' },
  { label: 'Đỏ thương hiệu', value: '#DC143B' },
  { label: 'Đỏ', value: '#dc2626' },
  { label: 'Cam', value: '#ea580c' },
  { label: 'Vàng', value: '#ca8a04' },
  { label: 'Xanh lá', value: '#16a34a' },
  { label: 'Xanh ngọc', value: '#0891b2' },
  { label: 'Xanh dương', value: '#2563eb' },
  { label: 'Tím', value: '#7c3aed' },
  { label: 'Hồng', value: '#db2777' },
  { label: 'Nâu', value: '#92400e' },
];

// Font size presets — 6 mức phổ biến + custom input
const FONT_SIZES = [
  { label: 'Rất nhỏ', value: '12px' },
  { label: 'Nhỏ', value: '14px' },
  { label: 'Bình thường', value: '' },     // empty = unset (default 16px)
  { label: 'Hơi lớn', value: '18px' },
  { label: 'Lớn', value: '22px' },
  { label: 'Rất lớn', value: '28px' },
  { label: 'Khổng lồ', value: '36px' },
];

export default function ArticleEditor({ initialHtml, onChange, onPickImage, onReady }: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  // Vị trí con trỏ được lưu lại ngay trước khi mở media picker,
  // để khi ảnh được chọn xong vẫn chèn đúng chỗ (picker làm editor mất focus).
  const savedPosRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showCtaModal, setShowCtaModal] = useState(false);
  // null = chèn mới; số = đang sửa node CTA tại vị trí đó
  const [ctaEditPos, setCtaEditPos] = useState<number | null>(null);
  const [ctaDraft, setCtaDraft] = useState<CTAData>({
    eyebrow: 'KHÁM PHÁ THÊM',
    title: '',
    buttonText: 'Xem sản phẩm →',
    buttonHref: '',
  });
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [customFontSize, setCustomFontSize] = useState('');
  const [showHtmlPasteDialog, setShowHtmlPasteDialog] = useState(false);
  const [htmlPasteContent, setHtmlPasteContent] = useState('');
  // 'paste' = dán HTML mới (trống); 'edit' = sửa HTML hiện tại (nạp sẵn nội dung bài)
  const [htmlDialogMode, setHtmlDialogMode] = useState<'paste' | 'edit'>('paste');
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [currentFAQs, setCurrentFAQs] = useState<FAQEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      ResizableImage,
      Callout,
      CTABlock,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
      Placeholder.configure({
        placeholder: 'Bắt đầu viết bài… Kéo thả ảnh hoặc Ctrl+V để chèn ảnh nhanh.',
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        modestBranding: true,
        HTMLAttributes: { class: 'youtube-embed' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FAQBlock,
    ],
    content: initialHtml,
    onUpdate({ editor }) {
      onChange(editor.getHTML(), editor.getJSON());
    },
    editorProps: {
      // Paste ảnh từ clipboard
      handlePaste(_view, event) {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) uploadAndInsert(file);
          return true;
        }
        return false;
      },
      // Drag-drop file ảnh từ máy
      handleDrop(view, event, _slice, moved) {
        if (moved) return false; // di chuyển node trong editor, không phải drop file
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        // Chèn ngay tại vị trí thả chuột, không phải vị trí con trỏ cũ.
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const dropPos = coords ? coords.pos : null;
        imageFiles.forEach((f) => uploadAndInsert(f, dropPos));
        return true;
      },
    },
  });

  // Cập nhật content khi initialHtml đổi (vd: load bài đã có)
  useEffect(() => {
    if (editor && initialHtml !== editor.getHTML()) {
      editor.commands.setContent(initialHtml || '', false);
    }
    // eslint-disable-next-line
  }, [initialHtml, editor]);

  const uploadAndInsert = useCallback(
    async (file: File, pos?: number | null) => {
      if (!editor) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await api.post<{ id: string; url: string; filename: string }>(
          '/media/upload',
          fd
        );
        const chain = editor.chain();
        // Chèn tại vị trí chỉ định (vd: chỗ thả ảnh); nếu không có thì tại con trỏ.
        if (pos != null) chain.focus(pos);
        else chain.focus();
        chain
          .setResizableImage({
            src: result.url,
            alt: result.filename.replace(/\.[^.]+$/, ''),
          })
          .run();
      } catch (e: any) {
        alert('Lỗi upload ảnh: ' + e.message);
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  // Bấm nút ảnh trên thanh công cụ: lưu vị trí con trỏ hiện tại
  // rồi mới mở media picker (vì mở picker sẽ làm editor mất focus/selection).
  const handlePickImageClick = useCallback(() => {
    if (editor) savedPosRef.current = editor.state.selection.from;
    onPickImage();
  }, [editor, onPickImage]);

  // Chèn ảnh (từ media picker) đúng vào vị trí con trỏ đã lưu.
  const insertImageAtCursor = useCallback(
    (url: string, alt?: string) => {
      if (!editor) return;
      const pos = savedPosRef.current;
      const chain = editor.chain();
      // focus đúng vị trí đã lưu; nếu không có thì focus hiện tại
      if (pos != null) chain.focus(pos);
      else chain.focus();
      chain.setResizableImage({ src: url, alt: alt ?? '' }).run();
      savedPosRef.current = null;
    },
    [editor]
  );

  // Expose handle cho component cha (PostEditor) một lần khi editor sẵn sàng.
  useEffect(() => {
    if (editor && onReady) onReady({ insertImageAtCursor });
    // eslint-disable-next-line
  }, [editor]);

  async function aiContinue() {
    if (!editor) return;
    const context = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n').slice(-1000);
    if (context.length < 30) {
      alert('Cần viết ít nhất 30 ký tự để AI có ngữ cảnh');
      return;
    }
    setAiLoading(true);
    try {
      const { text } = await api.post<{ text: string }>('/ai/continue-writing', { context });
      const paragraphs = text.split('\n').filter(Boolean);
      paragraphs.forEach((p) => {
        editor.chain().focus().insertContent(`<p>${p}</p>`).run();
      });
    } catch (e: any) {
      alert('Lỗi AI: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  }

  function insertYoutube() {
    const url = window.prompt('Nhập URL YouTube (vd: https://www.youtube.com/watch?v=...):');
    if (!url || !editor) return;
    editor.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function setCallout(type: 'info' | 'warning' | 'success' | 'tip') {
    editor?.chain().focus().toggleCallout(type).run();
    setShowCalloutMenu(false);
  }

  // Mở modal CTA (lựa chọn mới trong nhóm Callout)
  function openCtaModal() {
    setCtaEditPos(null); // chèn mới
    setCtaDraft({
      eyebrow: 'KHÁM PHÁ THÊM',
      title: '',
      buttonText: 'Xem sản phẩm →',
      buttonHref: 'https://yokool.vn/o-dien-du-lich/',
    });
    setShowCalloutMenu(false);
    setShowCtaModal(true);
  }

  function insertCta() {
    if (!editor) return;
    if (!ctaDraft.title.trim()) return;
    if (ctaEditPos != null) {
      // Đang sửa khối CTA có sẵn
      editor.chain().focus().updateCtaBlock(ctaEditPos, ctaDraft).run();
    } else {
      // Chèn khối CTA mới
      editor.chain().focus().setCtaBlock(ctaDraft).run();
    }
    setShowCtaModal(false);
    setCtaEditPos(null);
  }

  // Lắng nghe double-click trên khối CTA (từ nodeView) để mở modal sửa.
  useEffect(() => {
    if (!editor) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        pos: number;
        data: CTAData;
      };
      if (!detail) return;
      setCtaEditPos(detail.pos);
      setCtaDraft(detail.data);
      setShowCtaModal(true);
    };
    const el = editor.view.dom;
    el.addEventListener('yk-cta-edit', handler as EventListener);
    return () => el.removeEventListener('yk-cta-edit', handler as EventListener);
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`;

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 border border-gray-200 rounded-md mb-3 sticky z-10 shadow-sm"
        style={{ top: 'calc(var(--editor-topbar-h, 44px) + var(--mobile-header-h, 0px))' }}
      >
        <select
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1 | 2 | 3 }).run();
          }}
          value={
            editor.isActive('heading', { level: 1 }) ? '1' :
            editor.isActive('heading', { level: 2 }) ? '2' :
            editor.isActive('heading', { level: 3 }) ? '3' : 'p'
          }
          className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white mr-1"
        >
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <select
          onChange={(e) => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontFamily(v).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white mr-1"
        >
          {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline (Ctrl+U)">
          <UIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} title="Heading 1">
          <Heading1 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Heading 2">
          <Heading2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))} title="Heading 3">
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Danh sách">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Danh sách đánh số">
          <ListOrdered className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Trích dẫn">
          <Quote className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))} title="Code block">
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Callout dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCalloutMenu(!showCalloutMenu)}
            className={btn(editor.isActive('callout'))}
            title="Callout box"
          >
            <Info className="w-4 h-4" />
          </button>
          {showCalloutMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCalloutMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-40 py-1 min-w-[160px]">
                <button type="button" onClick={() => setCallout('info')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left">
                  <Info className="w-3.5 h-3.5 text-blue-600" /> Thông tin
                </button>
                <button type="button" onClick={() => setCallout('warning')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Cảnh báo
                </button>
                <button type="button" onClick={() => setCallout('success')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Thành công
                </button>
                <button type="button" onClick={() => setCallout('tip')} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left">
                  <Lightbulb className="w-3.5 h-3.5 text-purple-600" /> Mẹo
                </button>
                <div className="my-1 border-t border-gray-200" />
                <button type="button" onClick={openCtaModal} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left">
                  <span className="inline-block w-3.5 h-3.5 rounded-sm" style={{ background: '#10233f' }} /> CTA (nút kêu gọi)
                </button>
              </div>
            </>
          )}
        </div>

        {/* Color picker dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorMenu(!showColorMenu)}
            className={btn(false)}
            title="Màu chữ"
          >
            <Palette
              className="w-4 h-4"
              style={{ color: editor.getAttributes('textStyle').color || '#4b5563' }}
            />
          </button>
          {showColorMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowColorMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-40 p-2 w-[200px]">
                <div className="text-xs text-gray-500 mb-1.5 px-1">Màu chữ</div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value || 'default'}
                      type="button"
                      onClick={() => {
                        if (c.value) {
                          editor.chain().focus().setColor(c.value).run();
                        } else {
                          editor.chain().focus().unsetColor().run();
                        }
                        setShowColorMenu(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform relative flex items-center justify-center"
                      style={{ backgroundColor: c.value || '#fff' }}
                      title={c.label}
                    >
                      {!c.value && (
                        <span className="text-[10px] text-gray-400">×</span>
                      )}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 px-1 py-1 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 rounded">
                  <input
                    type="color"
                    onChange={(e) => {
                      editor.chain().focus().setColor(e.target.value).run();
                    }}
                    value={editor.getAttributes('textStyle').color || '#000000'}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                  />
                  Màu tùy chọn…
                </label>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorMenu(false);
                  }}
                  className="w-full mt-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded text-left"
                >
                  Bỏ màu
                </button>
              </div>
            </>
          )}
        </div>

        {/* Font size dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
            className={btn(false)}
            title="Cỡ chữ"
          >
            <Type className="w-4 h-4" />
          </button>
          {showFontSizeMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFontSizeMenu(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-40 py-1 min-w-[180px]">
                <div className="text-xs text-gray-500 px-3 py-1.5 border-b border-gray-100">Cỡ chữ</div>
                {FONT_SIZES.map((s) => {
                  const isActive = (editor.getAttributes('textStyle').fontSize || '') === s.value;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        if (s.value) {
                          editor.chain().focus().setFontSize(s.value).run();
                        } else {
                          editor.chain().focus().unsetFontSize().run();
                        }
                        setShowFontSizeMenu(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-xs hover:bg-gray-50 text-left ${
                        isActive ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      <span style={{ fontSize: s.value || '14px' }}>{s.label}</span>
                      <span className="text-gray-400 text-[10px] font-mono">{s.value || 'mặc định'}</span>
                    </button>
                  );
                })}
                <div className="border-t border-gray-100 mt-1 pt-1 px-2 pb-2">
                  <div className="text-[10px] text-gray-400 mb-1">Tùy chỉnh (px):</div>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="10"
                      max="72"
                      value={customFontSize}
                      onChange={(e) => setCustomFontSize(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const n = parseInt(customFontSize, 10);
                          if (n >= 10 && n <= 72) {
                            editor.chain().focus().setFontSize(`${n}px`).run();
                            setCustomFontSize('');
                            setShowFontSizeMenu(false);
                          }
                        }
                      }}
                      placeholder="VD: 20"
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const n = parseInt(customFontSize, 10);
                        if (n >= 10 && n <= 72) {
                          editor.chain().focus().setFontSize(`${n}px`).run();
                          setCustomFontSize('');
                          setShowFontSizeMenu(false);
                        }
                      }}
                      disabled={!customFontSize || parseInt(customFontSize, 10) < 10 || parseInt(customFontSize, 10) > 72}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Alignment buttons - group 4 buttons */}
        <div className="flex items-center gap-0.5 border-l border-gray-300 pl-1 ml-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={btn(editor.isActive({ textAlign: 'left' }))}
            title="Căn trái"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={btn(editor.isActive({ textAlign: 'center' }))}
            title="Căn giữa"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={btn(editor.isActive({ textAlign: 'right' }))}
            title="Căn phải"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={btn(editor.isActive({ textAlign: 'justify' }))}
            title="Căn đều"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            const previous = editor.getAttributes('link').href;
            const url = window.prompt('URL:', previous || '');
            if (url === null) return;
            if (url === '') editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
          className={btn(editor.isActive('link'))}
          title="Link (Ctrl+K)"
        >
          <Link2 className="w-4 h-4" />
        </button>

        <button type="button" onClick={handlePickImageClick} className={btn(false)} title="Chèn ảnh từ thư viện">
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={btn(false)}
          title="Upload ảnh từ máy"
          disabled={uploading}
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAndInsert(file);
            e.target.value = '';
          }}
        />

        <button type="button" onClick={insertYoutube} className={btn(false)} title="Chèn video YouTube">
          <YoutubeIcon className="w-4 h-4" />
        </button>

        <button type="button" onClick={insertTable} className={btn(false)} title="Chèn bảng">
          <TableIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            // Tìm faqBlock node trong document, lấy attribute faqs
            let existingFaqs: FAQData[] = [];
            editor.state.doc.descendants((node) => {
              if (node.type.name === 'faqBlock') {
                existingFaqs = (node.attrs.faqs as FAQData[]) || [];
                return false; // dừng iteration
              }
            });
            // Map FAQData -> FAQEntry (thêm id để FAQManager dùng)
            const entries = existingFaqs.map((f, i) => ({
              id: `faq_existing_${i}_${Date.now()}`,
              question: f.question,
              answer: f.answer,
            }));
            setCurrentFAQs(entries);
            setShowFAQModal(true);
          }}
          className={btn(editor.isActive('faqBlock'))}
          title="Quản lý FAQ (Câu hỏi thường gặp) - tốt cho SEO"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setHtmlDialogMode('paste');
            setHtmlPasteContent('');
            setShowHtmlPasteDialog(true);
          }}
          className={btn(false)}
          title="Dán HTML (cho bài viết soạn sẵn)"
        >
          <FileCode className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setHtmlDialogMode('edit');
            setHtmlPasteContent(editor.getHTML());
            setShowHtmlPasteDialog(true);
          }}
          className={btn(false)}
          title="Sửa HTML của bài viết hiện tại"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="Undo (Ctrl+Z)">
          <Undo className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="Redo (Ctrl+Y)">
          <Redo className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {uploading && <span className="text-xs text-blue-600 mr-2">Đang upload ảnh…</span>}

        <button
          type="button"
          onClick={aiContinue}
          disabled={aiLoading}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <Sparkles className="w-3 h-3" /> {aiLoading ? 'AI đang viết…' : 'AI viết tiếp'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-5">
        <EditorContent editor={editor} />
      </div>

      {/* Modal: CTA */}
      {showCtaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded-sm" style={{ background: '#10233f' }} />
                {ctaEditPos != null ? 'Sửa khối CTA' : 'Khối CTA'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ô nền navy, chữ trắng, nút đỏ. Hiển thị như nhau trong bài và trên website.
                {ctaEditPos == null && ' Mẹo: nhấp đúp vào khối CTA trong bài để sửa, nhấp 1 lần rồi Delete để xóa.'}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nhãn nhỏ (eyebrow)</label>
                <input
                  type="text"
                  value={ctaDraft.eyebrow}
                  onChange={(e) => setCtaDraft({ ...ctaDraft, eyebrow: e.target.value })}
                  placeholder="VD: KHÁM PHÁ THÊM"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <textarea
                  value={ctaDraft.title}
                  onChange={(e) => setCtaDraft({ ...ctaDraft, title: e.target.value })}
                  placeholder="VD: Xem bộ sưu tập sản phẩm Yokool — sạc thông minh, nhẹ gánh hành trình."
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chữ trên nút</label>
                  <input
                    type="text"
                    value={ctaDraft.buttonText}
                    onChange={(e) => setCtaDraft({ ...ctaDraft, buttonText: e.target.value })}
                    placeholder="Xem sản phẩm →"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Link của nút</label>
                  <input
                    type="text"
                    value={ctaDraft.buttonHref}
                    onChange={(e) => setCtaDraft({ ...ctaDraft, buttonHref: e.target.value })}
                    placeholder="https://yokool.vn/..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {/* Xem trước */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Xem trước</label>
                <div style={{ background: '#10233f', borderRadius: 14, padding: 20 }}>
                  {ctaDraft.eyebrow && (
                    <div style={{ color: '#dc143b', fontSize: 11, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{ctaDraft.eyebrow}</div>
                  )}
                  <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '8px 0 14px' }}>{ctaDraft.title || 'Tiêu đề CTA…'}</div>
                  {ctaDraft.buttonText && ctaDraft.buttonHref && (
                    <span style={{ display: 'inline-block', background: '#dc143b', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>{ctaDraft.buttonText}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
              <div>
                {ctaEditPos != null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editor && ctaEditPos != null) {
                        editor.chain().focus().setNodeSelection(ctaEditPos).deleteSelection().run();
                      }
                      setShowCtaModal(false);
                      setCtaEditPos(null);
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                  >
                    Xóa khối
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setShowCtaModal(false); setCtaEditPos(null); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                <button type="button" onClick={insertCta} disabled={!ctaDraft.title.trim()} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{ctaEditPos != null ? 'Lưu thay đổi' : 'Chèn CTA'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: FAQ Manager */}
      <FAQManager
        open={showFAQModal}
        initialFaqs={currentFAQs}
        onClose={() => setShowFAQModal(false)}
        onSave={(faqs) => {
          // Convert FAQEntry → FAQData (bỏ id)
          const faqData: FAQData[] = faqs.map((f) => ({
            question: f.question,
            answer: f.answer,
          }));

          // Tìm faqBlock node hiện có
          let existingPos: number | null = null;
          let existingNodeSize: number = 0;
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'faqBlock') {
              existingPos = pos;
              existingNodeSize = node.nodeSize;
              return false;
            }
          });

          if (faqData.length === 0) {
            // Xóa FAQ - nếu có node thì delete
            if (existingPos !== null) {
              editor
                .chain()
                .focus()
                .setNodeSelection(existingPos)
                .deleteSelection()
                .run();
            }
          } else if (existingPos !== null) {
            // Update node hiện có
            const tr = editor.state.tr.setNodeMarkup(existingPos, undefined, {
              faqs: faqData,
            });
            editor.view.dispatch(tr);
          } else {
            // Insert mới ở cursor
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'faqBlock',
                attrs: { faqs: faqData },
              })
              .run();
          }
        }}
      />

      {/* Modal: Paste HTML */}
      {showHtmlPasteDialog && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHtmlPasteDialog(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                {htmlDialogMode === 'edit' ? 'Sửa HTML bài viết' : 'Dán HTML'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {htmlDialogMode === 'edit'
                  ? 'Sửa trực tiếp mã HTML của toàn bộ bài viết rồi bấm Lưu thay đổi. Giữ nguyên các thẻ hợp lệ; tránh dán script lạ.'
                  : <>Dán HTML đã soạn sẵn (từ AI, file khác…). Editor sẽ tự động render thành rich content. Hỗ trợ: <code className="bg-gray-100 px-1 rounded">&lt;p&gt;</code>, <code className="bg-gray-100 px-1 rounded">&lt;h2&gt;</code>, <code className="bg-gray-100 px-1 rounded">&lt;ul&gt;</code>, <code className="bg-gray-100 px-1 rounded">&lt;strong&gt;</code>, FAQ, table, image…</>}
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <textarea
                autoFocus
                value={htmlPasteContent}
                onChange={(e) => setHtmlPasteContent(e.target.value)}
                placeholder={`<p>Đây là đoạn văn...</p>
<h2>Tiêu đề H2</h2>
<p>Nội dung với <strong>chữ đậm</strong>...</p>`}
                className="w-full h-[400px] px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              <div className="text-xs text-gray-400 mt-2">
                {htmlPasteContent.length.toLocaleString()} ký tự
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {htmlDialogMode === 'paste' && (
                  <>
                    <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="paste-mode"
                        defaultChecked
                        id="paste-replace"
                      />
                      Thay thế nội dung hiện tại
                    </label>
                    <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer ml-3">
                      <input
                        type="radio"
                        name="paste-mode"
                        id="paste-append"
                      />
                      Chèn vào vị trí con trỏ
                    </label>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHtmlPasteDialog(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!htmlPasteContent.trim()) return;
                    if (htmlDialogMode === 'edit') {
                      // Sửa HTML: thay toàn bộ nội dung bài bằng HTML đã chỉnh.
                      editor.commands.setContent(htmlPasteContent, true);
                    } else {
                      const replace = (document.getElementById('paste-replace') as HTMLInputElement)?.checked;
                      if (replace) {
                        editor.commands.setContent(htmlPasteContent, true);
                      } else {
                        editor.chain().focus().insertContent(htmlPasteContent).run();
                      }
                    }
                    setShowHtmlPasteDialog(false);
                    setHtmlPasteContent('');
                  }}
                  disabled={!htmlPasteContent.trim()}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {htmlDialogMode === 'edit' ? 'Lưu thay đổi' : 'Chèn HTML'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
