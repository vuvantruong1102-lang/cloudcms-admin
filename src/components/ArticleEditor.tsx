import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import {
  Bold, Italic, Underline as UIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link2, Image as ImageIcon, Sparkles, Redo, Undo,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

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

export default function ArticleEditor({ initialHtml, onChange, onPickImage }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Image.configure({ HTMLAttributes: { class: 'rounded-md' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
      Placeholder.configure({ placeholder: 'Bắt đầu viết bài… nhấn / để chèn block' }),
      TextStyle,
      FontFamily,
    ],
    content: initialHtml,
    onUpdate({ editor }) {
      onChange(editor.getHTML(), editor.getJSON());
    },
  });

  // Cập nhật content khi initialHtml đổi (vd: load bài đã có)
  useEffect(() => {
    if (editor && initialHtml !== editor.getHTML()) {
      editor.commands.setContent(initialHtml || '', false);
    }
    // eslint-disable-next-line
  }, [initialHtml, editor]);

  const [aiLoading, setAiLoading] = useState(false);

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

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 border border-gray-200 rounded-md mb-3 sticky top-0 z-10">
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

        <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline">
          <UIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))}>
          <Heading1 className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))}>
          <Heading2 className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive('heading', { level: 3 }))}>
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
          <List className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
          <ListOrdered className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>
          <Quote className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btn(editor.isActive('codeBlock'))}>
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button
          onClick={() => {
            const url = window.prompt('Nhập URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={btn(editor.isActive('link'))}
        >
          <Link2 className="w-4 h-4" />
        </button>
        <button onClick={onPickImage} className={btn(false)} title="Chèn ảnh">
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)}>
          <Undo className="w-4 h-4" />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)}>
          <Redo className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <button
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
