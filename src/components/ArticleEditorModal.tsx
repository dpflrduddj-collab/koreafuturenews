import React, { useState } from 'react';
import { X, Send, PenTool, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { Article, NewsCategory } from '../types';
import { saveCustomArticle } from '../services/newsService';

interface ArticleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArticleCreated: (newArticle: Article) => void;
}

const CATEGORY_OPTIONS: { id: NewsCategory; label: string }[] = [
  { id: 'politics', label: '정치' },
  { id: 'economy', label: '경제' },
  { id: 'society', label: '사회' },
  { id: 'world', label: '국제' },
  { id: 'defense', label: '국방·안보' },
  { id: 'culture', label: '문화·연예' },
  { id: 'kpop', label: 'K-POP' },
  { id: 'tech', label: 'IT·과학' },
  { id: 'opinion', label: '오피니언' },
];

const PRESET_IMAGES = [
  { label: '국방·안보', url: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=1200&q=80' },
  { label: '정치·국회', url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80' },
  { label: '경제·금융', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80' },
  { label: 'IT·기술', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80' },
  { label: 'K-POP·음악', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80' },
  { label: '사회·도시', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80' },
];

export const ArticleEditorModal: React.FC<ArticleEditorModalProps> = ({
  isOpen,
  onClose,
  onArticleCreated,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<NewsCategory>('politics');
  const [reporterName, setReporterName] = useState('김미래');
  const [reporterDept, setReporterDept] = useState('정치부 취재기자');
  const [reporterEmail, setReporterEmail] = useState('mr.kim@koreafuturenews.co.kr');
  const [summary, setSummary] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [isExclusive, setIsExclusive] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [tagsInput, setTagsInput] = useState('한국미래뉴스, 자체취재, 심층보도');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('기사 제목을 입력해 주세요.');
      return;
    }
    if (!summary.trim()) {
      setError('기사 요약문을 입력해 주세요.');
      return;
    }
    if (!bodyText.trim()) {
      setError('기사 본문 내용을 입력해 주세요.');
      return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const publishedAt = `${yyyy}.${mm}.${dd} ${hh}:${min}`;

    const catObj = CATEGORY_OPTIONS.find((c) => c.id === category);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const paragraphs = bodyText
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);

    const newArticle: Article = {
      id: `own-${Date.now()}`,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      summary: summary.trim(),
      content: paragraphs.length > 0 ? paragraphs : [bodyText.trim()],
      category,
      categoryName: catObj ? catObj.label : '종합',
      reporter: {
        name: reporterName.trim() || '편집국 기자',
        dept: reporterDept.trim() || '취재본부',
        email: reporterEmail.trim(),
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      },
      publishedAt,
      timeAgo: '방금 전',
      imageUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
      isBreaking,
      isTopStory: true,
      isExclusive,
      isExternal: false,
      isOwnPress: true,
      viewCount: 1,
      commentCount: 0,
      likes: 0,
      tags: tags.length > 0 ? tags : ['한국미래뉴스', '단독보도'],
    };

    saveCustomArticle(newArticle);
    onArticleCreated(newArticle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                본지 자체 기사 작성 및 송고 시스템
              </h3>
              <p className="text-xs text-slate-500">
                한국 미래 뉴스 편집국 자체 단독/기획 기사 발행
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category & Badge options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                기사 카테고리 분야 <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) => setIsExclusive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="font-bold text-blue-700">[단독] 보도 지정</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBreaking}
                  onChange={(e) => setIsBreaking(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className="font-bold text-red-600">[속보] 지정</span>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              기사 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: [단독] 한국 미래 첨단 우주센터, 2027년 독자 심우주 탐사선 발사 계획 확정"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900"
              required
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">부제목 (선택)</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="예: 과기정통부 및 항공우주연구원 핵심 프로젝트 승인... 글로벌 5대 우주강국 도약"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Reporter details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">기자명</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">소속 부서</label>
              <input
                type="text"
                value={reporterDept}
                onChange={(e) => setReporterDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">이메일</label>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              기사 요약 (리드문) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="기사의 핵심 요약 내용을 1~2문장으로 작성해 주세요."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Body Content */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              기사 본문 내용 <span className="text-red-500">*</span> (문단 구분은 줄바꿈 2번)
            </label>
            <textarea
              rows={5}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="본문 내용을 상세히 작성해 주세요."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans"
              required
            />
          </div>

          {/* Image Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              기사 대표 이미지 URL (또는 프리셋 선택)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_IMAGES.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  onClick={() => setImageUrl(preset.url)}
                  className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                    imageUrl === preset.url
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              관련 태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="예: 우주항공, 한국미래뉴스, 단독"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>기사 송고 및 발행</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
