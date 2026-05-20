import { useEffect, useState } from 'react';
import { Check, AlertTriangle, X, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

type SeoCheck = { id: string; label: string; status: 'pass' | 'warn' | 'fail'; message: string; weight: number };
type SeoAnalysis = { score: number; checks: SeoCheck[]; wordCount: number };

type Props = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  contentHtml: string;
  ogImageUrl: string;
  featuredImageAlt: string;
  siteHost?: string;
  onApplyMetaDescription: (s: string) => void;
  onApplyKeywords?: (kws: string[]) => void;
};

const statusIcon = {
  pass: <Check className="w-3.5 h-3.5 text-green-600" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
  fail: <X className="w-3.5 h-3.5 text-red-600" />,
};

export default function SeoPanel(props: Props) {
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState('');

  // Debounce analyze
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const data = await api.post<SeoAnalysis>('/posts/analyze-seo', {
          title: props.title,
          metaTitle: props.metaTitle,
          metaDescription: props.metaDescription,
          focusKeyword: props.focusKeyword,
          contentHtml: props.contentHtml,
          slug: props.slug,
          ogImageUrl: props.ogImageUrl,
          featuredImageAlt: props.featuredImageAlt,
        });
        setAnalysis(data);
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(t);
  }, [props.title, props.metaTitle, props.metaDescription, props.focusKeyword, props.contentHtml, props.slug, props.ogImageUrl, props.featuredImageAlt]);

  async function aiSuggestMeta() {
    setAiLoading('meta');
    try {
      const { suggestion } = await api.post<{ suggestion: string }>('/ai/suggest-meta', {
        title: props.title,
        content: props.contentHtml,
        focusKeyword: props.focusKeyword,
      });
      props.onApplyMetaDescription(suggestion);
    } catch (e: any) {
      alert('Lỗi AI: ' + e.message);
    } finally {
      setAiLoading('');
    }
  }

  async function aiSuggestKeywords() {
    setAiLoading('kw');
    try {
      const { keywords } = await api.post<{ keywords: string[] }>('/ai/suggest-keywords', {
        title: props.title,
        content: props.contentHtml,
      });
      props.onApplyKeywords?.(keywords);
    } catch (e: any) {
      alert('Lỗi AI: ' + e.message);
    } finally {
      setAiLoading('');
    }
  }

  const score = analysis?.score ?? 0;
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-3">
      {/* SEO Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Điểm SEO</h3>
          <span className={`text-xl font-semibold ${scoreColor}`}>{score}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className={`h-full ${scoreBg} transition-all`} style={{ width: `${score}%` }} />
        </div>
        <div className="space-y-1.5 text-xs">
          {analysis?.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <span className="mt-0.5">{statusIcon[c.status]}</span>
              <span className={c.status === 'pass' ? 'text-gray-700' : 'text-gray-600'}>{c.message}</span>
            </div>
          ))}
        </div>
        {analysis && <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">{analysis.wordCount} từ</div>}
      </div>

      {/* AI Suggestions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Gợi ý AI
        </h3>
        <div className="space-y-2">
          <button
            onClick={aiSuggestMeta}
            disabled={!props.title || !props.contentHtml || aiLoading === 'meta'}
            className="w-full text-left text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            {aiLoading === 'meta' ? 'Đang tạo…' : 'Viết meta description'}
          </button>
          <button
            onClick={aiSuggestKeywords}
            disabled={!props.title || !props.contentHtml || aiLoading === 'kw'}
            className="w-full text-left text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            {aiLoading === 'kw' ? 'Đang tạo…' : 'Đề xuất từ khóa'}
          </button>
        </div>
      </div>

      {/* Google preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="text-xs font-medium text-gray-600 mb-2">Xem trước Google</div>
        <div className="bg-white rounded p-3 text-xs">
          <div className="text-gray-500">{props.siteHost ?? 'yoursite.com'} › blog</div>
          <div className="text-base text-[#1a0dab] my-0.5 line-clamp-1">
            {(props.metaTitle || props.title || 'Tiêu đề bài viết').slice(0, 60)}
            {(props.metaTitle || props.title).length > 60 && '…'}
          </div>
          <div className="text-gray-600 line-clamp-2 leading-snug">
            {props.metaDescription || 'Meta description sẽ hiển thị ở đây…'}
          </div>
        </div>
      </div>
    </div>
  );
}
