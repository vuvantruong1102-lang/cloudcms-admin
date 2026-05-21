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
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { ResizableImage } from '../lib/ResizableImage';
import { Callout } from '../lib/CalloutExtension';
import { FontSize } from '../lib/FontSizeExtension';

type Props = {
  initialHtml: string;
  onChange: (html: string, json: any) => void;
  onPickImage: () => void; // mở media picker
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

export default function ArticleEditor({ initialHtml, onChange, onPickImage }: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [customFontSize, setCustomFontSize] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      ResizableImage,
      Callout,
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
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false; // di chuyển node trong editor, không phải drop file
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        imageFiles.forEach((f) => uploadAndInsert(f));
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
    async (file: File) => {
      if (!editor) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await api.post<{ id: string; url: string; filename: string }>(
          '/media/upload',
          fd
        );
        editor
          .chain()
          .focus()
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

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`;

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 border border-gray-200 rounded-md mb-3 sticky z-10 shadow-sm"
        style={{ top: 'var(--editor-topbar-h, 44px)' }}
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

        <button type="button" onClick={onPickImage} className={btn(false)} title="Chèn ảnh từ thư viện">
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
    </div>
  );
}
