import React, { useState, useEffect } from 'react';
import { Article, Comment } from '../types';
import {
  Bookmark,
  Check,
  ChevronRight,
  Copy,
  Heart,
  Lightbulb,
  MessageSquare,
  Pause,
  Play,
  Printer,
  Share2,
  ThumbsUp,
  Volume2,
  X,
  ExternalLink,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onSelectRelatedArticle: (art: Article) => void;
  relatedArticles: Article[];
}

export const ArticleModal: React.FC<ArticleModalProps> = ({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onSelectRelatedArticle,
  relatedArticles,
}) => {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({
    thumbsUp: 34,
    insight: 18,
    heart: 26,
  });
  const [userReacted, setUserReacted] = useState<Record<string, boolean>>({});

  // Comments state
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c1',
      author: '시민A',
      content: '국가 핵심 기술에 대한 지속적인 투자와 인재 육성이 무엇보다 중요합니다.',
      createdAt: '25분 전',
      likes: 12,
    },
    {
      id: 'c2',
      author: '경제학도',
      content: '기사 분석이 명쾌하네요. 상용화 로드맵이 차질 없이 진행되길 응원합니다.',
      createdAt: '1시간 전',
      likes: 7,
    },
  ]);
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Dynamic SEO & Structured Data updates when modal is opened
  useEffect(() => {
    if (!article) return;

    const originalTitle = document.title;
    document.title = `${article.title} - 한국 미래 뉴스`;

    // Inject or update Schema.org NewsArticle JSON-LD
    let scriptTag = document.getElementById('article-ld-json') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'article-ld-json';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      'headline': article.title,
      'description': article.summary,
      'image': article.imageUrl ? [article.imageUrl] : [],
      'datePublished': article.publishedAt,
      'dateModified': article.publishedAt,
      'author': [
        {
          '@type': 'Person',
          'name': article.reporter.name,
        },
      ],
      'publisher': {
        '@type': 'NewsMediaOrganization',
        'name': '한국 미래 뉴스',
        'url': window.location.origin,
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `${window.location.origin}/?article=${encodeURIComponent(article.id)}`,
      },
    };
    scriptTag.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = originalTitle;
      const tag = document.getElementById('article-ld-json');
      if (tag) tag.remove();
    };
  }, [article]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const handleCopyLink = () => {
    const canonicalArticleUrl = `${window.location.origin}/?article=${encodeURIComponent(article.id)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(canonicalArticleUrl);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = canonicalArticleUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReaction = (type: string) => {
    if (userReacted[type]) return;
    setReactions((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
    setUserReacted((prev) => ({ ...prev, [type]: true }));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newC: Comment = {
      id: `c-${Date.now()}`,
      author: newCommentAuthor.trim() || '독자',
      content: newCommentText.trim(),
      createdAt: '방금 전',
      likes: 0,
    };

    setComments([newC, ...comments]);
    setNewCommentText('');
    setNewCommentAuthor('');
  };

  const handleLikeComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c))
    );
  };

  const fontSizeClass =
    fontSize === 'xlarge'
      ? 'text-lg sm:text-xl leading-relaxed sm:leading-loose'
      : fontSize === 'large'
      ? 'text-base sm:text-lg leading-relaxed'
      : 'text-sm sm:text-base leading-relaxed';

  return (
    <div
      id="article-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6"
    >
      <div
        className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>홈</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-600 font-bold">{article.categoryName}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Font Size Adjust */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-full p-1 text-xs border border-slate-200/60">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2.5 py-1 rounded-full ${
                  fontSize === 'normal' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500'
                }`}
                title="기본 글자"
              >
                가
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`px-2.5 py-1 rounded-full text-sm ${
                  fontSize === 'large' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500'
                }`}
                title="크게"
              >
                가+
              </button>
              <button
                type="button"
                onClick={() => setFontSize('xlarge')}
                className={`px-2.5 py-1 rounded-full text-base ${
                  fontSize === 'xlarge' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500'
                }`}
                title="아주 크게"
              >
                가++
              </button>
            </div>

            {/* Audio Reader simulation */}
            <button
              type="button"
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isPlayingAudio
                  ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border-slate-200/60'
              }`}
              title="기사 음성 듣기"
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] font-bold">읽는 중</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline text-[11px]">음성듣기</span>
                </>
              )}
            </button>

            {/* Scrap Bookmark */}
            <button
              type="button"
              onClick={onToggleBookmark}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                isBookmarked
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border-slate-200/60'
              }`}
              title="기사 스크랩"
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline text-[11px]">{isBookmarked ? '스크랩됨' : '스크랩'}</span>
            </button>

            {/* Share Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200/60 hover:bg-slate-200/70 bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5"
              title="기사 주소 복사"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-[11px] text-emerald-700 font-semibold">복사완료</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline text-[11px]">공유</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              id="btn-close-article-modal"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio Player Bar (When Active) */}
        {isPlayingAudio && (
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>AI 음성 캐스터가 기사를 낭독하고 있습니다.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlayingAudio(false)}
              className="underline font-bold text-blue-700 cursor-pointer"
            >
              정지
            </button>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* Article Header */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {(article.isAiGenerated || article.aiDraft) && (
                <span className="px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-xs font-bold tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3" /> AI 요약·작성 기사
                </span>
              )}
              {article.isOwnPress && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold tracking-wider">
                  본지 자체 보도
                </span>
              )}
              {article.isExternal && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold tracking-wider flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> 외부 제휴: {article.externalSource}
                </span>
              )}
              {article.isExclusive && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold tracking-wider">
                  단독
                </span>
              )}
              {article.isBreaking && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold">
                  속보
                </span>
              )}
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {article.categoryName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
              {article.title}
            </h1>

            {/* AI Generation Transparency Box */}
            {(article.isAiGenerated || article.aiDraft) && (
              <div className="mt-4 p-4 rounded-xl bg-violet-50/90 border border-violet-200 text-violet-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-violet-900">
                      {article.aiDraft?.disclaimer || `본 기사는 [${article.externalSource || '제휴 언론사'}] 원문 보도를 토대로 Google Gemini AI가 핵심 사실을 요약·재구성하고 한국 미래 뉴스 편집국의 검토를 거쳐 게시되었습니다.`}
                    </p>
                    <p className="text-violet-700 mt-0.5">
                      가짜 사실이나 확인되지 않은 내용은 엄격히 배제되며, 출처 표기와 원문 링크를 완전하게 보존합니다.
                    </p>
                  </div>
                </div>
                {article.externalUrl && (
                  <a
                    href={article.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <span>원문 확인</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {article.isExternal && article.externalUrl && !article.isAiGenerated && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                    본 기사는 외부 언론사 [{article.externalSource}]에서 실시간 연계된 기사입니다.
                  </p>
                  <p className="text-indigo-700 mt-0.5">
                    전체 전문과 사진, 관련 보도는 해당 언론사의 원문 페이지에서 직접 확인하실 수 있습니다.
                  </p>
                </div>
                <a
                  href={article.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <span>원문 기사 바로보기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {article.subtitle && (
              <h2 className="text-base sm:text-lg font-medium text-slate-600 mt-3 leading-snug">
                {article.subtitle}
              </h2>
            )}

            {/* Reporter & Meta */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                {article.reporter.photo ? (
                  <img
                    src={article.reporter.photo}
                    alt={article.reporter.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center">
                    {article.reporter.name[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {article.reporter.name} 기자
                  </div>
                  <div className="text-slate-500">
                    {article.reporter.dept}
                    {article.reporter.email && (
                      <span className="ml-1 text-slate-400 font-mono">
                        ({article.reporter.email})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div>입력 {article.publishedAt}</div>
                <div className="text-slate-400 mt-0.5">최종 수정 {article.timeAgo}</div>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          {article.imageUrl && (
            <div className="my-6">
              <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-[420px]">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {article.imageCaption && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  ▲ {article.imageCaption}
                </p>
              )}
            </div>
          )}

          {/* AI / Key Summary Box */}
          {article.aiDraft?.summaryBullets && article.aiDraft.summaryBullets.length > 0 ? (
            <div className="bg-gradient-to-br from-violet-50/80 to-blue-50/60 border border-violet-200/80 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-700 tracking-wide mb-3">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span>AI 핵심 포인트 3</span>
              </div>
              <ul className="space-y-2.5">
                {article.aiDraft.summaryBullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-800 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-blue-50/40 border-l-4 border-blue-600 p-4 sm:p-5 rounded-r-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mb-1">
                <span>핵심 요약</span>
              </div>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {article.summary}
              </p>
            </div>
          )}

          {/* Article Paragraphs */}
          <div className={`text-slate-700 space-y-5 ${fontSizeClass}`}>
            {article.content.map((p, idx) => (
              <p key={idx} className="leading-relaxed">{p}</p>
            ))}
          </div>

          {/* External Source Original Article Link Action */}
          {article.isExternal && article.externalUrl && (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center my-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                [{article.externalSource}] 공식 원문 페이지에서 기사 전체를 확인하실 수 있습니다.
              </p>
              <a
                href={article.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all hover:scale-102"
              >
                <span>{article.externalSource} 원문 기사 전체보기</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Article Tags */}
          <div className="pt-6 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 block mb-2">관련 키워드</span>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Reader Reactions */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-100 text-center my-8">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              이 기사에 어떤 반응을 남기시겠습니까?
            </h4>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => handleReaction('thumbsUp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                  userReacted.thumbsUp
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <ThumbsUp className="w-4 h-4 text-blue-600" />
                <span>추천해요</span>
                <span className="font-mono text-slate-900">{reactions.thumbsUp}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReaction('insight')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                  userReacted.insight
                    ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>유익해요</span>
                <span className="font-mono text-slate-900">{reactions.insight}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReaction('heart')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                  userReacted.heart
                    ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500 fill-current" />
                <span>공감해요</span>
                <span className="font-mono text-slate-900">{reactions.heart}</span>
              </button>
            </div>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-blue-600 rounded-full"></span>
                이 시각 주요 관련 기사
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.slice(0, 2).map((rel, idx) => (
                  <div
                    key={`${rel.id}-${idx}`}
                    onClick={() => onSelectRelatedArticle(rel)}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer group flex gap-3"
                  >
                    <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                      <img
                        src={rel.imageUrl}
                        alt={rel.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {rel.title}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                        {rel.reporter.name} • {rel.timeAgo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="pt-8 border-t border-slate-100" id="comments-section">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900">
                  독자 의견 <span className="text-blue-600 font-mono text-sm">({comments.length})</span>
                </h3>
              </div>
              <span className="text-xs text-slate-400">건전한 토론 문화를 존중합니다</span>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100 mb-6">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="닉네임 (선택사항)"
                  value={newCommentAuthor}
                  onChange={(e) => setNewCommentAuthor(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-36"
                />
              </div>
              <textarea
                placeholder="기사에 대한 의견이나 생각을 자유롭게 남겨주세요."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={3}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${
                    newCommentText.trim()
                      ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  댓글 등록
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3">
              {comments.map((c, idx) => (
                <div key={`${c.id}-${idx}`} className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-900">{c.author}</span>
                    <span className="text-slate-400 font-mono">{c.createdAt}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {c.content}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleLikeComment(c.id)}
                      className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-mono"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>공감 {c.likes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
